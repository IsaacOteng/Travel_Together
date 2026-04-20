import uuid as _uuid
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone


class ChatConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket: ws/chat/<conversation_id>/

    Auth: send access_token in the first message after connect:
        { "type": "auth", "token": "<access_token>" }

    Incoming message types (client → server):
        { "type": "message.send",   "text": "...", "message_type": "text" }
        { "type": "message.send",   "message_type": "image", "media_url": "..." }
        { "type": "message.send",   "message_type": "streak", "streak_id": "..." }
        { "type": "message.edit",   "message_id": "...", "text": "..." }
        { "type": "message.delete", "message_id": "..." }
        { "type": "typing.start" }
        { "type": "typing.stop" }
        { "type": "read.mark" }

    Outgoing event types (server → client):
        { "type": "message.new",     "message": {...} }
        { "type": "message.edited",  "message": {...} }
        { "type": "message.deleted", "message_id": "..." }
        { "type": "typing",          "user_id": "...", "username": "...", "is_typing": true/false }
        { "type": "error",           "detail": "..." }
    """

    # ── lifecycle ──────────────────────────────────────────────────────────────

    async def connect(self):
        self.conversation_id = str(self.scope["url_route"]["kwargs"]["conversation_id"])
        self.group_name      = f"chat.{self.conversation_id}"
        self.user            = None   # set after auth message

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if self.user:
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type":      "typing",
                    "user_id":   str(self.user.id),
                    "username":  self.user.username or "",
                    "is_typing": False,
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

        handlers = {
            "message.send":   self._handle_send,
            "message.edit":   self._handle_edit,
            "message.delete": self._handle_delete,
            "typing.start":   self._handle_typing_start,
            "typing.stop":    self._handle_typing_stop,
            "read.mark":      self._handle_read_mark,
        }
        handler = handlers.get(msg_type)
        if handler:
            await handler(content)
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

        is_member = await self._is_member(user)
        if not is_member:
            await self.send_json({"type": "error", "detail": "Not a member of this conversation."})
            await self.close(code=4003)
            return

        self.user = user
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

    @database_sync_to_async
    def _is_member(self, user):
        from apps.chat.models import ConversationMember
        return ConversationMember.objects.filter(
            conversation_id=self.conversation_id, user=user
        ).exists()

    # ── send message ──────────────────────────────────────────────────────────

    async def _handle_send(self, content):
        msg_type  = content.get("message_type", "text")
        text      = content.get("text", "").strip()
        media_url = content.get("media_url")
        streak_id = content.get("streak_id")

        if msg_type == "text" and not text:
            await self.send_json({"type": "error", "detail": "text is required."})
            return
        if msg_type in ("image", "voice") and not media_url:
            await self.send_json({"type": "error", "detail": "media_url is required."})
            return
        if msg_type == "streak" and not streak_id:
            await self.send_json({"type": "error", "detail": "streak_id is required."})
            return

        msg_data = await self._create_message(msg_type, text, media_url, streak_id)
        await self.channel_layer.group_send(
            self.group_name,
            {"type": "chat.new_message", "message": msg_data},
        )
        # Notify each other member's notification channel so their nav badge
        # and conversation list update instantly without a page refresh.
        await self._push_chat_notifications(msg_data)

    @database_sync_to_async
    def _create_message(self, msg_type, text, media_url, streak_id):
        from apps.chat.models import Message, Conversation
        conv = Conversation.objects.get(id=self.conversation_id)
        msg  = Message.objects.create(
            conversation = conv,
            sender       = self.user,
            message_type = msg_type,
            text         = text or None,
            media_url    = media_url,
            streak_id    = _uuid.UUID(streak_id) if streak_id else None,
        )
        return {
            "id":              str(msg.id),
            "conversation":    str(msg.conversation_id),
            "sender_id":       str(self.user.id),
            "sender_username": self.user.username or "",
            "sender_avatar":   self.user.avatar_url or "",
            "message_type":    msg.message_type,
            "text":            msg.text,
            "media_url":       msg.media_url,
            "streak_id":       str(msg.streak_id) if msg.streak_id else None,
            "is_edited":       False,
            "is_deleted":      False,
            "is_pinned":       False,
            "read_by_count":   0,
            "created_at":      msg.created_at.isoformat(),
        }

    # ── edit message ──────────────────────────────────────────────────────────

    async def _handle_edit(self, content):
        message_id = content.get("message_id")
        new_text   = content.get("text", "").strip()
        if not message_id or not new_text:
            await self.send_json({"type": "error", "detail": "message_id and text are required."})
            return

        result = await self._edit_message(message_id, new_text)
        if result is None:
            await self.send_json({"type": "error", "detail": "Message not found or not editable."})
            return

        await self.channel_layer.group_send(
            self.group_name,
            {"type": "chat.edited_message", "message": result},
        )

    @database_sync_to_async
    def _edit_message(self, message_id, new_text):
        from apps.chat.models import Message
        try:
            msg = Message.objects.get(
                id=message_id,
                conversation_id=self.conversation_id,
                sender=self.user,
                is_deleted=False,
                message_type=Message.MessageType.TEXT,
            )
        except Message.DoesNotExist:
            return None
        msg.text      = new_text
        msg.is_edited = True
        msg.edited_at = timezone.now()
        msg.save(update_fields=["text", "is_edited", "edited_at"])
        return {
            "id":        str(msg.id),
            "text":      msg.text,
            "is_edited": True,
            "edited_at": msg.edited_at.isoformat(),
        }

    # ── delete message ────────────────────────────────────────────────────────

    async def _handle_delete(self, content):
        message_id = content.get("message_id")
        if not message_id:
            await self.send_json({"type": "error", "detail": "message_id is required."})
            return

        ok = await self._delete_message(message_id)
        if not ok:
            await self.send_json({"type": "error", "detail": "Message not found or not deletable."})
            return

        await self.channel_layer.group_send(
            self.group_name,
            {"type": "chat.deleted_message", "message_id": message_id},
        )

    @database_sync_to_async
    def _delete_message(self, message_id):
        from apps.chat.models import Message, ConversationMember
        try:
            msg = Message.objects.get(
                id=message_id,
                conversation_id=self.conversation_id,
                is_deleted=False,
            )
        except Message.DoesNotExist:
            return False
        is_sender = msg.sender_id == self.user.id
        is_admin  = ConversationMember.objects.filter(
            conversation_id=self.conversation_id, user=self.user, is_admin=True
        ).exists()
        if not is_sender and not is_admin:
            return False
        msg.is_deleted = True
        msg.deleted_at = timezone.now()
        msg.text       = None
        msg.media_url  = None
        msg.save(update_fields=["is_deleted", "deleted_at", "text", "media_url"])
        return True

    # ── chat notification push ────────────────────────────────────────────────

    async def _push_chat_notifications(self, msg_data):
        """
        Push a lightweight notification.new event to every other member's
        notification channel so their badge and conversation list update live.
        No DB record is created — this is a transient WS push only.
        """
        try:
            from consumers.notifications import user_group
            member_ids = await self._get_other_member_ids()
            if msg_data.get("message_type") == "image":
                body = "📷 Photo"
            elif msg_data.get("message_type") == "voice":
                body = "🎵 Voice message"
            else:
                body = msg_data.get("text") or ""
            payload = {
                "type": "notification.new",
                "notification": {
                    "id":                f"chatmsg-{msg_data['id']}",
                    "notification_type": "chat_message",
                    "title":             msg_data.get("sender_username") or "New message",
                    "body":              body,
                    "is_read":           False,
                    "created_at":        msg_data["created_at"],
                    "data":              {"conversation_id": str(self.conversation_id)},
                    "sender_id":         msg_data["sender_id"],
                    "sender_username":   msg_data.get("sender_username", ""),
                    "sender_avatar":     msg_data.get("sender_avatar", ""),
                },
            }
            for uid in member_ids:
                await self.channel_layer.group_send(user_group(str(uid)), payload)
        except Exception:
            pass  # never let notification errors break message delivery

    @database_sync_to_async
    def _get_other_member_ids(self):
        from apps.chat.models import ConversationMember
        return list(
            ConversationMember.objects.filter(
                conversation_id=self.conversation_id,
            ).exclude(user=self.user).values_list("user_id", flat=True)
        )

    # ── typing indicators ─────────────────────────────────────────────────────

    async def _handle_typing_start(self, _content):
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type":      "typing",
                "user_id":   str(self.user.id),
                "username":  self.user.username or "",
                "is_typing": True,
            },
        )

    async def _handle_typing_stop(self, _content):
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type":      "typing",
                "user_id":   str(self.user.id),
                "username":  self.user.username or "",
                "is_typing": False,
            },
        )

    # ── mark read ─────────────────────────────────────────────────────────────

    async def _handle_read_mark(self, _content):
        await self._update_last_read()
        # Tell every other member in the room that this user has now read everything
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type":    "chat.read_update",
                "user_id": str(self.user.id),
            },
        )

    @database_sync_to_async
    def _update_last_read(self):
        from apps.chat.models import ConversationMember
        ConversationMember.objects.filter(
            conversation_id=self.conversation_id, user=self.user
        ).update(last_read_at=timezone.now())

    # ── channel layer → individual client ─────────────────────────────────────

    async def chat_new_message(self, event):
        await self.send_json({"type": "message.new", "message": event["message"]})

    async def chat_edited_message(self, event):
        await self.send_json({"type": "message.edited", "message": event["message"]})

    async def chat_deleted_message(self, event):
        await self.send_json({"type": "message.deleted", "message_id": event["message_id"]})

    async def chat_read_update(self, event):
        # Don't echo back to the person who just read
        if event["user_id"] == str(getattr(self.user, "id", None)):
            return
        await self.send_json({"type": "message.read", "reader_id": event["user_id"]})

    async def typing(self, event):
        # Don't echo the typing event back to the sender
        if event["user_id"] == str(getattr(self.user, "id", None)):
            return
        await self.send_json({
            "type":      "typing",
            "user_id":   event["user_id"],
            "username":  event["username"],
            "is_typing": event["is_typing"],
        })
