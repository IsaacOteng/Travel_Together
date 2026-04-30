from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from unfold.decorators import display

from .models import (
    Trip, TripImage, TripTag, TripPriceCover,
    TripMember, ItineraryStop, CheckIn,
    TripRating, IncidentReport, SavedTrip,
)


class TripMemberInline(TabularInline):
    model               = TripMember
    extra               = 0
    readonly_fields     = ("requested_at", "approved_at")
    raw_id_fields       = ("user", "approved_by")
    fields              = ("user", "role", "status", "karma_earned", "requested_at", "approved_at")
    verbose_name        = "Member"
    verbose_name_plural = "Members"
    ordering            = ("role", "status")


class TripImageInline(TabularInline):
    model       = TripImage
    extra       = 0
    fields      = ("image_url", "order")
    readonly_fields = ("image_url",)


class TripTagInline(TabularInline):
    model  = TripTag
    extra  = 1
    fields = ("tag",)


@admin.register(Trip)
class TripAdmin(ModelAdmin):
    list_display    = ("title", "destination", "status_badge", "visibility", "chief", "date_start", "date_end", "member_count", "group_karma", "created_at")
    list_filter     = ("status", "visibility", "drive_time")
    search_fields   = ("title", "destination", "chief__email", "chief__username")
    ordering        = ("-created_at",)
    readonly_fields = ("id", "created_at", "updated_at", "departure_confirmed_at", "ended_at")
    raw_id_fields   = ("chief",)
    inlines         = [TripMemberInline, TripImageInline, TripTagInline]

    fieldsets = (
        ("Basic",      {"fields": ("id", "title", "destination", "description", "cover_url")}),
        ("Schedule",   {"fields": ("date_start", "date_end", "drive_time", "distance_km")}),
        ("Settings",   {"fields": ("status", "visibility", "spots_total", "entry_price", "price_note")}),
        ("Leadership", {"fields": ("chief", "group_karma")}),
        ("Location",   {"fields": ("meeting_point", "meeting_point_coords", "destination_point")}),
        ("Timestamps", {"fields": ("created_at", "updated_at", "departure_confirmed_at", "ended_at")}),
    )

    @display(description="Members")
    def member_count(self, obj):
        return obj.members.filter(status="approved").count()

    @display(description="Status", label={
        "draft":     "default",
        "published": "info",
        "active":    "success",
        "completed": "warning",
        "archived":  "danger",
    })
    def status_badge(self, obj):
        return obj.status


@admin.register(ItineraryStop)
class ItineraryStopAdmin(ModelAdmin):
    list_display  = ("trip", "order", "name", "arrival_time", "duration_minutes", "is_current")
    list_filter   = ("is_current",)
    search_fields = ("trip__title", "name")
    raw_id_fields = ("trip",)
    ordering      = ("trip", "order")


@admin.register(IncidentReport)
class IncidentReportAdmin(ModelAdmin):
    list_display    = ("reference_number", "type_badge", "status_badge", "reporter", "reported_user", "trip", "created_at")
    list_filter     = ("incident_type", "status")
    search_fields   = ("reference_number", "reporter__email", "reported_user__email", "trip__title")
    readonly_fields = ("id", "reference_number", "created_at", "updated_at")
    raw_id_fields   = ("trip", "reporter", "reported_user")
    ordering        = ("-created_at",)

    @display(description="Type", label={
        "safety":         "danger",
        "harassment":     "warning",
        "fraud":          "warning",
        "rule_violation": "info",
        "other":          "default",
    })
    def type_badge(self, obj):
        return obj.incident_type

    @display(description="Status", label={
        "pending":      "warning",
        "under_review": "info",
        "resolved":     "success",
        "dismissed":    "default",
    })
    def status_badge(self, obj):
        return obj.status


@admin.register(TripRating)
class TripRatingAdmin(ModelAdmin):
    list_display  = ("trip", "rater", "rated_user", "overall", "is_anonymous", "created_at")
    list_filter   = ("is_anonymous",)
    search_fields = ("trip__title", "rater__email", "rated_user__email")
    raw_id_fields = ("trip", "rater", "rated_user")
    ordering      = ("-created_at",)


@admin.register(CheckIn)
class CheckInAdmin(ModelAdmin):
    list_display  = ("trip", "member", "stop", "late_badge", "checked_in_at")
    list_filter   = ("is_late",)
    search_fields = ("trip__title", "member__email")
    raw_id_fields = ("trip", "member", "stop")
    ordering      = ("-checked_in_at",)

    @display(description="Late?", label={"Late": "danger", "On time": "success"})
    def late_badge(self, obj):
        return "Late" if obj.is_late else "On time"
