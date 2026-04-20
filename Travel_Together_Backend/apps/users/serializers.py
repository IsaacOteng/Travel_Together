import re
from rest_framework import serializers
from .models import User, EmergencyContact, NotificationSettings, UserPreferences
from apps.trips.models import Trip


# ─── Auth serializers ─────────────────────────────────────────────────────────

class SendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.lower().strip()


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code  = serializers.CharField(min_length=6, max_length=6)

    def validate_email(self, value):
        return value.lower().strip()

    def validate_code(self, value):
        if not re.fullmatch(r"\d{6}", value):
            raise serializers.ValidationError("Code must be exactly 6 digits.")
        return value


class GoogleAuthSerializer(serializers.Serializer):
    id_token = serializers.CharField()


class AppleAuthSerializer(serializers.Serializer):
    id_token   = serializers.CharField()
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name  = serializers.CharField(required=False, allow_blank=True)


# ─── Nested serializers ───────────────────────────────────────────────────────

class NotificationSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model  = NotificationSettings
        fields = [
            "notif_sos", "notif_chat", "notif_join_requests",
            "notif_proximity", "notif_reminders", "notif_karma",
            "quiet_hours_start", "quiet_hours_end",
        ]
        read_only_fields = ["notif_sos"]   # SOS always on


class UserPreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model  = UserPreferences
        fields = ["trip_types"]


class EmergencyContactSerializer(serializers.ModelSerializer):
    class Meta:
        model  = EmergencyContact
        fields = [
            "id", "name", "phone", "dial_code",
            "relationship", "email", "is_verified", "priority",
        ]
        read_only_fields = ["id", "is_verified"]

    def validate(self, data):
        user = self.context["request"].user
        # Cap at 3 contacts (skip check on update)
        if self.instance is None:
            count = EmergencyContact.objects.filter(user=user).count()
            if count >= 3:
                raise serializers.ValidationError(
                    "You can only have up to 3 emergency contacts."
                )
        return data


# ─── User: read ───────────────────────────────────────────────────────────────

class UserMeSerializer(serializers.ModelSerializer):
    """Full profile read — used for GET /api/users/me/"""
    notification_settings = NotificationSettingsSerializer(read_only=True)
    preferences           = UserPreferencesSerializer(read_only=True)

    class Meta:
        model  = User
        fields = [
            "id", "email", "username", "first_name", "last_name",
            "date_of_birth", "gender", "nationality", "city", "country",
            "dial_code", "phone_number", "bio", "avatar_url", "cover_url", "cover_position",
            "travel_karma", "karma_level", "email_verified",
            "is_verified_traveller", "onboarding_complete",
            "location_mode", "sos_sensitivity", "two_factor_enabled",
            "username_changed_at", "name_changed_at",
            "created_at", "notification_settings", "preferences",
        ]
        read_only_fields = fields


class UserPublicSerializer(serializers.ModelSerializer):
    """Public view of another user — no sensitive fields."""
    trips_completed = serializers.SerializerMethodField()
    trips_total     = serializers.SerializerMethodField()

    def get_trips_completed(self, obj):
        return Trip.objects.filter(chief=obj, status=Trip.Status.COMPLETED).count()

    def get_trips_total(self, obj):
        from apps.trips.models import TripMember
        return TripMember.objects.filter(user=obj, status=TripMember.Status.APPROVED).count()

    class Meta:
        model  = User
        fields = [
            "id", "username", "first_name", "last_name",
            "bio", "avatar_url", "cover_url", "cover_position", "travel_karma", "karma_level",
            "is_verified_traveller", "nationality", "city", "country",
            "created_at", "trips_completed", "trips_total",
        ]
        read_only_fields = fields


# ─── User: write ──────────────────────────────────────────────────────────────

class OnboardingSerializer(serializers.ModelSerializer):
    """
    PATCH /api/users/me/profile/
    Accepts all onboarding fields across both flows (OnboardingDetails +
    ProfileSetup). All fields optional per-request so each step can send
    only its own payload. Sets onboarding_complete=True when explicitly passed.
    """
    class Meta:
        model  = User
        fields = [
            "username", "first_name", "last_name", "date_of_birth",
            "gender", "nationality", "city", "country",
            "dial_code", "phone_number", "bio", "avatar_url",
            "location_mode", "sos_sensitivity", "onboarding_complete",
        ]
        extra_kwargs = {f: {"required": False} for f in fields}

    def validate_username(self, value):
        value = value.lower().strip()
        if not re.fullmatch(r"[a-z0-9._]{3,20}", value):
            raise serializers.ValidationError(
                "Username must be 3–20 characters: lowercase letters, "
                "numbers, dots, underscores only."
            )
        reserved = {"admin", "traveler", "explorer", "wanderer", "tripper", "nomad"}
        if value in reserved:
            raise serializers.ValidationError("That username is reserved.")
        # Exclude current user from uniqueness check
        qs = User.objects.filter(username=value, onboarding_complete=True)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Username is already taken.")
        return value

    def validate_date_of_birth(self, value):
        from datetime import date
        today = date.today()
        age = (today - value).days // 365
        if age < 13:
            raise serializers.ValidationError("You must be at least 13 years old.")
        if age > 120:
            raise serializers.ValidationError("Please enter a valid date of birth.")
        return value


class UserMeUpdateSerializer(serializers.ModelSerializer):
    """
    PATCH /api/users/me/
    Post-onboarding profile edits — name, bio, avatar, city, username, settings.
    """
    class Meta:
        model  = User
        fields = [
            "username", "first_name", "last_name", "bio", "avatar_url", "cover_url", "cover_position",
            "city", "country", "location_mode", "sos_sensitivity",
            "two_factor_enabled",
        ]
        extra_kwargs = {f: {"required": False} for f in fields}

    def validate_username(self, value):
        from datetime import timedelta
        from django.utils import timezone

        value = value.lower().strip()
        if not re.fullmatch(r"[a-z0-9._]{3,20}", value):
            raise serializers.ValidationError(
                "Username must be 3–20 characters: lowercase letters, numbers, dots, underscores only."
            )
        reserved = {"admin", "traveler", "explorer", "wanderer", "tripper", "nomad"}
        if value in reserved:
            raise serializers.ValidationError("That username is reserved.")

        # Cooldown: once every 6 months (only when actually changing)
        if self.instance and value != self.instance.username and self.instance.username_changed_at:
            next_allowed = self.instance.username_changed_at + timedelta(days=183)
            if timezone.now() < next_allowed:
                raise serializers.ValidationError(
                    f"Username can only be changed once every 6 months. "
                    f"Available again on {next_allowed.strftime('%d %b %Y')}."
                )

        # Uniqueness — only completed accounts block it
        qs = User.objects.filter(username=value, onboarding_complete=True)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("That username is already taken.")
        return value

    def validate_first_name(self, value):
        from datetime import timedelta
        from django.utils import timezone

        # Only enforce cooldown when actually changing the name
        if self.instance and value != self.instance.first_name and self.instance.name_changed_at:
            next_allowed = self.instance.name_changed_at + timedelta(days=90)
            if timezone.now() < next_allowed:
                raise serializers.ValidationError(
                    f"Name can only be changed once every 3 months. "
                    f"Available again on {next_allowed.strftime('%d %b %Y')}."
                )
        return value

    def update(self, instance, validated_data):
        from django.utils import timezone

        # Track username change timestamp and free old username implicitly
        if "username" in validated_data and validated_data["username"] != instance.username:
            instance.username_changed_at = timezone.now()

        # Track name change timestamp
        if "first_name" in validated_data and validated_data["first_name"] != instance.first_name:
            instance.name_changed_at = timezone.now()

        return super().update(instance, validated_data)
