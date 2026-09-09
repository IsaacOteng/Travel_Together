"""
Check-in evidence sets payout SPEED, not whether a trip may depart.

Departure is never blocked by the check-in rate — a trip whose members went
quiet (flat battery, no signal, or simply not knowing to tap the button) still
runs. What the rate decides is how long the organizer's partial payout is held,
so thin evidence means the money moves more cautiously rather than the trip
being stuck.
"""

from datetime import timedelta
from decimal import Decimal

from django.contrib.gis.geos import Point
from django.test import TestCase, override_settings
from django.utils import timezone

from apps.payments import services
from apps.payments.models import Payout
from apps.payments.tasks import release_due_partials
from apps.trips.checkin_stats import (
    meeting_point_stats, evidence_tier, partial_hold_hours,
)
from apps.trips.models import CheckIn, ItineraryStop, TripMember
from apps.payments.tests import make_user, make_trip, member, held_payment


@override_settings(PAYMENTS_ENABLED=True, PAYSTACK_SECRET_KEY="")
class EvidenceTierTests(TestCase):

    def setUp(self):
        self.chief = make_user("chief@t.co")
        self.chief.is_verified_traveller = True        # eligible for a partial
        self.chief.save()
        self.trip = make_trip(self.chief, entry_price="100.00", days_out=0, spots=40)
        member(self.trip, self.chief, role=TripMember.Role.CHIEF)
        self.stop = ItineraryStop.objects.create(
            trip=self.trip, order=0, name="Meet", is_system=True,
        )
        self.riders = []

    def _riders(self, total, checked_in):
        for i in range(total):
            u = make_user(f"r{i}@t.co")
            member(self.trip, u, TripMember.Status.APPROVED)
            held_payment(self.trip, u, amount="100.00")
            if i < checked_in:
                self._check_in(u)
            self.riders.append(u)

    def _check_in(self, user):
        CheckIn.objects.create(trip=self.trip, member=user, stop=self.stop,
                               location_at_checkin=Point(0, 0, srid=4326))

    def _depart(self, hours_ago=0):
        self.trip.departure_confirmed_at = timezone.now() - timedelta(hours=hours_ago)
        self.trip.save(update_fields=["departure_confirmed_at"])

    def _paid(self):
        return Payout.objects.filter(trip=self.trip, kind=Payout.Kind.PARTIAL).exists()

    # ── tier boundaries ──────────────────────────────────────────────────────

    def test_strong_evidence_uses_the_short_hold(self):
        self._riders(total=10, checked_in=8)               # 80%
        _, _, pct = meeting_point_stats(self.trip)
        self.assertEqual(pct, 80)
        self.assertEqual(evidence_tier(pct), "strong")
        self.assertEqual(partial_hold_hours(pct), 6)

    def test_exactly_the_threshold_counts_as_strong(self):
        self._riders(total=10, checked_in=7)               # exactly 70%
        _, _, pct = meeting_point_stats(self.trip)
        self.assertEqual(pct, 70)
        self.assertEqual(evidence_tier(pct), "strong")

    def test_weak_evidence_uses_the_long_hold(self):
        self._riders(total=20, checked_in=10)              # 50% — the reported case
        _, _, pct = meeting_point_stats(self.trip)
        self.assertEqual(evidence_tier(pct), "weak")
        self.assertEqual(partial_hold_hours(pct), 48)

    def test_below_the_anomaly_floor_gets_no_partial_at_all(self):
        self._riders(total=20, checked_in=1)               # 5%
        _, _, pct = meeting_point_stats(self.trip)
        self.assertEqual(evidence_tier(pct), "insufficient")
        self.assertIsNone(partial_hold_hours(pct))

    def test_organizers_own_checkin_never_counts(self):
        self._riders(total=4, checked_in=0)
        self._check_in(self.chief)
        self.assertEqual(meeting_point_stats(self.trip), (0, 4, 0))

    # ── the sweep honours the tier ───────────────────────────────────────────

    def test_weak_trip_is_not_paid_on_the_short_hold(self):
        self._riders(total=20, checked_in=10)
        self._depart(hours_ago=10)                         # past 6h, short of 48h
        release_due_partials()
        self.assertFalse(self._paid())

    def test_weak_trip_is_paid_once_the_long_hold_passes(self):
        self._riders(total=20, checked_in=10)
        self._depart(hours_ago=49)
        release_due_partials()
        self.assertTrue(self._paid())

    def test_strong_trip_is_paid_on_the_short_hold(self):
        self._riders(total=10, checked_in=8)
        self._depart(hours_ago=7)
        release_due_partials()
        self.assertTrue(self._paid())

    def test_insufficient_trip_is_never_paid_early(self):
        self._riders(total=20, checked_in=1)
        self._depart(hours_ago=500)
        release_due_partials()
        self.assertFalse(self._paid())

    def test_late_checkins_shorten_the_wait(self):
        # A trip that looked thin at departure moves to the short hold as
        # stragglers check in: the rate is recomputed, not frozen at departure.
        self._riders(total=10, checked_in=5)               # 50% → weak
        self._depart(hours_ago=7)
        release_due_partials()
        self.assertFalse(self._paid())

        for u in self.riders[5:8]:                         # now 80% → strong
            self._check_in(u)
        release_due_partials()
        self.assertTrue(self._paid())

    # ── every other guard still applies on top of the tier ───────────────────

    def test_a_flagged_trip_is_still_frozen(self):
        self._riders(total=10, checked_in=9)
        self._depart(hours_ago=7)
        self.trip.flagged_for_review = True
        self.trip.save(update_fields=["flagged_for_review"])
        release_due_partials()
        self.assertFalse(self._paid())

    def test_an_open_report_still_freezes(self):
        from apps.trips.models import IncidentReport
        self._riders(total=10, checked_in=9)
        self._depart(hours_ago=7)
        IncidentReport.objects.create(
            trip=self.trip, reporter=self.riders[0], reported_user=self.chief,
            description="never showed up", status=IncidentReport.ReportStatus.PENDING,
        )
        release_due_partials()
        self.assertFalse(self._paid())

    def test_unestablished_organizer_still_gets_no_partial(self):
        self.chief.is_verified_traveller = False
        self.chief.save()
        self._riders(total=10, checked_in=10)              # perfect evidence
        self._depart(hours_ago=7)
        release_due_partials()
        self.assertFalse(self._paid())

    def test_only_one_partial_per_trip(self):
        self._riders(total=10, checked_in=9)
        self._depart(hours_ago=7)
        release_due_partials()
        release_due_partials()
        self.assertEqual(Payout.objects.filter(trip=self.trip, kind=Payout.Kind.PARTIAL).count(), 1)

    def test_direct_call_cannot_bypass_the_hold(self):
        # Any caller — an admin action, a retry, a future code path — must get
        # the same answer as the scheduler.
        self._riders(total=20, checked_in=10)
        self._depart(hours_ago=1)
        self.assertIsNone(services.release_partial_payout(self.trip))

    def test_a_trip_that_never_departed_has_no_due_date(self):
        self._riders(total=10, checked_in=10)
        self.assertIsNone(services.partial_release_due_at(self.trip))

    # ── nothing is confiscated, only delayed ─────────────────────────────────

    def test_money_still_reaches_the_organizer_at_completion(self):
        self._riders(total=20, checked_in=1)               # insufficient
        # Capture the share BEFORE releasing: the final payout flips every held
        # payment to RELEASED, after which _organizer_share reads zero.
        expected = services._organizer_share(self.trip)[2]

        self._depart(hours_ago=500)
        release_due_partials()
        self.assertFalse(self._paid())

        services.release_final_payout(self.trip)
        total = sum((p.amount for p in Payout.objects.filter(trip=self.trip)), Decimal("0"))
        self.assertEqual(total, expected)

    def test_partial_plus_final_equals_the_full_share(self):
        self._riders(total=10, checked_in=9)               # strong
        expected = services._organizer_share(self.trip)[2]

        self._depart(hours_ago=7)
        release_due_partials()
        self.assertTrue(self._paid())

        services.release_final_payout(self.trip)
        total = sum((p.amount for p in Payout.objects.filter(trip=self.trip)), Decimal("0"))
        self.assertEqual(total, expected)


@override_settings(PAYMENTS_ENABLED=True, PAYSTACK_SECRET_KEY="")
class EvidenceIsVisibleTests(TestCase):
    """
    A dispute over "did this trip happen?" is settled with the check-in
    evidence, so it has to be reachable — not buried in the database.
    """

    def setUp(self):
        from rest_framework.test import APIClient
        self.client = APIClient()
        self.chief  = make_user("chief@t.co")
        self.trip   = make_trip(self.chief, days_out=0, spots=10)
        member(self.trip, self.chief, role=TripMember.Role.CHIEF)
        self.stop   = ItineraryStop.objects.create(
            trip=self.trip, order=0, name="Meet", is_system=True,
        )
        self.rider = make_user("rider@t.co")
        member(self.trip, self.rider, TripMember.Status.APPROVED)
        CheckIn.objects.create(trip=self.trip, member=self.rider, stop=self.stop,
                               location_at_checkin=Point(0, 0, srid=4326))

    def test_departure_records_the_evidence_snapshot(self):
        self.client.force_authenticate(self.chief)
        res = self.client.post(f"/api/trips/{self.trip.id}/depart/")
        self.assertEqual(res.status_code, 200)

        self.trip.refresh_from_db()
        self.assertEqual(self.trip.departure_checkin_percent, 100)
        self.assertEqual(res.json()["evidence"], "strong")
        self.assertEqual(res.json()["checkin_percent"], 100)

    def test_trip_detail_exposes_the_snapshot(self):
        self.client.force_authenticate(self.chief)
        self.client.post(f"/api/trips/{self.trip.id}/depart/")
        body = self.client.get(f"/api/trips/{self.trip.id}/").json()
        self.assertEqual(body["departure_checkin_percent"], 100)

    def test_admin_sees_both_the_snapshot_and_the_live_rate(self):
        self.client.force_authenticate(self.chief)
        self.client.post(f"/api/trips/{self.trip.id}/depart/")

        admin = make_user("admin@t.co")
        admin.is_staff = True
        admin.save()
        self.client.force_authenticate(admin)

        row = next(t for t in self.client.get("/api/admin-dashboard/trips/").json()["results"]
                   if t["id"] == str(self.trip.id))
        self.assertEqual(row["departure_checkin_percent"], 100)
        self.assertEqual(row["checkin_percent_now"], 100)
        self.assertIsNotNone(row["departure_confirmed_at"])
