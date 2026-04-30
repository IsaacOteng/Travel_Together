from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from unfold.decorators import display

from .models import SOSAlert, SOSAction


class SOSActionInline(TabularInline):
    model           = SOSAction
    extra           = 0
    raw_id_fields   = ("taken_by",)
    readonly_fields = ("created_at",)
    fields          = ("taken_by", "action", "notes", "created_at")


@admin.register(SOSAlert)
class SOSAlertAdmin(ModelAdmin):
    list_display    = ("member", "trip", "trigger_badge", "status_badge", "emergency_contact_notified", "chief_notified", "created_at", "resolved_at")
    list_filter     = ("trigger_type", "status", "emergency_contact_notified", "chief_notified")
    search_fields   = ("member__email", "member__username", "trip__title")
    raw_id_fields   = ("trip", "member", "resolved_by")
    readonly_fields = ("id", "created_at", "resolved_at")
    ordering        = ("-created_at",)
    inlines         = [SOSActionInline]

    fieldsets = (
        ("Alert",        {"fields": ("id", "trip", "member", "trigger_type", "status")}),
        ("Details",      {"fields": ("accuracy_meters", "deviation_distance_m", "stationary_minutes")}),
        ("Notification", {"fields": ("emergency_contact_notified", "chief_notified")}),
        ("Resolution",   {"fields": ("resolved_by", "resolved_at", "resolution_notes")}),
        ("Timestamps",   {"fields": ("created_at",)}),
    )

    @display(description="Trigger", label={"Manual": "danger", "Stationary": "warning", "Route Deviation": "info"})
    def trigger_badge(self, obj):
        return obj.get_trigger_type_display()

    @display(description="Status", label={"active": "danger", "resolved": "success", "false_alarm": "default"})
    def status_badge(self, obj):
        return obj.status


@admin.register(SOSAction)
class SOSActionAdmin(ModelAdmin):
    list_display    = ("alert", "taken_by", "action_badge", "created_at")
    list_filter     = ("action",)
    search_fields   = ("taken_by__email", "alert__id")
    raw_id_fields   = ("alert", "taken_by")
    readonly_fields = ("created_at",)
    ordering        = ("-created_at",)

    @display(description="Action", label={
        "called_member":  "info",
        "called_contact": "warning",
        "sent_location":  "default",
        "marked_safe":    "success",
        "escalated":      "danger",
    })
    def action_badge(self, obj):
        return obj.action
