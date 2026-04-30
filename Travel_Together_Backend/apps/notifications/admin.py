from django.contrib import admin
from unfold.admin import ModelAdmin
from unfold.decorators import display

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(ModelAdmin):
    list_display    = ("type_badge", "recipient", "sender", "title", "read_badge", "created_at")
    list_filter     = ("notification_type", "is_read")
    search_fields   = ("recipient__email", "sender__email", "title", "body")
    raw_id_fields   = ("recipient", "sender", "trip")
    readonly_fields = ("id", "created_at")
    ordering        = ("-created_at",)

    @display(description="Type", label={
        "sos_alert":         "danger",
        "join_request":      "info",
        "join_approved":     "success",
        "join_declined":     "danger",
        "approved":          "success",
        "chat_message":      "default",
        "karma_level":       "warning",
        "trip_reminder":     "info",
        "proximity_warning": "warning",
        "trip_ended":        "default",
        "review_reminder":   "info",
    })
    def type_badge(self, obj):
        return obj.notification_type

    @display(description="Read", label={"Read": "success", "Unread": "warning"})
    def read_badge(self, obj):
        return "Read" if obj.is_read else "Unread"
