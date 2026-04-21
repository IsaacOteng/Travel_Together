import uuid
from django.db import transaction
from utils.storage import save_image, delete_file as storage_delete
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import (
    Trip, TripImage, TripMember, ItineraryStop, SavedTrip, TripRating, IncidentReport, CheckIn,
)
from .geocoding import geocode_trip
from .serializers import (
    TripListSerializer, TripDetailSerializer,
    TripCreateSerializer, TripUpdateSerializer,
    TripImageSerializer, TripImageUploadSerializer,
    TripMemberSerializer, MemberActionSerializer,
    ItineraryStopSerializer, ItineraryStopWriteSerializer,
    TripRatingSerializer, IncidentReportSerializer,
)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _save_upload(file, trip_id, request=None):
    """Strip EXIF, resize to max 1600 px, save as JPEG. Returns (absolute_url, key)."""
    key = f"trips/{trip_id}/{uuid.uuid4().hex}.jpg"
    url = save_image(file, key, max_px=1600, request=request)
    return url, key


def _delete_file(key):
    storage_delete(key)


def _is_chief(trip, user):
    return trip.chief_id == user.pk


def _require_chief(trip, user):
    if not _is_chief(trip, user):
        return Response({"detail": "Only the trip chief can do this."}, status=403)
    return None


# ─── Trips: list + create ─────────────────────────────────────────────────────

class TripListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """My trips — where I'm chief or an approved/pending member."""
        memberships = TripMember.objects.filter(user=request.user).values_list("trip_id", flat=True)
        trips = Trip.objects.filter(id__in=memberships).select_related("chief").prefetch_related(
            "images", "tags", "members__user", "saved_by"
        ).order_by("-created_at")
        serializer = TripListSerializer(trips, many=True, context={"request": request})
        return Response(serializer.data)

    def post(self, request):
        """Create a new trip. Chief is auto-set to the request user."""
        serializer = TripCreateSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        trip = serializer.save(chief=request.user)

        # Geocode destination if no coordinates were supplied by the client
        if not trip.destination_point:
            geocode_trip(trip)   # updates trip.destination_point in place if found

        return Response(
            TripDetailSerializer(trip, context={"request": request}).data,
            status=201,
        )


# ─── Trip: detail + update + delete ──────────────────────────────────────────

class TripDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_trip(self, trip_id):
        try:
            return Trip.objects.prefetch_related(
                "images", "tags", "price_covers", "itinerary",
                "members__user", "saved_by",
            ).get(id=trip_id)
        except Trip.DoesNotExist:
            return None

    def get(self, request, trip_id):
        trip = self._get_trip(trip_id)
        if not trip:
            return Response({"detail": "Not found."}, status=404)
        # Must be a member or chief to see non-public trips
        if trip.visibility == Trip.Visibility.PRIVATE:
            is_member = trip.members.filter(
                user=request.user,
                status__in=[TripMember.Status.APPROVED, TripMember.Status.PENDING],
            ).exists()
            if not is_member and not _is_chief(trip, request.user):
                return Response({"detail": "Not found."}, status=404)
        return Response(TripDetailSerializer(trip, context={"request": request}).data)

    def patch(self, request, trip_id):
        trip = self._get_trip(trip_id)
        if not trip:
            return Response({"detail": "Not found."}, status=404)
        err = _require_chief(trip, request.user)
        if err:
            return err
        if trip.status in (Trip.Status.COMPLETED, Trip.Status.ARCHIVED):
            return Response({"detail": "Cannot edit a completed or archived trip."}, status=400)
        old_destination = trip.destination
        serializer = TripUpdateSerializer(trip, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        trip = serializer.save()

        # Re-geocode if destination text changed and no new coords were supplied
        destination_changed = trip.destination != old_destination
        coords_supplied     = "destination_lat" in request.data or "destination_lng" in request.data
        if destination_changed and not coords_supplied:
            trip.destination_point = None   # clear stale coords first
            trip.save(update_fields=["destination_point"])
            geocode_trip(trip)

        return Response(TripDetailSerializer(trip, context={"request": request}).data)

    def delete(self, request, trip_id):
        trip = self._get_trip(trip_id)
        if not trip:
            return Response({"detail": "Not found."}, status=404)
        err = _require_chief(trip, request.user)
        if err:
            return err
        if trip.status == Trip.Status.ACTIVE:
            return Response({"detail": "Cannot delete an active trip."}, status=400)
        # Clean up stored images
        for img in trip.images.all():
            _delete_file(img.image_key)
        trip.delete()
        return Response(status=204)


# ─── Trip: publish ────────────────────────────────────────────────────────────

class TripPublishView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, trip_id):
        try:
            trip = Trip.objects.get(id=trip_id)
        except Trip.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        err = _require_chief(trip, request.user)
        if err:
            return err
        if trip.status != Trip.Status.DRAFT:
            return Response({"detail": "Only draft trips can be published."}, status=400)
        trip.status = Trip.Status.PUBLISHED
        trip.save(update_fields=["status", "updated_at"])
        return Response({"status": trip.status})


# ─── Trip: end ───────────────────────────────────────────────────────────────

class TripEndView(APIView):
    """
    POST /api/trips/<id>/end/
    Chief-only. Marks the trip as completed, awards karma to all approved
    members, and sends a review-reminder notification to every member.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, trip_id):
        try:
            trip = Trip.objects.prefetch_related("members__user").get(id=trip_id)
        except Trip.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        err = _require_chief(trip, request.user)
        if err:
            return err

        if trip.status == Trip.Status.COMPLETED:
            return Response({"detail": "Trip has already been ended."}, status=400)
        if trip.status not in (Trip.Status.PUBLISHED, Trip.Status.ACTIVE):
            return Response(
                {"detail": "Only published or active trips can be ended."},
                status=400,
            )

        from django.utils import timezone
        trip.status   = Trip.Status.COMPLETED
        trip.ended_at = timezone.now()
        trip.save(update_fields=["status", "ended_at", "updated_at"])

        # Award karma + badges for every approved member (including chief via membership)
        from apps.karma.utils import award_karma, award_badges
        approved_members = list(
            trip.members.filter(status=TripMember.Status.APPROVED).select_related("user")
        )
        for membership in approved_members:
            award_karma(
                user        = membership.user,
                delta       = 10,
                reason      = "trip_completed",
                description = f"Completed trip: {trip.title}",
                trip        = trip,
            )
            award_badges(membership.user, trip=trip)

        # Notify all approved members to review the crew
        from apps.notifications.utils import push_many
        from apps.notifications.models import Notification
        recipients = [m.user for m in approved_members]
        if recipients:
            push_many(
                recipients = recipients,
                notif_type = Notification.NotificationType.REVIEW_REMINDER,
                title      = f'"{trip.title}" has ended!',
                body       = "The trip is complete. Rate your crew members and share your experience.",
                action_url = f"/trip/{trip.id}",
                trip       = trip,
                sender     = request.user,
            )

        return Response(TripDetailSerializer(trip, context={"request": request}).data)


# ─── Trip Images ──────────────────────────────────────────────────────────────

class TripImageListView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser]

    def post(self, request, trip_id):
        """Upload images for a trip. Appends after existing ones (up to 5 total)."""
        try:
            trip = Trip.objects.get(id=trip_id)
        except Trip.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        err = _require_chief(trip, request.user)
        if err:
            return err

        # Accept either `images` (multiple) or `image` (single) key
        files = request.FILES.getlist("images") or (
            [request.FILES["image"]] if "image" in request.FILES else []
        )
        if not files:
            return Response({"detail": "No images provided."}, status=400)

        existing_count = trip.images.count()
        if existing_count + len(files) > 5:
            return Response(
                {"detail": f"A trip can have at most 5 images. You already have {existing_count}."},
                status=400,
            )

        # Validate each file
        for f in files:
            if f.size > 5 * 1024 * 1024:
                return Response({"detail": f"{f.name} exceeds the 5 MB limit."}, status=400)
            ct = getattr(f, "content_type", "")
            if ct and not ct.startswith("image/"):
                return Response({"detail": f"{f.name} is not an image."}, status=400)

        created = []
        with transaction.atomic():
            next_order = existing_count
            for f in files:
                abs_url, key = _save_upload(f, trip.id, request=request)
                img = TripImage.objects.create(
                    trip=trip, image_url=abs_url, image_key=key, order=next_order
                )
                # Keep cover_url synced to order=0
                if next_order == 0:
                    trip.cover_url = abs_url
                    trip.save(update_fields=["cover_url"])
                created.append(img)
                next_order += 1

        return Response(TripImageSerializer(created, many=True).data, status=201)


class TripImageDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, trip_id, image_id):
        try:
            trip = Trip.objects.get(id=trip_id)
        except Trip.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        err = _require_chief(trip, request.user)
        if err:
            return err
        try:
            img = TripImage.objects.get(id=image_id, trip=trip)
        except TripImage.DoesNotExist:
            return Response({"detail": "Image not found."}, status=404)

        deleted_order = img.order
        _delete_file(img.image_key)
        img.delete()

        # Re-sequence orders after deletion
        for i, remaining in enumerate(trip.images.order_by("order")):
            if remaining.order != i:
                remaining.order = i
                remaining.save(update_fields=["order"])

        # Update cover_url
        new_cover = trip.images.filter(order=0).first()
        trip.cover_url = new_cover.image_url if new_cover else None
        trip.save(update_fields=["cover_url"])

        return Response(status=204)

    def patch(self, request, trip_id, image_id):
        """Reorder: move image to a new order position."""
        try:
            trip = Trip.objects.get(id=trip_id)
        except Trip.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        err = _require_chief(trip, request.user)
        if err:
            return err
        try:
            img = TripImage.objects.get(id=image_id, trip=trip)
        except TripImage.DoesNotExist:
            return Response({"detail": "Image not found."}, status=404)

        new_order = request.data.get("order")
        if new_order is None:
            return Response({"detail": "order is required."}, status=400)
        try:
            new_order = int(new_order)
        except (TypeError, ValueError):
            return Response({"detail": "order must be an integer."}, status=400)

        images = list(trip.images.order_by("order"))
        if new_order < 0 or new_order >= len(images):
            return Response({"detail": "order out of range."}, status=400)

        with transaction.atomic():
            images.remove(img)
            images.insert(new_order, img)
            for i, im in enumerate(images):
                if im.order != i:
                    im.order = i
                    im.save(update_fields=["order"])
            cover = trip.images.filter(order=0).first()
            trip.cover_url = cover.image_url if cover else None
            trip.save(update_fields=["cover_url"])

        return Response(TripImageSerializer(trip.images.order_by("order"), many=True).data)


# ─── Join request ─────────────────────────────────────────────────────────────

class JoinRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, trip_id):
        try:
            trip = Trip.objects.get(id=trip_id)
        except Trip.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        if trip.status not in (Trip.Status.PUBLISHED,):
            return Response({"detail": "This trip is not accepting requests."}, status=400)

        if _is_chief(trip, request.user):
            return Response({"detail": "You are already the chief of this trip."}, status=400)

        existing = TripMember.objects.filter(trip=trip, user=request.user).first()
        if existing:
            if existing.status == TripMember.Status.APPROVED:
                return Response({"detail": "You are already a member."}, status=400)
            if existing.status == TripMember.Status.PENDING:
                return Response({"detail": "Your request is already pending."}, status=400)
            if existing.status == TripMember.Status.REMOVED:
                return Response({"detail": "You have been removed from this trip."}, status=403)

        spots_left = trip.spots_total - trip.members.filter(
            status=TripMember.Status.APPROVED
        ).count()
        if spots_left <= 0:
            return Response({"detail": "This trip is full."}, status=400)

        if existing and existing.status == TripMember.Status.REJECTED:
            existing.status = TripMember.Status.PENDING
            existing.rejected_reason = None
            existing.save(update_fields=["status", "rejected_reason"])
            member = existing
        else:
            member = TripMember.objects.create(
                trip=trip,
                user=request.user,
                role=TripMember.Role.MEMBER,
                status=TripMember.Status.PENDING,
            )

        # Notify the trip chief about the new join request
        if trip.chief:
            from apps.notifications.utils import push
            push(
                recipient  = trip.chief,
                notif_type = "join_request",
                title      = "New join request",
                body       = f"{request.user.username} wants to join \"{trip.title}\".",
                sender     = request.user,
                trip       = trip,
                data       = {"trip_id": str(trip.id), "user_id": str(request.user.id)},
            )

        return Response(TripMemberSerializer(member).data, status=201)

    def delete(self, request, trip_id):
        """Withdraw a pending join request or leave the trip."""
        try:
            trip = Trip.objects.get(id=trip_id)
        except Trip.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        try:
            member = TripMember.objects.get(trip=trip, user=request.user)
        except TripMember.DoesNotExist:
            return Response({"detail": "You are not in this trip."}, status=404)

        if member.role == TripMember.Role.CHIEF:
            return Response({"detail": "The chief cannot leave the trip."}, status=400)

        member.delete()
        # Remove from group chat
        from apps.chat.models import ConversationMember
        conv = trip.group_chats.first()
        if conv:
            ConversationMember.objects.filter(conversation=conv, user=request.user).delete()
        return Response(status=204)


# ─── Member management (chief only) ──────────────────────────────────────────

class TripMemberListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, trip_id):
        try:
            trip = Trip.objects.prefetch_related("members__user").get(id=trip_id)
        except Trip.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        members = trip.members.all()
        return Response(TripMemberSerializer(members, many=True).data)


class TripMemberDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, trip_id, user_id):
        """Approve, reject, or change role of a member (chief only)."""
        try:
            trip = Trip.objects.get(id=trip_id)
        except Trip.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        err = _require_chief(trip, request.user)
        if err:
            return err
        try:
            member = TripMember.objects.select_related("user").get(trip=trip, user_id=user_id)
        except TripMember.DoesNotExist:
            return Response({"detail": "Member not found."}, status=404)

        serializer = MemberActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        action = serializer.validated_data["action"]
        reason = serializer.validated_data.get("reason", "")

        from django.utils import timezone
        if action == "approve":
            spots_left = trip.spots_total - trip.members.filter(
                status=TripMember.Status.APPROVED
            ).count()
            if spots_left <= 0:
                return Response({"detail": "Trip is full."}, status=400)
            member.status = TripMember.Status.APPROVED
            member.approved_at = timezone.now()
            member.approved_by = request.user
            member.save(update_fields=["status", "approved_at", "approved_by"])
            # Auto-add to group conversation if it exists
            from apps.chat.models import ConversationMember as ConvMember
            conv = trip.group_chats.first()
            if conv:
                ConvMember.objects.get_or_create(
                    conversation=conv, user=member.user,
                    defaults={"is_admin": False},
                )
            # Stamp the chief's join_request notification as decided
            from apps.notifications.models import Notification as Notif
            Notif.objects.filter(
                notification_type="join_request",
                trip=trip,
                data__user_id=str(member.user.id),
            ).update(is_read=True, data={"trip_id": str(trip.id), "user_id": str(member.user.id), "decided": "approved"})
            # Notify the approved member
            from apps.notifications.utils import push
            push(
                recipient  = member.user,
                notif_type = "join_approved",
                title      = "Join request approved!",
                body       = f"You've been approved to join \"{trip.title}\". Welcome to the group!",
                sender     = request.user,
                trip       = trip,
                data       = {"trip_id": str(trip.id)},
            )
        elif action == "reject":
            member.status = TripMember.Status.REJECTED
            member.rejected_reason = reason
            member.save(update_fields=["status", "rejected_reason"])
            # Stamp the chief's join_request notification as decided
            from apps.notifications.models import Notification as Notif
            Notif.objects.filter(
                notification_type="join_request",
                trip=trip,
                data__user_id=str(member.user.id),
            ).update(is_read=True, data={"trip_id": str(trip.id), "user_id": str(member.user.id), "decided": "declined"})
            from apps.notifications.utils import push
            push(
                recipient  = member.user,
                notif_type = "join_declined",
                title      = "Join request declined",
                body       = f"Your request to join \"{trip.title}\" was not accepted.",
                sender     = request.user,
                trip       = trip,
                data       = {"trip_id": str(trip.id)},
            )
        elif action == "promote_scout":
            if member.status != TripMember.Status.APPROVED:
                return Response({"detail": "Member must be approved to promote."}, status=400)
            member.role = TripMember.Role.SCOUT
            member.save(update_fields=["role"])
        elif action == "demote_member":
            member.role = TripMember.Role.MEMBER
            member.save(update_fields=["role"])

        return Response(TripMemberSerializer(member).data)

    def delete(self, request, trip_id, user_id):
        """Remove a member from the trip (chief only)."""
        try:
            trip = Trip.objects.get(id=trip_id)
        except Trip.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        err = _require_chief(trip, request.user)
        if err:
            return err
        try:
            member = TripMember.objects.get(trip=trip, user_id=user_id)
        except TripMember.DoesNotExist:
            return Response({"detail": "Member not found."}, status=404)
        if member.role == TripMember.Role.CHIEF:
            return Response({"detail": "Cannot remove the chief."}, status=400)
        from django.utils import timezone
        member.status = TripMember.Status.REMOVED
        member.removed_at = timezone.now()
        member.save(update_fields=["status", "removed_at"])
        # Remove from group chat
        from apps.chat.models import ConversationMember
        conv = trip.group_chats.first()
        if conv:
            ConversationMember.objects.filter(conversation=conv, user=member.user).delete()
        return Response(status=204)


# ─── Save / Unsave ────────────────────────────────────────────────────────────

class TripSaveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, trip_id):
        try:
            trip = Trip.objects.get(id=trip_id)
        except Trip.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        _, created = SavedTrip.objects.get_or_create(user=request.user, trip=trip)
        return Response({"saved": True}, status=201 if created else 200)

    def delete(self, request, trip_id):
        try:
            trip = Trip.objects.get(id=trip_id)
        except Trip.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        SavedTrip.objects.filter(user=request.user, trip=trip).delete()
        return Response({"saved": False}, status=200)


# ─── Saved trips list ─────────────────────────────────────────────────────────

class SavedTripListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        saved = SavedTrip.objects.filter(user=request.user).select_related("trip").order_by("-saved_at")
        trip_ids = [s.trip_id for s in saved]
        trips = list(
            Trip.objects.prefetch_related("images", "tags", "members__user", "saved_by")
            .filter(id__in=trip_ids)
            .in_bulk()
            .values()
        )
        # Preserve saved_at ordering
        id_order = {tid: idx for idx, tid in enumerate(trip_ids)}
        trips.sort(key=lambda t: id_order.get(t.id, 0))
        return Response(TripListSerializer(trips, many=True, context={"request": request}).data)


# ─── Itinerary ────────────────────────────────────────────────────────────────

class ItineraryListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, trip_id):
        try:
            trip = Trip.objects.get(id=trip_id)
        except Trip.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        stops = trip.itinerary.order_by("order")
        return Response(ItineraryStopSerializer(stops, many=True).data)

    def post(self, request, trip_id):
        try:
            trip = Trip.objects.get(id=trip_id)
        except Trip.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        # Chief or scout can add stops
        member = trip.members.filter(
            user=request.user,
            role__in=[TripMember.Role.CHIEF, TripMember.Role.SCOUT],
            status=TripMember.Status.APPROVED,
        ).first()
        if not member and not _is_chief(trip, request.user):
            return Response({"detail": "Only the chief or a scout can manage the itinerary."}, status=403)

        serializer = ItineraryStopWriteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        stop = serializer.save(trip=trip)
        return Response(ItineraryStopSerializer(stop).data, status=201)


class ItineraryStopDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_stop(self, trip_id, stop_id):
        try:
            return ItineraryStop.objects.select_related("trip").get(id=stop_id, trip_id=trip_id)
        except ItineraryStop.DoesNotExist:
            return None

    def patch(self, request, trip_id, stop_id):
        stop = self._get_stop(trip_id, stop_id)
        if not stop:
            return Response({"detail": "Not found."}, status=404)
        trip = stop.trip
        member = trip.members.filter(
            user=request.user,
            role__in=[TripMember.Role.CHIEF, TripMember.Role.SCOUT],
            status=TripMember.Status.APPROVED,
        ).first()
        if not member and not _is_chief(trip, request.user):
            return Response({"detail": "Only the chief or a scout can edit stops."}, status=403)
        serializer = ItineraryStopWriteSerializer(stop, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        stop = serializer.save()
        return Response(ItineraryStopSerializer(stop).data)

    def delete(self, request, trip_id, stop_id):
        stop = self._get_stop(trip_id, stop_id)
        if not stop:
            return Response({"detail": "Not found."}, status=404)
        err = _require_chief(stop.trip, request.user)
        if err:
            return err
        stop.delete()
        return Response(status=204)


# ─── Public views (no auth) ───────────────────────────────────────────────────

class PublicTripListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        trips = Trip.objects.filter(
            status=Trip.Status.PUBLISHED,
            visibility=Trip.Visibility.PUBLIC,
        ).select_related("chief").prefetch_related("images", "tags", "members__user", "saved_by").order_by("-created_at")

        # Full-text / trigram search
        q = request.query_params.get("q", "").strip()
        if q:
            from django.contrib.postgres.search import TrigramSimilarity
            from django.db.models.functions import Greatest
            from django.db.models import Q
            trips = (
                trips
                .annotate(sim=Greatest(
                    TrigramSimilarity("title",       q),
                    TrigramSimilarity("destination", q),
                    TrigramSimilarity("description", q),
                ))
                .filter(
                    Q(sim__gte=0.1) |
                    Q(title__icontains=q) |
                    Q(destination__icontains=q) |
                    Q(description__icontains=q)
                )
                .order_by("-sim")
            )

        # Simple filtering
        destination = request.query_params.get("destination")
        if destination:
            trips = trips.filter(destination__icontains=destination)
        date_start = request.query_params.get("date_start")
        if date_start:
            trips = trips.filter(date_start__gte=date_start)
        date_end = request.query_params.get("date_end")
        if date_end:
            trips = trips.filter(date_end__lte=date_end)

        # Simple pagination
        try:
            page      = max(int(request.query_params.get("page", 1)), 1)
            page_size = min(int(request.query_params.get("page_size", 20)), 50)
        except (TypeError, ValueError):
            return Response({"detail": "page and page_size must be integers."}, status=400)
        offset    = (page - 1) * page_size
        total     = trips.count()
        trips     = trips[offset: offset + page_size]

        return Response({
            "count":    total,
            "page":     page,
            "results":  TripListSerializer(trips, many=True, context={"request": request}).data,
        })


class PublicTripDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, trip_id):
        try:
            trip = Trip.objects.prefetch_related(
                "images", "tags", "price_covers", "itinerary",
                "members__user", "saved_by",
            ).get(id=trip_id, status=Trip.Status.PUBLISHED, visibility=Trip.Visibility.PUBLIC)
        except Trip.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        return Response(TripDetailSerializer(trip, context={"request": request}).data)


# ─── Trip Ratings ─────────────────────────────────────────────────────────────

class TripRatingView(APIView):
    """
    GET  /api/trips/{trip_id}/ratings/  — my ratings given + members still to rate
    POST /api/trips/{trip_id}/ratings/  — submit a rating (trip must be completed)
    """
    permission_classes = [IsAuthenticated]

    def _get_trip_and_member(self, trip_id, user):
        try:
            trip = Trip.objects.prefetch_related("members__user").get(id=trip_id)
        except Trip.DoesNotExist:
            return None, None, Response({"detail": "Not found."}, status=404)
        member = trip.members.filter(user=user, status=TripMember.Status.APPROVED).first()
        if not member:
            return None, None, Response(
                {"detail": "You are not a member of this trip."}, status=403
            )
        return trip, member, None

    def get(self, request, trip_id):
        trip, _, err = self._get_trip_and_member(trip_id, request.user)
        if err:
            return err

        ratings = TripRating.objects.filter(
            trip=trip, rater=request.user
        ).select_related("rated_user")
        already_rated_ids = set(ratings.values_list("rated_user_id", flat=True))

        pending = []
        if trip.status == Trip.Status.COMPLETED:
            pending = [
                {
                    "user_id":    str(m.user.id),
                    "username":   m.user.username,
                    "first_name": m.user.first_name,
                    "last_name":  m.user.last_name,
                    "avatar_url": m.user.avatar_url,
                    "role":       m.role,
                }
                for m in trip.members.filter(
                    status=TripMember.Status.APPROVED
                ).exclude(user=request.user).select_related("user")
                if m.user.id not in already_rated_ids
            ]

        return Response({
            "trip_status":   trip.status,
            "ratings":       TripRatingSerializer(ratings, many=True).data,
            "pending":       pending,
            "has_rated_all": trip.status == Trip.Status.COMPLETED and len(pending) == 0,
        })

    def post(self, request, trip_id):
        trip, _, err = self._get_trip_and_member(trip_id, request.user)
        if err:
            return err

        if trip.status != Trip.Status.COMPLETED:
            return Response(
                {"detail": "You can only rate members after the trip ends."}, status=400
            )

        rated_user_id = request.data.get("rated_user")
        if not rated_user_id:
            return Response({"detail": "rated_user is required."}, status=400)

        try:
            rated_member = TripMember.objects.select_related("user").get(
                trip=trip, user_id=rated_user_id, status=TripMember.Status.APPROVED
            )
        except TripMember.DoesNotExist:
            return Response(
                {"detail": "Rated user was not a member of this trip."}, status=400
            )

        if str(rated_member.user.id) == str(request.user.id):
            return Response({"detail": "You cannot rate yourself."}, status=400)

        if TripRating.objects.filter(
            trip=trip, rater=request.user, rated_user=rated_member.user
        ).exists():
            return Response(
                {"detail": "You have already rated this member."}, status=400
            )

        serializer = TripRatingSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        rating = serializer.save(
            trip=trip, rater=request.user, rated_user=rated_member.user
        )

        # Award karma for giving a rating, then check badge criteria for both users
        from apps.karma.utils import award_karma, award_badges
        award_karma(
            user        = request.user,
            delta       = 2,
            reason      = "group_rating",
            description = f"Rated a crew member on: {trip.title}",
            trip        = trip,
        )
        award_badges(request.user, trip=trip)
        award_badges(rated_member.user, trip=trip)

        return Response(TripRatingSerializer(rating).data, status=201)


# ─── Incident Reports ─────────────────────────────────────────────────────────

class IncidentReportView(APIView):
    """
    POST /api/trips/{trip_id}/reports/  — file a report (must be approved member)
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, trip_id):
        try:
            trip = Trip.objects.get(id=trip_id)
        except Trip.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        is_member = TripMember.objects.filter(
            trip=trip, user=request.user, status=TripMember.Status.APPROVED
        ).exists()
        if not is_member:
            return Response(
                {"detail": "You must be a trip member to file a report."}, status=403
            )

        serializer = IncidentReportSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        report = serializer.save(trip=trip, reporter=request.user)
        return Response(IncidentReportSerializer(report).data, status=201)


# ─── Trip group conversation ──────────────────────────────────────────────────

class TripGroupConversationView(APIView):
    """
    GET /api/trips/{trip_id}/conversation/
    Returns (or creates) the group conversation for this trip.
    The requester must be the chief or an approved member.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, trip_id):
        from apps.chat.models import Conversation, ConversationMember
        from apps.chat.serializers import ConversationDetailSerializer

        try:
            trip = Trip.objects.select_related("chief").get(id=trip_id)
        except Trip.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        is_chief  = _is_chief(trip, request.user)
        is_member = TripMember.objects.filter(
            trip=trip, user=request.user, status=TripMember.Status.APPROVED
        ).exists()

        if not is_chief and not is_member:
            return Response({"detail": "You are not a member of this trip."}, status=403)

        with transaction.atomic():
            conv = trip.group_chats.first()
            just_created = False
            if not conv:
                conv = Conversation.objects.create(
                    type=Conversation.Type.GROUP,
                    trip=trip,
                    name=trip.title,
                    created_by=trip.chief,
                )
                just_created = True
                # Add chief as admin
                ConversationMember.objects.get_or_create(
                    conversation=conv, user=trip.chief,
                    defaults={"is_admin": True},
                )
                # Add all approved members so the chat appears for everyone
                approved_members = TripMember.objects.filter(
                    trip=trip, status=TripMember.Status.APPROVED
                ).select_related("user").exclude(user=trip.chief)
                ConversationMember.objects.bulk_create(
                    [ConversationMember(conversation=conv, user=m.user, is_admin=False)
                     for m in approved_members],
                    ignore_conflicts=True,
                )

            # Ensure requester is a member of the conversation
            ConversationMember.objects.get_or_create(
                conversation=conv, user=request.user,
                defaults={"is_admin": is_chief},
            )

        # Notify all members on first creation (except the person who triggered it)
        if just_created:
            from apps.notifications.utils import push_many
            all_members = TripMember.objects.filter(
                trip=trip, status=TripMember.Status.APPROVED
            ).select_related("user").exclude(user=request.user)
            push_many(
                recipients=[m.user for m in all_members],
                notif_type="chat_message",
                title=f"Group chat started — {trip.title}",
                body=f"{request.user.first_name or request.user.username} started the group chat. Tap to join.",
                sender=request.user,
                trip=trip,
                action_url=f"/chat",
                data={"conversation_id": str(conv.id)},
            )

        return Response(
            ConversationDetailSerializer(conv, context={"request": request}).data
        )


# ─── Trip check-in ────────────────────────────────────────────────────────────

class TripCheckInView(APIView):
    """
    GET  /api/trips/{trip_id}/checkin/ — list stop IDs the requester has checked into
    POST /api/trips/{trip_id}/checkin/ — check in at a stop
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, trip_id):
        try:
            trip = Trip.objects.get(id=trip_id)
        except Trip.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        checked_stop_ids = list(
            CheckIn.objects.filter(trip=trip, member=request.user)
            .values_list("stop_id", flat=True)
        )
        return Response({"checked_in_stops": [str(sid) for sid in checked_stop_ids]})

    def post(self, request, trip_id):
        from django.contrib.gis.geos import Point

        try:
            trip = Trip.objects.prefetch_related("itinerary").get(id=trip_id)
        except Trip.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        if not TripMember.objects.filter(
            trip=trip, user=request.user, status=TripMember.Status.APPROVED
        ).exists():
            return Response({"detail": "You are not an approved member of this trip."}, status=403)

        stop_id = request.data.get("stop_id")
        if stop_id:
            try:
                stop = ItineraryStop.objects.get(id=stop_id, trip=trip)
            except ItineraryStop.DoesNotExist:
                return Response({"detail": "Stop not found."}, status=404)
        else:
            stop = trip.itinerary.filter(is_current=True).first() \
                or trip.itinerary.order_by("order").first()
            if not stop:
                return Response({"detail": "No itinerary stops for this trip."}, status=400)

        if CheckIn.objects.filter(trip=trip, member=request.user, stop=stop).exists():
            return Response({"checked_in": True, "stop": stop.name, "already": True}, status=200)

        lat = request.data.get("lat")
        lng = request.data.get("lng")
        if lat is None or lng is None:
            return Response({"detail": "lat and lng are required."}, status=400)

        try:
            point = Point(float(lng), float(lat), srid=4326)
        except (TypeError, ValueError):
            return Response({"detail": "Invalid lat/lng values."}, status=400)

        CheckIn.objects.create(
            trip=trip,
            member=request.user,
            stop=stop,
            location_at_checkin=point,
        )
        return Response({"checked_in": True, "stop": stop.name, "already": False}, status=201)
