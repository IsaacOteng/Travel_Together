from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from django.utils import timezone
from django.contrib.gis.geos import Point

from apps.users.models import User
from apps.trips.models import Trip, TripMember, ItineraryStop, CheckIn


def make_user(email):
    return User.objects.create_user(email=email, username=email.split("@")[0])


def make_trip(chief, days_out, status="published"):
    return Trip.objects.create(
        title="Trip", destination="Accra",
        date_start=date.today() + timedelta(days=days_out),
        date_end=date.today() + timedelta(days=days_out + 2),
        entry_price=Decimal("0"), spots_total=5, chief=chief,
        status=status, visibility="public",
    )


class DiscoverPastTripTests(TestCase):
    """Trips that have already started must not appear on Discover or be joinable."""

    def setUp(self):
        self.client = APIClient()
        self.chief  = make_user("chief@t.co")

    def test_discover_excludes_started_trips(self):
        future = make_trip(self.chief, days_out=5)
        today  = make_trip(self.chief, days_out=0)    # starts today — still shown
        past   = make_trip(self.chief, days_out=-2)   # already started — hidden

        ids = [t["id"] for t in self.client.get("/api/public/trips/").json()["results"]]
        self.assertIn(str(future.id), ids)
        self.assertIn(str(today.id), ids)
        self.assertNotIn(str(past.id), ids)

    def test_cannot_join_started_trip(self):
        past   = make_trip(self.chief, days_out=-1)
        joiner = make_user("joiner@t.co")
        self.client.force_authenticate(joiner)

        res = self.client.post(f"/api/trips/{past.id}/join/")
        self.assertEqual(res.status_code, 400)
        self.assertIn("already started", res.json()["detail"])

    def test_can_still_join_future_trip(self):
        future = make_trip(self.chief, days_out=3)
        joiner = make_user("joiner@t.co")
        self.client.force_authenticate(joiner)

        res = self.client.post(f"/api/trips/{future.id}/join/")
        self.assertEqual(res.status_code, 201)


class DeleteGuardTests(TestCase):
    """Hard-delete only empty trips; joined/completed trips are preserved."""

    def setUp(self):
        self.client = APIClient()
        self.chief  = make_user("chief@t.co")

    def _chief_member(self, trip):
        TripMember.objects.create(trip=trip, user=self.chief,
                                  role=TripMember.Role.CHIEF, status=TripMember.Status.APPROVED)

    def test_empty_trip_is_hard_deleted(self):
        trip = make_trip(self.chief, days_out=5)
        self._chief_member(trip)
        self.client.force_authenticate(self.chief)

        res = self.client.delete(f"/api/trips/{trip.id}/")
        self.assertEqual(res.status_code, 204)
        self.assertFalse(Trip.objects.filter(id=trip.id).exists())

    def test_joined_trip_is_cancelled_not_deleted(self):
        trip = make_trip(self.chief, days_out=5)
        self._chief_member(trip)
        joiner = make_user("joiner@t.co")
        TripMember.objects.create(trip=trip, user=joiner,
                                  role=TripMember.Role.MEMBER, status=TripMember.Status.APPROVED)
        self.client.force_authenticate(self.chief)

        res = self.client.delete(f"/api/trips/{trip.id}/")
        self.assertEqual(res.status_code, 200)
        trip.refresh_from_db()
        self.assertEqual(trip.status, Trip.Status.CANCELLED)          # preserved, not erased
        self.assertTrue(TripMember.objects.filter(trip=trip, user=joiner).exists())

    def test_completed_trip_cannot_be_deleted(self):
        trip = make_trip(self.chief, days_out=-5, status="completed")
        self._chief_member(trip)
        self.client.force_authenticate(self.chief)

        res = self.client.delete(f"/api/trips/{trip.id}/")
        self.assertEqual(res.status_code, 400)
        self.assertTrue(Trip.objects.filter(id=trip.id).exists())


class ConfirmCompletionTests(TestCase):
    """A member can confirm only if they attended (checked in); no-shows can't."""

    def setUp(self):
        self.client = APIClient()
        self.chief  = make_user("chief@t.co")
        self.trip   = make_trip(self.chief, days_out=-2, status="completed")
        self.trip.ended_at = timezone.now()
        self.trip.save()
        self.stop   = ItineraryStop.objects.create(trip=self.trip, order=0, name="Meet", is_system=True)
        self.member = make_user("m@t.co")
        TripMember.objects.create(trip=self.trip, user=self.member,
                                  role=TripMember.Role.MEMBER, status=TripMember.Status.APPROVED)

    def test_no_show_cannot_confirm(self):
        self.client.force_authenticate(self.member)
        res = self.client.post(f"/api/trips/{self.trip.id}/confirm/")
        self.assertEqual(res.status_code, 400)

    def test_attended_member_can_confirm(self):
        CheckIn.objects.create(trip=self.trip, member=self.member, stop=self.stop,
                               location_at_checkin=Point(0, 0, srid=4326))
        self.client.force_authenticate(self.member)
        res = self.client.post(f"/api/trips/{self.trip.id}/confirm/")
        self.assertEqual(res.status_code, 200)
        m = TripMember.objects.get(trip=self.trip, user=self.member)
        self.assertIsNotNone(m.completion_confirmed_at)


class NoShowKarmaTests(TestCase):
    """Attendees earn karma; no-shows are penalised — but never blocked."""

    @patch("tasks.karma.check_karma_level_up.delay")
    def test_attendee_rewarded_noshow_penalised(self, _delay):
        from tasks.karma import award_trip_completion_karma
        from apps.karma.models import KarmaLog

        chief = make_user("chief@t.co")
        trip  = make_trip(chief, days_out=-2, status="completed")
        trip.ended_at = timezone.now(); trip.save()
        stop  = ItineraryStop.objects.create(trip=trip, order=0, name="Meet", is_system=True)
        TripMember.objects.create(trip=trip, user=chief, role=TripMember.Role.CHIEF, status=TripMember.Status.APPROVED)

        attendee = make_user("att@t.co")
        TripMember.objects.create(trip=trip, user=attendee, role=TripMember.Role.MEMBER, status=TripMember.Status.APPROVED)
        CheckIn.objects.create(trip=trip, member=attendee, stop=stop, location_at_checkin=Point(0, 0, srid=4326))

        noshow = make_user("ns@t.co")
        TripMember.objects.create(trip=trip, user=noshow, role=TripMember.Role.MEMBER, status=TripMember.Status.APPROVED)

        award_trip_completion_karma.apply(args=[str(trip.id)])

        self.assertTrue(KarmaLog.objects.filter(user=attendee, reason="trip_completed", delta=10).exists())
        self.assertTrue(KarmaLog.objects.filter(user=noshow, reason="penalty", delta=-10).exists())


class DisputeFlowTests(TestCase):
    """Two-sided disputes: organizer is reported + can respond; admin upholds/dismisses."""

    def setUp(self):
        self.client = APIClient()
        self.chief  = make_user("chief@t.co")
        self.trip   = make_trip(self.chief, days_out=-1, status="active")
        TripMember.objects.create(trip=self.trip, user=self.chief, role=TripMember.Role.CHIEF, status=TripMember.Status.APPROVED)
        self.member = make_user("m@t.co")
        TripMember.objects.create(trip=self.trip, user=self.member, role=TripMember.Role.MEMBER, status=TripMember.Status.APPROVED)

    def _file_report(self):
        self.client.force_authenticate(self.member)
        res = self.client.post(f"/api/trips/{self.trip.id}/reports/",
                               {"incident_type": "fraud", "description": "x" * 50}, format="json")
        self.assertEqual(res.status_code, 201)
        return res.json()["id"]

    def test_report_targets_organizer_who_can_respond(self):
        from apps.trips.models import IncidentReport
        report_id = self._file_report()
        report = IncidentReport.objects.get(id=report_id)
        self.assertEqual(report.reported_user_id, self.chief.id)        # organizer is the reported party

        self.client.force_authenticate(self.chief)
        res = self.client.post(f"/api/trips/{self.trip.id}/reports/{report_id}/respond/",
                               {"response": "Here is my side"}, format="json")
        self.assertEqual(res.status_code, 200)
        report.refresh_from_db()
        self.assertEqual(report.response, "Here is my side")
        self.assertIsNotNone(report.responded_at)

    @override_settings(PAYMENTS_ENABLED=True, PAYSTACK_SECRET_KEY="")
    @patch("apps.payments.paystack.refund_transaction", return_value={})
    def test_admin_uphold_cancels_and_refunds(self, _mock):
        from apps.payments.models import Payment
        from apps.trips.models import IncidentReport
        report_id = self._file_report()
        p = Payment.objects.create(trip=self.trip, user=self.member, amount=Decimal("100.00"),
                                   status=Payment.Status.HELD, paystack_ref="ref1")

        admin = make_user("admin@t.co"); admin.is_staff = True; admin.save()
        self.client.force_authenticate(admin)
        res = self.client.patch(f"/api/admin-dashboard/incidents/{report_id}/", {"action": "uphold"}, format="json")
        self.assertEqual(res.status_code, 200)

        self.trip.refresh_from_db(); p.refresh_from_db()
        self.assertEqual(self.trip.status, Trip.Status.CANCELLED)
        self.assertEqual(p.status, Payment.Status.REFUNDED)
        self.assertEqual(IncidentReport.objects.get(id=report_id).status, "resolved")
