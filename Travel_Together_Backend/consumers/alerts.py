from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async


class AlertsConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket: ws/trips/<trip_id>/alerts/

    Primarily a server-push channel — the backend broadcasts alerts here
    when safety or system events occur. Clients connect and listen.

    Auth: same pattern — send token first:
        { "type": "auth", "token": "<access_token>" }

    Outgoing event types (server → client):
        {
          "type": "sos.triggered",
          "alert_id": "...",
          "member_id": "...",
          "member_username": "...",
          "trigger_type": "manual",
          "latitude": 5.6037,
          "longitude": -0.1870,
          "created_at": "..."
        }
        {
          "type": "sos.resolved",
          "alert_id": "...",
          "resolution": "resolved"|"false_alarm",
          "resolved_by": "..."
        }
        {
          "type": "trip.status",
          "status": "active"|"completed",
          "message": "..."
        }
        {
          "type": "member.removed",
          "user_id": "...",
          "username": "..."
        }

    Incoming (client → server):
        { "type": "sos.ack", "alert_id": "..." }   # acknowledge receipt
        { "type": "ping" }                          # keepalive
    """

    # ── lifecycle ──────────────────────────────────────────────────────────────

    async def connect(self):
        self.trip_id    = str(self.scope["url_route"]["kwargs"]["trip_id"])
        self.group_name = f"trips.{self.trip_id}.alerts"
        self.user       = None

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    # ── receive (dispatch) ────────────────────────────────────────────────────

    async def receive_json(self, content):
        msg_type = content.get("type")

        if msg_type == "auth":
            await self._handle_auth(content)
            return

        if not self.user:
            await self.send_json({"type": "error", "detail": "Not authenticated."})
            return

        if msg_type == "sos.ack":
            await self._handle_sos_ack(content)
        elif msg_type == "ping":
            await self.send_json({"type": "pong"})
        else:
            await self.send_json({"type": "error", "detail": f"Unknown type: {msg_type}"})

    # ── auth ──────────────────────────────────────────────────────────────────

    async def _handle_auth(self, content):
        token = content.get("token", "")
        user  = await self._authenticate(token)
        if not user:
            await self.send_json({"type": "error", "detail": "Invalid or expired token."})
            await self.close(code=4001)
            return

        is_member = await self._is_trip_member(user)
        if not is_member:
            await self.send_json({"type": "error", "detail": "Not a member of this trip."})
            await self.close(code=4003)
            return

        self.user = user
        await self.send_json({"type": "auth.ok", "user_id": str(user.id)})

        # Send any active SOS alerts immediately on connect
        active_alerts = await self._get_active_alerts()
        if active_alerts:
            await self.send_json({"type": "sos.snapshot", "alerts": active_alerts})

    @database_sync_to_async
    def _authenticate(self, raw_token):
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            from apps.users.models import User
            decoded = AccessToken(raw_token)
            return User.objects.get(id=decoded["user_id"])
        except Exception:
            return None

    @database_sync_to_async
    def _is_trip_member(self, user):
        from apps.trips.models import TripMember
        return TripMember.objects.filter(
            trip_id=self.trip_id,
            user=user,
            status=TripMember.Status.APPROVED,
        ).exists()

    @database_sync_to_async
    def _get_active_alerts(self):
        from apps.safety.models import SOSAlert
        alerts = []
        for a in SOSAlert.objects.filter(
            trip_id=self.trip_id, status=SOSAlert.AlertStatus.ACTIVE
        ).select_related("member"):
            alerts.append({
                "alert_id":        str(a.id),
                "member_id":       str(a.member_id),
                "member_username": a.member.username or "",
                "trigger_type":    a.trigger_type,
                "latitude":        a.location.y,
                "longitude":       a.location.x,
                "created_at":      a.created_at.isoformat(),
            })
        return alerts

    # ── SOS acknowledge ───────────────────────────────────────────────────────

    async def _handle_sos_ack(self, content):
        """Client acknowledges they received an SOS alert. Logged silently."""
        alert_id = content.get("alert_id")
        if alert_id:
            await self._log_sos_ack(alert_id)
        await self.send_json({"type": "sos.ack.ok", "alert_id": alert_id})

    @database_sync_to_async
    def _log_sos_ack(self, alert_id):
        from apps.safety.models import SOSAlert, SOSAction
        try:
            alert = SOSAlert.objects.get(id=alert_id, trip_id=self.trip_id)
            if alert.status == SOSAlert.AlertStatus.ACTIVE:
                SOSAction.objects.get_or_create(
                    alert=alert,
                    taken_by=self.user,
                    action=SOSAction.Action.CALLED_MEMBER,
                    defaults={"notes": "Alert acknowledged via WebSocket"},
                )
        except SOSAlert.DoesNotExist:
            pass

    # ── channel layer → individual client ─────────────────────────────────────

    async def trip_alert(self, event):
        """Generic passthrough — used by backend to push any alert payload."""
        await self.send_json(event["data"])

    async def sos_triggered(self, event):
        await self.send_json({"type": "sos.triggered", **{k: v for k, v in event.items() if k != "type"}})

    async def sos_resolved(self, event):
        await self.send_json({"type": "sos.resolved", **{k: v for k, v in event.items() if k != "type"}})

    async def trip_status(self, event):
        await self.send_json({"type": "trip.status", **{k: v for k, v in event.items() if k != "type"}})

    async def member_removed(self, event):
        await self.send_json({"type": "member.removed", **{k: v for k, v in event.items() if k != "type"}})
