from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone


class LocationConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket: ws/trips/<trip_id>/locations/

    Auth: same as ChatConsumer — send token first:
        { "type": "auth", "token": "<access_token>" }

    Incoming (client → server):
        {
          "type": "location.update",
          "latitude": 5.6037,
          "longitude": -0.1870,
          "accuracy_meters": 8.5,
          "heading": 270.0,       # optional 0-360
          "speed": 1.4,           # optional m/s
          "battery_level": 82     # optional 0-100
        }
        { "type": "location.stop" }   # stops broadcasting (privacy)

    Outgoing (server → all members in trip):
        {
          "type": "location.update",
          "user_id": "...",
          "username": "...",
          "avatar_url": "...",
          "latitude": 5.6037,
          "longitude": -0.1870,
          "accuracy_meters": 8.5,
          "heading": 270.0,
          "speed": 1.4,
          "battery_level": 82,
          "updated_at": "2026-04-01T12:00:00Z"
        }
        {
          "type": "member.joined",
          "user_id": "...",
          "username": "..."
        }
        {
          "type": "member.left",
          "user_id": "...",
          "username": "..."
        }
    """

    # ── lifecycle ──────────────────────────────────────────────────────────────

    async def connect(self):
        self.trip_id    = str(self.scope["url_route"]["kwargs"]["trip_id"])
        self.group_name = f"trips.{self.trip_id}.locations"
        self.user       = None

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if self.user:
            await self._delete_location()
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type":     "location.stopped",
                    "user_id":  str(self.user.id),
                    "username": self.user.username or "",
                },
            )
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type":     "member.left",
                    "user_id":  str(self.user.id),
                    "username": self.user.username or "",
                },
            )
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

        if msg_type == "location.update":
            await self._handle_location_update(content)
        elif msg_type == "location.stop":
            await self._handle_location_stop()
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

        # Announce arrival to all other members
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type":     "member.joined",
                "user_id":  str(user.id),
                "username": user.username or "",
            },
        )

        # Send current snapshot of all known positions to the new joiner
        positions = await self._get_all_positions()
        if positions:
            await self.send_json({"type": "location.snapshot", "positions": positions})

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

    # ── location update ───────────────────────────────────────────────────────

    async def _handle_location_update(self, content):
        lat = content.get("latitude")
        lng = content.get("longitude")
        if lat is None or lng is None:
            await self.send_json({"type": "error", "detail": "latitude and longitude are required."})
            return

        updated_at = await self._persist_location(content)

        await self.channel_layer.group_send(
            self.group_name,
            {
                "type":           "location.update",
                "user_id":        str(self.user.id),
                "username":       self.user.username or "",
                "avatar_url":     self.user.avatar_url or "",
                "latitude":       lat,
                "longitude":      lng,
                "accuracy_meters": content.get("accuracy_meters"),
                "heading":        content.get("heading"),
                "speed":          content.get("speed"),
                "battery_level":  content.get("battery_level"),
                "updated_at":     updated_at,
            },
        )

    @database_sync_to_async
    def _persist_location(self, content):
        from apps.users.models import UserLocation
        from apps.trips.models import Trip
        from django.contrib.gis.geos import Point

        point = Point(x=content["longitude"], y=content["latitude"], srid=4326)
        trip  = Trip.objects.get(id=self.trip_id)

        loc, _ = UserLocation.objects.update_or_create(
            user=self.user,
            trip=trip,
            defaults={
                "location":        point,
                "accuracy_meters": content.get("accuracy_meters"),
                "heading":         content.get("heading"),
                "speed":           content.get("speed"),
                "battery_level":   content.get("battery_level"),
            },
        )
        return loc.updated_at.isoformat()

    async def _handle_location_stop(self):
        """User stopped sharing — clear DB record and notify others."""
        await self._delete_location()
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type":     "location.stopped",
                "user_id":  str(self.user.id),
                "username": self.user.username or "",
            },
        )

    @database_sync_to_async
    def _delete_location(self):
        from apps.users.models import UserLocation
        UserLocation.objects.filter(user=self.user, trip_id=self.trip_id).delete()

    @database_sync_to_async
    def _get_all_positions(self):
        from apps.users.models import UserLocation
        from datetime import timedelta
        cutoff = timezone.now() - timedelta(minutes=10)
        positions = []
        for loc in UserLocation.objects.filter(
            trip_id=self.trip_id, updated_at__gte=cutoff
        ).select_related("user"):
            positions.append({
                "user_id":        str(loc.user_id),
                "username":       loc.user.username or "",
                "avatar_url":     loc.user.avatar_url or "",
                "latitude":       loc.location.y,
                "longitude":      loc.location.x,
                "accuracy_meters": loc.accuracy_meters,
                "heading":        loc.heading,
                "speed":          loc.speed,
                "battery_level":  loc.battery_level,
                "updated_at":     loc.updated_at.isoformat(),
            })
        return positions

    # ── channel layer → individual client ─────────────────────────────────────

    async def location_update(self, event):
        # Don't echo position back to the sender
        if event["user_id"] == str(getattr(self.user, "id", None)):
            return
        await self.send_json({k: v for k, v in event.items() if k != "type"} | {"type": "location.update"})

    async def location_stopped(self, event):
        await self.send_json({"type": "location.stopped", "user_id": event["user_id"]})

    async def member_joined(self, event):
        if event["user_id"] == str(getattr(self.user, "id", None)):
            return
        await self.send_json({"type": "member.joined", "user_id": event["user_id"], "username": event["username"]})

    async def member_left(self, event):
        await self.send_json({"type": "member.left", "user_id": event["user_id"], "username": event["username"]})
