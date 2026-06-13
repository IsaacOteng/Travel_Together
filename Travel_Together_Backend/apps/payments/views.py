import json
import uuid
from decimal import Decimal

from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from apps.trips.models import Trip, TripMember
from .models import Payment, Payout, PayoutMethod
from .services import confirm_payment
from . import paystack


def _paystack_fee(data):
    """Extract the Paystack fee (GHS) from a charge/verify payload."""
    return Decimal(str(data.get("fees", 0) or 0)) / 100


class InitiatePaymentView(APIView):
    """
    POST /api/payments/trips/<trip_id>/initiate/

    Member starts paying for their approved-awaiting-payment spot. Returns a
    Paystack authorization_url for the frontend to open.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, trip_id):
        try:
            trip = Trip.objects.get(id=trip_id)
        except Trip.DoesNotExist:
            return Response({"detail": "Trip not found."}, status=404)

        member = TripMember.objects.filter(
            trip=trip, user=request.user,
            status=TripMember.Status.AWAITING_PAYMENT,
        ).first()
        if not member:
            return Response({"detail": "No payment is due for you on this trip."}, status=400)

        payment = (
            Payment.objects
            .filter(trip=trip, user=request.user, status=Payment.Status.PENDING)
            .order_by("-created_at")
            .first()
        )
        if not payment:
            return Response({"detail": "No pending payment found."}, status=400)

        # Fresh unique reference per attempt; last attempt wins. Stale references
        # are harmless because confirm_payment is idempotent.
        reference = f"tt_{payment.id.hex}_{uuid.uuid4().hex[:8]}"
        payment.paystack_ref = reference
        payment.save(update_fields=["paystack_ref", "updated_at"])

        try:
            data = paystack.initialize_transaction(
                email=request.user.email,
                amount=payment.amount,
                reference=reference,
                currency=payment.currency,
                metadata={
                    "payment_id": str(payment.id),
                    "trip_id":    str(trip.id),
                    "user_id":    str(request.user.id),
                },
                callback_url=settings.PAYSTACK_CALLBACK_URL or None,
            )
        except paystack.PaystackError as exc:
            return Response({"detail": str(exc)}, status=502)

        return Response({
            "authorization_url": data["authorization_url"],
            "reference":         data["reference"],
            "amount":            str(payment.amount),
        })


class VerifyPaymentView(APIView):
    """
    GET /api/payments/verify/<reference>/

    Frontend calls this after returning from Paystack. Confirms with Paystack and,
    on success, admits the member. Backup to the webhook — both are idempotent.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, reference):
        payment = Payment.objects.filter(paystack_ref=reference).first()
        if not payment:
            return Response({"detail": "Unknown payment reference."}, status=404)
        if payment.user_id != request.user.id:
            return Response({"detail": "Not your payment."}, status=403)

        if payment.status == Payment.Status.HELD:
            return Response({"status": "held", "paid": True})

        try:
            data = paystack.verify_transaction(reference)
        except paystack.PaystackError as exc:
            return Response({"detail": str(exc)}, status=502)

        if data.get("status") == "success":
            confirm_payment(payment, fee=_paystack_fee(data))
            return Response({"status": "held", "paid": True})

        return Response({
            "status":          payment.status,
            "paid":            False,
            "paystack_status": data.get("status"),
        })


@method_decorator(csrf_exempt, name="dispatch")
class PaystackWebhookView(APIView):
    """
    POST /api/payments/webhook/

    Paystack server-to-server callback. Signature-verified and idempotent.
    Always returns 200 quickly so Paystack stops retrying.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        # Use the RAW body for signature verification (never request.data here).
        signature = request.headers.get("x-paystack-signature", "")
        if not paystack.verify_webhook_signature(request.body, signature):
            return Response({"detail": "Invalid signature."}, status=400)

        try:
            event = json.loads(request.body.decode())
        except (ValueError, UnicodeDecodeError):
            return Response({"detail": "Bad payload."}, status=400)

        event_type = event.get("event")
        data       = event.get("data", {}) or {}
        reference  = data.get("reference")

        if event_type == "charge.success" and reference:
            payment = Payment.objects.filter(paystack_ref=reference).first()
            if payment:
                confirm_payment(payment, fee=_paystack_fee(data))   # idempotent

        elif event_type == "refund.processed":
            # Refund payloads reference the original transaction.
            ref = (
                data.get("transaction_reference")
                or (data.get("transaction") or {}).get("reference")
            )
            payment = Payment.objects.filter(paystack_ref=ref).first() if ref else None
            if payment and payment.status != Payment.Status.REFUNDED:
                payment.status = Payment.Status.REFUNDED
                payment.save(update_fields=["status", "updated_at"])

        elif event_type in ("transfer.success", "transfer.failed", "transfer.reversed") and reference:
            payout = Payout.objects.filter(paystack_ref=reference).first()
            if payout:
                from django.utils import timezone
                if event_type == "transfer.success":
                    payout.status, payout.paid_at = Payout.Status.PAID, timezone.now()
                else:
                    payout.status = Payout.Status.FAILED
                payout.save(update_fields=["status", "paid_at"])

        return Response({"status": "ok"})


class PayoutMethodView(APIView):
    """
    GET/PUT /api/payments/payout-method/

    The organizer's payout destination. The account name need not match their
    identity; accountability comes from identity verification, not this name.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        method = PayoutMethod.objects.filter(user=request.user).first()
        if not method:
            return Response({"configured": False})
        return Response({
            "configured":     True,
            "type":           method.type,
            "account_masked": f"••••{method.account_number[-4:]}",
            "bank_code":      method.bank_code,
            "account_name":   method.account_name,
            "tokenized":      bool(method.recipient_code),
        })

    def put(self, request):
        account_number = (request.data.get("account_number") or "").strip()
        bank_code      = (request.data.get("bank_code") or "").strip()
        if not account_number or not bank_code:
            return Response({"detail": "account_number and bank_code are required."}, status=400)

        method, _ = PayoutMethod.objects.update_or_create(
            user=request.user,
            defaults={
                "type":           request.data.get("type", PayoutMethod.Type.MOBILE_MONEY),
                "account_number": account_number,
                "bank_code":      bank_code,
                "account_name":   (request.data.get("account_name") or "").strip(),
                "recipient_code": None,   # re-tokenize whenever details change
            },
        )

        # Best-effort tokenisation (needs live keys); details are saved regardless.
        if settings.PAYSTACK_SECRET_KEY:
            try:
                method.recipient_code = paystack.create_transfer_recipient(
                    name=method.account_name,
                    account_number=method.account_number,
                    bank_code=method.bank_code,
                    recipient_type=("mobile_money" if method.type == PayoutMethod.Type.MOBILE_MONEY else "ghipss"),
                )
                method.save(update_fields=["recipient_code", "updated_at"])
            except paystack.PaystackError:
                pass

        return Response({"configured": True, "tokenized": bool(method.recipient_code)})
