from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from unfold.decorators import display

from .models import Streak, StreakReaction


class StreakReactionInline(TabularInline):
    model       = StreakReaction
    extra       = 0
    raw_id_fields = ("user",)
    readonly_fields = ("reacted_at",)
    fields      = ("user", "reaction", "reacted_at")


@admin.register(Streak)
class StreakAdmin(ModelAdmin):
    list_display    = ("user", "trip", "duration_seconds", "engagement_count", "validated_badge", "recap_badge", "created_at")
    list_filter     = ("geofence_validated", "is_in_recap")
    search_fields   = ("user__email", "trip__title")
    raw_id_fields   = ("trip", "user", "stop")
    readonly_fields = ("id", "created_at", "video_key")
    ordering        = ("-created_at",)
    inlines         = [StreakReactionInline]

    @display(description="Validated", label={"Yes": "success", "No": "danger"})
    def validated_badge(self, obj):
        return "Yes" if obj.geofence_validated else "No"

    @display(description="In recap", label={"Yes": "info", "No": "default"})
    def recap_badge(self, obj):
        return "Yes" if obj.is_in_recap else "No"


@admin.register(StreakReaction)
class StreakReactionAdmin(ModelAdmin):
    list_display    = ("streak", "user", "reaction_badge", "reacted_at")
    list_filter     = ("reaction",)
    search_fields   = ("user__email",)
    raw_id_fields   = ("streak", "user")
    readonly_fields = ("reacted_at",)
    ordering        = ("-reacted_at",)

    @display(description="Reaction", label={"like": "info", "fire": "danger", "heart": "warning", "wow": "success"})
    def reaction_badge(self, obj):
        return obj.reaction
