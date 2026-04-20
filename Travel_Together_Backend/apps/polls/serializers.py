from rest_framework import serializers
from django.utils import timezone
from .models import Poll, PollOption, PollVote


class PollOptionSerializer(serializers.ModelSerializer):
    vote_count  = serializers.SerializerMethodField()
    percentage  = serializers.SerializerMethodField()

    class Meta:
        model  = PollOption
        fields = ["id", "text", "order", "vote_count", "percentage"]

    def get_vote_count(self, obj):
        return obj.votes.count()

    def get_percentage(self, obj):
        total = self.context.get("total_votes", 0)
        if not total:
            return 0
        return round((obj.votes.count() / total) * 100, 1)


class PollVoteSerializer(serializers.ModelSerializer):
    username   = serializers.CharField(source="user.username", read_only=True)
    avatar_url = serializers.CharField(source="user.avatar_url", read_only=True)

    class Meta:
        model  = PollVote
        fields = ["user", "username", "avatar_url", "option", "yes_no_value", "rating_value", "voted_at"]
        read_only_fields = fields


class PollSerializer(serializers.ModelSerializer):
    options      = serializers.SerializerMethodField()
    total_votes  = serializers.SerializerMethodField()
    my_vote      = serializers.SerializerMethodField()
    is_expired   = serializers.SerializerMethodField()
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model  = Poll
        fields = [
            "id", "trip", "question", "poll_type",
            "expires_at", "is_locked", "is_expired",
            "time_impact_minutes", "budget_impact_ghs",
            "created_by", "created_by_username", "created_at",
            "options", "total_votes", "my_vote",
        ]
        read_only_fields = [
            "id", "trip", "created_by", "created_by_username",
            "created_at", "is_expired",
        ]

    def get_total_votes(self, obj):
        return obj.votes.count()

    def get_options(self, obj):
        total = obj.votes.count()
        return PollOptionSerializer(
            obj.options.all(), many=True, context={"total_votes": total}
        ).data

    def get_my_vote(self, obj):
        request = self.context.get("request")
        if not request:
            return None
        vote = obj.votes.filter(user=request.user).first()
        if not vote:
            return None
        if obj.poll_type == Poll.PollType.YES_NO:
            return {"yes_no_value": vote.yes_no_value}
        if obj.poll_type == Poll.PollType.RATING:
            return {"rating_value": vote.rating_value}
        return {"option_id": vote.option_id}

    def get_is_expired(self, obj):
        return bool(obj.expires_at and timezone.now() > obj.expires_at)


class PollCreateSerializer(serializers.ModelSerializer):
    options = serializers.ListField(
        child=serializers.CharField(max_length=200),
        required=False,
        default=list,
    )

    class Meta:
        model  = Poll
        fields = [
            "question", "poll_type", "expires_at",
            "time_impact_minutes", "budget_impact_ghs", "options",
        ]

    def validate(self, data):
        poll_type = data.get("poll_type")
        options   = data.get("options", [])

        if poll_type == Poll.PollType.MULTIPLE_CHOICE:
            if len(options) < 2:
                raise serializers.ValidationError(
                    "Multiple choice polls require at least 2 options."
                )
            if len(options) > 10:
                raise serializers.ValidationError("Maximum 10 options allowed.")

        if poll_type == Poll.PollType.YES_NO and options:
            raise serializers.ValidationError(
                "Yes/No polls do not take custom options."
            )

        if poll_type == Poll.PollType.RATING and options:
            raise serializers.ValidationError(
                "Rating polls do not take custom options."
            )

        if data.get("expires_at") and data["expires_at"] <= timezone.now():
            raise serializers.ValidationError("expires_at must be in the future.")

        return data

    def create(self, validated_data):
        options   = validated_data.pop("options", [])
        poll_type = validated_data["poll_type"]
        poll      = Poll.objects.create(**validated_data)

        if poll_type == Poll.PollType.MULTIPLE_CHOICE:
            PollOption.objects.bulk_create([
                PollOption(poll=poll, text=text.strip(), order=i)
                for i, text in enumerate(options)
            ])
        elif poll_type == Poll.PollType.YES_NO:
            PollOption.objects.bulk_create([
                PollOption(poll=poll, text="Yes", order=0),
                PollOption(poll=poll, text="No",  order=1),
            ])

        return poll


class CastVoteSerializer(serializers.Serializer):
    option_id    = serializers.UUIDField(required=False)
    yes_no_value = serializers.BooleanField(required=False, allow_null=True)
    rating_value = serializers.IntegerField(required=False, min_value=1, max_value=5)

    def validate(self, data):
        poll_type = self.context["poll_type"]

        if poll_type == Poll.PollType.MULTIPLE_CHOICE and not data.get("option_id"):
            raise serializers.ValidationError("option_id is required for multiple choice polls.")

        if poll_type == Poll.PollType.YES_NO and data.get("yes_no_value") is None:
            raise serializers.ValidationError("yes_no_value (true/false) is required.")

        if poll_type == Poll.PollType.RATING and data.get("rating_value") is None:
            raise serializers.ValidationError("rating_value (1–5) is required.")

        return data
