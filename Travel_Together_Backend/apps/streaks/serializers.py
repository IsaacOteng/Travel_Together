from rest_framework import serializers
from .models import Streak, StreakReaction


class StreakReactionSerializer(serializers.ModelSerializer):
    username   = serializers.CharField(source="user.username",   read_only=True)
    avatar_url = serializers.CharField(source="user.avatar_url", read_only=True)

    class Meta:
        model  = StreakReaction
        fields = ["user", "username", "avatar_url", "reaction", "reacted_at"]
        read_only_fields = fields


class StreakSerializer(serializers.ModelSerializer):
    uploader_username  = serializers.CharField(source="user.username",   read_only=True)
    uploader_avatar    = serializers.CharField(source="user.avatar_url", read_only=True)
    stop_name          = serializers.CharField(source="stop.name",       read_only=True, allow_null=True)
    latitude           = serializers.FloatField(source="location.y",     read_only=True)
    longitude          = serializers.FloatField(source="location.x",     read_only=True)
    my_reaction        = serializers.SerializerMethodField()
    reaction_summary   = serializers.SerializerMethodField()

    class Meta:
        model  = Streak
        fields = [
            "id", "trip", "stop", "stop_name",
            "uploader_username", "uploader_avatar",
            "video_url", "thumbnail_url", "duration_seconds",
            "latitude", "longitude", "accuracy_meters",
            "geofence_validated", "is_in_recap",
            "engagement_count", "my_reaction", "reaction_summary",
            "created_at",
        ]
        read_only_fields = fields

    def get_my_reaction(self, obj):
        request = self.context.get("request")
        if not request:
            return None
        r = obj.reactions.filter(user=request.user).first()
        return r.reaction if r else None

    def get_reaction_summary(self, obj):
        from django.db.models import Count
        counts = obj.reactions.values("reaction").annotate(count=Count("reaction"))
        return {entry["reaction"]: entry["count"] for entry in counts}


class StreakUploadSerializer(serializers.Serializer):
    video          = serializers.FileField()
    latitude       = serializers.FloatField()
    longitude      = serializers.FloatField()
    accuracy_meters = serializers.FloatField(required=False, allow_null=True)
    stop_id        = serializers.UUIDField(required=False, allow_null=True)

    def validate_video(self, file):
        allowed = {"video/mp4", "video/quicktime", "video/webm", "video/x-m4v"}
        ct = getattr(file, "content_type", "")
        if ct and ct not in allowed:
            raise serializers.ValidationError(
                f"Unsupported format: {ct}. Use MP4, MOV, or WebM."
            )
        if file.size > 50 * 1024 * 1024:
            raise serializers.ValidationError("Video exceeds the 50 MB limit.")
        return file


class ReactSerializer(serializers.Serializer):
    reaction = serializers.ChoiceField(choices=StreakReaction.Reaction.choices)
