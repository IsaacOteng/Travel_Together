from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.utils import timezone
from django.contrib.gis.geos import Point
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.trips.models import Trip, TripMember
from apps.notifications.utils import push, push_many
from .models import SOSAlert, SOSAction


def _broadcast_alert(trip_id, payload):
    """Push a message to the trip's alerts WebSocket group."""
    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return
        async_to_sync(channel_layer.group_send)(
            f"trips.{trip_id}.alerts",
            {"type": "trip.alert", "data": payload},
        )
    except Exception:
        pass
from .serializers import (
    SOSAlertSerializer, TriggerSOSSerializer,
    ResolveSOSSerializer, LogActionSerializer,
)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_trip_and_membership(trip_id, user):
    try:
        trip = Trip.objects.get(id=trip_id)
    except Trip.DoesNotExist:
        return None, None, Response({"detail": "Trip not found."}, status=404)

    member = TripMember.objects.filter(
        trip=trip, user=user, status=TripMember.Status.APPROVED
    ).first()
    if not member:
        return None, None, Response({"detail": "You are not a member of this trip."}, status=403)

    return trip, member, None


# ─── Trigger SOS ─────────────────────────────────────────────────────────────

class TriggerSOSView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, trip_id):
        trip, _, err = _get_trip_and_membership(trip_id, request.user)
        if err:
            return err

        serializer = TriggerSOSSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        d = serializer.validated_data

        # If an active alert already exists, resolve it first then create a fresh one
        SOSAlert.objects.filter(
            trip=trip, member=request.user, status=SOSAlert.AlertStatus.ACTIVE
        ).update(status=SOSAlert.AlertStatus.RESOLVED, resolved_by=request.user)

        alert = SOSAlert.objects.create(
            trip                 = trip,
            member               = request.user,
            trigger_type         = d["trigger_type"],
            location             = Point(x=d["longitude"], y=d["latitude"], srid=4326),
            accuracy_meters      = d.get("accuracy_meters"),
            deviation_distance_m = d.get("deviation_distance_m"),
            stationary_minutes   = d.get("stationary_minutes"),
        )

        # Notify all approved trip members
        approved_members = TripMember.objects.filter(
            trip=trip, status=TripMember.Status.APPROVED
        ).exclude(user=request.user).select_related("user")

        name = request.user.first_name or request.user.username or "A member"
        push_many(
            recipients = [m.user for m in approved_members],
            notif_type = "sos_alert",
            title      = "SOS Alert",
            body       = f"{name} has triggered an SOS alert on trip '{trip.title}'.",
            sender     = request.user,
            trip       = trip,
            action_url = f"/trips/{trip.id}/safety/",
            data       = {"alert_id": str(alert.id)},
        )

        alert.chief_notified = True
        alert.save(update_fields=["chief_notified"])

        # Push to alerts WebSocket channel instantly
        _broadcast_alert(trip_id, {
            "type":            "sos.triggered",
            "alert_id":        str(alert.id),
            "member_id":       str(request.user.id),
            "member_username": request.user.username or "",
            "member_avatar":   request.user.avatar_url or "",
            "trigger_type":    alert.trigger_type,
            "latitude":        d["latitude"],
            "longitude":       d["longitude"],
            "created_at":      alert.created_at.isoformat(),
        })

        # Post SOS location message directly into the group chat
        conv = trip.group_chats.first()
        if conv and d.get("latitude") and d.get("longitude"):
            from apps.chat.models import Message
            name = request.user.first_name or request.user.username or "A member"
            sos_msg = Message.objects.create(
                conversation = conv,
                sender       = request.user,
                message_type = Message.MessageType.SYSTEM,
                text         = (
                    f"SOS ALERT: {name} needs help!\n"
                    f"https://www.google.com/maps?q={d['latitude']},{d['longitude']}"
                ),
                location     = Point(x=d["longitude"], y=d["latitude"], srid=4326),
            )
            # Broadcast to anyone currently in the chat
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"chat.{conv.id}",
                {
                    "type":    "chat.new_message",
                    "message": {
                        "id":              str(sos_msg.id),
                        "conversation":    str(conv.id),
                        "sender_id":       str(request.user.id),
                        "sender_username": request.user.username or "",
                        "sender_avatar":   getattr(request.user, "avatar_url", "") or "",
                        "message_type":    sos_msg.message_type,
                        "text":            sos_msg.text,  # "SOS ALERT: {name}...\nhttps://maps..."
                        "media_url":       None,
                        "streak_id":       None,
                        "is_edited":       False,
                        "is_deleted":      False,
                        "is_pinned":       False,
                        "read_by_count":   0,
                        "created_at":      sos_msg.created_at.isoformat(),
                    },
                },
            )

        # SMS every emergency contact (non-blocking)
        from tasks.sos import notify_emergency_contacts
        notify_emergency_contacts.delay(str(alert.id))

        return Response(SOSAlertSerializer(alert).data, status=201)


# ─── SOS alert list (trip level) ─────────────────────────────────────────────

class SOSAlertListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, trip_id):
        trip, member, err = _get_trip_and_membership(trip_id, request.user)
        if err:
            return err

        qs = SOSAlert.objects.filter(trip=trip).prefetch_related(
            "actions__taken_by"
        ).select_related("member", "resolved_by").order_by("-created_at")

        # Members see only active alerts; chief/scout see all
        if member.role == TripMember.Role.MEMBER:
            qs = qs.filter(status=SOSAlert.AlertStatus.ACTIVE)

        return Response(SOSAlertSerializer(qs, many=True).data)


# ─── SOS alert detail ─────────────────────────────────────────────────────────

class SOSAlertDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_alert(self, trip_id, alert_id, user):
        trip, member, err = _get_trip_and_membership(trip_id, user)
        if err:
            return None, None, err
        try:
            alert = SOSAlert.objects.prefetch_related(
                "actions__taken_by"
            ).select_related("member", "resolved_by").get(id=alert_id, trip=trip)
        except SOSAlert.DoesNotExist:
            return None, None, Response({"detail": "Alert not found."}, status=404)
        return alert, member, None

    def get(self, request, trip_id, alert_id):
        alert, _, err = self._get_alert(trip_id, alert_id, request.user)
        if err:
            return err
        return Response(SOSAlertSerializer(alert).data)

    def patch(self, request, trip_id, alert_id):
        """Resolve or mark false alarm — chief / scout only."""
        alert, member, err = self._get_alert(trip_id, alert_id, request.user)
        if err:
            return err

        if member.role not in (TripMember.Role.CHIEF, TripMember.Role.SCOUT):
            # The member who triggered can also resolve their own alert
            if alert.member_id != request.user.id:
                return Response({"detail": "Only the chief, a scout, or the alert member can resolve this."}, status=403)

        if alert.status != SOSAlert.AlertStatus.ACTIVE:
            return Response({"detail": "This alert is already resolved."}, status=400)

        serializer = ResolveSOSSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        d = serializer.validated_data
        status_map = {
            "resolved":    SOSAlert.AlertStatus.RESOLVED,
            "false_alarm": SOSAlert.AlertStatus.FALSE_ALARM,
        }
        alert.status           = status_map[d["resolution"]]
        alert.resolved_at      = timezone.now()
        alert.resolved_by      = request.user
        alert.resolution_notes = d.get("resolution_notes", "")
        alert.save(update_fields=["status", "resolved_at", "resolved_by", "resolution_notes"])

        # Push resolution to alerts WebSocket channel
        _broadcast_alert(trip_id, {
            "type":        "sos.resolved",
            "alert_id":    str(alert.id),
            "resolution":  d["resolution"],
            "resolved_by": request.user.username or "",
            "resolved_at": alert.resolved_at.isoformat(),
        })

        # Notify the member whose alert was resolved (if someone else resolved it)
        if alert.member_id != request.user.id:
            push(
                recipient  = alert.member,
                notif_type = "sos_alert",
                title      = "SOS Alert Resolved",
                body       = f"Your SOS alert on '{alert.trip.title}' has been marked as {d['resolution'].replace('_', ' ')}.",
                sender     = request.user,
                trip       = alert.trip,
                data       = {"alert_id": str(alert.id)},
            )

        return Response(SOSAlertSerializer(alert).data)


# ─── Log an action on an alert ────────────────────────────────────────────────

class SOSActionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, trip_id, alert_id):
        trip, _, err = _get_trip_and_membership(trip_id, request.user)
        if err:
            return err

        try:
            alert = SOSAlert.objects.get(id=alert_id, trip=trip)
        except SOSAlert.DoesNotExist:
            return Response({"detail": "Alert not found."}, status=404)

        if alert.status != SOSAlert.AlertStatus.ACTIVE:
            return Response({"detail": "Cannot log actions on a resolved alert."}, status=400)

        serializer = LogActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        action = SOSAction.objects.create(
            alert    = alert,
            taken_by = request.user,
            action   = serializer.validated_data["action"],
            notes    = serializer.validated_data.get("notes", ""),
        )

        # Mark emergency contacts notified if applicable
        if action.action == SOSAction.Action.CALLED_CONTACT:
            alert.emergency_contact_notified = True
            alert.save(update_fields=["emergency_contact_notified"])

        return Response({
            "id":         str(action.id),
            "action":     action.action,
            "notes":      action.notes,
            "created_at": action.created_at.isoformat(),
        }, status=201)


# ─── My active SOS (quick check) ─────────────────────────────────────────────

class MyActiveSOSView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Returns the user's active SOS alert across all trips, if any."""
        alert = SOSAlert.objects.filter(
            member=request.user, status=SOSAlert.AlertStatus.ACTIVE
        ).select_related("trip").first()

        if not alert:
            return Response({"active": False})

        return Response({
            "active":   True,
            "alert_id": str(alert.id),
            "trip_id":  str(alert.trip_id),
            "trip":     alert.trip.title,
            "since":    alert.created_at.isoformat(),
        })
