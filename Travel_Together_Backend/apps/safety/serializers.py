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
    # SerializerMethodField rather than source="location.y": location is
    # nullable now, and a plain source would raise on an alert with no fix.
    latitude          = serializers.SerializerMethodField()
    longitude         = serializers.SerializerMethodField()
    has_location      = serializers.SerializerMethodField()
    actions           = SOSActionSerializer(many=True, read_only=True)

    class Meta:
        model  = SOSAlert
        fields = [
            "id", "trip", "trigger_type", "status",
            "member_username", "member_first_name", "member_avatar",
            "latitude", "longitude", "has_location", "accuracy_meters",
            "deviation_distance_m", "stationary_minutes",
            "resolved_at", "resolved_by_username", "resolution_notes",
            "emergency_contact_notified", "chief_notified",
            "actions", "created_at",
        ]
        read_only_fields = fields

    def get_latitude(self, obj):
        return obj.location.y if obj.location else None

    def get_longitude(self, obj):
        return obj.location.x if obj.location else None

    def get_has_location(self, obj):
        """
        Explicit so the UI can distinguish "no fix" from "fix at 0.0". Responders
        need to see 'location unavailable' rather than a map pin they'd trust.
        """
        return obj.location is not None


class TriggerSOSSerializer(serializers.Serializer):
    """
    Coordinates are optional but, when given, must be real.

    Optional: the alert has to go out even when the device can't produce a fix
    refusing an SOS because GPS failed would be the worst possible failure mode.
    Validated: a caller that sends coordinates must send usable ones. The range
    checks reject the placeholder values clients reach for when geolocation
    fails (0,0 is a point in the Atlantic, not a "no data" marker), and both
    halves must arrive together a lone latitude locates nobody.
    """

    trigger_type         = serializers.ChoiceField(choices=SOSAlert.TriggerType.choices)
    latitude             = serializers.FloatField(
                               required=False, allow_null=True,
                               min_value=-90, max_value=90,
                           )
    longitude            = serializers.FloatField(
                               required=False, allow_null=True,
                               min_value=-180, max_value=180,
                           )
    accuracy_meters      = serializers.FloatField(required=False, allow_null=True)
    deviation_distance_m = serializers.FloatField(required=False, allow_null=True)
    stationary_minutes   = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, attrs):
        lat, lng = attrs.get("latitude"), attrs.get("longitude")
        if (lat is None) != (lng is None):
            raise serializers.ValidationError(
                "Send both latitude and longitude, or neither."
            )
        # Null Island. Real coordinates, ~570 km off the coast of Ghana, and the
        # value every failed geolocation call defaults to. Treat it as "no fix"
        # so responders get an honest "location unavailable" instead of a pin in
        # the Atlantic they might waste time on.
        if lat == 0 and lng == 0:
            attrs["latitude"] = attrs["longitude"] = None
        return attrs


class ResolveSOSSerializer(serializers.Serializer):
    resolution        = serializers.ChoiceField(
        choices=["resolved", "false_alarm"],
    )
    resolution_notes  = serializers.CharField(required=False, allow_blank=True)


class LogActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=SOSAction.Action.choices)
    notes  = serializers.CharField(required=False, allow_blank=True)
