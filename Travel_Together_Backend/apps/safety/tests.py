from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase
from django.contrib.gis.geos import Point
from rest_framework.test import APIClient

from apps.users.models import User
from apps.trips.models import Trip, TripMember
from apps.safety.models import SOSAlert, SOSAction


def make_user(email):
    return User.objects.create_user(email=email, username=email.split("@")[0])


def make_trip(chief):
    return Trip.objects.create(
        title="Trip", destination="Accra",
        date_start=date.today(), date_end=date.today() + timedelta(days=2),
        entry_price=Decimal("0"), spots_total=5, chief=chief,
        status="active", visibility="public",
    )


SOS_BODY = {"trigger_type": "manual", "latitude": 5.6037, "longitude": -0.1870}


@patch("tasks.sos.notify_emergency_contacts.delay")
class TriggerSOSTests(TestCase):
    """
    SOS is the app's life-safety path. It must fire for real members, refuse
    outsiders, and reach the rest of the group.
    """

    def setUp(self):
        self.client = APIClient()
        self.chief  = make_user("chief@t.co")
        self.trip   = make_trip(self.chief)
        TripMember.objects.create(trip=self.trip, user=self.chief,
                                  role=TripMember.Role.CHIEF,
                                  status=TripMember.Status.APPROVED)
        self.member = make_user("member@t.co")
        TripMember.objects.create(trip=self.trip, user=self.member,
                                  status=TripMember.Status.APPROVED)
        self.url = f"/api/trips/{self.trip.id}/sos/"

    def _trigger(self, user, **overrides):
        self.client.force_authenticate(user)
        return self.client.post(self.url, {**SOS_BODY, **overrides}, format="json")

    def test_member_can_trigger(self, _sms):
        res = self._trigger(self.member)
        self.assertEqual(res.status_code, 201)
        alert = SOSAlert.objects.get()
        self.assertEqual(alert.member, self.member)
        self.assertEqual(alert.status, SOSAlert.AlertStatus.ACTIVE)

    def test_location_is_stored_lng_lat_not_swapped(self, _sms):
        # A swapped pair sends responders to the wrong hemisphere.
        self._trigger(self.member)
        alert = SOSAlert.objects.get()
        self.assertAlmostEqual(alert.location.y, 5.6037, places=4)   # latitude
        self.assertAlmostEqual(alert.location.x, -0.1870, places=4)  # longitude

    def test_non_member_cannot_trigger(self, _sms):
        self.assertEqual(self._trigger(make_user("outsider@t.co")).status_code, 403)
        self.assertFalse(SOSAlert.objects.exists())

    def test_pending_applicant_cannot_trigger(self, _sms):
        applicant = make_user("applicant@t.co")
        TripMember.objects.create(trip=self.trip, user=applicant,
                                  status=TripMember.Status.PENDING)
        self.assertEqual(self._trigger(applicant).status_code, 403)

    def test_the_rest_of_the_group_is_notified(self, _sms):
        from apps.notifications.models import Notification
        self._trigger(self.member)

        self.assertTrue(
            Notification.objects.filter(recipient=self.chief,
                                        notification_type="sos_alert").exists()
        )
        # The person in trouble isn't notified about their own alert.
        self.assertFalse(
            Notification.objects.filter(recipient=self.member,
                                        notification_type="sos_alert").exists()
        )

    def test_emergency_contacts_are_dispatched(self, sms):
        self._trigger(self.member)
        sms.assert_called_once_with(str(SOSAlert.objects.get().id))

    def test_retriggering_leaves_exactly_one_active_alert(self, _sms):
        self._trigger(self.member)
        self._trigger(self.member)

        self.assertEqual(SOSAlert.objects.count(), 2)
        self.assertEqual(
            SOSAlert.objects.filter(status=SOSAlert.AlertStatus.ACTIVE).count(), 1
        )


@patch("tasks.sos.notify_emergency_contacts.delay")
class ResolveSOSTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.chief  = make_user("chief@t.co")
        self.trip   = make_trip(self.chief)
        TripMember.objects.create(trip=self.trip, user=self.chief,
                                  role=TripMember.Role.CHIEF,
                                  status=TripMember.Status.APPROVED)
        self.member = make_user("member@t.co")
        TripMember.objects.create(trip=self.trip, user=self.member,
                                  status=TripMember.Status.APPROVED)
        self.other  = make_user("other@t.co")
        TripMember.objects.create(trip=self.trip, user=self.other,
                                  status=TripMember.Status.APPROVED)
        self.alert = SOSAlert.objects.create(
            trip=self.trip, member=self.member, trigger_type="manual",
            location=Point(-0.187, 5.6037, srid=4326),
        )
        self.url = f"/api/trips/{self.trip.id}/sos/alerts/{self.alert.id}/"

    def _resolve(self, user, resolution="resolved"):
        self.client.force_authenticate(user)
        return self.client.patch(self.url, {"resolution": resolution}, format="json")

    def test_chief_can_resolve(self, _sms):
        self.assertEqual(self._resolve(self.chief).status_code, 200)
        self.alert.refresh_from_db()
        self.assertEqual(self.alert.status, SOSAlert.AlertStatus.RESOLVED)

    def test_the_person_in_trouble_can_resolve_their_own(self, _sms):
        self.assertEqual(self._resolve(self.member).status_code, 200)

    def test_an_ordinary_member_cannot_resolve_someone_elses(self, _sms):
        self.assertEqual(self._resolve(self.other).status_code, 403)
        self.alert.refresh_from_db()
        self.assertEqual(self.alert.status, SOSAlert.AlertStatus.ACTIVE)

    def test_an_outsider_cannot_resolve(self, _sms):
        self.assertEqual(self._resolve(make_user("nobody@t.co")).status_code, 403)

    def test_cannot_resolve_twice(self, _sms):
        self._resolve(self.chief)
        self.assertEqual(self._resolve(self.chief).status_code, 400)

    def test_ordinary_members_only_see_active_alerts(self, _sms):
        self._resolve(self.chief)
        self.client.force_authenticate(self.other)
        res = self.client.get(f"/api/trips/{self.trip.id}/sos/alerts/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), 0)          # resolved -> hidden from members

        self.client.force_authenticate(self.chief)
        res = self.client.get(f"/api/trips/{self.trip.id}/sos/alerts/")
        self.assertEqual(len(res.json()), 1)          # chief sees the history

    def test_actions_cannot_be_logged_on_a_resolved_alert(self, _sms):
        self._resolve(self.chief)
        self.client.force_authenticate(self.chief)
        res = self.client.post(
            f"{self.url}actions/",
            {"action": SOSAction.Action.CALLED_CONTACT}, format="json",
        )
        self.assertEqual(res.status_code, 400)


@patch("tasks.sos.notify_emergency_contacts.delay")
class SOSWithoutLocationTests(TestCase):
    """
    An SOS must fire when the device has no fix, and must never invent a
    position. The old client sent (0, 0) on geolocation failure a real point
    in the Atlantic that reads as a precise location.
    """

    def setUp(self):
        self.client = APIClient()
        self.chief  = make_user("chief@t.co")
        self.trip   = make_trip(self.chief)
        TripMember.objects.create(trip=self.trip, user=self.chief,
                                  role=TripMember.Role.CHIEF,
                                  status=TripMember.Status.APPROVED)
        self.member = make_user("member@t.co")
        TripMember.objects.create(trip=self.trip, user=self.member,
                                  status=TripMember.Status.APPROVED)
        self.url = f"/api/trips/{self.trip.id}/sos/"
        self.client.force_authenticate(self.member)

    def _post(self, body):
        return self.client.post(self.url, body, format="json")

    def test_alert_fires_with_no_coordinates_at_all(self, _sms):
        res = self._post({"trigger_type": "manual"})
        self.assertEqual(res.status_code, 201)

        alert = SOSAlert.objects.get()
        self.assertIsNone(alert.location)
        self.assertEqual(alert.status, SOSAlert.AlertStatus.ACTIVE)
        self.assertIsNone(res.json()["latitude"])
        self.assertFalse(res.json()["has_location"])

    def test_group_is_still_notified_without_a_location(self, _sms):
        from apps.notifications.models import Notification
        self._post({"trigger_type": "manual"})
        self.assertTrue(
            Notification.objects.filter(recipient=self.chief,
                                        notification_type="sos_alert").exists()
        )

    def test_emergency_contacts_are_still_dispatched(self, sms):
        self._post({"trigger_type": "manual"})
        sms.assert_called_once()

    def test_null_island_is_treated_as_no_fix(self, _sms):
        res = self._post({"trigger_type": "manual", "latitude": 0, "longitude": 0})
        self.assertEqual(res.status_code, 201)
        self.assertIsNone(SOSAlert.objects.get().location)
        self.assertFalse(res.json()["has_location"])

    def test_out_of_range_coordinates_are_rejected(self, _sms):
        for lat, lng in ((91, 0), (-91, 0), (0, 181), (0, -181)):
            res = self._post({"trigger_type": "manual", "latitude": lat, "longitude": lng})
            self.assertEqual(res.status_code, 400, f"({lat}, {lng}) was accepted")

    def test_half_a_coordinate_pair_is_rejected(self, _sms):
        res = self._post({"trigger_type": "manual", "latitude": 5.6})
        self.assertEqual(res.status_code, 400)
        self.assertIn("both", str(res.json()).lower())

    def test_chat_message_says_location_unknown_instead_of_linking_a_map(self, _sms):
        from apps.chat.models import Conversation, Message
        Conversation.objects.create(type=Conversation.Type.GROUP,
                                    trip=self.trip, created_by=self.chief)
        self._post({"trigger_type": "manual"})

        msg = Message.objects.get()
        self.assertIn("SOS ALERT", msg.text)
        self.assertNotIn("google.com/maps", msg.text)
        self.assertIn("could not be determined", msg.text)
        self.assertIsNone(msg.location)

    def test_chat_message_links_the_map_when_there_is_a_fix(self, _sms):
        from apps.chat.models import Conversation, Message
        Conversation.objects.create(type=Conversation.Type.GROUP,
                                    trip=self.trip, created_by=self.chief)
        self._post({"trigger_type": "manual", "latitude": 5.6037, "longitude": -0.1870})

        msg = Message.objects.get()
        self.assertIn("google.com/maps?q=5.6037,-0.187", msg.text)

    def test_sms_body_never_points_at_null_island(self, _sms):
        from tasks.sos import notify_emergency_contacts
        from apps.users.models import EmergencyContact

        EmergencyContact.objects.create(user=self.member, name="Kin", phone="+233200000000")
        self._post({"trigger_type": "manual"})
        alert = SOSAlert.objects.get()

        with patch("requests.post") as rp:
            rp.return_value.status_code = 201
            rp.return_value.json.return_value = {}
            notify_emergency_contacts(str(alert.id))

        body = rp.call_args.kwargs.get("data", {}).get("message", "") if rp.call_args else ""
        self.assertNotIn("q=0,0", body)
        self.assertIn("could not be determined", body)
