from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.users.models import User
from apps.trips.models import Trip, TripMember
from apps.payments.models import Payment, Payout
from apps.payments import services


# ─── Helpers ──────────────────────────────────────────────────────────────────

def make_user(email):
    return User.objects.create_user(email=email, username=email.split("@")[0])


def make_trip(chief, entry_price="100.00", days_out=10, spots=5, status="published"):
    return Trip.objects.create(
        title="Test Trip",
        destination="Accra",
        date_start=date.today() + timedelta(days=days_out),
        date_end=date.today() + timedelta(days=days_out + 2),
        entry_price=Decimal(entry_price),
        spots_total=spots,
        chief=chief,
        status=status,
    )


def member(trip, user, status=TripMember.Status.APPROVED, role=TripMember.Role.MEMBER):
    return TripMember.objects.create(trip=trip, user=user, status=status, role=role)


def held_payment(trip, user, amount="100.00", fee="0.00"):
    return Payment.objects.create(
        trip=trip, user=user, amount=Decimal(amount), fee=Decimal(fee),
        status=Payment.Status.HELD, paystack_ref=f"tt_{user.username}",
    )


# ─── Phase 1: capacity ────────────────────────────────────────────────────────

class CapacityTests(TestCase):
    def test_occupied_spots_counts_approved_and_awaiting(self):
        chief = make_user("chief@t.co")
        trip  = make_trip(chief, spots=5)
        member(trip, chief, role=TripMember.Role.CHIEF)               # approved
        member(trip, make_user("a@t.co"), TripMember.Status.APPROVED)
        member(trip, make_user("b@t.co"), TripMember.Status.AWAITING_PAYMENT)
        member(trip, make_user("c@t.co"), TripMember.Status.PENDING)  # does not occupy

        self.assertEqual(trip.occupied_spots(), 3)        # 2 approved + 1 awaiting
        self.assertEqual(trip.spots_left(), 2)
        self.assertEqual(trip.approved_members_count(), 2)  # awaiting excluded


# ─── Phase 3: confirm_payment idempotency ─────────────────────────────────────

class ConfirmPaymentTests(TestCase):
    def setUp(self):
        self.chief = make_user("chief@t.co")
        self.trip  = make_trip(self.chief)
        self.user  = make_user("payer@t.co")
        member(self.trip, self.user, TripMember.Status.AWAITING_PAYMENT)
        self.payment = Payment.objects.create(
            trip=self.trip, user=self.user, amount=Decimal("100.00"),
            status=Payment.Status.PENDING, paystack_ref="tt_payer",
        )

    def test_confirm_admits_member(self):
        services.confirm_payment(self.payment, fee=Decimal("2.00"))
        self.payment.refresh_from_db()
        m = TripMember.objects.get(trip=self.trip, user=self.user)
        self.assertEqual(self.payment.status, Payment.Status.HELD)
        self.assertEqual(self.payment.fee, Decimal("2.00"))
        self.assertEqual(m.status, TripMember.Status.APPROVED)

    def test_confirm_is_idempotent(self):
        services.confirm_payment(self.payment)
        services.confirm_payment(self.payment)   # second call must be a no-op
        self.assertEqual(
            Payment.objects.filter(trip=self.trip, user=self.user).count(), 1
        )
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, Payment.Status.HELD)


# ─── Phase 4: refunds ─────────────────────────────────────────────────────────

@override_settings(PAYMENTS_ENABLED=True, PAYSTACK_SECRET_KEY="", REFUND_CUTOFF_DAYS=7)
class RefundTests(TestCase):
    def setUp(self):
        self.chief = make_user("chief@t.co")

    def test_refund_cutoff(self):
        self.assertTrue(services.is_refund_eligible(make_trip(self.chief, days_out=10)))
        self.assertFalse(services.is_refund_eligible(make_trip(self.chief, days_out=3)))

    @patch("apps.payments.paystack.refund_transaction", return_value={})
    def test_refund_deducts_fee(self, _mock):
        trip = make_trip(self.chief)
        user = make_user("u@t.co")
        p = held_payment(trip, user, amount="100.00", fee="2.50")
        amount = services.refund_payment(p, notify=False)
        p.refresh_from_db()
        self.assertEqual(amount, Decimal("97.50"))           # amount − fee
        self.assertEqual(p.status, Payment.Status.REFUNDED)

    @patch("apps.payments.paystack.refund_transaction", return_value={})
    def test_leaving_eligible_refunds(self, _mock):
        trip = make_trip(self.chief, days_out=10)
        user = make_user("u@t.co")
        member(trip, user, TripMember.Status.APPROVED)
        p = held_payment(trip, user)
        services.handle_member_leaving(trip, user)
        p.refresh_from_db()
        self.assertEqual(p.status, Payment.Status.REFUNDED)

    @patch("apps.payments.paystack.refund_transaction", return_value={})
    def test_leaving_late_forfeits(self, _mock):
        trip = make_trip(self.chief, days_out=2)            # inside cutoff → no refund
        user = make_user("u@t.co")
        member(trip, user, TripMember.Status.APPROVED)
        p = held_payment(trip, user)
        services.handle_member_leaving(trip, user)
        p.refresh_from_db()
        self.assertEqual(p.status, Payment.Status.HELD)     # money stays for organizer


# ─── Phase 4: payouts ─────────────────────────────────────────────────────────

@override_settings(PAYMENTS_ENABLED=True, PLATFORM_COMMISSION_PERCENT=10, PARTIAL_RELEASE_PERCENT=50)
class PayoutTests(TestCase):
    def setUp(self):
        self.chief = make_user("chief@t.co")
        self.trip  = make_trip(self.chief)
        held_payment(self.trip, make_user("a@t.co"), amount="100.00")
        held_payment(self.trip, make_user("b@t.co"), amount="100.00")

    def test_partial_then_final(self):
        # held 200, commission 10% = 20, organizer share = 180
        partial = services.release_partial_payout(self.trip)
        self.assertEqual(partial.amount, Decimal("90.00"))    # 50% of 180
        self.assertEqual(partial.kind, Payout.Kind.PARTIAL)

        final = services.release_final_payout(self.trip)
        self.assertEqual(final.amount, Decimal("90.00"))      # 180 − 90
        self.assertEqual(
            Payment.objects.filter(trip=self.trip, status=Payment.Status.RELEASED).count(), 2
        )

    def test_partial_is_one_per_trip(self):
        services.release_partial_payout(self.trip)
        self.assertIsNone(services.release_partial_payout(self.trip))
        self.assertEqual(Payout.objects.filter(trip=self.trip, kind=Payout.Kind.PARTIAL).count(), 1)


@override_settings(PAYMENTS_ENABLED=True, PAYSTACK_SECRET_KEY="")
class CancelTripTests(TestCase):
    @patch("apps.payments.paystack.refund_transaction", return_value={})
    def test_cancel_refunds_and_sets_status(self, _mock):
        chief = make_user("chief@t.co")
        trip  = make_trip(chief)
        u = make_user("u@t.co")
        member(trip, u, TripMember.Status.APPROVED)
        p = held_payment(trip, u)
        services.cancel_trip(trip)
        trip.refresh_from_db(); p.refresh_from_db()
        self.assertEqual(trip.status, Trip.Status.CANCELLED)
        self.assertEqual(p.status, Payment.Status.REFUNDED)


# ─── Phase 2: approval → payment (API integration) ────────────────────────────

class ApproveFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.chief  = make_user("chief@t.co")
        self.trip   = make_trip(self.chief, entry_price="100.00")
        member(self.trip, self.chief, TripMember.Status.APPROVED, TripMember.Role.CHIEF)
        self.applicant = make_user("applicant@t.co")
        self.pending = member(self.trip, self.applicant, TripMember.Status.PENDING)
        self.url = f"/api/trips/{self.trip.id}/members/{self.applicant.id}/"

    @override_settings(PAYMENTS_ENABLED=True)
    def test_approve_parks_at_awaiting_payment(self):
        self.client.force_authenticate(self.chief)
        res = self.client.patch(self.url, {"action": "approve"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.pending.refresh_from_db()
        self.assertEqual(self.pending.status, TripMember.Status.AWAITING_PAYMENT)
        self.assertTrue(
            Payment.objects.filter(trip=self.trip, user=self.applicant,
                                   status=Payment.Status.PENDING).exists()
        )

    @override_settings(PAYMENTS_ENABLED=False)
    def test_approve_admits_directly_when_flag_off(self):
        self.client.force_authenticate(self.chief)
        res = self.client.patch(self.url, {"action": "approve"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.pending.refresh_from_db()
        self.assertEqual(self.pending.status, TripMember.Status.APPROVED)
        self.assertFalse(Payment.objects.filter(trip=self.trip, user=self.applicant).exists())
