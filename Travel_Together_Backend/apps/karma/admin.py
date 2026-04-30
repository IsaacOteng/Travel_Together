from django.contrib import admin
from unfold.admin import ModelAdmin
from unfold.decorators import display

from .models import KarmaLog, Badge, UserBadge


@admin.register(KarmaLog)
class KarmaLogAdmin(ModelAdmin):
    list_display  = ("user", "delta_display", "reason_badge", "trip", "description", "created_at")
    list_filter   = ("reason",)
    search_fields = ("user__email", "user__username", "description")
    raw_id_fields = ("user", "trip")
    readonly_fields = ("created_at",)
    ordering      = ("-created_at",)

    @display(description="Delta")
    def delta_display(self, obj):
        sign = "+" if obj.delta >= 0 else ""
        return f"{sign}{obj.delta}"

    @display(description="Reason", label={
        "trip_completed":    "success",
        "checkin_ontime":    "info",
        "group_rating":      "warning",
        "streak_engagement": "default",
        "penalty":           "danger",
    })
    def reason_badge(self, obj):
        return obj.reason


@admin.register(Badge)
class BadgeAdmin(ModelAdmin):
    list_display  = ("icon", "label", "slug", "rarity_badge", "holder_count")
    list_filter   = ("rarity",)
    search_fields = ("label", "slug", "description")
    prepopulated_fields = {"slug": ("label",)}

    @display(description="Holders")
    def holder_count(self, obj):
        return obj.holders.count()

    @display(description="Rarity", label={
        "common":    "default",
        "rare":      "info",
        "epic":      "warning",
        "legendary": "danger",
    })
    def rarity_badge(self, obj):
        return obj.rarity


@admin.register(UserBadge)
class UserBadgeAdmin(ModelAdmin):
    list_display    = ("user", "badge", "rarity_badge", "trip", "earned_at")
    list_filter     = ("badge__rarity",)
    search_fields   = ("user__email", "badge__label")
    raw_id_fields   = ("user", "badge", "trip")
    readonly_fields = ("earned_at",)
    ordering        = ("-earned_at",)

    @display(description="Rarity", label={"common": "default", "rare": "info", "epic": "warning", "legendary": "danger"})
    def rarity_badge(self, obj):
        return obj.badge.rarity
