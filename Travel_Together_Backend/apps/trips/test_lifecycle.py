"""
The three ways an organizer can walk away from a trip, and which one applies.

    delete   erase it — only while nobody else is involved
    cancel   call it off — refunds everyone, keeps the record
    end      it ran and is over — starts the clock on paying the organizer

The dangerous confusions these tests pin down:

  * deleting a trip people paid for (their money and their record vanish)
  * ending a trip that never departed (the organizer is paid for a trip that
    did not happen — the exact hole the departure evidence exists to close)
  * offering the organizer a button the API would refuse
"""

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.payments.models import Payment, Payout
from apps.payments.tests import make_user, make_trip, member, held_payment
from apps.trips.lifecycle import can_cancel, can_delete, can_end
from apps.trips.models import Trip, TripMember


@override_settings(PAYMENTS_ENABLED=True, PAYSTACK_SECRET_KEY="")
class TripExitTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.chief  = make_user("chief@t.co")
        self.trip   = make_trip(self.chief, entry_price="100.00", days_out=5)
        member(self.trip, self.chief, role=TripMember.Role.CHIEF)
        self.client.force_authenticate(self.chief)

    def _join(self, email="rider@t.co", pay=True, status=TripMember.Status.APPROVED):
        u = make_user(email)
        member(self.trip, u, status)
        if pay:
            held_payment(self.trip, u, amount="100.00")
        return u

    def _set_status(self, status):
        self.trip.status = status
        self.trip.save(update_fields=["status"])

    def _depart(self):
        self.trip.departure_confirmed_at = timezone.now()
        self.trip.status = Trip.Status.ACTIVE
        self.trip.save(update_fields=["departure_confirmed_at", "status"])

    def _finish_time(self):
        """Move the trip's dates into the past so its end time has arrived."""
        from datetime import date, time, timedelta
        self.trip.date_start = date.today() - timedelta(days=3)
        self.trip.date_end   = date.today() - timedelta(days=1)
        self.trip.end_time   = time(12, 0)
        self.trip.save(update_fields=["date_start", "date_end", "end_time"])

    # ── delete: only an empty trip ───────────────────────────────────────────

    def test_an_empty_trip_can_be_deleted(self):
        res = self.client.delete(f"/api/trips/{self.trip.id}/")
        self.assertEqual(res.status_code, 204)
        self.assertFalse(Trip.objects.filter(id=self.trip.id).exists())

    def test_a_trip_people_joined_cannot_be_deleted(self):
        self._join()
        res = self.client.delete(f"/api/trips/{self.trip.id}/")
        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.json()["action"], "cancel")
        self.assertTrue(Trip.objects.filter(id=self.trip.id).exists())

    def test_deleting_never_silently_refunds(self):
        # The old behaviour cancelled + refunded behind a button labelled
        # "Delete". Refusing is the point: cancelling is the organizer's call.
        rider = self._join()
        self.client.delete(f"/api/trips/{self.trip.id}/")
        payment = Payment.objects.get(trip=self.trip, user=rider)
        self.assertEqual(payment.status, Payment.Status.HELD)
        self.trip.refresh_from_db()
        self.assertEqual(self.trip.status, Trip.Status.PUBLISHED)

    def test_an_active_trip_cannot_be_deleted(self):
        self._set_status(Trip.Status.ACTIVE)
        res = self.client.delete(f"/api/trips/{self.trip.id}/")
        self.assertEqual(res.status_code, 400)
        self.assertTrue(Trip.objects.filter(id=self.trip.id).exists())

    def test_a_completed_trip_cannot_be_deleted(self):
        self._set_status(Trip.Status.COMPLETED)
        res = self.client.delete(f"/api/trips/{self.trip.id}/")
        self.assertEqual(res.status_code, 400)
        self.assertTrue(Trip.objects.filter(id=self.trip.id).exists())

    def test_money_held_blocks_deletion_even_with_no_members(self):
        # A membership row can be gone while the refund is still pending.
        ghost = make_user("ghost@t.co")
        held_payment(self.trip, ghost, amount="100.00")
        res = self.client.delete(f"/api/trips/{self.trip.id}/")
        self.assertEqual(res.status_code, 409)

    # ── cancel: the honest exit once people have joined ──────────────────────

    def test_cancelling_refunds_everyone_and_keeps_the_trip(self):
        rider = self._join()
        res = self.client.post(f"/api/trips/{self.trip.id}/cancel/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["refunds_started"], 1)

        self.trip.refresh_from_db()
        self.assertEqual(self.trip.status, Trip.Status.CANCELLED)
        self.assertTrue(Trip.objects.filter(id=self.trip.id).exists())

        payment = Payment.objects.get(trip=self.trip, user=rider)
        self.assertNotEqual(payment.status, Payment.Status.HELD)

    def test_an_active_trip_can_still_be_cancelled_before_departure(self):
        self._join()
        self._set_status(Trip.Status.ACTIVE)
        res = self.client.post(f"/api/trips/{self.trip.id}/cancel/")
        self.assertEqual(res.status_code, 200)
        self.trip.refresh_from_db()
        self.assertEqual(self.trip.status, Trip.Status.CANCELLED)

    def test_a_trip_cut_short_mid_way_is_cancelled_and_refunded(self):
        # Weather, illness, the group turns back. Without this the trip stays
        # ACTIVE (location sharing live) until the nightly sweep notices.
        rider = self._join()
        self._depart()
        res = self.client.post(f"/api/trips/{self.trip.id}/cancel/")
        self.assertEqual(res.status_code, 200)

        self.trip.refresh_from_db()
        self.assertEqual(self.trip.status, Trip.Status.CANCELLED)
        self.assertEqual(Payment.objects.get(trip=self.trip, user=rider).status,
                         Payment.Status.REFUNDED)

    def test_cancelling_twice_is_refused(self):
        self._join()
        self.client.post(f"/api/trips/{self.trip.id}/cancel/")
        res = self.client.post(f"/api/trips/{self.trip.id}/cancel/")
        self.assertEqual(res.status_code, 400)

    def test_only_the_chief_can_cancel(self):
        rider = self._join()
        self.client.force_authenticate(rider)
        res = self.client.post(f"/api/trips/{self.trip.id}/cancel/")
        self.assertEqual(res.status_code, 403)
        self.trip.refresh_from_db()
        self.assertEqual(self.trip.status, Trip.Status.PUBLISHED)

    # ── end: only for a trip that actually ran ───────────────────────────────

    def test_ending_a_trip_that_never_departed_is_refused(self):
        # Otherwise: take payments, never go, press End Trip, get paid in full.
        self._join()
        res = self.client.post(f"/api/trips/{self.trip.id}/end/")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["action"], "cancel")
        self.trip.refresh_from_db()
        self.assertNotEqual(self.trip.status, Trip.Status.COMPLETED)
        self.assertIsNone(self.trip.ended_at)

    def test_a_departed_trip_can_be_ended_once_its_end_time_arrives(self):
        self._join()
        self._depart()
        self._finish_time()
        res = self.client.post(f"/api/trips/{self.trip.id}/end/")
        self.assertEqual(res.status_code, 200)
        self.trip.refresh_from_db()
        self.assertEqual(self.trip.status, Trip.Status.COMPLETED)

    def test_a_trip_still_under_way_cannot_be_ended(self):
        # "Completed" must not be claimable while the group is still out there.
        self._join()
        self._depart()
        res = self.client.post(f"/api/trips/{self.trip.id}/end/")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["action"], "cancel")
        self.assertIn("ends_at", res.json())
        self.trip.refresh_from_db()
        self.assertNotEqual(self.trip.status, Trip.Status.COMPLETED)

    def test_a_trip_nobody_joined_can_still_be_ended(self):
        # Nothing is at stake, so there is no reason to trap the organizer.
        res = self.client.post(f"/api/trips/{self.trip.id}/end/")
        self.assertEqual(res.status_code, 200)

    def test_ending_by_hand_still_flags_thin_check_in_evidence(self):
        # The nightly sweep flags these; the button must not be a way around it.
        from apps.trips.models import ItineraryStop
        for i in range(5):
            self._join(f"r{i}@t.co")
        ItineraryStop.objects.create(trip=self.trip, order=0, name="Meet", is_system=True)
        self._depart()
        self._finish_time()

        self.client.post(f"/api/trips/{self.trip.id}/end/")
        self.trip.refresh_from_db()
        self.assertTrue(self.trip.flagged_for_review)
        self.assertIn("check-in", self.trip.flag_reason.lower())

    def test_a_cancelled_trip_never_pays_the_organizer(self):
        self._join()
        self.client.post(f"/api/trips/{self.trip.id}/cancel/")
        self.assertFalse(
            Payout.objects.filter(trip=self.trip, status=Payout.Status.PAID).exists()
        )

    # ── what the UI is told matches what the API will do ─────────────────────

    def test_offered_actions_match_the_api_for_an_empty_trip(self):
        self.assertTrue(can_delete(self.trip))
        self.assertTrue(can_cancel(self.trip))
        self.assertTrue(can_end(self.trip))

    def test_offered_actions_match_the_api_once_someone_joins(self):
        self._join()
        self.assertFalse(can_delete(self.trip))   # 409
        self.assertTrue(can_cancel(self.trip))    # 200
        self.assertFalse(can_end(self.trip))      # 400, never departed

    def test_offered_actions_match_the_api_while_under_way(self):
        self._join()
        self._depart()
        self.assertFalse(can_delete(self.trip))
        self.assertTrue(can_cancel(self.trip))    # the abandon-the-trip exit
        self.assertFalse(can_end(self.trip))      # not over yet

    def test_offered_actions_match_the_api_once_the_trip_is_over(self):
        self._join()
        self._depart()
        self._finish_time()
        self.assertFalse(can_delete(self.trip))
        self.assertTrue(can_cancel(self.trip))
        self.assertTrue(can_end(self.trip))

    def test_a_completed_trip_offers_no_exit_at_all(self):
        self._set_status(Trip.Status.COMPLETED)
        self.assertFalse(can_delete(self.trip))
        self.assertFalse(can_cancel(self.trip))
        self.assertFalse(can_end(self.trip))

    def test_the_trip_list_tells_the_organizer_which_actions_exist(self):
        self._join()
        row = next(t for t in self.client.get("/api/trips/").json()
                   if t["id"] == str(self.trip.id))
        self.assertEqual(row["my_actions"]["delete"], False)
        self.assertEqual(row["my_actions"]["cancel"], True)
        self.assertEqual(row["my_actions"]["end"],    False)

    def test_other_people_are_told_nothing_about_organizer_actions(self):
        rider = self._join()
        self.client.force_authenticate(rider)
        row = next(t for t in self.client.get("/api/trips/").json()
                   if t["id"] == str(self.trip.id))
        self.assertIsNone(row["my_actions"])


@override_settings(
    PAYMENTS_ENABLED=True, PAYSTACK_SECRET_KEY="",
    LATE_CANCEL_WINDOW_HOURS=48,
    ORGANIZER_CANCEL_KARMA_PENALTY=25,
    ORGANIZER_LATE_CANCEL_KARMA_PENALTY=60,
    LATE_CANCEL_PAYOUT_PROBATION_DAYS=30,
)
class LateCancellationTests(TestCase):
    """
    Cancelling weeks out and cancelling the night before are not the same act.

    Karma is displayed but gates nothing, so on its own it is not a deterrent —
    the cost that actually bites is payout probation: no early payouts for a
    window afterwards, on any trip.
    """

    def setUp(self):
        self.client = APIClient()
        self.chief  = make_user("chief@t.co")
        self.chief.is_verified_traveller = True     # normally eligible for a partial
        # award_karma floors totals at 0, so an organizer starting from nothing
        # shows no visible loss. Start with a balance so the deduction is real —
        # and see test_the_penalty_is_recorded_even_when_the_total_floors.
        self.chief.travel_karma = 200
        self.chief.save()
        self.client.force_authenticate(self.chief)

    def _trip(self, days_out):
        trip = make_trip(self.chief, entry_price="100.00", days_out=days_out)
        member(trip, self.chief, role=TripMember.Role.CHIEF)
        rider = make_user(f"rider{days_out}@t.co")
        member(trip, rider, TripMember.Status.APPROVED)
        held_payment(trip, rider, amount="100.00")
        return trip

    def _cancel(self, trip):
        return self.client.post(f"/api/trips/{trip.id}/cancel/")

    def test_cancelling_well_ahead_is_the_ordinary_penalty(self):
        res = self._cancel(self._trip(days_out=10))
        self.assertFalse(res.json()["late"])

        self.chief.refresh_from_db()
        self.assertEqual(self.chief.travel_karma, 175)
        self.assertIsNone(self.chief.payout_probation_until)

    def test_cancelling_inside_the_window_costs_more(self):
        res = self._cancel(self._trip(days_out=1))       # under 48h
        self.assertTrue(res.json()["late"])

        self.chief.refresh_from_db()
        self.assertEqual(self.chief.travel_karma, 140)
        self.assertIsNotNone(self.chief.payout_probation_until)

    def test_abandoning_a_departed_trip_always_counts_as_late(self):
        trip = self._trip(days_out=10)                   # far out by date
        trip.departure_confirmed_at = timezone.now()     # but already under way
        trip.save(update_fields=["departure_confirmed_at"])

        self.assertTrue(self._cancel(trip).json()["late"])
        self.chief.refresh_from_db()
        self.assertEqual(self.chief.travel_karma, 140)

    def test_probation_actually_blocks_the_early_payout(self):
        from apps.payments.services import _organizer_is_established
        self.assertTrue(_organizer_is_established(self.chief))   # before

        self._cancel(self._trip(days_out=1))
        self.chief.refresh_from_db()
        self.assertFalse(_organizer_is_established(self.chief))  # after

    def test_probation_lifts_when_it_expires(self):
        from datetime import timedelta
        from apps.payments.services import _organizer_is_established

        self._cancel(self._trip(days_out=1))
        self.chief.refresh_from_db()
        self.chief.payout_probation_until = timezone.now() - timedelta(days=1)
        self.chief.save(update_fields=["payout_probation_until"])
        self.assertTrue(_organizer_is_established(self.chief))

    def test_a_second_late_cancellation_extends_probation(self):
        self._cancel(self._trip(days_out=1))
        self.chief.refresh_from_db()
        first = self.chief.payout_probation_until

        self._cancel(self._trip(days_out=2))
        self.chief.refresh_from_db()
        self.assertGreater(self.chief.payout_probation_until, first)

    def test_an_early_cancellation_never_shortens_an_active_probation(self):
        self._cancel(self._trip(days_out=1))
        self.chief.refresh_from_db()
        probation = self.chief.payout_probation_until

        self._cancel(self._trip(days_out=30))            # ordinary cancellation
        self.chief.refresh_from_db()
        self.assertEqual(self.chief.payout_probation_until, probation)

    def test_the_organizer_is_warned_before_they_confirm(self):
        trip = self._trip(days_out=1)
        row  = next(t for t in self.client.get("/api/trips/").json()
                    if t["id"] == str(trip.id))
        self.assertTrue(row["my_actions"]["cancel_late"])

    def test_no_late_warning_when_the_trip_is_still_far_off(self):
        trip = self._trip(days_out=10)
        row  = next(t for t in self.client.get("/api/trips/").json()
                    if t["id"] == str(trip.id))
        self.assertFalse(row["my_actions"]["cancel_late"])

    def test_the_penalty_is_recorded_even_when_the_total_floors(self):
        # Karma totals never go below zero, so a brand-new organizer loses no
        # visible points. The ledger still records what happened, and payout
        # probation still applies — which is the part that actually costs them.
        from apps.karma.models import KarmaLog

        broke = make_user("broke@t.co")
        trip  = make_trip(broke, entry_price="100.00", days_out=1)
        member(trip, broke, role=TripMember.Role.CHIEF)
        rider = make_user("rider-b@t.co")
        member(trip, rider, TripMember.Status.APPROVED)
        held_payment(trip, rider, amount="100.00")

        self.client.force_authenticate(broke)
        self.client.post(f"/api/trips/{trip.id}/cancel/")

        broke.refresh_from_db()
        self.assertEqual(broke.travel_karma, 0)                  # floored
        self.assertEqual(KarmaLog.objects.get(user=broke, trip=trip).delta, -60)
        self.assertIsNotNone(broke.payout_probation_until)       # the real cost
