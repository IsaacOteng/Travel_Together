import uuid
from django.contrib.gis.db import models


# ─── Conversation ─────────────────────────────────────────────────────────────

class Conversation(models.Model):
    class Type(models.TextChoices):
        DM    = "dm",    "Direct Message"
        GROUP = "group", "Group"

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    type       = models.CharField(max_length=10, choices=Type.choices)
    trip       = models.ForeignKey(
                    "trips.Trip",
                    on_delete=models.CASCADE,
                    null=True,
                    blank=True,
                    related_name="group_chats",
                )                                  # NULL for DMs; set for trip group chats
    name       = models.CharField(max_length=100, null=True, blank=True)
    cover_url  = models.TextField(null=True, blank=True)
    created_by = models.ForeignKey(
                    "users.User",
                    on_delete=models.SET_NULL,
                    null=True,
                    related_name="created_conversations",
                )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table   = "chat_conversation"
        verbose_name = "Conversation"

    def __str__(self):
        return f"{self.type} — {self.name or self.id}"


# ─── Conversation Member ──────────────────────────────────────────────────────

class ConversationMember(models.Model):
    conversation  = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="memberships")
    user          = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="conversations")
    is_admin      = models.BooleanField(default=False)
    last_read_at  = models.DateTimeField(null=True, blank=True)   # used for unread count
    is_muted      = models.BooleanField(default=False)
    muted_until   = models.DateTimeField(null=True, blank=True)
    joined_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table      = "chat_conversationmember"
        verbose_name  = "Conversation Member"
        unique_together = [("conversation", "user")]

    def __str__(self):
        return f"{self.user.email} in {self.conversation_id}"


# ─── Message ──────────────────────────────────────────────────────────────────

class Message(models.Model):
    class MessageType(models.TextChoices):
        TEXT        = "text",        "Text"
        IMAGE       = "image",       "Image"
        VOICE       = "voice",       "Voice"
        LOCATION    = "location",    "Location"
        STREAK      = "streak",      "Streak"
        POLL_RESULT = "poll_result", "Poll Result"
        SYSTEM      = "system",      "System"

    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation     = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    sender           = models.ForeignKey(
                            "users.User",
                            on_delete=models.SET_NULL,
                            null=True,
                            related_name="sent_messages",
                        )
    message_type     = models.CharField(max_length=15, choices=MessageType.choices, default=MessageType.TEXT)
    text             = models.TextField(null=True, blank=True)
    media_url        = models.TextField(null=True, blank=True)
    duration_seconds = models.IntegerField(null=True, blank=True)  # voice messages
    location         = models.PointField(null=True, blank=True)    # location-share messages
    location_address = models.CharField(max_length=300, null=True, blank=True)
    # Plain UUIDField — NOT a FK. Deleted streaks must not cascade-delete chat history.
    # Serializer resolves to streak data or null at read time.
    streak_id        = models.UUIDField(null=True, blank=True)
    is_edited        = models.BooleanField(default=False)
    edited_at        = models.DateTimeField(null=True, blank=True)
    is_deleted       = models.BooleanField(default=False)
    deleted_at       = models.DateTimeField(null=True, blank=True)
    is_pinned        = models.BooleanField(default=False)
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table   = "chat_message"
        verbose_name = "Message"
        indexes    = [
            models.Index(fields=["conversation", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.message_type} from {self.sender_id} in {self.conversation_id}"


# ─── Message Read Receipt ─────────────────────────────────────────────────────

class MessageReadReceipt(models.Model):
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="read_receipts")
    user    = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="read_receipts")
    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table      = "chat_messagereadreceipt"
        verbose_name  = "Message Read Receipt"
        unique_together = [("message", "user")]

    def __str__(self):
        return f"{self.user.email} read {self.message_id}"
