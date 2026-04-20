from rest_framework import serializers
from .models import Conversation, ConversationMember, Message, MessageReadReceipt


# ─── Member snapshot ──────────────────────────────────────────────────────────

class ConversationMemberSerializer(serializers.ModelSerializer):
    user_id    = serializers.UUIDField(source="user.id",         read_only=True)
    username   = serializers.CharField(source="user.username",   read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name  = serializers.CharField(source="user.last_name",  read_only=True)
    avatar_url = serializers.CharField(source="user.avatar_url", read_only=True)

    class Meta:
        model  = ConversationMember
        fields = [
            "user_id", "username", "first_name", "last_name", "avatar_url",
            "is_admin", "is_muted", "last_read_at", "joined_at",
        ]
        read_only_fields = fields


# ─── Message ──────────────────────────────────────────────────────────────────

class MessageSerializer(serializers.ModelSerializer):
    sender_id      = serializers.UUIDField(source="sender.id",         read_only=True)
    sender_username = serializers.CharField(source="sender.username",  read_only=True)
    sender_avatar  = serializers.CharField(source="sender.avatar_url", read_only=True)
    read_by_count  = serializers.SerializerMethodField()

    class Meta:
        model  = Message
        fields = [
            "id", "conversation",
            "sender_id", "sender_username", "sender_avatar",
            "message_type", "text", "media_url",
            "duration_seconds", "location_address",
            "streak_id", "is_edited", "edited_at",
            "is_deleted", "is_pinned",
            "read_by_count", "created_at",
        ]
        read_only_fields = fields

    def get_read_by_count(self, obj):
        return obj.read_receipts.count()


class MessageSendSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Message
        fields = ["message_type", "text", "media_url", "duration_seconds", "streak_id"]
        extra_kwargs = {
            "message_type": {"default": Message.MessageType.TEXT},
            "text":         {"required": False, "allow_blank": False},
            "media_url":    {"required": False},
            "duration_seconds": {"required": False},
            "streak_id":    {"required": False},
        }

    def validate(self, data):
        msg_type = data.get("message_type", Message.MessageType.TEXT)
        if msg_type == Message.MessageType.TEXT and not data.get("text"):
            raise serializers.ValidationError("text is required for text messages.")
        if msg_type in (Message.MessageType.IMAGE, Message.MessageType.VOICE) and not data.get("media_url"):
            raise serializers.ValidationError("media_url is required for image/voice messages.")
        if msg_type == Message.MessageType.STREAK and not data.get("streak_id"):
            raise serializers.ValidationError("streak_id is required for streak messages.")
        return data


# ─── Conversation ─────────────────────────────────────────────────────────────

class ConversationListSerializer(serializers.ModelSerializer):
    last_message   = serializers.SerializerMethodField()
    unread_count   = serializers.SerializerMethodField()
    member_count   = serializers.SerializerMethodField()
    other_user     = serializers.SerializerMethodField()  # DM only

    class Meta:
        model  = Conversation
        fields = [
            "id", "type", "name", "cover_url", "trip",
            "last_message", "unread_count", "member_count", "other_user",
            "created_at",
        ]

    def get_last_message(self, obj):
        msg = obj.messages.filter(is_deleted=False).order_by("-created_at").first()
        if not msg:
            return None
        return {
            "id":              str(msg.id),
            "message_type":    msg.message_type,
            "text":            msg.text,
            "sender_id":       str(msg.sender_id) if msg.sender_id else None,
            "sender_username": msg.sender.username if msg.sender_id else None,
            "created_at":      msg.created_at.isoformat(),
        }

    def get_unread_count(self, obj):
        request = self.context.get("request")
        if not request:
            return 0
        membership = obj.memberships.filter(user=request.user).first()
        if not membership:
            return 0
        baseline = membership.last_read_at or membership.joined_at
        return obj.messages.filter(
            created_at__gt=baseline, is_deleted=False
        ).exclude(sender=request.user).count()

    def get_member_count(self, obj):
        return obj.memberships.count()

    def get_other_user(self, obj):
        request = self.context.get("request")
        if obj.type != Conversation.Type.DM or not request:
            return None
        other = obj.memberships.exclude(user=request.user).select_related("user").first()
        if not other:
            return None
        u = other.user
        return {
            "id":         str(u.id),
            "username":   u.username,
            "first_name": u.first_name,
            "last_name":  u.last_name,
            "avatar_url": u.avatar_url,
        }


class ConversationDetailSerializer(ConversationListSerializer):
    members = ConversationMemberSerializer(source="memberships", many=True, read_only=True)

    class Meta(ConversationListSerializer.Meta):
        fields = ConversationListSerializer.Meta.fields + ["members"]


# ─── Create DM ────────────────────────────────────────────────────────────────

class DMCreateSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()

    def validate_user_id(self, value):
        from apps.users.models import User
        if not User.objects.filter(id=value).exists():
            raise serializers.ValidationError("User not found.")
        return value
