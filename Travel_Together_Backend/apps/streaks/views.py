import os
import uuid
from django.conf import settings
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser

from apps.trips.models import Trip, TripMember, ItineraryStop
from apps.karma.utils import award_karma
from apps.notifications.utils import push_many
from .models import Streak, StreakReaction
from .serializers import StreakSerializer, StreakUploadSerializer, ReactSerializer


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_trip_and_membership(trip_id, user):
    try:
        trip = Trip.objects.get(id=trip_id)
    except Trip.DoesNotExist:
        return None, None, Response({"detail": "Trip not found."}, status=404)
    member = TripMember.objects.filter(
        trip=trip, user=user, status=TripMember.Status.APPROVED
    ).first()
    if not member:
        return None, None, Response({"detail": "You are not a member of this trip."}, status=403)
    return trip, member, None


def _save_video(file, trip_id):
    ext  = os.path.splitext(file.name)[1].lower() or ".mp4"
    key  = f"streaks/{trip_id}/{uuid.uuid4().hex}{ext}"
    path = os.path.join(settings.MEDIA_ROOT, key)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb+") as dest:
        for chunk in file.chunks():
            dest.write(chunk)
    return f"{settings.MEDIA_URL}{key}", key


def _delete_file(key):
    try:
        path = os.path.join(settings.MEDIA_ROOT, key)
        if os.path.exists(path):
            os.remove(path)
    except Exception:
        pass


# ─── Streak list + upload ─────────────────────────────────────────────────────

class StreakListView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser]

    def get(self, request, trip_id):
        trip, _, err = _get_trip_and_membership(trip_id, request.user)
        if err:
            return err

        qs = Streak.objects.filter(trip=trip).select_related(
            "user", "stop"
        ).prefetch_related("reactions").order_by("-created_at")

        # Filter by stop
        stop_id = request.query_params.get("stop_id")
        if stop_id:
            qs = qs.filter(stop_id=stop_id)

        # Filter by user
        user_id = request.query_params.get("user_id")
        if user_id:
            qs = qs.filter(user_id=user_id)

        page      = max(int(request.query_params.get("page", 1)), 1)
        page_size = min(int(request.query_params.get("page_size", 20)), 50)
        offset    = (page - 1) * page_size
        total     = qs.count()

        return Response({
            "count":   total,
            "page":    page,
            "results": StreakSerializer(
                qs[offset: offset + page_size], many=True, context={"request": request}
            ).data,
        })

    def post(self, request, trip_id):
        """Upload a streak video. Max 10 seconds, 50 MB."""
        trip, _, err = _get_trip_and_membership(trip_id, request.user)
        if err:
            return err

        serializer = StreakUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        d    = serializer.validated_data
        file = d["video"]

        # Validate stop if provided
        stop = None
        if d.get("stop_id"):
            try:
                stop = ItineraryStop.objects.get(id=d["stop_id"], trip=trip)
            except ItineraryStop.DoesNotExist:
                return Response({"detail": "Itinerary stop not found."}, status=404)

        # Check geofence if stop provided
        geofence_validated = False
        if stop and stop.location:
            from django.contrib.gis.measure import Distance
            from django.contrib.gis.geos import Point
            user_point = Point(x=d["longitude"], y=d["latitude"], srid=4326)
            distance_m = user_point.distance(stop.location.transform(4326, clone=True)) * 111320
            geofence_validated = distance_m <= stop.geofence_radius

        video_url, video_key = _save_video(file, trip_id)

        with transaction.atomic():
            from django.contrib.gis.geos import Point
            streak = Streak.objects.create(
                trip               = trip,
                user               = request.user,
                stop               = stop,
                video_url          = video_url,
                video_key          = video_key,
                duration_seconds   = float(request.data.get("duration_seconds", 0)),
                location           = Point(x=d["longitude"], y=d["latitude"], srid=4326),
                accuracy_meters    = d.get("accuracy_meters"),
                geofence_validated = geofence_validated,
            )

            # Award karma for posting a streak
            award_karma(
                user        = request.user,
                delta       = 2,
                reason      = "streak_engagement",
                description = f"Posted a streak on trip '{trip.title}'",
                trip        = trip,
            )

        # Notify other trip members
        approved = TripMember.objects.filter(
            trip=trip, status=TripMember.Status.APPROVED
        ).exclude(user=request.user).select_related("user")

        name = request.user.first_name or request.user.username or "Someone"
        push_many(
            recipients = [m.user for m in approved],
            notif_type = "chat_message",   # reuse closest type
            title      = "New Streak",
            body       = f"{name} posted a streak on '{trip.title}'.",
            sender     = request.user,
            trip       = trip,
            action_url = f"/trips/{trip.id}/streaks/",
            data       = {"streak_id": str(streak.id)},
        )

        return Response(
            StreakSerializer(streak, context={"request": request}).data,
            status=201,
        )


# ─── Streak detail + delete ───────────────────────────────────────────────────

class StreakDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_streak(self, trip_id, streak_id, user):
        trip, member, err = _get_trip_and_membership(trip_id, user)
        if err:
            return None, None, err
        try:
            streak = Streak.objects.select_related("user", "stop").prefetch_related(
                "reactions__user"
            ).get(id=streak_id, trip=trip)
        except Streak.DoesNotExist:
            return None, None, Response({"detail": "Streak not found."}, status=404)
        return streak, member, None

    def get(self, request, trip_id, streak_id):
        streak, _, err = self._get_streak(trip_id, streak_id, request.user)
        if err:
            return err
        return Response(StreakSerializer(streak, context={"request": request}).data)

    def delete(self, request, trip_id, streak_id):
        streak, member, err = self._get_streak(trip_id, streak_id, request.user)
        if err:
            return err

        is_owner = streak.user_id == request.user.id
        is_chief = member.role == TripMember.Role.CHIEF
        if not is_owner and not is_chief:
            return Response({"detail": "Only the uploader or trip chief can delete a streak."}, status=403)

        _delete_file(streak.video_key)
        streak.delete()
        return Response(status=204)


# ─── React to a streak ────────────────────────────────────────────────────────

class StreakReactView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, trip_id, streak_id):
        """Add or change reaction. One reaction per user per streak."""
        trip, _, err = _get_trip_and_membership(trip_id, request.user)
        if err:
            return err

        try:
            streak = Streak.objects.get(id=streak_id, trip=trip)
        except Streak.DoesNotExist:
            return Response({"detail": "Streak not found."}, status=404)

        serializer = ReactSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        reaction_type = serializer.validated_data["reaction"]

        reaction, created = StreakReaction.objects.update_or_create(
            streak=streak,
            user=request.user,
            defaults={"reaction": reaction_type},
        )

        # Keep denormalised engagement_count in sync
        streak.engagement_count = streak.reactions.count()
        streak.save(update_fields=["engagement_count"])

        return Response({
            "reaction":         reaction.reaction,
            "engagement_count": streak.engagement_count,
        }, status=201 if created else 200)

    def delete(self, request, trip_id, streak_id):
        """Remove your reaction."""
        trip, _, err = _get_trip_and_membership(trip_id, request.user)
        if err:
            return err

        try:
            streak = Streak.objects.get(id=streak_id, trip=trip)
        except Streak.DoesNotExist:
            return Response({"detail": "Streak not found."}, status=404)

        deleted, _ = StreakReaction.objects.filter(streak=streak, user=request.user).delete()
        if not deleted:
            return Response({"detail": "You have not reacted to this streak."}, status=404)

        streak.engagement_count = streak.reactions.count()
        streak.save(update_fields=["engagement_count"])

        return Response({"engagement_count": streak.engagement_count})


# ─── Trip recap feed (is_in_recap=True) ──────────────────────────────────────

class TripRecapView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, trip_id):
        trip, _, err = _get_trip_and_membership(trip_id, request.user)
        if err:
            return err

        streaks = Streak.objects.filter(
            trip=trip, is_in_recap=True
        ).select_related("user", "stop").prefetch_related("reactions").order_by("created_at")

        return Response(StreakSerializer(streaks, many=True, context={"request": request}).data)
