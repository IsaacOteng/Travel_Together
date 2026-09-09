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
        today  = make_trip(self.chief, days_out=0)    # starts today still shown
        past   = make_trip(self.chief, days_out=-2)   # already started hidden

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
    """Attendees earn karma; no-shows are penalised but never blocked."""

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


# ─── Public trip detail must not leak group data ─────────────────────────────

class PublicTripLeakTests(TestCase):
    """
    /api/public/trips/<id>/ is AllowAny. It must never serve the itinerary
    (coordinates, geofence radii, per-stop check-in identities) or the exact
    meeting-point coordinates to anyone outside the group.
    """

    def setUp(self):
        self.client = APIClient()
        self.chief  = make_user("chief@t.co")
        self.trip   = make_trip(self.chief, days_out=5)
        self.trip.meeting_point_coords = Point(-0.187, 5.603, srid=4326)
        self.trip.meeting_point = "Accra Mall"
        self.trip.save()
        TripMember.objects.create(trip=self.trip, user=self.chief,
                                  role=TripMember.Role.CHIEF,
                                  status=TripMember.Status.APPROVED)
        self.stop = ItineraryStop.objects.create(
            trip=self.trip, order=1, name="Secret Rendezvous",
            location=Point(-0.2, 5.6, srid=4326), geofence_radius=100,
        )
        self.member = make_user("member@t.co")
        TripMember.objects.create(trip=self.trip, user=self.member,
                                  status=TripMember.Status.APPROVED)
        CheckIn.objects.create(trip=self.trip, member=self.member, stop=self.stop,
                               location_at_checkin=Point(-0.2, 5.6, srid=4326))

    def _public_body(self):
        return self.client.get(f"/api/public/trips/{self.trip.id}/").json()

    def test_anonymous_gets_no_itinerary_or_meeting_coords(self):
        body = self._public_body()
        self.assertEqual(body["itinerary"], [])
        self.assertIsNone(body["meeting_lat"])
        self.assertIsNone(body["meeting_lng"])
        # The coarse free-text meeting point stays public it's listing copy.
        self.assertEqual(body["meeting_point"], "Accra Mall")

    def test_anonymous_never_sees_who_checked_in_where(self):
        # The public roster deliberately lists members at "card" tier, so a
        # username on its own is fine. What must never appear is the linkage of
        # a person to a place and time: the stop, its coordinates, and the
        # per-stop check-in list.
        raw = self.client.get(f"/api/public/trips/{self.trip.id}/").content.decode()
        self.assertNotIn("Secret Rendezvous", raw)
        self.assertNotIn("checked_in_users", raw)
        self.assertNotIn("checked_in_at", raw)
        self.assertNotIn("geofence_radius", raw)

    def test_non_member_authenticated_user_gets_no_itinerary(self):
        outsider = make_user("outsider@t.co")
        self.client.force_authenticate(outsider)
        body = self._public_body()
        self.assertEqual(body["itinerary"], [])
        self.assertIsNone(body["meeting_lat"])

    def test_pending_applicant_gets_no_itinerary(self):
        applicant = make_user("applicant@t.co")
        TripMember.objects.create(trip=self.trip, user=applicant,
                                  status=TripMember.Status.PENDING)
        self.client.force_authenticate(applicant)
        self.assertEqual(self._public_body()["itinerary"], [])

    def test_approved_member_sees_the_full_itinerary(self):
        self.client.force_authenticate(self.member)
        body = self._public_body()
        self.assertEqual(len(body["itinerary"]), 1)
        stop = body["itinerary"][0]
        self.assertEqual(stop["name"], "Secret Rendezvous")
        self.assertAlmostEqual(stop["latitude"], 5.6, places=3)
        self.assertEqual(stop["checkin_count"], 1)
        self.assertAlmostEqual(body["meeting_lat"], 5.603, places=3)

    def test_awaiting_payment_member_sees_the_itinerary(self):
        payer = make_user("payer@t.co")
        TripMember.objects.create(trip=self.trip, user=payer,
                                  status=TripMember.Status.AWAITING_PAYMENT)
        self.client.force_authenticate(payer)
        self.assertEqual(len(self._public_body()["itinerary"]), 1)

    def test_chief_sees_the_itinerary(self):
        self.client.force_authenticate(self.chief)
        self.assertEqual(len(self._public_body()["itinerary"]), 1)


# ─── Membership state machine ────────────────────────────────────────────────

class RemovedMemberCannotRejoinTests(TestCase):
    """
    Being removed by the chief is a ban. POST /join/ refuses a REMOVED member,
    so DELETE /join/ must not let them erase the row and walk back in.
    """

    def setUp(self):
        self.client = APIClient()
        self.chief  = make_user("chief@t.co")
        self.trip   = make_trip(self.chief, days_out=10)
        TripMember.objects.create(trip=self.trip, user=self.chief,
                                  role=TripMember.Role.CHIEF,
                                  status=TripMember.Status.APPROVED)
        self.outcast = make_user("outcast@t.co")
        self.membership = TripMember.objects.create(
            trip=self.trip, user=self.outcast, status=TripMember.Status.REMOVED,
        )

    def test_removed_member_cannot_delete_their_membership_row(self):
        self.client.force_authenticate(self.outcast)
        res = self.client.delete(f"/api/trips/{self.trip.id}/join/")
        self.assertEqual(res.status_code, 403)
        self.assertTrue(TripMember.objects.filter(id=self.membership.id).exists())

    def test_delete_then_rejoin_does_not_bypass_the_ban(self):
        self.client.force_authenticate(self.outcast)
        self.client.delete(f"/api/trips/{self.trip.id}/join/")
        res = self.client.post(f"/api/trips/{self.trip.id}/join/")
        self.assertEqual(res.status_code, 403)
        self.assertEqual(
            TripMember.objects.get(id=self.membership.id).status,
            TripMember.Status.REMOVED,
        )

    def test_ordinary_member_can_still_leave(self):
        leaver = make_user("leaver@t.co")
        TripMember.objects.create(trip=self.trip, user=leaver,
                                  status=TripMember.Status.APPROVED)
        self.client.force_authenticate(leaver)
        res = self.client.delete(f"/api/trips/{self.trip.id}/join/")
        self.assertEqual(res.status_code, 204)
        self.assertFalse(TripMember.objects.filter(trip=self.trip, user=leaver).exists())


class JoinRequestExistingMembershipTests(TestCase):
    """
    (trip, user) is unique, so every existing-membership status must be answered
    with a response never fall through to create() and hit the constraint.
    """

    def setUp(self):
        self.client    = APIClient()
        self.chief     = make_user("chief@t.co")
        self.trip      = make_trip(self.chief, days_out=10)
        TripMember.objects.create(trip=self.trip, user=self.chief,
                                  role=TripMember.Role.CHIEF,
                                  status=TripMember.Status.APPROVED)
        self.applicant = make_user("applicant@t.co")
        self.client.force_authenticate(self.applicant)

    def _join(self):
        return self.client.post(f"/api/trips/{self.trip.id}/join/")

    def test_awaiting_payment_returns_400_not_500(self):
        TripMember.objects.create(trip=self.trip, user=self.applicant,
                                  status=TripMember.Status.AWAITING_PAYMENT)
        res = self._join()
        self.assertEqual(res.status_code, 400)
        self.assertIn("pay", res.json()["detail"].lower())
        self.assertEqual(
            TripMember.objects.filter(trip=self.trip, user=self.applicant).count(), 1
        )

    def test_every_status_gets_a_clean_response(self):
        for status_value in TripMember.Status.values:
            TripMember.objects.filter(trip=self.trip, user=self.applicant).delete()
            TripMember.objects.create(trip=self.trip, user=self.applicant,
                                      status=status_value)
            res = self._join()
            self.assertIn(res.status_code, (400, 403, 201),
                          f"{status_value} produced {res.status_code}")
            self.assertLessEqual(
                TripMember.objects.filter(trip=self.trip, user=self.applicant).count(), 1,
                f"{status_value} created a duplicate membership",
            )

    def test_rejected_applicant_can_still_re_request(self):
        TripMember.objects.create(trip=self.trip, user=self.applicant,
                                  status=TripMember.Status.REJECTED,
                                  rejected_reason="no")
        res = self._join()
        self.assertEqual(res.status_code, 201)
        m = TripMember.objects.get(trip=self.trip, user=self.applicant)
        self.assertEqual(m.status, TripMember.Status.PENDING)
        self.assertIsNone(m.rejected_reason)


class PrivateTripVisibilityTests(TestCase):
    """A member being asked to pay must be able to see the trip they're paying for."""

    def setUp(self):
        self.client = APIClient()
        self.chief  = make_user("chief@t.co")
        self.trip   = make_trip(self.chief, days_out=10)
        self.trip.visibility = Trip.Visibility.PRIVATE
        self.trip.save()
        TripMember.objects.create(trip=self.trip, user=self.chief,
                                  role=TripMember.Role.CHIEF,
                                  status=TripMember.Status.APPROVED)

    def _get_as(self, user):
        self.client.force_authenticate(user)
        return self.client.get(f"/api/trips/{self.trip.id}/")

    def test_awaiting_payment_member_can_see_the_trip(self):
        payer = make_user("payer@t.co")
        TripMember.objects.create(trip=self.trip, user=payer,
                                  status=TripMember.Status.AWAITING_PAYMENT)
        self.assertEqual(self._get_as(payer).status_code, 200)

    def test_approved_and_pending_still_see_it(self):
        for status_value in (TripMember.Status.APPROVED, TripMember.Status.PENDING):
            user = make_user(f"{status_value}@t.co")
            TripMember.objects.create(trip=self.trip, user=user, status=status_value)
            self.assertEqual(self._get_as(user).status_code, 200, status_value)

    def test_outsider_still_cannot(self):
        self.assertEqual(self._get_as(make_user("nobody@t.co")).status_code, 404)


class DepartureQuorumSettingTests(TestCase):
    """The configured quorum percentage is the one enforced (no in-code default)."""

    def setUp(self):
        self.client = APIClient()
        self.chief  = make_user("chief@t.co")
        self.trip   = make_trip(self.chief, days_out=0)
        TripMember.objects.create(trip=self.trip, user=self.chief,
                                  role=TripMember.Role.CHIEF,
                                  status=TripMember.Status.APPROVED)
        self.stop = ItineraryStop.objects.create(
            trip=self.trip, order=0, name="Meet", is_system=True,
        )
        # Four approved members, one of whom checks in → 25% turnout.
        self.members = [make_user(f"m{i}@t.co") for i in range(4)]
        for m in self.members:
            TripMember.objects.create(trip=self.trip, user=m,
                                      status=TripMember.Status.APPROVED)
        CheckIn.objects.create(trip=self.trip, member=self.members[0], stop=self.stop,
                               location_at_checkin=Point(0, 0, srid=4326))
        self.client.force_authenticate(self.chief)

    def _depart(self):
        return self.client.post(f"/api/trips/{self.trip.id}/depart/")

    def test_one_checkin_is_enough_to_depart_however_thin(self):
        # 1 of 4 = 25%: far below the old 70% quorum, which would have blocked
        # this. Departure is no longer gated on the rate, only on there being
        # some evidence at all.
        res = self._depart()
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["checked_in"], 1)
        self.assertEqual(res.json()["expected"], 4)
        self.assertEqual(res.json()["evidence"], "weak")


class DepartureRulesTests(TestCase):
    """
    Departure starts the payout clock, so every precondition matters. See
    TripDepartView's docstring for the full list.
    """

    def setUp(self):
        self.client = APIClient()
        self.chief  = make_user("chief@t.co")
        # Starts today at 00:00, so "now" is already past the start.
        self.trip   = make_trip(self.chief, days_out=0)
        TripMember.objects.create(trip=self.trip, user=self.chief,
                                  role=TripMember.Role.CHIEF,
                                  status=TripMember.Status.APPROVED)
        self.stop = ItineraryStop.objects.create(
            trip=self.trip, order=0, name="Meet", is_system=True,
        )
        self.client.force_authenticate(self.chief)

    def _depart(self):
        return self.client.post(f"/api/trips/{self.trip.id}/depart/")

    def _add_member(self, email, checked_in=False):
        u = make_user(email)
        TripMember.objects.create(trip=self.trip, user=u,
                                  status=TripMember.Status.APPROVED)
        if checked_in:
            CheckIn.objects.create(trip=self.trip, member=u, stop=self.stop,
                                   location_at_checkin=Point(0, 0, srid=4326))
        return u

    # ── rule 5: somebody has to be travelling ────────────────────────────────

    def test_cannot_depart_an_empty_trip(self):
        res = self._depart()
        self.assertEqual(res.status_code, 400)
        self.assertIn("Nobody has joined", res.json()["detail"])
        self.trip.refresh_from_db()
        self.assertIsNone(self.trip.departure_confirmed_at)

    def test_chief_alone_does_not_count_as_the_group(self):
        # The chief has an approved membership of their own; it must not satisfy
        # "someone has joined".
        self.assertEqual(self._depart().status_code, 400)

    def test_a_pending_applicant_does_not_count(self):
        u = make_user("pending@t.co")
        TripMember.objects.create(trip=self.trip, user=u,
                                  status=TripMember.Status.PENDING)
        self.assertEqual(self._depart().status_code, 400)

    def test_an_unpaid_member_does_not_count(self):
        u = make_user("unpaid@t.co")
        TripMember.objects.create(trip=self.trip, user=u,
                                  status=TripMember.Status.AWAITING_PAYMENT)
        self.assertEqual(self._depart().status_code, 400)

    # ── rule 4: not before the start ─────────────────────────────────────────

    def test_cannot_depart_before_the_start_date(self):
        future = make_trip(self.chief, days_out=5)
        TripMember.objects.create(trip=future, user=self.chief,
                                  role=TripMember.Role.CHIEF,
                                  status=TripMember.Status.APPROVED)
        stop = ItineraryStop.objects.create(trip=future, order=0, name="Meet", is_system=True)
        rider = make_user("rider@t.co")
        TripMember.objects.create(trip=future, user=rider, status=TripMember.Status.APPROVED)
        CheckIn.objects.create(trip=future, member=rider, stop=stop,
                               location_at_checkin=Point(0, 0, srid=4326))

        res = self.client.post(f"/api/trips/{future.id}/depart/")
        self.assertEqual(res.status_code, 400)
        self.assertIn("hasn't started yet", res.json()["detail"])
        future.refresh_from_db()
        self.assertIsNone(future.departure_confirmed_at)

    def test_start_time_is_respected_not_just_the_date(self):
        from datetime import time
        self.trip.start_time = time(23, 59)
        self.trip.save()
        self._add_member("rider@t.co", checked_in=True)

        res = self._depart()
        self.assertEqual(res.status_code, 400)
        self.assertIn("hasn't started yet", res.json()["detail"])

    # ── rule 6: quorum ───────────────────────────────────────────────────────

    def test_nobody_checked_in_blocks_departure(self):
        self._add_member("rider@t.co", checked_in=False)
        res = self._depart()
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["checked_in"], 0)

    def test_at_least_one_checkin_is_always_required(self):
        # The evidence floor: a trip nobody turned up to can never depart, and so
        # can never reach an early payout.
        self._add_member("rider@t.co", checked_in=False)
        res = self._depart()
        self.assertEqual(res.status_code, 400)
        self.assertIn("at least one member", res.json()["detail"].lower())

    # ── the happy path, and rule 3 ───────────────────────────────────────────

    def test_departs_once_a_member_has_joined_and_checked_in(self):
        self._add_member("rider@t.co", checked_in=True)
        res = self._depart()
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["departed"])

        self.trip.refresh_from_db()
        self.assertIsNotNone(self.trip.departure_confirmed_at)
        self.assertEqual(self.trip.status, Trip.Status.ACTIVE)

    def test_cannot_depart_twice(self):
        self._add_member("rider@t.co", checked_in=True)
        self.assertEqual(self._depart().status_code, 200)

        res = self._depart()
        self.assertEqual(res.status_code, 400)
        self.assertIn("already departed", res.json()["detail"])

    def test_non_chief_cannot_depart(self):
        rider = self._add_member("rider@t.co", checked_in=True)
        self.client.force_authenticate(rider)
        self.assertEqual(self._depart().status_code, 403)


class CheckInWindowTests(TestCase):
    """
    Check-ins are the evidence departure and the organizer's payout rest on, so
    they can't be banked days early. They open an hour before the start.
    """

    def setUp(self):
        self.client = APIClient()
        self.chief  = make_user("chief@t.co")
        self.member = make_user("m@t.co")

    def _trip(self, days_out, start_time=None):
        trip = make_trip(self.chief, days_out=days_out)
        if start_time:
            trip.start_time = start_time
            trip.save()
        TripMember.objects.create(trip=trip, user=self.chief, role=TripMember.Role.CHIEF,
                                  status=TripMember.Status.APPROVED)
        TripMember.objects.create(trip=trip, user=self.member,
                                  status=TripMember.Status.APPROVED)
        stop = ItineraryStop.objects.create(trip=trip, order=0, name="Meet", is_system=True)
        return trip, stop

    def _check_in(self, trip, stop):
        self.client.force_authenticate(self.member)
        return self.client.post(f"/api/trips/{trip.id}/checkin/",
                                {"stop_id": str(stop.id), "lat": 0, "lng": 0}, format="json")

    def test_cannot_check_in_days_early(self):
        trip, stop = self._trip(days_out=5)
        res = self._check_in(trip, stop)
        self.assertEqual(res.status_code, 400)
        self.assertIn("Check-in opens", res.json()["detail"])
        self.assertFalse(CheckIn.objects.exists())

    def test_cannot_check_in_two_hours_early(self):
        from datetime import datetime, timedelta as td
        soon = timezone.now() + td(hours=2)
        trip, stop = self._trip(days_out=0, start_time=soon.time())
        trip.date_start = soon.date()
        trip.save()

        res = self._check_in(trip, stop)
        self.assertEqual(res.status_code, 400)

    def test_can_check_in_inside_the_hour_before_start(self):
        from datetime import timedelta as td
        soon = timezone.now() + td(minutes=30)
        trip, stop = self._trip(days_out=0, start_time=soon.time())
        trip.date_start = soon.date()
        trip.save()

        self.assertEqual(self._check_in(trip, stop).status_code, 201)

    def test_can_check_in_once_the_trip_has_started(self):
        trip, stop = self._trip(days_out=0)          # started at 00:00 today
        self.assertEqual(self._check_in(trip, stop).status_code, 201)

    @override_settings(CHECKIN_WINDOW_HOURS_BEFORE_START=48)
    def test_window_is_configurable(self):
        trip, stop = self._trip(days_out=1)
        self.assertEqual(self._check_in(trip, stop).status_code, 201)

    def test_early_checkins_cannot_prop_up_a_quorum(self):
        # The whole point: no banking presence in advance.
        trip, stop = self._trip(days_out=3)
        self._check_in(trip, stop)
        self.client.force_authenticate(self.chief)
        res = self.client.post(f"/api/trips/{trip.id}/depart/")
        self.assertEqual(res.status_code, 400)
