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


def depart_with_evidence(trip, payers, hours_ago=7, checked_in=None):
    """
    Make `trip` look like a real departure so payout logic can be tested on it.

    A partial payout now depends on the trip having actually departed with
    meeting-point check-ins behind it (see apps.trips.checkin_stats), so a
    fixture that only creates held Payments no longer reaches the payout code
    at all. This supplies the missing half: approved memberships, a meeting
    stop, check-ins, and a departure timestamp.

    `checked_in` defaults to everyone, giving "strong" evidence and the short
    hold — pass a smaller number to exercise the thinner tiers.
    """
    from datetime import timedelta
    from django.contrib.gis.geos import Point
    from django.utils import timezone
    from apps.trips.models import CheckIn, ItineraryStop

    stop = (trip.itinerary.filter(is_system=True).first()
            or ItineraryStop.objects.create(trip=trip, order=0, name="Meet", is_system=True))

    if checked_in is None:
        checked_in = len(payers)

    for i, user in enumerate(payers):
        TripMember.objects.get_or_create(
            trip=trip, user=user,
            defaults={"status": TripMember.Status.APPROVED, "role": TripMember.Role.MEMBER},
        )
        if i < checked_in:
            CheckIn.objects.get_or_create(
                trip=trip, member=user, stop=stop,
                defaults={"location_at_checkin": Point(0, 0, srid=4326)},
            )

    trip.departure_confirmed_at = timezone.now() - timedelta(hours=hours_ago)
    trip.save(update_fields=["departure_confirmed_at"])
    return trip


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

    def test_confirm_notifies_organizer(self):
        from apps.notifications.models import Notification
        services.confirm_payment(self.payment)
        self.assertTrue(
            Notification.objects.filter(recipient=self.chief, notification_type="payment_received").exists()
        )


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
        self.chief.is_verified_traveller = True   # established → eligible for partial release
        self.chief.save()
        self.trip  = make_trip(self.chief)
        a, b = make_user("a@t.co"), make_user("b@t.co")
        held_payment(self.trip, a, amount="100.00")
        held_payment(self.trip, b, amount="100.00")
        depart_with_evidence(self.trip, [a, b])

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


@override_settings(PAYMENTS_ENABLED=True, PARTIAL_RELEASE_MIN_COMPLETED_TRIPS=2)
class PayoutGuardTests(TestCase):
    """Anti-collusion: new/unverified organizers get no partial; open reports freeze payouts."""

    def setUp(self):
        self.chief = make_user("chief@t.co")
        self.trip  = make_trip(self.chief)
        a = make_user("a@t.co")
        held_payment(self.trip, a, amount="100.00")
        # Full check-in evidence, so each test below fails for the reason it
        # names rather than for want of a departure.
        depart_with_evidence(self.trip, [a])

    def test_new_organizer_gets_no_partial(self):
        # 0 completed trips, unverified → no partial release
        self.assertIsNone(services.release_partial_payout(self.trip))

    def test_verified_organizer_gets_partial(self):
        self.chief.is_verified_traveller = True
        self.chief.save()
        self.assertIsNotNone(services.release_partial_payout(self.trip))

    def test_open_report_freezes_payouts(self):
        from apps.trips.models import IncidentReport
        self.chief.is_verified_traveller = True   # established, so only the report can block it
        self.chief.save()
        IncidentReport.objects.create(
            trip=self.trip, reporter=make_user("victim@t.co"),
            incident_type="fraud", description="x" * 50,
        )
        self.assertIsNone(services.release_partial_payout(self.trip))
        self.assertIsNone(services.release_final_payout(self.trip))

    def test_anomaly_flag_freezes_payouts(self):
        self.chief.is_verified_traveller = True
        self.chief.save()
        self.trip.flagged_for_review = True
        self.trip.save()
        self.assertIsNone(services.release_partial_payout(self.trip))
        self.assertIsNone(services.release_final_payout(self.trip))


@override_settings(PAYMENTS_ENABLED=True, PAYSTACK_SECRET_KEY="",
                   PLATFORM_COMMISSION_PERCENT=10, PARTIAL_RELEASE_PERCENT=50)
class ClawbackTests(TestCase):
    """Released payouts on an upheld-fraud trip become a debt recovered from future payouts."""

    @patch("apps.payments.paystack.refund_transaction", return_value={})
    def test_cancel_records_clawback(self, _mock):
        chief = make_user("chief@t.co")
        trip  = make_trip(chief)
        Payout.objects.create(trip=trip, organizer=chief, amount=Decimal("90.00"),
                              kind=Payout.Kind.PARTIAL, status=Payout.Status.PAID)
        services.cancel_trip(trip, by_organizer=True)
        chief.refresh_from_db()
        self.assertEqual(chief.clawback_owed, Decimal("90.00"))

    def test_future_payout_deducts_clawback(self):
        chief = make_user("chief@t.co")
        chief.is_verified_traveller = True
        chief.clawback_owed = Decimal("50.00")
        chief.save()
        trip = make_trip(chief)
        a = make_user("a@t.co")
        held_payment(trip, a, amount="200.00")                     # share 180, partial 90
        depart_with_evidence(trip, [a])
        payout = services.release_partial_payout(trip)
        self.assertEqual(payout.amount, Decimal("40.00"))          # 90 − 50 clawback
        chief.refresh_from_db()
        self.assertEqual(chief.clawback_owed, Decimal("0.00"))


@override_settings(PAYMENTS_ENABLED=True, DEPARTURE_GRACE_HOURS=6)
class PartialSweepTests(TestCase):
    """Partial releases via the sweep only after the departure grace window."""

    def setUp(self):
        from datetime import timedelta
        from django.utils import timezone
        self.chief = make_user("chief@t.co")
        self.chief.is_verified_traveller = True
        self.chief.save()
        self.trip = make_trip(self.chief)
        self.now = timezone.now
        self.timedelta = timedelta
        self.rider = make_user("a@t.co")
        held_payment(self.trip, self.rider, amount="100.00")

    def _depart(self, hours_ago):
        # Full check-in evidence → the short DEPARTURE_GRACE_HOURS hold, which
        # is what this class is about.
        depart_with_evidence(self.trip, [self.rider], hours_ago=hours_ago)

    def test_partial_held_within_grace(self):
        from apps.payments.tasks import release_due_partials
        self._depart(hours_ago=1)             # still inside the 6h window
        release_due_partials()
        self.assertFalse(Payout.objects.filter(trip=self.trip, kind=Payout.Kind.PARTIAL).exists())

    def test_partial_releases_after_grace(self):
        from apps.payments.tasks import release_due_partials
        self._depart(hours_ago=7)             # past the 6h window
        release_due_partials()
        self.assertTrue(Payout.objects.filter(trip=self.trip, kind=Payout.Kind.PARTIAL).exists())


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


# ─── Organizer removing a member must refund them ────────────────────────────

@override_settings(PAYMENTS_ENABLED=True, PAYSTACK_SECRET_KEY="")
class RemovedMemberRefundTests(TestCase):
    """
    An organizer must not be able to approve a member, take their money, remove
    them, and keep the funds at payout. Removal is not the member's choice, so
    the voluntary-departure forfeit cutoff must not apply.
    """

    def setUp(self):
        self.client    = APIClient()
        self.chief     = make_user("chief@t.co")
        self.applicant = make_user("applicant@t.co")

    def _remove(self, trip):
        self.client.force_authenticate(self.chief)
        return self.client.delete(f"/api/trips/{trip.id}/members/{self.applicant.id}/")

    @patch("apps.payments.paystack.refund_transaction", return_value={})
    def test_removal_refunds_held_payment_inside_cutoff(self, _mock):
        trip = make_trip(self.chief, days_out=30)
        member(trip, self.chief, role=TripMember.Role.CHIEF)
        member(trip, self.applicant, TripMember.Status.APPROVED)
        p = held_payment(trip, self.applicant)

        res = self._remove(trip)
        self.assertEqual(res.status_code, 200)
        p.refresh_from_db()
        self.assertEqual(p.status, Payment.Status.REFUNDED)

    @patch("apps.payments.paystack.refund_transaction", return_value={})
    def test_removal_refunds_even_past_the_forfeit_cutoff(self, _mock):
        # 1 day out: a member who LEFT here would forfeit. A removed member
        # must still be refunded this is the theft path being closed.
        trip = make_trip(self.chief, days_out=1)
        member(trip, self.chief, role=TripMember.Role.CHIEF)
        member(trip, self.applicant, TripMember.Status.APPROVED)
        p = held_payment(trip, self.applicant)

        self.assertFalse(services.is_refund_eligible(trip))   # voluntary leave = forfeit
        self._remove(trip)
        p.refresh_from_db()
        self.assertEqual(p.status, Payment.Status.REFUNDED)

    @patch("apps.payments.paystack.refund_transaction", return_value={})
    def test_removed_member_money_does_not_reach_the_organizer(self, _mock):
        trip = make_trip(self.chief, days_out=1)
        member(trip, self.chief, role=TripMember.Role.CHIEF)
        member(trip, self.applicant, TripMember.Status.APPROVED)
        held_payment(trip, self.applicant)

        self._remove(trip)
        # Nothing is left in escrow, so the organizer's share is zero.
        _, _, organizer_total = services._organizer_share(trip)
        self.assertEqual(organizer_total, Decimal("0"))

    def test_removal_fails_out_an_unpaid_pending_payment(self):
        trip = make_trip(self.chief, days_out=30)
        member(trip, self.chief, role=TripMember.Role.CHIEF)
        member(trip, self.applicant, TripMember.Status.AWAITING_PAYMENT)
        p = Payment.objects.create(trip=trip, user=self.applicant,
                                   amount=Decimal("100.00"),
                                   status=Payment.Status.PENDING)

        self._remove(trip)
        p.refresh_from_db()
        self.assertEqual(p.status, Payment.Status.FAILED)

    @patch("apps.payments.paystack.refund_transaction", return_value={})
    def test_member_is_still_marked_removed(self, _mock):
        trip = make_trip(self.chief, days_out=30)
        member(trip, self.chief, role=TripMember.Role.CHIEF)
        m = member(trip, self.applicant, TripMember.Status.APPROVED)
        held_payment(trip, self.applicant)

        self._remove(trip)
        m.refresh_from_db()
        self.assertEqual(m.status, TripMember.Status.REMOVED)
        self.assertIsNotNone(m.removed_at)


# ─── Approval is not idempotent, so it must not be repeatable ────────────────

class DoubleApprovalTests(TestCase):
    """
    Approving admits to the group chat and, on a paid trip, opens a Payment row.
    Re-approving would bill the member a second time, so it must be refused.
    """

    def setUp(self):
        self.client    = APIClient()
        self.chief     = make_user("chief@t.co")
        self.trip      = make_trip(self.chief, entry_price="100.00")
        member(self.trip, self.chief, role=TripMember.Role.CHIEF)
        self.applicant = make_user("applicant@t.co")
        self.pending   = member(self.trip, self.applicant, TripMember.Status.PENDING)
        self.url       = f"/api/trips/{self.trip.id}/members/{self.applicant.id}/"
        self.client.force_authenticate(self.chief)

    def _approve(self):
        return self.client.patch(self.url, {"action": "approve"}, format="json")

    @override_settings(PAYMENTS_ENABLED=True)
    def test_second_approval_does_not_create_a_second_payment(self):
        self.assertEqual(self._approve().status_code, 200)
        res = self._approve()

        self.assertEqual(res.status_code, 400)
        self.assertEqual(
            Payment.objects.filter(trip=self.trip, user=self.applicant).count(), 1,
        )

    @override_settings(PAYMENTS_ENABLED=False)
    def test_cannot_re_approve_an_approved_member(self):
        self.assertEqual(self._approve().status_code, 200)
        res = self._approve()
        self.assertEqual(res.status_code, 400)
        self.assertIn("already approved", res.json()["detail"])

    @override_settings(PAYMENTS_ENABLED=False)
    def test_cannot_approve_a_removed_member(self):
        self.pending.status = TripMember.Status.REMOVED
        self.pending.save()

        res = self._approve()
        self.assertEqual(res.status_code, 400)
        self.pending.refresh_from_db()
        self.assertEqual(self.pending.status, TripMember.Status.REMOVED)

    @override_settings(PAYMENTS_ENABLED=False)
    def test_rejected_applicant_can_still_be_approved(self):
        self.pending.status = TripMember.Status.REJECTED
        self.pending.save()

        self.assertEqual(self._approve().status_code, 200)
        self.pending.refresh_from_db()
        self.assertEqual(self.pending.status, TripMember.Status.APPROVED)


# ─── Clawback must only chase money that actually moved ──────────────────────

@override_settings(PAYMENTS_ENABLED=True, PAYSTACK_SECRET_KEY="")
class ClawbackTests(TestCase):
    def setUp(self):
        self.chief = make_user("chief@t.co")
        self.trip  = make_trip(self.chief)
        member(self.trip, self.chief, role=TripMember.Role.CHIEF)

    def _payout(self, status, amount="50.00"):
        return Payout.objects.create(
            trip=self.trip, organizer=self.chief,
            amount=Decimal(amount), kind=Payout.Kind.PARTIAL, status=status,
        )

    def test_pending_payout_creates_no_debt(self):
        # PENDING = recorded but never sent (no payout method / no keys). The
        # organizer never received it, so it must not become a debt.
        self._payout(Payout.Status.PENDING)
        services.cancel_trip(self.trip, by_organizer=True)

        self.chief.refresh_from_db()
        self.assertEqual(self.chief.clawback_owed or Decimal("0"), Decimal("0"))

    def test_pending_payout_is_cancelled_not_left_payable(self):
        po = self._payout(Payout.Status.PENDING)
        services.cancel_trip(self.trip, by_organizer=True)

        po.refresh_from_db()
        self.assertEqual(po.status, Payout.Status.FAILED)

    def test_paid_and_processing_payouts_do_create_debt(self):
        self._payout(Payout.Status.PAID,       "40.00")
        self._payout(Payout.Status.PROCESSING, "25.00")
        services.cancel_trip(self.trip, by_organizer=True)

        self.chief.refresh_from_db()
        self.assertEqual(self.chief.clawback_owed, Decimal("65.00"))

    def test_failed_payout_creates_no_debt(self):
        self._payout(Payout.Status.FAILED)
        services.cancel_trip(self.trip, by_organizer=True)

        self.chief.refresh_from_db()
        self.assertEqual(self.chief.clawback_owed or Decimal("0"), Decimal("0"))


# ─── confirm_payment is called twice by design (webhook + verify) ────────────

@override_settings(PAYMENTS_ENABLED=True)
class ConfirmPaymentIdempotencyTests(TestCase):
    def setUp(self):
        self.chief     = make_user("chief@t.co")
        self.trip      = make_trip(self.chief)
        member(self.trip, self.chief, role=TripMember.Role.CHIEF)
        self.applicant = make_user("applicant@t.co")
        self.member    = member(self.trip, self.applicant,
                                TripMember.Status.AWAITING_PAYMENT)
        self.payment   = Payment.objects.create(
            trip=self.trip, user=self.applicant, amount=Decimal("100.00"),
            status=Payment.Status.PENDING, paystack_ref="tt_ref",
        )

    def test_second_confirmation_admits_only_once(self):
        from apps.notifications.models import Notification

        services.confirm_payment(self.payment, paid_amount=Decimal("100.00"))
        services.confirm_payment(self.payment, paid_amount=Decimal("100.00"))

        self.member.refresh_from_db()
        self.assertEqual(self.member.status, TripMember.Status.APPROVED)
        self.assertEqual(
            Notification.objects.filter(recipient=self.chief,
                                        notification_type="payment_received").count(),
            1,
        )

    def test_stale_in_memory_object_cannot_reconfirm(self):
        # The webhook and the verify view each hold their own instance. One
        # commits; the other's copy still says PENDING. Re-reading under the row
        # lock is what stops the second one going through again.
        stale = Payment.objects.get(pk=self.payment.pk)
        services.confirm_payment(self.payment, paid_amount=Decimal("100.00"))

        self.assertEqual(stale.status, Payment.Status.PENDING)   # stale copy
        result = services.confirm_payment(stale, paid_amount=Decimal("100.00"))
        self.assertEqual(result.status, Payment.Status.HELD)

        from apps.notifications.models import Notification
        self.assertEqual(
            Notification.objects.filter(recipient=self.chief,
                                        notification_type="payment_received").count(),
            1,
        )


# ─── Configured settings must actually be the ones used ─────────────────────

class SettingsAreHonouredTests(TestCase):
    """
    These read settings.X directly rather than getattr(settings, "X", <default>).
    A stale in-code fallback silently diverging from settings.py is the bug this
    guards against (commission was 10 in code vs 5 in settings).
    """

    @override_settings(PLATFORM_COMMISSION_PERCENT=20)
    def test_commission_percent_comes_from_settings(self):
        chief = make_user("chief@t.co")
        trip  = make_trip(chief)
        member(trip, chief, role=TripMember.Role.CHIEF)
        held_payment(trip, make_user("a@t.co"), amount="100.00")

        held, commission, organizer_total = services._organizer_share(trip)
        self.assertEqual(held, Decimal("100.00"))
        self.assertEqual(commission, Decimal("20.00"))
        self.assertEqual(organizer_total, Decimal("80.00"))
