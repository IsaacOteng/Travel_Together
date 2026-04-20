from rest_framework import serializers
from .models import SOSAlert, SOSAction


class SOSActionSerializer(serializers.ModelSerializer):
    taken_by_username = serializers.CharField(source="taken_by.username", read_only=True)
    taken_by_avatar   = serializers.CharField(source="taken_by.avatar_url", read_only=True)

    class Meta:
        model  = SOSAction
        fields = ["id", "action", "notes", "taken_by_username", "taken_by_avatar", "created_at"]
        read_only_fields = fields


class SOSAlertSerializer(serializers.ModelSerializer):
    member_username   = serializers.CharField(source="member.username",   read_only=True)
    member_first_name = serializers.CharField(source="member.first_name", read_only=True)
    member_avatar     = serializers.CharField(source="member.avatar_url", read_only=True)
    resolved_by_username = serializers.CharField(source="resolved_by.username", read_only=True, allow_null=True)
    latitude          = serializers.FloatField(source="location.y", read_only=True)
    longitude         = serializers.FloatField(source="location.x", read_only=True)
    actions           = SOSActionSerializer(many=True, read_only=True)

    class Meta:
        model  = SOSAlert
        fields = [
            "id", "trip", "trigger_type", "status",
            "member_username", "member_first_name", "member_avatar",
            "latitude", "longitude", "accuracy_meters",
            "deviation_distance_m", "stationary_minutes",
            "resolved_at", "resolved_by_username", "resolution_notes",
            "emergency_contact_notified", "chief_notified",
            "actions", "created_at",
        ]
        read_only_fields = fields


class TriggerSOSSerializer(serializers.Serializer):
    trigger_type         = serializers.ChoiceField(choices=SOSAlert.TriggerType.choices)
    latitude             = serializers.FloatField()
    longitude            = serializers.FloatField()
    accuracy_meters      = serializers.FloatField(required=False, allow_null=True)
    deviation_distance_m = serializers.FloatField(required=False, allow_null=True)
    stationary_minutes   = serializers.IntegerField(required=False, allow_null=True)


class ResolveSOSSerializer(serializers.Serializer):
    resolution        = serializers.ChoiceField(
        choices=["resolved", "false_alarm"],
    )
    resolution_notes  = serializers.CharField(required=False, allow_blank=True)


class LogActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=SOSAction.Action.choices)
    notes  = serializers.CharField(required=False, allow_blank=True)
