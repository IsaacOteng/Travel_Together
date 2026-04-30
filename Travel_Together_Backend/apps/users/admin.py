from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from unfold.admin import ModelAdmin, TabularInline
from unfold.decorators import display

from .models import User, EmergencyContact, NotificationSettings, UserPreferences, EmailVerification


class EmergencyContactInline(TabularInline):
    model  = EmergencyContact
    extra  = 0
    fields = ("name", "relationship", "phone", "priority", "is_verified")
    readonly_fields = ("is_verified",)


@admin.register(User)
class UserAdmin(ModelAdmin, BaseUserAdmin):
    list_display    = ("email", "username", "full_name", "karma_level_badge", "travel_karma", "status_badge", "is_verified_traveller", "created_at")
    list_filter     = ("is_staff", "is_active", "karma_level", "is_verified_traveller", "onboarding_complete", "gender")
    search_fields   = ("email", "username", "first_name", "last_name", "phone_number")
    ordering        = ("-created_at",)
    readonly_fields = ("id", "created_at", "updated_at", "last_seen")
    filter_horizontal  = ()
    list_display_links = ("email",)
    inlines            = [EmergencyContactInline]

    fieldsets = (
        ("Identity",    {"fields": ("id", "email", "username", "first_name", "last_name", "date_of_birth", "gender", "nationality")}),
        ("Contact",     {"fields": ("dial_code", "phone_number", "city", "country")}),
        ("Profile",     {"fields": ("bio", "avatar_url", "cover_url")}),
        ("Karma",       {"fields": ("travel_karma", "karma_level")}),
        ("Auth",        {"fields": ("google_uid", "apple_uid", "email_verified", "is_verified_traveller", "onboarding_complete", "two_factor_enabled")}),
        ("Permissions", {"fields": ("is_active", "is_staff")}),
        ("Safety",      {"fields": ("sos_sensitivity", "location_mode")}),
        ("Timestamps",  {"fields": ("created_at", "updated_at", "last_seen", "deactivated_at")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "is_staff", "is_active")}),
    )

    @display(description="Name")
    def full_name(self, obj):
        return f"{obj.first_name or ''} {obj.last_name or ''}".strip() or "—"

    @display(description="Status", label={"Active": "success", "Inactive": "danger"})
    def status_badge(self, obj):
        return "Active" if obj.is_active else "Inactive"

    @display(description="Karma Level", label={
        "Legend":    "warning",
        "Navigator": "info",
        "Explorer":  "default",
    })
    def karma_level_badge(self, obj):
        return obj.karma_level


@admin.register(EmergencyContact)
class EmergencyContactAdmin(ModelAdmin):
    list_display  = ("user", "name", "relationship", "phone", "priority", "is_verified")
    list_filter   = ("relationship", "is_verified")
    search_fields = ("user__email", "name", "phone")
    raw_id_fields = ("user",)


@admin.register(NotificationSettings)
class NotificationSettingsAdmin(ModelAdmin):
    list_display  = ("user", "notif_sos", "notif_chat", "notif_join_requests", "notif_karma")
    search_fields = ("user__email",)
    raw_id_fields = ("user",)


@admin.register(UserPreferences)
class UserPreferencesAdmin(ModelAdmin):
    list_display  = ("user", "trip_types")
    search_fields = ("user__email",)
    raw_id_fields = ("user",)


@admin.register(EmailVerification)
class EmailVerificationAdmin(ModelAdmin):
    list_display    = ("user", "purpose", "used_badge", "attempt_count", "expires_at")
    list_filter     = ("purpose", "is_used")
    search_fields   = ("user__email",)
    readonly_fields = ("id", "expires_at")
    raw_id_fields   = ("user",)

    @display(description="Used", label={"Used": "success", "Pending": "warning"})
    def used_badge(self, obj):
        return "Used" if obj.is_used else "Pending"
