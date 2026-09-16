"""
Proves incomplete trips can't reach the public.

Two doors are tested because there are two ways in: the create endpoint the
form uses, and the publish endpoint, which a draft assembled some other way
(PATCHes, fixtures, admin) would still have to pass through.
"""

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from .models import Trip, TripMember

User = get_user_model()


def _payload(**overrides):
    data = {
        "title":         "Mount Afadja Weekend",
        "destination":   "Mount Afadja, Volta Region, Ghana",
        "description":   "A two-day hike up Ghana's tallest mountain with an overnight stay.",
        "meeting_point": "Dansoman, Accra",
        "date_start":    str(date.today() + timedelta(days=14)),
        "date_end":      str(date.today() + timedelta(days=16)),
        "spots_total":   8,
        "entry_price":   "250.00",
        "tags":          ["hiking"],
        "visibility":    "public",
    }
    data.update(overrides)
    return data


class TripCreateValidationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="chief@example.com", password="pw12345!")
        self.client.force_authenticate(self.user)

    def test_valid_payload_is_accepted(self):
        res = self.client.post("/api/trips/", _payload(), format="json")
        self.assertEqual(res.status_code, 201, res.data)

    def test_description_is_required(self):
        res = self.client.post("/api/trips/", _payload(description=""), format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("description", res.data)

    def test_short_description_is_rejected(self):
        res = self.client.post("/api/trips/", _payload(description="Too short"), format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("description", res.data)

    def test_meeting_point_is_required(self):
        res = self.client.post("/api/trips/", _payload(meeting_point=""), format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("meeting_point", res.data)

    def test_at_least_one_tag_is_required(self):
        res = self.client.post("/api/trips/", _payload(tags=[]), format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("tags", res.data)

    def test_solo_trip_is_rejected(self):
        res = self.client.post("/api/trips/", _payload(spots_total=1), format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("spots_total", res.data)

    def test_negative_price_is_rejected(self):
        res = self.client.post("/api/trips/", _payload(entry_price="-10.00"), format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("entry_price", res.data)

    def test_start_date_in_the_past_is_rejected(self):
        res = self.client.post(
            "/api/trips/",
            _payload(date_start=str(date.today() - timedelta(days=1))),
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("date_start", res.data)

    def test_end_before_start_is_rejected(self):
        res = self.client.post(
            "/api/trips/",
            _payload(
                date_start=str(date.today() + timedelta(days=10)),
                date_end=str(date.today() + timedelta(days=5)),
            ),
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("date_end", res.data)


class TripPublishGateTests(APITestCase):
    """A draft built outside the create serializer still can't go public."""

    def setUp(self):
        self.user = User.objects.create_user(email="chief2@example.com", password="pw12345!")
        self.client.force_authenticate(self.user)

    def _draft(self, **fields):
        defaults = dict(
            chief=self.user,
            title="Mount Afadja Weekend",
            destination="Mount Afadja, Volta Region, Ghana",
            description="A two-day hike up Ghana's tallest mountain with an overnight stay.",
            meeting_point="Dansoman, Accra",
            date_start=date.today() + timedelta(days=14),
            date_end=date.today() + timedelta(days=16),
            spots_total=8,
            entry_price=250,
            status=Trip.Status.DRAFT,
        )
        defaults.update(fields)
        trip = Trip.objects.create(**defaults)
        TripMember.objects.create(
            trip=trip, user=self.user,
            role=TripMember.Role.CHIEF, status=TripMember.Status.APPROVED,
        )
        return trip

    def test_complete_draft_publishes(self):
        trip = self._draft()
        trip.tags.create(tag="hiking")
        res = self.client.post(f"/api/trips/{trip.id}/publish/")
        self.assertEqual(res.status_code, 200, res.data)
        trip.refresh_from_db()
        self.assertEqual(trip.status, Trip.Status.PUBLISHED)

    def test_draft_without_description_cannot_publish(self):
        trip = self._draft(description="")
        trip.tags.create(tag="hiking")
        res = self.client.post(f"/api/trips/{trip.id}/publish/")
        self.assertEqual(res.status_code, 400)
        self.assertIn("description", res.data["missing"])
        trip.refresh_from_db()
        self.assertEqual(trip.status, Trip.Status.DRAFT)

    def test_draft_without_tags_cannot_publish(self):
        trip = self._draft()
        res = self.client.post(f"/api/trips/{trip.id}/publish/")
        self.assertEqual(res.status_code, 400)
        self.assertIn("tags", res.data["missing"])

    def test_draft_without_meeting_point_cannot_publish(self):
        trip = self._draft(meeting_point="")
        trip.tags.create(tag="hiking")
        res = self.client.post(f"/api/trips/{trip.id}/publish/")
        self.assertEqual(res.status_code, 400)
        self.assertIn("meeting_point", res.data["missing"])

    def test_draft_starting_in_the_past_cannot_publish(self):
        trip = self._draft(
            date_start=date.today() - timedelta(days=2),
            date_end=date.today() - timedelta(days=1),
        )
        trip.tags.create(tag="hiking")
        res = self.client.post(f"/api/trips/{trip.id}/publish/")
        self.assertEqual(res.status_code, 400)
        self.assertIn("date_start", res.data["missing"])
