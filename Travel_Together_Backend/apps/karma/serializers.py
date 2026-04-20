from rest_framework import serializers
from .models import KarmaLog, Badge, UserBadge


class KarmaLogSerializer(serializers.ModelSerializer):
    trip_title = serializers.CharField(source="trip.title", read_only=True, allow_null=True)

    class Meta:
        model  = KarmaLog
        fields = ["id", "delta", "reason", "description", "trip", "trip_title", "created_at"]
        read_only_fields = fields


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Badge
        fields = ["slug", "label", "description", "icon", "rarity", "unlock_criteria"]
        read_only_fields = fields


class UserBadgeSerializer(serializers.ModelSerializer):
    slug        = serializers.CharField(source="badge.slug",        read_only=True)
    label       = serializers.CharField(source="badge.label",       read_only=True)
    description = serializers.CharField(source="badge.description", read_only=True)
    icon        = serializers.CharField(source="badge.icon",        read_only=True)
    rarity      = serializers.CharField(source="badge.rarity",      read_only=True)
    trip_title  = serializers.CharField(source="trip.title",        read_only=True, allow_null=True)

    class Meta:
        model  = UserBadge
        fields = ["slug", "label", "description", "icon", "rarity", "trip_title", "earned_at"]
        read_only_fields = fields
