import uuid
from django.db import models


# ─── Notification ─────────────────────────────────────────────────────────────

class Notification(models.Model):
    class NotificationType(models.TextChoices):
        SOS_ALERT         = "sos_alert",         "SOS Alert"
        JOIN_REQUEST      = "join_request",      "Join Request"
        APPROVED          = "approved",          "Join Approved"
        CHAT_MESSAGE      = "chat_message",      "Chat Message"
        KARMA_LEVEL       = "karma_level",       "Karma Level Up"
        TRIP_REMINDER     = "trip_reminder",     "Trip Reminder"
        PROXIMITY_WARNING = "proximity_warning", "Proximity Warning"
        TRIP_ENDED        = "trip_ended",        "Trip Ended"
        REVIEW_REMINDER   = "review_reminder",   "Review Reminder"

    id                = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient         = models.ForeignKey(
                            "users.User",
                            on_delete=models.CASCADE,
                            related_name="notifications",
                            )
    sender            = models.ForeignKey(
                            "users.User",
                            on_delete=models.SET_NULL,
                            null=True,
                            blank=True,
                            related_name="notifications_sent",
                            )
    notification_type = models.CharField(max_length=25, choices=NotificationType.choices)
    title             = models.CharField(max_length=200)
    body              = models.TextField()
    action_url        = models.CharField(max_length=500, null=True, blank=True)
    is_read           = models.BooleanField(default=False)
    trip              = models.ForeignKey(
                            "trips.Trip",
                            on_delete=models.SET_NULL,
                            null=True,
                            blank=True,
                            related_name="notifications",
                            )
    data              = models.JSONField(default=dict)   # extra payload (alert id, badge slug, etc.)
    created_at        = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table   = "notifications_notification"
        verbose_name = "Notification"
        indexes    = [
            models.Index(fields=["recipient", "is_read", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.notification_type} → {self.recipient.email}"
