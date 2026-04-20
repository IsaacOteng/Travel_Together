from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async


def user_group(user_id: str) -> str:
    """Channel-layer group name for a single user's notification stream."""
    return f"notifs.{user_id}"


class NotificationsConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket: ws/notifications/

    Per-user notification stream. The server pushes notifications here
    whenever one is created for the authenticated user.

    Auth flow (same as ChatConsumer):
        1. Client connects
        2. Client sends: { "type": "auth", "token": "<access_token>" }
        3. Server replies: { "type": "auth.ok", "user_id": "..." }

    Server → client push events:
        {
          "type": "notification.new",
          "notification": {
            "id": "...",
            "notification_type": "join_approved" | "join_declined" | ...,
            "title": "...",
            "body": "...",
            "is_read": false,
            "created_at": "...",
            "data": { ... },
            "sender_id": "...",
            "sender_username": "...",
            "sender_avatar": "..."
          }
        }

    Client → server:
        { "type": "ping" }
    """

    async def connect(self):
        self.user       = None
        self.group_name = None
        await self.accept()

    async def disconnect(self, code):
        if self.group_name:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content):
        msg_type = content.get("type")

        if msg_type == "auth":
            await self._handle_auth(content)
            return

        if not self.user:
            await self.send_json({"type": "error", "detail": "Not authenticated."})
            return

        if msg_type == "ping":
            await self.send_json({"type": "pong"})

    # ── auth ──────────────────────────────────────────────────────────────────

    async def _handle_auth(self, content):
        token = content.get("token", "")
        user  = await self._authenticate(token)
        if not user:
            await self.send_json({"type": "error", "detail": "Invalid or expired token."})
            await self.close(code=4001)
            return

        self.user       = user
        self.group_name = user_group(str(user.id))
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.send_json({"type": "auth.ok", "user_id": str(user.id)})

    @database_sync_to_async
    def _authenticate(self, raw_token):
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            from apps.users.models import User
            decoded = AccessToken(raw_token)
            return User.objects.get(id=decoded["user_id"])
        except Exception:
            return None

    # ── channel layer handler (server → this client) ──────────────────────────

    async def notification_new(self, event):
        """Called by channel_layer.group_send when a new notification is pushed."""
        await self.send_json({"type": "notification.new", "notification": event["notification"]})
