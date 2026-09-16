import os
from datetime import date

from rest_framework import serializers
from django.conf import settings
from .completeness import (
    MIN_TITLE_LEN, MIN_DESCRIPTION_LEN, MIN_SPOTS, MAX_SPOTS,
)
from .models import (
    Trip, TripImage, TripTag, TripPriceCover,
    ItineraryStop, TripMember, SavedTrip, TripRating, IncidentReport, CheckIn,
)


# ─── Image ────────────────────────────────────────────────────────────────────

class TripImageSerializer(serializers.ModelSerializer):
    class Meta:
        model  = TripImage
        fields = ["id", "image_url", "order"]
        read_only_fields = fields


class TripImageUploadSerializer(serializers.Serializer):
    """Accept up to 5 image files; order determined by list position."""
    images = serializers.ListField(
        child=serializers.ImageField(allow_empty_file=False, use_url=False),
        max_length=5,
        min_length=1,
    )

    def validate_images(self, files):
        # Validate total size < 20 MB per upload
        for f in files:
            if f.size > 5 * 1024 * 1024:
                raise serializers.ValidationError(
                    f"{f.name} exceeds the 5 MB per-image limit."
                )
        return files


# ─── Nested helpers ───────────────────────────────────────────────────────────

class TripTagSerializer(serializers.ModelSerializer):
    class Meta:
        model  = TripTag
        fields = ["tag"]


class TripPriceCoverSerializer(serializers.ModelSerializer):
    class Meta:
        model  = TripPriceCover
        fields = ["item"]


class ItineraryStopSerializer(serializers.ModelSerializer):
    latitude     = serializers.FloatField(source="location.y",  read_only=True, allow_null=True)
    longitude    = serializers.FloatField(source="location.x",  read_only=True, allow_null=True)
    checkin_count   = serializers.SerializerMethodField()
    checked_in_users = serializers.SerializerMethodField()

    class Meta:
        model  = ItineraryStop
        fields = [
            "id", "order", "name",
            "latitude", "longitude", "geofence_radius",
            "arrival_time", "duration_minutes", "note", "is_current", "is_system",
            "checkin_count", "checked_in_users",
        ]
        read_only_fields = ["id", "is_current", "is_system"]

    def get_checkin_count(self, obj):
        return CheckIn.objects.filter(stop=obj).count()

    def get_checked_in_users(self, obj):
        request = self.context.get("request")
        checkins = CheckIn.objects.filter(stop=obj).select_related("member")
        return [
            {
                "user_id":    str(c.member.id),
                "username":   c.member.username,
                "first_name": c.member.first_name,
                "last_name":  c.member.last_name,
                "avatar_url": c.member.avatar_url,
                "checked_in_at": c.checked_in_at.isoformat(),
            }
            for c in checkins
        ]


class ItineraryStopWriteSerializer(serializers.ModelSerializer):
    latitude  = serializers.FloatField(write_only=True, required=False, allow_null=True)
    longitude = serializers.FloatField(write_only=True, required=False, allow_null=True)

    class Meta:
        model  = ItineraryStop
        fields = [
            "order", "name", "latitude", "longitude",
            "geofence_radius", "arrival_time", "duration_minutes", "note",
        ]
        extra_kwargs = {f: {"required": False} for f in fields}

    def _make_point(self, lat, lng):
        from django.contrib.gis.geos import Point
        if lat is not None and lng is not None:
            return Point(x=lng, y=lat, srid=4326)
        return None

    def create(self, validated_data):
        lat = validated_data.pop("latitude", None)
        lng = validated_data.pop("longitude", None)
        validated_data["location"] = self._make_point(lat, lng)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        lat = validated_data.pop("latitude", None)
        lng = validated_data.pop("longitude", None)
        if lat is not None or lng is not None:
            validated_data["location"] = self._make_point(lat, lng)
        return super().update(instance, validated_data)


# ─── Member ───────────────────────────────────────────────────────────────────

class TripMemberPreviewSerializer(serializers.ModelSerializer):
    """Lightweight shape for trip list cards (avatar stacks only)."""
    user_id    = serializers.UUIDField(source="user.id",         read_only=True)
    username   = serializers.CharField(source="user.username",   read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name  = serializers.CharField(source="user.last_name",  read_only=True)
    avatar_url = serializers.CharField(source="user.avatar_url", read_only=True, allow_null=True)

    class Meta:
        model  = TripMember
        fields = ["user_id", "username", "first_name", "last_name", "avatar_url"]
        read_only_fields = fields


# ─── Tiered member serializers (used in trip detail) ─────────────────────────

class TripMemberCardSerializer(serializers.ModelSerializer):
    """
    Tier 1 visible to anyone viewing a public trip (pre-join).
    First name only, karma level, role, verification badge, trip count.
    No last name, no bio, no contact info.
    """
    user_id      = serializers.UUIDField(source="user.id",                    read_only=True)
    username     = serializers.CharField(source="user.username",              read_only=True)
    first_name   = serializers.CharField(source="user.first_name",            read_only=True)
    avatar_url   = serializers.CharField(source="user.avatar_url",            read_only=True, allow_null=True)
    karma_level  = serializers.CharField(source="user.karma_level",           read_only=True)
    travel_karma = serializers.IntegerField(source="user.travel_karma",       read_only=True)
    is_verified  = serializers.BooleanField(source="user.is_verified_traveller", read_only=True)
    trip_count   = serializers.SerializerMethodField()
    profile_tier = serializers.SerializerMethodField()

    class Meta:
        model  = TripMember
        fields = [
            "user_id", "username", "first_name", "avatar_url",
            "karma_level", "travel_karma", "is_verified", "trip_count",
            "role", "approved_at", "profile_tier",
        ]
        read_only_fields = fields

    def get_trip_count(self, obj):
        return TripMember.objects.filter(
            user_id=obj.user_id,
            status=TripMember.Status.APPROVED,
        ).count()

    def get_profile_tier(self, obj):
        return "card"


class TripMemberFullSerializer(TripMemberCardSerializer):
    """
    Tier 2 visible only to approved members of the same trip (post-join).
    Adds: last name, bio, nationality, city, country, member-since date.
    Still never exposes: email, phone, dob, location data, settings.
    """
    last_name    = serializers.CharField(source="user.last_name",   read_only=True)
    bio          = serializers.CharField(source="user.bio",         read_only=True, allow_null=True)
    nationality  = serializers.CharField(source="user.nationality", read_only=True, allow_null=True)
    city         = serializers.CharField(source="user.city",        read_only=True, allow_null=True)
    country      = serializers.CharField(source="user.country",     read_only=True, allow_null=True)
    member_since = serializers.DateTimeField(source="user.created_at", read_only=True)

    class Meta(TripMemberCardSerializer.Meta):
        fields = TripMemberCardSerializer.Meta.fields + [
            "last_name", "bio", "nationality", "city", "country", "member_since",
        ]

    def get_profile_tier(self, obj):
        return "full"


class TripMemberSerializer(serializers.ModelSerializer):
    """Legacy kept for the members management endpoint (/api/trips/{id}/members/)."""
    user_id        = serializers.UUIDField(source="user.id",               read_only=True)
    username       = serializers.CharField(source="user.username",          read_only=True)
    first_name     = serializers.CharField(source="user.first_name",        read_only=True)
    last_name      = serializers.CharField(source="user.last_name",         read_only=True)
    avatar_url     = serializers.CharField(source="user.avatar_url",        read_only=True)
    karma_level    = serializers.CharField(source="user.karma_level",       read_only=True)
    travel_karma   = serializers.IntegerField(source="user.travel_karma",   read_only=True)
    is_verified    = serializers.BooleanField(source="user.is_verified_traveller", read_only=True)
    trips_count    = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()

    class Meta:
        model  = TripMember
        fields = [
            "user_id", "username", "first_name", "last_name",
            "avatar_url", "karma_level", "travel_karma", "is_verified",
            "trips_count", "average_rating",
            "role", "status", "requested_at", "approved_at", "karma_earned",
        ]
        read_only_fields = fields

    def get_trips_count(self, obj):
        return TripMember.objects.filter(
            user_id=obj.user_id, status=TripMember.Status.APPROVED
        ).count()

    def get_average_rating(self, obj):
        from django.db.models import Avg
        result = TripRating.objects.filter(rated_user=obj.user).aggregate(avg=Avg("overall"))
        avg = result["avg"]
        return round(float(avg), 1) if avg else 0.0


# ─── Trip: list (lightweight) ─────────────────────────────────────────────────

class TripListSerializer(serializers.ModelSerializer):
    cover_image       = serializers.SerializerMethodField()
    images            = TripImageSerializer(many=True, read_only=True)
    member_count      = serializers.SerializerMethodField()
    spots_left        = serializers.SerializerMethodField()
    tags              = serializers.SlugRelatedField(many=True, read_only=True, slug_field="tag")
    is_saved          = serializers.SerializerMethodField()
    chief_id          = serializers.UUIDField(source="chief.id", read_only=True)
    chief_username    = serializers.CharField(source="chief.username", read_only=True)
    chief_first_name  = serializers.CharField(source="chief.first_name", read_only=True)
    chief_last_name   = serializers.CharField(source="chief.last_name", read_only=True)
    chief_avatar_url  = serializers.CharField(source="chief.avatar_url", read_only=True, allow_null=True)
    chief_trip_count  = serializers.SerializerMethodField()
    chief_karma       = serializers.SerializerMethodField()
    chief_rating      = serializers.SerializerMethodField()
    my_status         = serializers.SerializerMethodField()
    pending_requests  = serializers.SerializerMethodField()
    destination_lat   = serializers.FloatField(source="destination_point.y", read_only=True, allow_null=True)
    destination_lng   = serializers.FloatField(source="destination_point.x", read_only=True, allow_null=True)
    meeting_point     = serializers.CharField(read_only=True, allow_null=True)
    members_preview   = serializers.SerializerMethodField()
    my_actions        = serializers.SerializerMethodField()

    class Meta:
        model  = Trip
        fields = [
            "id", "title", "description", "destination", "cover_image", "images",
            "destination_lat", "destination_lng", "meeting_point",
            "date_start", "date_end", "start_time", "end_time", "drive_time", "distance_km",
            "spots_total", "spots_left",
            "entry_price", "status", "visibility",
            "tags", "member_count", "is_saved", "pending_requests",
            "chief_id", "chief_username", "chief_first_name", "chief_last_name",
            "chief_avatar_url", "chief_trip_count", "chief_karma", "chief_rating", "my_status",
            "members_preview", "departure_confirmed_at", "my_actions",
        ]

    def get_my_actions(self, obj):
        """
        Which lifecycle actions the requester may actually take on this trip.

        The UI reads this instead of guessing from `status`, so a button is never
        offered that the API would refuse — and the rule only has to be right in
        one place. Only meaningful for the organizer; everyone else gets nothing.
        """
        request = self.context.get("request")
        user    = getattr(request, "user", None)
        if not (user and user.is_authenticated and obj.chief_id == user.id):
            return None

        from .lifecycle import (
            can_cancel, can_delete, can_end, is_late_cancellation, trip_end_datetime,
        )
        cancel = can_cancel(obj)
        return {
            "delete":      can_delete(obj),
            "cancel":      cancel,
            "end":         can_end(obj),
            # So the confirm dialog can warn before, not after: cancelling now
            # carries the heavier penalty.
            "cancel_late": bool(cancel and is_late_cancellation(obj)),
            "ends_at":     trip_end_datetime(obj).isoformat(),
        }

    def get_cover_image(self, obj):
        img = obj.images.filter(order=0).first()
        return img.image_url if img else obj.cover_url

    def get_member_count(self, obj):
        return obj.approved_members_count()

    def get_spots_left(self, obj):
        return obj.spots_left()

    def get_is_saved(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.saved_by.filter(user=request.user).exists()
        return False

    def get_chief_trip_count(self, obj):
        if not obj.chief_id:
            return 0
        return Trip.objects.filter(chief_id=obj.chief_id).count()

    def get_chief_karma(self, obj):
        if not obj.chief_id:
            return 0
        try:
            return obj.chief.travel_karma or 0
        except Exception:
            return 0

    def get_chief_rating(self, obj):
        if not obj.chief_id:
            return 0.0
        from django.db.models import Avg
        result = TripRating.objects.filter(rated_user_id=obj.chief_id).aggregate(avg=Avg("overall"))
        avg = result["avg"]
        return round(float(avg), 1) if avg else 0.0

    def get_my_status(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        membership = obj.members.filter(user=request.user).first()
        return membership.status if membership else None

    def get_pending_requests(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return 0
        if str(obj.chief_id) != str(request.user.id):
            return 0
        return obj.members.filter(status=TripMember.Status.PENDING).count()

    def get_members_preview(self, obj):
        """Return up to 5 approved members with just the avatar fields."""
        approved = obj.members.filter(status=TripMember.Status.APPROVED).select_related("user")[:5]
        return TripMemberPreviewSerializer(approved, many=True).data


# ─── Trip: full detail ────────────────────────────────────────────────────────

class TripDetailSerializer(serializers.ModelSerializer):
    images           = TripImageSerializer(many=True, read_only=True)
    tags             = serializers.SlugRelatedField(many=True, read_only=True, slug_field="tag")
    price_covers     = serializers.SlugRelatedField(many=True, read_only=True, slug_field="item")
    # itinerary, like members, is tiered: the full stop list (with coordinates,
    # geofence radii and per-stop check-in identities) is group-only. Everyone
    # else gets an empty list see get_itinerary.
    itinerary        = serializers.SerializerMethodField()
    # members is a SerializerMethodField returns Tier 1 (card) or Tier 2 (full)
    # depending on whether the viewer is an approved trip member.
    members          = serializers.SerializerMethodField()
    viewer_is_member = serializers.SerializerMethodField()
    # Whether this viewer has already answered the post-trip prompt. Without
    # these the prompt is driven by component state alone, so it reappears on
    # every refresh and keeps asking a question already answered.
    viewer_confirmed_completion = serializers.SerializerMethodField()
    viewer_has_reported         = serializers.SerializerMethodField()
    chief_id         = serializers.UUIDField(source="chief.id", read_only=True)
    chief_username   = serializers.CharField(source="chief.username",   read_only=True)
    chief_first_name = serializers.CharField(source="chief.first_name", read_only=True, allow_null=True)
    chief_last_name  = serializers.CharField(source="chief.last_name",  read_only=True, allow_null=True)
    chief_avatar_url = serializers.CharField(source="chief.avatar_url", read_only=True, allow_null=True)
    chief_trip_count = serializers.SerializerMethodField()
    member_count     = serializers.SerializerMethodField()
    spots_left       = serializers.SerializerMethodField()
    my_status        = serializers.SerializerMethodField()
    is_saved         = serializers.SerializerMethodField()
    destination_lat  = serializers.FloatField(source="destination_point.y", read_only=True, allow_null=True)
    destination_lng  = serializers.FloatField(source="destination_point.x", read_only=True, allow_null=True)
    # The meeting point's exact coordinates are what the departure geofence is
    # measured against, so they are group-only. The free-text `meeting_point`
    # stays public it's the coarse "where we set off from" line the organizer
    # writes for the trip listing, and the public trip page displays it.
    meeting_lat      = serializers.SerializerMethodField()
    meeting_lng      = serializers.SerializerMethodField()

    class Meta:
        model  = Trip
        fields = [
            "id", "title", "destination",
            "destination_lat", "destination_lng",
            "meeting_point", "meeting_lat", "meeting_lng",
            "images", "description",
            "date_start", "date_end", "start_time", "end_time", "drive_time", "distance_km",
            "spots_total", "spots_left", "member_count",
            "entry_price", "price_note", "price_covers", "highlights",
            "status", "visibility", "group_karma",
            "chief_id", "chief_username", "chief_first_name", "chief_last_name",
            "chief_avatar_url", "chief_trip_count",
            "tags", "itinerary", "members", "viewer_is_member",
            "viewer_confirmed_completion", "viewer_has_reported",
            "my_status", "is_saved",
            "departure_confirmed_at", "departure_checkin_percent", "ended_at",
            "created_at", "updated_at",
        ]

    def _approved_members(self, obj):
        """
        Return approved TripMember instances from the prefetch cache.
        Uses Python-side filtering so we don't issue extra queries when
        members__user is already prefetched.
        """
        all_members = list(obj.members.all())
        approved = [m for m in all_members if m.status == TripMember.Status.APPROVED]
        approved.sort(key=lambda m: m.approved_at or m.requested_at)
        return approved

    def _viewer_is_approved(self, obj):
        """True if the request user is an approved member of this trip."""
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return any(
            m.user_id == request.user.pk
            for m in self._approved_members(obj)
        )

    def _viewer_in_group(self, obj):
        """
        True if the viewer is actually inside this trip's group: the chief, or a
        member who is approved / approved-awaiting-payment.

        Wider than `_viewer_is_approved` (which gates the member roster) because
        a member who has been approved but hasn't paid yet still needs the
        itinerary and meeting point to show up and pay. Mirrors
        `_IN_GROUP_STATUSES` in apps.trips.views the two must stay in step.
        """
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        if obj.chief_id and obj.chief_id == request.user.pk:
            return True
        return any(
            m.user_id == request.user.pk
            and m.status in (TripMember.Status.APPROVED, TripMember.Status.AWAITING_PAYMENT)
            for m in obj.members.all()
        )

    def get_viewer_confirmed_completion(self, obj):
        """True once this viewer has confirmed the trip took place."""
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return any(
            m.user_id == request.user.pk and m.completion_confirmed_at is not None
            for m in obj.members.all()
        )

    def get_viewer_has_reported(self, obj):
        """True once this viewer has filed a report against this trip."""
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.incident_reports.filter(reporter=request.user).exists()

    def get_itinerary(self, obj):
        """
        Stops are group data, not listing data. Each one carries precise
        coordinates, a geofence radius, and the name/avatar/timestamp of every
        member who checked in there so serving them on the public trip page
        would publish where each named traveller was and when.

        Outsiders get an empty list. This endpoint is the only place the trip
        detail is served anonymously (PublicTripDetailView); members fetch the
        real thing from /api/trips/<id>/itinerary/, which enforces the same rule.
        """
        if not self._viewer_in_group(obj):
            return []
        stops = sorted(obj.itinerary.all(), key=lambda s: s.order)
        return ItineraryStopSerializer(stops, many=True, context=self.context).data

    def get_meeting_lat(self, obj):
        if not self._viewer_in_group(obj) or not obj.meeting_point_coords:
            return None
        return obj.meeting_point_coords.y

    def get_meeting_lng(self, obj):
        if not self._viewer_in_group(obj) or not obj.meeting_point_coords:
            return None
        return obj.meeting_point_coords.x

    def get_members(self, obj):
        approved = self._approved_members(obj)
        if self._viewer_is_approved(obj):
            return TripMemberFullSerializer(approved, many=True).data
        return TripMemberCardSerializer(approved, many=True).data

    def get_viewer_is_member(self, obj):
        return self._viewer_is_approved(obj)

    def get_chief_trip_count(self, obj):
        if not obj.chief_id:
            return 0
        return Trip.objects.filter(chief_id=obj.chief_id).count()

    def get_member_count(self, obj):
        # Members fully in the group (approved). Uses the prefetched member list
        # to avoid an extra query, so it stays in Python rather than calling the
        # model helper.
        return sum(
            1 for m in obj.members.all()
            if m.status == TripMember.Status.APPROVED
        )

    def get_spots_left(self, obj):
        # Capacity is based on OCCUPYING_STATUSES (the single source of truth),
        # which today equals approved but will include AWAITING_PAYMENT later.
        occupied = sum(
            1 for m in obj.members.all()
            if m.status in TripMember.OCCUPYING_STATUSES
        )
        return max(obj.spots_total - occupied, 0)

    def get_my_status(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            for m in obj.members.all():
                if m.user_id == request.user.pk:
                    return {"role": m.role, "status": m.status}
        return None

    def get_is_saved(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.saved_by.filter(user=request.user).exists()
        return False


# ─── Trip: create / update ────────────────────────────────────────────────────

class TripCreateSerializer(serializers.ModelSerializer):
    # The model lets these be blank so a draft can be saved half-finished.
    # A trip created through this endpoint is going straight to publish, so
    # they're required here — see apps/trips/completeness.py.
    description   = serializers.CharField(required=True, allow_blank=False)
    meeting_point = serializers.CharField(required=True, allow_blank=False)
    spots_total   = serializers.IntegerField(required=True)
    tags         = serializers.ListField(
        child=serializers.CharField(max_length=50), required=True, allow_empty=False
    )
    price_covers = serializers.ListField(
        child=serializers.CharField(max_length=100), required=False, default=list
    )
    highlights   = serializers.ListField(
        child=serializers.CharField(max_length=120), required=False, default=list
    )
    destination_lat = serializers.FloatField(write_only=True, required=False, allow_null=True)
    destination_lng = serializers.FloatField(write_only=True, required=False, allow_null=True)
    meeting_lat  = serializers.FloatField(write_only=True, required=False, allow_null=True)
    meeting_lng  = serializers.FloatField(write_only=True, required=False, allow_null=True)

    class Meta:
        model  = Trip
        fields = [
            "title", "destination", "destination_lat", "destination_lng",
            "meeting_point", "meeting_lat", "meeting_lng",
            "description", "date_start", "date_end", "start_time", "end_time",
            "drive_time", "distance_km",
            "spots_total", "entry_price", "price_note", "highlights",
            "visibility", "tags", "price_covers",
        ]

    def validate_title(self, value):
        value = (value or "").strip()
        if len(value) < MIN_TITLE_LEN:
            raise serializers.ValidationError(
                f"Title must be at least {MIN_TITLE_LEN} characters."
            )
        return value

    def validate_description(self, value):
        value = (value or "").strip()
        if len(value) < MIN_DESCRIPTION_LEN:
            raise serializers.ValidationError(
                f"Description must be at least {MIN_DESCRIPTION_LEN} characters."
            )
        return value

    def validate_meeting_point(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError(
                "Set a meeting point — it becomes the departure check-in."
            )
        return value

    def validate_spots_total(self, value):
        if value is None or value < MIN_SPOTS:
            raise serializers.ValidationError(
                f"A group trip needs at least {MIN_SPOTS} spots."
            )
        if value > MAX_SPOTS:
            raise serializers.ValidationError(f"Maximum {MAX_SPOTS} spots.")
        return value

    def validate_entry_price(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError(
                "Price can't be negative. Use 0 for a free trip."
            )
        return value

    def validate_tags(self, value):
        if not value:
            raise serializers.ValidationError(
                "Pick at least one tag so the trip can be found."
            )
        return value

    def validate(self, data):
        if data.get("date_end") and data.get("date_start"):
            if data["date_end"] < data["date_start"]:
                raise serializers.ValidationError(
                    {"date_end": "The end date can't be before the start date."}
                )
        if data.get("date_start") and data["date_start"] < date.today():
            raise serializers.ValidationError(
                {"date_start": "The start date is in the past."}
            )
        return data

    def create(self, validated_data):
        from django.contrib.gis.geos import Point
        tags         = validated_data.pop("tags", [])
        price_covers = validated_data.pop("price_covers", [])
        dest_lat     = validated_data.pop("destination_lat", None)
        dest_lng     = validated_data.pop("destination_lng", None)
        meet_lat     = validated_data.pop("meeting_lat", None)
        meet_lng     = validated_data.pop("meeting_lng", None)

        if dest_lat is not None and dest_lng is not None:
            validated_data["destination_point"] = Point(x=dest_lng, y=dest_lat, srid=4326)
        if meet_lat is not None and meet_lng is not None:
            validated_data["meeting_point_coords"] = Point(x=meet_lng, y=meet_lat, srid=4326)

        trip = Trip.objects.create(**validated_data)

        # Chief is automatically an approved member
        TripMember.objects.create(
            trip=trip,
            user=validated_data.get("chief") or self.context["request"].user,
            role=TripMember.Role.CHIEF,
            status=TripMember.Status.APPROVED,
        )

        for tag in tags:
            TripTag.objects.get_or_create(trip=trip, tag=tag.lower().strip())
        for item in price_covers:
            TripPriceCover.objects.get_or_create(trip=trip, item=item.strip())

        return trip


class TripUpdateSerializer(serializers.ModelSerializer):
    tags         = serializers.ListField(
        child=serializers.CharField(max_length=50), required=False
    )
    price_covers = serializers.ListField(
        child=serializers.CharField(max_length=100), required=False
    )
    highlights   = serializers.ListField(
        child=serializers.CharField(max_length=120), required=False
    )
    destination_lat = serializers.FloatField(write_only=True, required=False, allow_null=True)
    destination_lng = serializers.FloatField(write_only=True, required=False, allow_null=True)
    meeting_lat  = serializers.FloatField(write_only=True, required=False, allow_null=True)
    meeting_lng  = serializers.FloatField(write_only=True, required=False, allow_null=True)

    class Meta:
        model  = Trip
        fields = [
            "title", "destination", "destination_lat", "destination_lng",
            "meeting_point", "meeting_lat", "meeting_lng",
            "description", "date_start", "date_end", "start_time", "end_time",
            "drive_time", "distance_km",
            "spots_total", "entry_price", "price_note", "highlights",
            "visibility", "tags", "price_covers",
        ]
        extra_kwargs = {f: {"required": False} for f in fields}

    def validate(self, data):
        date_start = data.get("date_start", self.instance.date_start)
        date_end   = data.get("date_end",   self.instance.date_end)
        if date_end and date_start and date_end < date_start:
            raise serializers.ValidationError("date_end must be on or after date_start.")
        return data

    def update(self, instance, validated_data):
        from django.contrib.gis.geos import Point
        tags         = validated_data.pop("tags", None)
        price_covers = validated_data.pop("price_covers", None)
        dest_lat     = validated_data.pop("destination_lat", None)
        dest_lng     = validated_data.pop("destination_lng", None)
        meet_lat     = validated_data.pop("meeting_lat", None)
        meet_lng     = validated_data.pop("meeting_lng", None)

        if dest_lat is not None and dest_lng is not None:
            validated_data["destination_point"] = Point(x=dest_lng, y=dest_lat, srid=4326)
        if meet_lat is not None and meet_lng is not None:
            validated_data["meeting_point_coords"] = Point(x=meet_lng, y=meet_lat, srid=4326)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if tags is not None:
            instance.tags.all().delete()
            for tag in tags:
                TripTag.objects.get_or_create(trip=instance, tag=tag.lower().strip())
        if price_covers is not None:
            instance.price_covers.all().delete()
            for item in price_covers:
                TripPriceCover.objects.get_or_create(trip=instance, item=item.strip())

        return instance


# ─── Member update (approve / reject / role change) ───────────────────────────

class MemberActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["approve", "reject", "promote_scout", "demote_member"])
    reason = serializers.CharField(required=False, allow_blank=True)


# ─── Trip Rating ──────────────────────────────────────────────────────────────

class TripRatingSerializer(serializers.ModelSerializer):
    rater_username = serializers.CharField(source="rater.username",        read_only=True)
    rater_avatar   = serializers.CharField(source="rater.avatar_url",      read_only=True, allow_null=True)
    rated_username = serializers.CharField(source="rated_user.username",   read_only=True)
    rated_avatar   = serializers.CharField(source="rated_user.avatar_url", read_only=True, allow_null=True)

    class Meta:
        model  = TripRating
        fields = [
            "id", "rater", "rater_username", "rater_avatar",
            "rated_user", "rated_username", "rated_avatar",
            "overall", "created_at",
        ]
        read_only_fields = [
            "id", "rater", "rater_username", "rater_avatar",
            "rated_username", "rated_avatar", "created_at",
        ]

    def validate_overall(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Must be between 1 and 5.")
        return value


# ─── Incident Report ──────────────────────────────────────────────────────────

class IncidentReportSerializer(serializers.ModelSerializer):
    reported_username = serializers.CharField(
        source="reported_user.username", read_only=True, allow_null=True
    )

    class Meta:
        model  = IncidentReport
        fields = [
            "id", "trip", "reporter",
            "reported_user", "reported_username",
            "incident_type", "description", "evidence_urls",
            "status", "reference_number", "created_at",
        ]
        read_only_fields = [
            "id", "trip", "reporter", "reported_username",
            "status", "reference_number", "created_at",
        ]

    def validate_description(self, value):
        if len(value.strip()) < 50:
            raise serializers.ValidationError(
                "Description must be at least 50 characters."
            )
        return value

    def validate_evidence_urls(self, value):
        if len(value) > 5:
            raise serializers.ValidationError("Maximum 5 evidence URLs.")
        return value
