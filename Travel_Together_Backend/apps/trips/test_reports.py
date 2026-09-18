"""
Reports: who can file one, what it is about, and who hears back.

The distinction under test throughout is `scope` — whether a concern is about a
trip or about the platform — and the fact that it is stamped from the endpoint
rather than accepted from the client.
"""

from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.users.models import User
from apps.trips.models import Trip, TripMember, IncidentReport
from apps.chat.models import Conversation, Message


DESC = "x" * 60   # clears the 50-character minimum in the serializer


def make_user(email):
    return User.objects.create_user(email=email, username=email.split("@")[0])


def make_trip(chief):
    trip = Trip.objects.create(
        title="Trip", destination="Accra",
        date_start=date.today() + timedelta(days=5),
        date_end=date.today() + timedelta(days=7),
        entry_price=Decimal("0"), spots_total=5, chief=chief,
        status="published", visibility="public",
    )
    TripMember.objects.create(
        trip=trip, user=chief,
        role=TripMember.Role.CHIEF, status=TripMember.Status.APPROVED,
    )
    return trip


def add_member(trip, user):
    return TripMember.objects.create(
        trip=trip, user=user,
        role=TripMember.Role.MEMBER, status=TripMember.Status.APPROVED,
    )


class ChiefReportTests(TestCase):
    """
    An organizer must be able to raise a concern about someone on their trip.

    Before this, the chief passed the member check and then had themselves set
    as `reported_user`, so their own complaint came back to them through the
    organizer view as an accusation against themselves.
    """

    def setUp(self):
        self.client = APIClient()
        self.chief  = make_user("chief@t.co")
        self.member = make_user("member@t.co")
        self.trip   = make_trip(self.chief)
        add_member(self.trip, self.member)

    def test_chief_can_file_and_is_not_the_accused(self):
        self.client.force_authenticate(self.chief)
        res = self.client.post(
            f"/api/trips/{self.trip.id}/reports/",
            {"incident_type": "harassment", "description": DESC,
             "reported_user": str(self.member.id)},
            format="json",
        )
        self.assertEqual(res.status_code, 201)

        report = IncidentReport.objects.get(id=res.json()["id"])
        self.assertEqual(report.reporter_id,      self.chief.pk)
        self.assertEqual(report.reported_user_id, self.member.pk)
        self.assertEqual(report.reporter_role,    IncidentReport.ReporterRole.CHIEF)

    def test_chiefs_own_report_is_not_shown_back_to_them(self):
        self.client.force_authenticate(self.chief)
        self.client.post(
            f"/api/trips/{self.trip.id}/reports/",
            {"incident_type": "harassment", "description": DESC,
             "reported_user": str(self.member.id)},
            format="json",
        )
        # The organizer view is "concerns raised about you", not "everything".
        res = self.client.get(f"/api/trips/{self.trip.id}/reports/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [])

    def test_chief_sees_their_own_report_under_mine(self):
        self.client.force_authenticate(self.chief)
        self.client.post(
            f"/api/trips/{self.trip.id}/reports/",
            {"incident_type": "fraud", "description": DESC},
            format="json",
        )
        res = self.client.get(f"/api/trips/{self.trip.id}/reports/?mine=1")
        self.assertEqual(len(res.json()), 1)

    def test_member_report_still_lands_on_the_organizer(self):
        self.client.force_authenticate(self.member)
        res = self.client.post(
            f"/api/trips/{self.trip.id}/reports/",
            {"incident_type": "fraud", "description": DESC},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        report = IncidentReport.objects.get(id=res.json()["id"])
        self.assertEqual(report.reported_user_id, self.chief.pk)

        self.client.force_authenticate(self.chief)
        self.assertEqual(len(self.client.get(f"/api/trips/{self.trip.id}/reports/").json()), 1)

    def test_cannot_name_someone_who_is_not_on_the_trip(self):
        outsider = make_user("outsider@t.co")
        self.client.force_authenticate(self.chief)
        res = self.client.post(
            f"/api/trips/{self.trip.id}/reports/",
            {"incident_type": "other", "description": DESC,
             "reported_user": str(outsider.id)},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_cannot_report_yourself(self):
        self.client.force_authenticate(self.member)
        res = self.client.post(
            f"/api/trips/{self.trip.id}/reports/",
            {"incident_type": "other", "description": DESC,
             "reported_user": str(self.member.id)},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_someone_not_on_the_trip_cannot_file_about_it(self):
        self.client.force_authenticate(make_user("stranger@t.co"))
        res = self.client.post(
            f"/api/trips/{self.trip.id}/reports/",
            {"incident_type": "other", "description": DESC},
            format="json",
        )
        self.assertEqual(res.status_code, 403)


class ScopeTests(TestCase):
    """`scope` says what a report is about, and the client cannot choose it."""

    def setUp(self):
        self.client = APIClient()
        self.chief  = make_user("chief@t.co")
        self.member = make_user("member@t.co")
        self.trip   = make_trip(self.chief)
        add_member(self.trip, self.member)

    def test_trip_endpoint_stamps_trip_scope(self):
        self.client.force_authenticate(self.member)
        res = self.client.post(
            f"/api/trips/{self.trip.id}/reports/",
            {"incident_type": "safety", "description": DESC},
            format="json",
        )
        report = IncidentReport.objects.get(id=res.json()["id"])
        self.assertEqual(report.scope,  IncidentReport.Scope.TRIP)
        self.assertEqual(report.origin, IncidentReport.Origin.GROUP_DASHBOARD)
        self.assertEqual(report.trip_id, self.trip.id)

    def test_general_endpoint_stamps_general_scope_and_no_trip(self):
        self.client.force_authenticate(self.member)
        res = self.client.post(
            "/api/reports/",
            {"incident_type": "other", "description": DESC},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        report = IncidentReport.objects.get(id=res.json()["id"])
        self.assertEqual(report.scope, IncidentReport.Scope.GENERAL)
        self.assertIsNone(report.trip_id)
        self.assertIsNone(report.reported_user_id)

    def test_client_cannot_forge_the_scope(self):
        """A trip report claiming to be general would escape the payout freeze."""
        self.client.force_authenticate(self.member)
        res = self.client.post(
            f"/api/trips/{self.trip.id}/reports/",
            {"incident_type": "fraud", "description": DESC,
             "scope": "general", "origin": "sos", "reporter_role": "chief"},
            format="json",
        )
        report = IncidentReport.objects.get(id=res.json()["id"])
        self.assertEqual(report.scope,         IncidentReport.Scope.TRIP)
        self.assertEqual(report.origin,        IncidentReport.Origin.GROUP_DASHBOARD)
        self.assertEqual(report.reporter_role, IncidentReport.ReporterRole.MEMBER)

    def test_general_report_may_attach_a_trip_the_user_was_on(self):
        self.client.force_authenticate(self.member)
        res = self.client.post(
            "/api/reports/",
            {"incident_type": "fraud", "description": DESC, "trip": str(self.trip.id)},
            format="json",
        )
        report = IncidentReport.objects.get(id=res.json()["id"])
        # Attaching a trip makes it trip-scoped, but `origin` still records that
        # it arrived through support rather than from inside the trip.
        self.assertEqual(report.scope,  IncidentReport.Scope.TRIP)
        self.assertEqual(report.origin, IncidentReport.Origin.SUPPORT_CHAT)

    def test_cannot_attach_a_trip_you_were_never_on(self):
        self.client.force_authenticate(make_user("stranger@t.co"))
        res = self.client.post(
            "/api/reports/",
            {"incident_type": "fraud", "description": DESC, "trip": str(self.trip.id)},
            format="json",
        )
        self.assertEqual(res.status_code, 403)

    def test_mine_lists_both_kinds(self):
        self.client.force_authenticate(self.member)
        self.client.post(f"/api/trips/{self.trip.id}/reports/",
                         {"incident_type": "safety", "description": DESC}, format="json")
        self.client.post("/api/reports/",
                         {"incident_type": "other", "description": DESC}, format="json")
        scopes = {r["scope"] for r in self.client.get("/api/reports/").json()}
        self.assertEqual(scopes, {"trip", "general"})


class SupportThreadTests(TestCase):
    """Filing a report must produce a receipt the reporter can actually find."""

    def setUp(self):
        self.client = APIClient()
        self.chief  = make_user("chief@t.co")
        self.member = make_user("member@t.co")
        self.trip   = make_trip(self.chief)
        add_member(self.trip, self.member)

    def test_support_thread_is_created_on_demand_and_reused(self):
        self.client.force_authenticate(self.member)
        first  = self.client.get("/api/conversations/support/").json()
        second = self.client.get("/api/conversations/support/").json()
        self.assertEqual(first["id"], second["id"])
        self.assertEqual(first["type"], "support")
        self.assertEqual(
            Conversation.objects.filter(type=Conversation.Type.SUPPORT).count(), 1
        )

    def test_filing_a_report_posts_an_official_card(self):
        self.client.force_authenticate(self.member)
        res = self.client.post(
            f"/api/trips/{self.trip.id}/reports/",
            {"incident_type": "safety", "description": DESC},
            format="json",
        )
        report = IncidentReport.objects.get(id=res.json()["id"])

        msg = Message.objects.get(report_id=report.id)
        self.assertTrue(msg.is_official)
        self.assertIsNone(msg.sender_id)          # the team, not a named admin
        self.assertEqual(msg.message_type, Message.MessageType.REPORT_REF)
        self.assertIn(report.reference_number, msg.text)
        self.assertEqual(msg.conversation.type, Conversation.Type.SUPPORT)

        # And it landed in the reporter's thread, nobody else's.
        self.assertEqual(
            list(msg.conversation.memberships.values_list("user_id", flat=True)),
            [self.member.pk],
        )

    def test_support_thread_is_private_to_its_owner(self):
        self.client.force_authenticate(self.member)
        conv_id = self.client.get("/api/conversations/support/").json()["id"]

        self.client.force_authenticate(self.chief)
        res = self.client.get(f"/api/conversations/{conv_id}/messages/")
        self.assertEqual(res.status_code, 403)

    def test_status_change_tells_the_reporter(self):
        self.client.force_authenticate(self.member)
        res = self.client.post(
            f"/api/trips/{self.trip.id}/reports/",
            {"incident_type": "safety", "description": DESC},
            format="json",
        )
        report = IncidentReport.objects.get(id=res.json()["id"])

        admin = User.objects.create_user(
            email="admin@t.co", username="admin", is_staff=True,
        )
        self.client.force_authenticate(admin)
        patch_res = self.client.patch(
            f"/api/admin-dashboard/incidents/{report.id}/",
            {"status": "under_review", "note": "We have started looking into this."},
            format="json",
        )
        self.assertEqual(patch_res.status_code, 200)

        texts = list(
            Message.objects.filter(report_id=report.id).order_by("created_at")
                   .values_list("text", flat=True)
        )
        self.assertEqual(len(texts), 2)                       # receipt, then update
        self.assertIn("We have started looking into this.", texts[1])

    def test_repeating_the_same_status_does_not_spam_the_reporter(self):
        self.client.force_authenticate(self.member)
        res = self.client.post(
            f"/api/trips/{self.trip.id}/reports/",
            {"incident_type": "safety", "description": DESC},
            format="json",
        )
        report_id = res.json()["id"]

        admin = User.objects.create_user(
            email="admin@t.co", username="admin", is_staff=True,
        )
        self.client.force_authenticate(admin)
        for _ in range(3):
            self.client.patch(
                f"/api/admin-dashboard/incidents/{report_id}/",
                {"status": "under_review"}, format="json",
            )

        self.assertEqual(Message.objects.filter(report_id=report_id).count(), 2)


class AdminMessagingTests(TestCase):
    """Admins reach members as Travel Together, without joining their threads."""

    def setUp(self):
        self.client = APIClient()
        self.chief  = make_user("chief@t.co")
        self.member = make_user("member@t.co")
        self.trip   = make_trip(self.chief)
        add_member(self.trip, self.member)
        self.admin = User.objects.create_user(
            email="admin@t.co", username="admin", is_staff=True,
        )

    def test_broadcast_reaches_every_traveller_privately(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            "/api/admin-dashboard/broadcast/",
            {"trip_id": str(self.trip.id), "text": "Meeting point has moved."},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["sent"], 2)      # chief + member

        # Two separate threads, not one group message.
        self.assertEqual(
            Conversation.objects.filter(type=Conversation.Type.SUPPORT).count(), 2
        )
        for msg in Message.objects.filter(is_official=True):
            self.assertIsNone(msg.sender_id)
            self.assertEqual(msg.conversation.memberships.count(), 1)

    def test_admin_reply_lands_in_the_users_thread_without_joining_it(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            f"/api/admin-dashboard/support/{self.member.id}/",
            {"text": "Thanks — we are on it."},
            format="json",
        )
        self.assertEqual(res.status_code, 201)

        conv = Conversation.objects.get(type=Conversation.Type.SUPPORT)
        self.assertEqual(
            list(conv.memberships.values_list("user_id", flat=True)), [self.member.pk]
        )

    def test_reading_a_thread_does_not_create_an_empty_one(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(f"/api/admin-dashboard/support/{self.member.id}/")
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.json()["conversation_id"])
        self.assertEqual(Conversation.objects.count(), 0)

    def test_broadcast_requires_staff(self):
        self.client.force_authenticate(self.member)
        res = self.client.post(
            "/api/admin-dashboard/broadcast/",
            {"trip_id": str(self.trip.id), "text": "hello"},
            format="json",
        )
        self.assertIn(res.status_code, (401, 403))

    def test_general_report_cannot_be_upheld(self):
        """Upholding cancels a trip and refunds it — there is no trip here."""
        self.client.force_authenticate(self.member)
        res = self.client.post(
            "/api/reports/",
            {"incident_type": "other", "description": DESC}, format="json",
        )
        report_id = res.json()["id"]

        self.client.force_authenticate(self.admin)
        res = self.client.patch(
            f"/api/admin-dashboard/incidents/{report_id}/",
            {"action": "uphold"}, format="json",
        )
        self.assertEqual(res.status_code, 400)
