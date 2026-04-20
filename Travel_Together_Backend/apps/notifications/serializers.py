from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    sender_id       = serializers.UUIDField(source="sender.id",         read_only=True, allow_null=True)
    sender_username = serializers.CharField(source="sender.username",   read_only=True, allow_null=True)
    sender_avatar   = serializers.CharField(source="sender.avatar_url", read_only=True, allow_null=True)
    sender_name     = serializers.SerializerMethodField()

    def get_sender_name(self, obj):
        if not obj.sender:
            return None
        return obj.sender.first_name or obj.sender.username or None

    class Meta:
        model  = Notification
        fields = [
            "id", "notification_type", "title", "body",
            "action_url", "is_read", "trip",
            "sender_id", "sender_username", "sender_name", "sender_avatar",
            "data", "created_at",
        ]
        read_only_fields = fields
