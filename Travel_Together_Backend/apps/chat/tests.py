from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.users.models import User
from apps.trips.models import Trip, TripMember
from apps.chat.models import Conversation, ConversationMember, Message
from apps.chat.utils import users_share_a_trip


def make_user(email):
    return User.objects.create_user(email=email, username=email.split("@")[0])


def make_trip(chief):
    return Trip.objects.create(
        title="Trip", destination="Accra",
        date_start=date.today() + timedelta(days=10),
        date_end=date.today() + timedelta(days=12),
        entry_price=Decimal("100.00"), spots_total=5, chief=chief,
        status="published", visibility="public",
    )


class DMAccessRuleTests(TestCase):
    """
    DMs are only for people actually travelling together: both approved on the
    same trip, which on a paid trip means both have paid (confirm_payment is
    what moves AWAITING_PAYMENT → APPROVED).
    """

    def setUp(self):
        self.client   = APIClient()
        self.chief    = make_user("chief@t.co")
        self.trip     = make_trip(self.chief)
        TripMember.objects.create(trip=self.trip, user=self.chief,
                                  role=TripMember.Role.CHIEF,
                                  status=TripMember.Status.APPROVED)
        self.paid     = make_user("paid@t.co")
        TripMember.objects.create(trip=self.trip, user=self.paid,
                                  status=TripMember.Status.APPROVED)
        self.stranger = make_user("stranger@t.co")

    def _open_dm(self, sender, target):
        self.client.force_authenticate(sender)
        return self.client.post("/api/conversations/",
                                {"user_id": str(target.id)}, format="json")

    # ── the rule itself ──────────────────────────────────────────────────────

    def test_two_paid_members_share_a_trip(self):
        other = make_user("other@t.co")
        TripMember.objects.create(trip=self.trip, user=other,
                                  status=TripMember.Status.APPROVED)
        self.assertTrue(users_share_a_trip(self.paid, other))

    def test_awaiting_payment_does_not_count(self):
        unpaid = make_user("unpaid@t.co")
        TripMember.objects.create(trip=self.trip, user=unpaid,
                                  status=TripMember.Status.AWAITING_PAYMENT)
        self.assertFalse(users_share_a_trip(self.paid, unpaid))

    def test_pending_applicant_does_not_count(self):
        applicant = make_user("applicant@t.co")
        TripMember.objects.create(trip=self.trip, user=applicant,
                                  status=TripMember.Status.PENDING)
        self.assertFalse(users_share_a_trip(self.paid, applicant))

    # ── opening a DM ─────────────────────────────────────────────────────────

    def test_stranger_cannot_open_a_dm(self):
        res = self._open_dm(self.stranger, self.paid)
        self.assertEqual(res.status_code, 403)
        self.assertFalse(Conversation.objects.exists())

    def test_organizer_cannot_dm_a_prospective_joiner(self):
        applicant = make_user("applicant@t.co")
        TripMember.objects.create(trip=self.trip, user=applicant,
                                  status=TripMember.Status.PENDING)

        self.assertEqual(self._open_dm(self.chief, applicant).status_code, 403)
        self.assertEqual(self._open_dm(applicant, self.chief).status_code, 403)

    def test_organizer_cannot_dm_someone_who_has_not_paid_yet(self):
        unpaid = make_user("unpaid@t.co")
        TripMember.objects.create(trip=self.trip, user=unpaid,
                                  status=TripMember.Status.AWAITING_PAYMENT)
        self.assertEqual(self._open_dm(self.chief, unpaid).status_code, 403)

    def test_organizer_can_dm_a_paid_member(self):
        self.assertEqual(self._open_dm(self.chief, self.paid).status_code, 201)

    def test_two_paid_members_can_dm(self):
        other = make_user("other@t.co")
        TripMember.objects.create(trip=self.trip, user=other,
                                  status=TripMember.Status.APPROVED)
        self.assertEqual(self._open_dm(self.paid, other).status_code, 201)

    def test_cannot_dm_yourself(self):
        self.assertEqual(self._open_dm(self.paid, self.paid).status_code, 400)

    # ── existing threads ─────────────────────────────────────────────────────

    def _existing_dm(self, a, b):
        conv = Conversation.objects.create(type=Conversation.Type.DM, created_by=a)
        ConversationMember.objects.bulk_create([
            ConversationMember(conversation=conv, user=a),
            ConversationMember(conversation=conv, user=b),
        ])
        return conv

    def test_legacy_thread_is_not_a_permanent_back_channel(self):
        # A thread that predates the rule must not stay writable.
        conv = self._existing_dm(self.stranger, self.paid)
        self.client.force_authenticate(self.stranger)

        res = self.client.post(f"/api/conversations/{conv.id}/messages/",
                               {"text": "hi"}, format="json")
        self.assertEqual(res.status_code, 403)
        self.assertFalse(Message.objects.exists())

    def test_qualifying_thread_can_still_be_written_to(self):
        conv = self._existing_dm(self.chief, self.paid)
        self.client.force_authenticate(self.chief)

        res = self.client.post(f"/api/conversations/{conv.id}/messages/",
                               {"text": "see you at the meeting point"}, format="json")
        self.assertEqual(res.status_code, 201)

    def test_group_chats_are_unaffected(self):
        conv = Conversation.objects.create(type=Conversation.Type.GROUP,
                                           trip=self.trip, created_by=self.chief)
        ConversationMember.objects.create(conversation=conv, user=self.paid)
        self.client.force_authenticate(self.paid)

        res = self.client.post(f"/api/conversations/{conv.id}/messages/",
                               {"text": "hello group"}, format="json")
        self.assertEqual(res.status_code, 201)
