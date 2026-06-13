"""
Payment state-machine services.

These functions own the transitions between membership and payment states so
the logic lives in one place (the trip view just calls into them):

    approve (free / payments off) ─────────────────► admit_member_to_group
    approve (payments on, paid trip) ──► start_member_payment ──┐
                                                                 │ member pays
    Paystack confirms charge (Phase 3) ──► confirm_payment ──────┘──► admit_member_to_group
"""

from datetime import timedelta
from django.conf import settings
from django.utils import timezone


def _stamp_join_request_decided(trip, member, decided):
    """Mark the chief's original join_request notification as resolved."""
    from apps.notifications.models import Notification as Notif
    Notif.objects.filter(
        notification_type="join_request",
        trip=trip,
        data__user_id=str(member.user.id),
    ).update(
        is_read=True,
        data={"trip_id": str(trip.id), "user_id": str(member.user.id), "decided": decided},
    )


def admit_member_to_group(trip, member, approved_by=None):
    """
    Member is fully in the group: add them to the group chat and notify them.

    Shared by the no-payment path (PAYMENTS_ENABLED off, or a free trip) and by
    confirm_payment once a paid member's money is received.
    """
    from apps.chat.models import ConversationMember as ConvMember
    from apps.notifications.utils import push

    conv = trip.group_chats.first()
    if conv:
        ConvMember.objects.get_or_create(
            conversation=conv, user=member.user,
            defaults={"is_admin": False},
        )

    _stamp_join_request_decided(trip, member, "approved")

    push(
        recipient  = member.user,
        notif_type = "join_approved",
        title      = "Join request approved!",
        body       = f"You've been approved to join \"{trip.title}\". Welcome to the group!",
        sender     = approved_by,
        trip       = trip,
        data       = {"trip_id": str(trip.id)},
    )


def start_member_payment(trip, member, approved_by=None):
    """
    Organizer approved the member, but they must pay to secure the spot.
    Creates a pending Payment with a deadline and prompts the member to pay.
    """
    from apps.notifications.utils import push
    from .models import Payment

    hours    = getattr(settings, "PAYMENT_DEADLINE_HOURS", 48)
    deadline = timezone.now() + timedelta(hours=hours)

    payment = Payment.objects.create(
        trip   = trip,
        user   = member.user,
        amount = trip.entry_price,
        status = Payment.Status.PENDING,
        due_at = deadline,
    )

    _stamp_join_request_decided(trip, member, "approved")

    push(
        recipient  = member.user,
        notif_type = "payment_due",
        title      = "You're approved — confirm your spot",
        body       = (
            f"You've been approved for \"{trip.title}\". "
            f"Pay GH₵{trip.entry_price} to secure your spot."
        ),
        sender     = approved_by,
        trip       = trip,
        action_url = f"/trips/{trip.id}/",
        data       = {
            "trip_id":    str(trip.id),
            "payment_id": str(payment.id),
            "amount":     str(trip.entry_price),
            "due_at":     deadline.isoformat(),
        },
    )
    return payment


def confirm_payment(payment, fee=None):
    """
    Called when Paystack confirms the charge (wired to the webhook in Phase 3).
    Marks the payment held and admits the member to the group. Idempotent.

    `fee` (GHS, optional) is the Paystack processing fee, recorded so refunds can
    deduct it from the member (the platform never eats the fee).
    """
    from apps.trips.models import TripMember
    from .models import Payment

    if payment.status == Payment.Status.HELD:
        return payment  # already confirmed — safe to call again (idempotent)

    payment.status  = Payment.Status.HELD
    payment.paid_at = timezone.now()
    if fee is not None:
        payment.fee = fee
    payment.save(update_fields=["status", "paid_at", "fee", "updated_at"])

    member = (
        TripMember.objects
        .select_related("user")
        .filter(trip=payment.trip, user=payment.user)
        .first()
    )
    if member and member.status == TripMember.Status.AWAITING_PAYMENT:
        member.status = TripMember.Status.APPROVED
        member.save(update_fields=["status"])
        admit_member_to_group(payment.trip, member, approved_by=payment.trip.chief)

    return payment


# ─── Refunds ──────────────────────────────────────────────────────────────────

def is_refund_eligible(trip):
    """Option-A cutoff: refundable only if the trip is still ≥ REFUND_CUTOFF_DAYS away."""
    days_out = (trip.date_start - timezone.now().date()).days
    return days_out >= getattr(settings, "REFUND_CUTOFF_DAYS", 7)


def refund_payment(payment, reason="", notify=True):
    """
    Refund a held payment back to the member, **minus the Paystack fee** (the
    member bears the fee so the platform never goes into debt). Idempotent.
    Returns the refunded amount (Decimal) or None if nothing was refunded.
    """
    from decimal import Decimal
    from apps.notifications.utils import push
    from . import paystack
    from .models import Payment

    if payment.status != Payment.Status.HELD:
        return None  # only money currently in escrow can be refunded

    refund_amt = max(payment.amount - (payment.fee or Decimal("0")), Decimal("0"))

    try:
        paystack.refund_transaction(payment.paystack_ref, amount=refund_amt)
    except paystack.PaystackError:
        # With real keys a genuine failure should surface; in dev/test (no keys)
        # let the state machine proceed so the flow stays demoable.
        if settings.PAYSTACK_SECRET_KEY:
            raise

    payment.status      = Payment.Status.REFUNDED
    payment.refunded_at = timezone.now()
    payment.save(update_fields=["status", "refunded_at", "updated_at"])

    if notify:
        push(
            recipient  = payment.user,
            notif_type = "refund_processed",
            title      = "Refund on its way",
            body       = (
                f"GH₵{refund_amt} has been refunded for \"{payment.trip.title}\" "
                f"(less the processing fee)."
            ),
            trip       = payment.trip,
            data       = {"trip_id": str(payment.trip_id), "amount": str(refund_amt)},
        )
    return refund_amt


def handle_member_leaving(trip, user):
    """
    Called when a member leaves / withdraws. Applies the refund cutoff:
      • still pending (never paid) → mark FAILED, nothing to refund
      • held + eligible (≥ cutoff)  → refund (minus fee)
      • held + too late / no-show   → forfeit; money stays in escrow for the organizer
    """
    if not getattr(settings, "PAYMENTS_ENABLED", False):
        return None

    from .models import Payment

    held = Payment.objects.filter(trip=trip, user=user, status=Payment.Status.HELD).first()
    if held:
        if is_refund_eligible(trip):
            return refund_payment(held, reason="left_trip")
        return None  # forfeit — stays held, flows to organizer at payout

    pending = Payment.objects.filter(trip=trip, user=user, status=Payment.Status.PENDING).first()
    if pending:
        pending.status = Payment.Status.FAILED
        pending.save(update_fields=["status", "updated_at"])
    return None


def cancel_trip(trip, by_organizer=False, reason=""):
    """
    Cancel a trip: refund every held payment (minus fee), notify members, set the
    trip to CANCELLED. If the organizer cancelled, apply a karma penalty (the only
    deterrent available, since we can't reclaim money from them).
    """
    from apps.trips.models import Trip, TripMember
    from apps.notifications.utils import push_many
    from .models import Payment

    for payment in Payment.objects.filter(trip=trip, status=Payment.Status.HELD):
        refund_payment(payment, reason="trip_cancelled", notify=False)

    affected = (
        TripMember.objects
        .filter(trip=trip)
        .exclude(status__in=[TripMember.Status.REJECTED, TripMember.Status.REMOVED])
        .select_related("user")
    )
    recipients = [m.user for m in affected if m.user_id != (trip.chief_id or None)]
    if recipients:
        push_many(
            recipients = recipients,
            notif_type = "trip_cancelled",
            title      = "Trip cancelled",
            body       = f"\"{trip.title}\" has been cancelled. Any payment you made is being refunded.",
            trip       = trip,
            data       = {"trip_id": str(trip.id)},
        )

    trip.status = Trip.Status.CANCELLED
    trip.save(update_fields=["status", "updated_at"])

    if by_organizer and trip.chief:
        from apps.karma.utils import award_karma
        award_karma(
            user        = trip.chief,
            delta       = -getattr(settings, "ORGANIZER_CANCEL_KARMA_PENALTY", 25),
            reason      = "trip_cancelled_by_organizer",
            description = f"Cancelled trip: {trip.title}",
            trip        = trip,
        )


# ─── Payouts (release escrow to the organizer) ────────────────────────────────

def _organizer_share(trip):
    """(held_total, commission, organizer_total) for the funds currently in escrow."""
    from decimal import Decimal
    from .models import Payment

    held_total = sum(
        (p.amount for p in Payment.objects.filter(trip=trip, status=Payment.Status.HELD)),
        Decimal("0"),
    )
    commission = (held_total * Decimal(getattr(settings, "PLATFORM_COMMISSION_PERCENT", 10)) / 100)
    return held_total, commission, (held_total - commission)


def _already_paid_out(trip):
    from decimal import Decimal
    from .models import Payout
    return sum(
        (po.amount for po in Payout.objects.filter(trip=trip).exclude(status=Payout.Status.FAILED)),
        Decimal("0"),
    )


def _create_and_send_payout(trip, amount, kind):
    """Create a Payout row and attempt the Paystack transfer (best-effort in dev)."""
    from apps.notifications.utils import push
    from . import paystack
    from .models import Payout, PayoutMethod

    payout = Payout.objects.create(trip=trip, organizer=trip.chief, amount=amount, kind=kind)

    method = PayoutMethod.objects.filter(user=trip.chief).first() if trip.chief else None
    if method and method.recipient_code and settings.PAYSTACK_SECRET_KEY:
        reference = f"po_{payout.id.hex}"
        try:
            paystack.initiate_transfer(
                amount=amount,
                recipient_code=method.recipient_code,
                reason=f"{kind} payout — {trip.title}",
                reference=reference,
            )
            payout.paystack_ref = reference
            payout.status       = Payout.Status.PROCESSING  # confirmed via transfer.success webhook
        except paystack.PaystackError:
            payout.status = Payout.Status.FAILED
        payout.save(update_fields=["paystack_ref", "status"])
    # else: no payout method / no keys → stays PENDING (manual or dev)

    if trip.chief:
        push(
            recipient  = trip.chief,
            notif_type = "payout_released",
            title      = "Payout released",
            body       = f"GH₵{amount} ({kind}) has been released for \"{trip.title}\".",
            trip       = trip,
            data       = {"trip_id": str(trip.id), "amount": str(amount), "kind": kind},
        )
    return payout


def release_partial_payout(trip):
    """Release the partial (departure) portion of the organizer's share. One per trip."""
    from decimal import Decimal
    from .models import Payout

    if Payout.objects.filter(trip=trip, kind=Payout.Kind.PARTIAL).exists():
        return None
    _, _, organizer_total = _organizer_share(trip)
    if organizer_total <= 0:
        return None
    pct     = Decimal(getattr(settings, "PARTIAL_RELEASE_PERCENT", 50)) / 100
    partial = (organizer_total * pct).quantize(Decimal("0.01"))
    if partial <= 0:
        return None
    return _create_and_send_payout(trip, partial, Payout.Kind.PARTIAL)


def release_final_payout(trip):
    """Release the remaining organizer share after the dispute window. One per trip."""
    from decimal import Decimal
    from .models import Payment, Payout

    if Payout.objects.filter(trip=trip, kind=Payout.Kind.FINAL).exists():
        return None

    _, _, organizer_total = _organizer_share(trip)
    remaining = (organizer_total - _already_paid_out(trip)).quantize(Decimal("0.01"))

    payout = None
    if remaining > 0:
        payout = _create_and_send_payout(trip, remaining, Payout.Kind.FINAL)

    # Mark the trip's escrowed payments as fully released.
    Payment.objects.filter(trip=trip, status=Payment.Status.HELD).update(
        status=Payment.Status.RELEASED, released_at=timezone.now()
    )
    return payout
