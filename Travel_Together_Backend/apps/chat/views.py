import uuid
from django.db import transaction
from utils.storage import save_image, save_file
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser

from .models import Conversation, ConversationMember, Message, MessageReadReceipt
from .serializers import (
    ConversationListSerializer, ConversationDetailSerializer,
    MessageSerializer, MessageSendSerializer, DMCreateSerializer,
)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_membership(conversation, user):
    return ConversationMember.objects.filter(conversation=conversation, user=user).first()


def _require_member(conversation, user):
    m = _get_membership(conversation, user)
    if not m:
        return None, Response({"detail": "Not a member of this conversation."}, status=403)
    return m, None


# ─── Conversation list + create DM ───────────────────────────────────────────

class ConversationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """All conversations the user belongs to, ordered by most recent message."""
        conv_ids = ConversationMember.objects.filter(user=request.user).values_list(
            "conversation_id", flat=True
        )
        convs = (
            Conversation.objects
            .filter(id__in=conv_ids)
            .prefetch_related("memberships__user", "messages")
            .order_by("-created_at")
        )
        return Response(ConversationListSerializer(convs, many=True, context={"request": request}).data)

    def post(self, request):
        """Start a DM with another user. Returns existing DM if one already exists."""
        serializer = DMCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        other_id = serializer.validated_data["user_id"]
        if str(other_id) == str(request.user.id):
            return Response({"detail": "You cannot DM yourself."}, status=400)

        # Find existing DM between the two users
        my_convs = ConversationMember.objects.filter(
            user=request.user, conversation__type=Conversation.Type.DM
        ).values_list("conversation_id", flat=True)
        existing = ConversationMember.objects.filter(
            user_id=other_id, conversation_id__in=my_convs
        ).select_related("conversation").first()

        if existing:
            conv = existing.conversation
            return Response(
                ConversationDetailSerializer(conv, context={"request": request}).data,
                status=200,
            )

        with transaction.atomic():
            conv = Conversation.objects.create(
                type=Conversation.Type.DM,
                created_by=request.user,
            )
            ConversationMember.objects.bulk_create([
                ConversationMember(conversation=conv, user=request.user, is_admin=True),
                ConversationMember(conversation=conv, user_id=other_id),
            ])

        return Response(
            ConversationDetailSerializer(conv, context={"request": request}).data,
            status=201,
        )


# ─── Conversation detail ──────────────────────────────────────────────────────

class ConversationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, conversation_id):
        try:
            conv = Conversation.objects.prefetch_related("memberships__user", "messages").get(
                id=conversation_id
            )
        except Conversation.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        _, err = _require_member(conv, request.user)
        if err:
            return err
        return Response(ConversationDetailSerializer(conv, context={"request": request}).data)

    def patch(self, request, conversation_id):
        """Update name / cover_url (group only, admin only)."""
        try:
            conv = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        membership, err = _require_member(conv, request.user)
        if err:
            return err
        if conv.type != Conversation.Type.GROUP:
            return Response({"detail": "Only group conversations can be renamed."}, status=400)
        if not membership.is_admin:
            return Response({"detail": "Only admins can edit this conversation."}, status=403)

        for field in ("name", "cover_url"):
            if field in request.data:
                setattr(conv, field, request.data[field])
        conv.save()
        return Response(ConversationDetailSerializer(conv, context={"request": request}).data)


# ─── Message list + send ──────────────────────────────────────────────────────

class MessageListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, conversation_id):
        """Paginated message history (cursor). Pass ?before=<message_id> to page back."""
        try:
            conv = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        _, err = _require_member(conv, request.user)
        if err:
            return err

        qs = conv.messages.order_by("-created_at")  # include deleted — frontend shows placeholder

        before = request.query_params.get("before")
        if before:
            try:
                pivot = Message.objects.get(id=before, conversation=conv)
                qs = qs.filter(created_at__lt=pivot.created_at)
            except Message.DoesNotExist:
                pass

        limit    = min(int(request.query_params.get("limit", 50)), 100)
        messages = list(qs[:limit])

        # Bulk-create read receipts for messages the caller hasn't read yet
        existing_receipts = set(
            MessageReadReceipt.objects.filter(
                message__in=messages, user=request.user
            ).values_list("message_id", flat=True)
        )
        new_receipts = [
            MessageReadReceipt(message=m, user=request.user)
            for m in messages
            if m.id not in existing_receipts and m.sender_id != request.user.id and not m.is_deleted
        ]
        if new_receipts:
            MessageReadReceipt.objects.bulk_create(new_receipts, ignore_conflicts=True)

        if messages:
            ConversationMember.objects.filter(
                conversation=conv, user=request.user
            ).update(last_read_at=timezone.now())

        return Response({
            "results":  MessageSerializer(reversed(messages), many=True).data,
            "has_more": qs.count() > limit,
        })

    def post(self, request, conversation_id):
        """Send a message via REST (WebSocket preferred; this is the REST fallback)."""
        try:
            conv = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        _, err = _require_member(conv, request.user)
        if err:
            return err

        serializer = MessageSendSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        msg = Message.objects.create(
            conversation=conv,
            sender=request.user,
            **serializer.validated_data,
        )
        return Response(MessageSerializer(msg).data, status=201)


# ─── Message detail (edit / delete) ──────────────────────────────────────────

class MessageDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_msg(self, conversation_id, message_id):
        try:
            return Message.objects.select_related("conversation").get(
                id=message_id, conversation_id=conversation_id, is_deleted=False
            )
        except Message.DoesNotExist:
            return None

    def patch(self, request, conversation_id, message_id):
        """Edit message text (sender only, text messages only)."""
        msg = self._get_msg(conversation_id, message_id)
        if not msg:
            return Response({"detail": "Not found."}, status=404)
        if msg.sender_id != request.user.id:
            return Response({"detail": "You can only edit your own messages."}, status=403)
        if msg.message_type != Message.MessageType.TEXT:
            return Response({"detail": "Only text messages can be edited."}, status=400)

        text = request.data.get("text", "").strip()
        if not text:
            return Response({"detail": "text cannot be empty."}, status=400)

        msg.text      = text
        msg.is_edited = True
        msg.edited_at = timezone.now()
        msg.save(update_fields=["text", "is_edited", "edited_at"])
        return Response(MessageSerializer(msg).data)

    def delete(self, request, conversation_id, message_id):
        """Soft-delete. Sender can delete their own; admins can delete any."""
        msg = self._get_msg(conversation_id, message_id)
        if not msg:
            return Response({"detail": "Not found."}, status=404)

        membership = _get_membership(msg.conversation, request.user)
        is_sender  = msg.sender_id == request.user.id
        is_admin   = membership and membership.is_admin

        if not is_sender and not is_admin:
            return Response({"detail": "Not authorised to delete this message."}, status=403)

        msg.is_deleted = True
        msg.deleted_at = timezone.now()
        msg.text       = None
        msg.media_url  = None
        msg.save(update_fields=["is_deleted", "deleted_at", "text", "media_url"])
        return Response(status=204)


# ─── Pin a message ────────────────────────────────────────────────────────────

class MessagePinView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, conversation_id, message_id):
        try:
            conv = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        membership, err = _require_member(conv, request.user)
        if err:
            return err
        if not membership.is_admin:
            return Response({"detail": "Only admins can pin messages."}, status=403)
        try:
            msg = Message.objects.get(id=message_id, conversation=conv, is_deleted=False)
        except Message.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        msg.is_pinned = not msg.is_pinned
        msg.save(update_fields=["is_pinned"])
        return Response({"is_pinned": msg.is_pinned})


# ─── Mark conversation as read ────────────────────────────────────────────────

class MarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, conversation_id):
        try:
            conv = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        _, err = _require_member(conv, request.user)
        if err:
            return err
        ConversationMember.objects.filter(
            conversation=conv, user=request.user
        ).update(last_read_at=timezone.now())
        return Response({"ok": True})


# ─── Mute / unmute ────────────────────────────────────────────────────────────

class MuteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, conversation_id):
        try:
            conv = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        membership, err = _require_member(conv, request.user)
        if err:
            return err
        membership.is_muted    = True
        membership.muted_until = request.data.get("muted_until")
        membership.save(update_fields=["is_muted", "muted_until"])
        return Response({"is_muted": True})

    def delete(self, request, conversation_id):
        try:
            conv = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        membership, err = _require_member(conv, request.user)
        if err:
            return err
        membership.is_muted    = False
        membership.muted_until = None
        membership.save(update_fields=["is_muted", "muted_until"])
        return Response({"is_muted": False})


# ─── Media upload ─────────────────────────────────────────────────────────────

class ChatMediaUploadView(APIView):
    """
    POST /api/conversations/<id>/upload/
    Accepts a single file under the key `file`.
    Returns { "media_url": "...", "message_type": "image"|"voice" }
    Then use media_url when sending a message.
    """
    permission_classes = [IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser]

    ALLOWED_IMAGE = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    ALLOWED_VOICE = {"audio/mpeg", "audio/mp4", "audio/ogg", "audio/webm", "audio/wav", "audio/aac"}
    MAX_IMAGE_SIZE = 10 * 1024 * 1024   # 10 MB
    MAX_VOICE_SIZE = 25 * 1024 * 1024   # 25 MB

    def post(self, request, conversation_id):
        try:
            conv = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        _, err = _require_member(conv, request.user)
        if err:
            return err

        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "No file provided. Use key 'file'."}, status=400)

        content_type = getattr(file, "content_type", "")

        if content_type in self.ALLOWED_IMAGE:
            if file.size > self.MAX_IMAGE_SIZE:
                return Response({"detail": "Image exceeds 10 MB limit."}, status=400)
            message_type = "image"
            subfolder    = "chat/images"
        elif content_type in self.ALLOWED_VOICE:
            if file.size > self.MAX_VOICE_SIZE:
                return Response({"detail": "Voice message exceeds 25 MB limit."}, status=400)
            message_type = "voice"
            subfolder    = "chat/voice"
        else:
            return Response(
                {"detail": f"Unsupported file type: {content_type}. Allowed: images and audio."},
                status=400,
            )

        if message_type == "image":
            key       = f"{subfolder}/{conversation_id}/{uuid.uuid4().hex}.jpg"
            media_url = save_image(file, key, max_px=2000, request=request)
        else:
            ext       = ".m4a"
            key       = f"{subfolder}/{conversation_id}/{uuid.uuid4().hex}{ext}"
            media_url = save_file(file, key, request=request)

        return Response({"media_url": media_url, "message_type": message_type}, status=201)
