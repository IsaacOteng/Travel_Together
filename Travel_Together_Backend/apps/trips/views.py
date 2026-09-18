import uuid
from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.core.exceptions import ValidationError
from utils.storage import save_image, delete_file as storage_delete
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .completeness import missing_for_publish
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


def _acknowledge_report(report):
    """
    Drop the acknowledgement card into the reporter's Travel Together thread.

    Best-effort: a chat thread that fails to write must never lose a report that
    is already committed. The report is the record; the card is the receipt.
    """
    try:
        from apps.chat.support import post_report_card
        post_report_card(report)
    except Exception:
        pass


def _notify_reported_party(report):
    """
    Tell whoever this report names that they need to answer it without ever
    saying who filed it.

    Anti-retaliation is the whole point: the reporter may still be in a van with
    this person. `push` carries only the trip and the report id, and
    IncidentReportView.get withholds the reporter on the way back out.
    """
    reported_id = report.reported_user_id
    if not reported_id or reported_id == report.reporter_id:
        return
    try:
        from apps.notifications.utils import push
        trip = report.trip
        push(
            recipient  = report.reported_user,
            notif_type = "report_filed",
            title      = (
                "A concern was raised about your trip" if trip
                else "A concern was raised involving you"
            ),
            body       = (
                f'Someone raised a concern about "{trip.title}". '
                f"Add your side and any evidence so the team can review it fairly."
                if trip else
                "The Travel Together team will be in touch about a concern involving you."
            ),
            trip       = trip,
            action_url = f"/group-dashboard/{trip.id}" if trip else "/chat",
            data       = {
                "trip_id":   str(trip.id) if trip else None,
                "report_id": str(report.id),
            },
        )
    except Exception:
        pass


def _is_chief(trip, user):
    return trip.chief_id == user.pk


def _haversine_meters(lat1, lng1, lat2, lng2):
    """Great-circle distance in metres between two WGS-84 points."""
    import math
    r = 6371000.0  # mean earth radius, metres
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp     = math.radians(lat2 - lat1)
    dl     = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _ensure_meeting_point_stop(trip):
    """
    Create the locked meeting-point check-in (order 0) if it doesn't exist.

    This is the tamper-proof departure / no-show signal: the organizer can't
    edit or remove it, and members check in here to prove they're on board.
    Idempotent.
    """
    if trip.itinerary.filter(is_system=True).exists():
        return None
    # Make room at order 0 by bumping any existing stops down.
    for stop in trip.itinerary.all().order_by("-order"):
        stop.order += 1
        stop.save(update_fields=["order"])
    return ItineraryStop.objects.create(
        trip=trip,
        order=0,
        name=trip.meeting_point or "Meeting Point",
        location=trip.meeting_point_coords,
        is_system=True,
        note="Departure check-in point",
    )


def _trip_start_datetime(trip):
    """
    When the trip is due to set off, as an aware datetime.

    Defined once in apps.trips.lifecycle, alongside the matching end time, so
    the check-in window, the departure gate and the End Trip gate all agree on
    when a trip runs.
    """
    from .lifecycle import trip_start_datetime
    return trip_start_datetime(trip)


def _require_chief(trip, user):
    if not _is_chief(trip, user):
        return Response({"detail": "Only the trip chief can do this."}, status=403)
    return None


def _trip_has_stakeholders(trip):
    """Someone other than the organizer holds a spot or has money in escrow.

    The rule itself lives in apps.trips.lifecycle so the API and the serializers
    that tell the UI which buttons to show cannot disagree about it.
    """
    from .lifecycle import has_stakeholders
    return has_stakeholders(trip)


# Statuses that mean "you are part of this group" for read purposes. Mirrors the
# tiering already enforced by TripDetailSerializer.get_members: only people who
# are actually in the group see the group's internal data (full roster, stop
# addresses, meeting-point coordinates).
_IN_GROUP_STATUSES = [
    TripMember.Status.APPROVED,
    TripMember.Status.AWAITING_PAYMENT,
]


def _is_in_group(trip, user):
    """True if the user is the chief or a member who is actually in the group."""
    if _is_chief(trip, user):
        return True
    return trip.members.filter(user=user, status__in=_IN_GROUP_STATUSES).exists()


def _require_group_access(trip, user):
    """
    Guard for trip-internal reads (roster, itinerary).

    These expose meeting-point addresses, stop coordinates and the full member
    list, so they must never be readable by someone outside the group even
    though they're behind IsAuthenticated. Returns a Response to bail out with,
    or None when access is allowed.
    """
    if not _is_in_group(trip, user):
        return Response({"detail": "You are not a member of this trip."}, status=403)
    return None


# ─── Trips: list + create ─────────────────────────────────────────────────────

class TripListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """My trips where I'm chief or an approved/pending member."""
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
        # Must be a member or chief to see non-public trips. AWAITING_PAYMENT
        # counts: that member has been approved and is being asked to pay, so
        # hiding the trip from them would hide the thing they're paying for.
        if trip.visibility == Trip.Visibility.PRIVATE:
            is_member = trip.members.filter(
                user=request.user,
                status__in=_IN_GROUP_STATUSES + [TripMember.Status.PENDING],
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
            return Response(
                {"detail": "This trip is already running and can't be deleted. "
                           "Cancel it instead — members are refunded.",
                 "action": "cancel"},
                status=400,
            )
        if trip.status == Trip.Status.COMPLETED:
            # Completed trips are everyone's permanent travel history never erase.
            return Response(
                {"detail": "Completed trips are part of travellers' history and can't be deleted."},
                status=400,
            )

        # A trip others have joined (or that holds money) carries history we must
        # NOT erase via a cascading hard-delete, and the members are owed both a
        # refund and an explanation. That is cancellation, not deletion — a
        # different, heavier action that the organizer has to choose knowingly,
        # so we refuse here and point at /cancel/ rather than quietly doing it
        # behind a button labelled "Delete".
        if _trip_has_stakeholders(trip):
            return Response(
                {"detail": "People have already joined this trip, so it can't be deleted. "
                           "Cancel it instead — everyone is refunded and told why.",
                 "action": "cancel"},
                status=409,
            )

        # Empty trip safe to remove entirely.
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

        # A draft is allowed to be half-finished; a published trip is not.
        # This is the authoritative check — the create serializer validates the
        # normal path, but a draft can also be built up through PATCHes, so the
        # completeness rules are re-run here against the saved row.
        problems = missing_for_publish(trip)
        if problems:
            return Response(
                {
                    "detail": "This trip isn't ready to publish yet.",
                    "missing": problems,
                },
                status=400,
            )

        trip.status = Trip.Status.PUBLISHED
        trip.save(update_fields=["status", "updated_at"])
        _ensure_meeting_point_stop(trip)
        return Response({"status": trip.status})


# ─── Trip: depart ────────────────────────────────────────────────────────────

class TripDepartView(APIView):
    """
    POST /api/trips/<id>/depart/

    Chief confirms the group has set off. Every condition below must hold:

      1. Caller is the trip's chief.
      2. Trip is PUBLISHED or ACTIVE (not draft/cancelled/completed).
      3. It hasn't already departed.
      4. The trip's start date/time has arrived.
      5. At least one approved member other than the chief has joined.
      6. At least ONE of those members has checked in at the meeting point.

    Rule 6 used to be a percentage quorum, and it was the wrong instrument. It
    made the organizer's trip depend on other people remembering to tap a
    button, so a flat battery or poor signal at the meeting point blocked a
    real departure. Most missing check-ins are that, not fraud.

    So the evidence no longer decides WHETHER you can leave only how fast the
    money follows. The check-in rate is recorded here and graded when the
    partial payout is considered (see apps.trips.checkin_stats.evidence_tier):
    a well-attested trip pays out on the short hold, a thinly-attested one waits
    much longer so members have time to object, and one below the anomaly floor
    gets no partial at all. What rule 6 still guarantees is that a trip nobody
    turned up to can never depart, and so can never reach an early payout.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, trip_id):
        import math
        from django.utils import timezone
        from django.conf import settings

        try:
            trip = Trip.objects.get(id=trip_id)
        except Trip.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        err = _require_chief(trip, request.user)
        if err:
            return err
        if trip.status not in (Trip.Status.PUBLISHED, Trip.Status.ACTIVE):
            return Response({"detail": "This trip can't be marked as departed."}, status=400)

        if trip.departure_confirmed_at:
            return Response({"detail": "This trip has already departed."}, status=400)

        # ── Not before the trip is due to start ──────────────────────────────
        # Departure is what starts the payout clock (the partial releases
        # DEPARTURE_GRACE_HOURS later), so an organizer must not be able to
        # "depart" a trip that is still days away and begin drawing down escrow
        # before anyone has travelled.
        starts_at = _trip_start_datetime(trip)
        if timezone.now() < starts_at:
            return Response({
                "detail": (
                    "This trip hasn't started yet. You can confirm departure from "
                    f"{starts_at.strftime('%d %b %Y, %H:%M')} UTC."
                ),
                "starts_at": starts_at.isoformat(),
            }, status=400)

        meeting_stop = trip.itinerary.filter(is_system=True).first()
        if not meeting_stop:
            return Response({"detail": "No meeting-point check-in configured for this trip."}, status=400)

        approved_ids = set(
            trip.members.filter(status=TripMember.Status.APPROVED)
            .exclude(role=TripMember.Role.CHIEF)
            .values_list("user_id", flat=True)
        )
        checked_in_ids = set(
            CheckIn.objects.filter(trip=trip, stop=meeting_stop)
            .values_list("member_id", flat=True)
        )
        checked_in     = len(approved_ids & checked_in_ids)
        approved_count = len(approved_ids)

        # ── Somebody other than the organizer must actually be travelling ────
        # A solo trip has nothing to depart, and letting one through would start
        # the payout clock on a trip with no travellers at all.
        if approved_count == 0:
            return Response({
                "detail": "Nobody has joined this trip yet, so there's no departure to confirm.",
                "checked_in": 0,
                "expected":   0,
            }, status=400)

        # The evidence floor: somebody other than the organizer must have proved
        # they were there. Below this there is no evidence of a trip at all,
        # which is the case a departure gate is genuinely for.
        if checked_in < 1:
            return Response({
                "detail": (
                    "At least one member needs to check in at the meeting point "
                    "before you can confirm departure."
                ),
                "checked_in": checked_in,
                "expected":   approved_count,
            }, status=400)

        from apps.trips.checkin_stats import meeting_point_stats, evidence_tier, partial_hold_hours
        _, _, percent = meeting_point_stats(trip)

        trip.departure_confirmed_at   = timezone.now()
        trip.departure_checkin_percent = percent
        if trip.status == Trip.Status.PUBLISHED:
            trip.status = Trip.Status.ACTIVE
        trip.save(update_fields=[
            "departure_confirmed_at", "departure_checkin_percent", "status", "updated_at",
        ])

        # The partial is never released inline. The hourly sweep releases it once
        # the hold for this trip's evidence level has passed and no dispute has
        # been raised; thin evidence simply waits longer.
        tier  = evidence_tier(percent)
        hours = partial_hold_hours(percent)
        return Response({
            "departed":        True,
            "checked_in":      checked_in,
            "expected":        approved_count,
            "checkin_percent": percent,
            "evidence":        tier,
            "partial_in": (
                f"~{hours}h (after the review window)" if hours
                else "held until the trip is completed (too few check-ins for an early release)"
            ),
        })


# ─── Trip: confirm completion ─────────────────────────────────────────────────

class TripConfirmView(APIView):
    """
    POST /api/trips/<id>/confirm/

    A member confirms the trip took place. Only members who actually attended
    (checked in at least once) can confirm a no-show can't vouch, though they
    may still dispute via a report. Recorded as evidence for the grace window.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, trip_id):
        from django.utils import timezone
        try:
            trip = Trip.objects.get(id=trip_id)
        except Trip.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        member = TripMember.objects.filter(
            trip=trip, user=request.user, status=TripMember.Status.APPROVED
        ).first()
        if not member:
            return Response({"detail": "You are not a member of this trip."}, status=403)

        if not trip.ended_at and trip.status != Trip.Status.COMPLETED:
            return Response({"detail": "You can confirm once the trip has ended."}, status=400)

        if not CheckIn.objects.filter(trip=trip, member=request.user).exists():
            return Response(
                {"detail": "You didn't check in on this trip, so you can't confirm it. "
                           "Report a problem instead if something was wrong."},
                status=400,
            )

        if not member.completion_confirmed_at:
            member.completion_confirmed_at = timezone.now()
            member.save(update_fields=["completion_confirmed_at"])
        return Response({"confirmed": True})


# ─── Trip: end ───────────────────────────────────────────────────────────────

class TripCancelView(APIView):
    """
    POST /api/trips/<id>/cancel/
    Chief-only. Calls the whole trip off: every held payment is refunded, every
    member is notified, the trip is marked CANCELLED, and the organizer takes a
    karma penalty (the only deterrent available, since the money goes back).

    This is the honest exit when an organizer changes their mind. It is
    deliberately separate from delete — nothing is erased, because the members
    need the record of what happened to their money.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, trip_id):
        try:
            trip = Trip.objects.get(id=trip_id)
        except Trip.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        err = _require_chief(trip, request.user)
        if err:
            return err

        if trip.status == Trip.Status.CANCELLED:
            return Response({"detail": "This trip is already cancelled."}, status=400)
        if trip.status in (Trip.Status.COMPLETED, Trip.Status.ARCHIVED):
            return Response(
                {"detail": "This trip has already finished and can't be cancelled."},
                status=400,
            )

        from apps.payments.models import Payment
        refunded = Payment.objects.filter(trip=trip, status=Payment.Status.HELD).count()

        from .lifecycle import is_late_cancellation
        was_late = is_late_cancellation(trip)

        from apps.payments.services import cancel_trip
        cancel_trip(trip, by_organizer=True, reason="cancelled by organizer")

        return Response({
            "detail": "Trip cancelled. Everyone who paid is being refunded.",
            "status": Trip.Status.CANCELLED,
            "refunds_started": refunded,
            "late": was_late,
        }, status=200)


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

        # "Ended" means the trip ran to its conclusion, which starts the clock on
        # paying the organizer. Two ways that claim can be false, and both hand
        # the organizer money for a trip that did not happen as described:
        #
        #   never departed        — the trip never happened at all
        #   still under way       — it is happening, but it isn't over
        #
        # Either way the honest exit is cancellation, which refunds the members.
        from django.utils import timezone
        from .lifecycle import trip_end_datetime
        if _trip_has_stakeholders(trip):
            if not trip.departure_confirmed_at:
                return Response(
                    {"detail": "This trip never departed, so it can't be ended. "
                               "If it's going ahead, confirm departure first; if it's off, "
                               "cancel it and everyone is refunded.",
                     "action": "cancel"},
                    status=400,
                )
            ends_at = trip_end_datetime(trip)
            if timezone.now() < ends_at:
                return Response(
                    {"detail": "This trip isn't over yet. You can end it from "
                               f"{ends_at.strftime('%d %b %Y, %H:%M')} UTC. "
                               "If it's being cut short, cancel it instead — "
                               "everyone gets refunded.",
                     "ends_at": ends_at.isoformat(),
                     "action": "cancel"},
                    status=400,
                )

        trip.status   = Trip.Status.COMPLETED
        trip.ended_at = timezone.now()
        trip.save(update_fields=["status", "ended_at", "updated_at"])

        # The nightly completion sweep flags trips that "happened" with almost no
        # check-ins, which freezes the payout for review. Ending by hand must run
        # the same check, or the button becomes a way to walk around it.
        from apps.trips.checkin_stats import flag_if_checkin_evidence_is_thin
        flag_if_checkin_evidence_is_thin(trip)

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

        from django.utils import timezone
        if trip.date_start < timezone.now().date():
            return Response({"detail": "This trip has already started and can no longer be joined."}, status=400)

        if _is_chief(trip, request.user):
            return Response({"detail": "You are already the chief of this trip."}, status=400)

        # (trip, user) is unique, so every existing-membership case must be
        # answered here. Falling through to the create() below on a status we
        # forgot to name would hit the constraint and 500.
        existing = TripMember.objects.filter(trip=trip, user=request.user).first()
        if existing:
            if existing.status == TripMember.Status.APPROVED:
                return Response({"detail": "You are already a member."}, status=400)
            if existing.status == TripMember.Status.AWAITING_PAYMENT:
                return Response(
                    {"detail": "You're already approved for this trip pay to confirm your spot."},
                    status=400,
                )
            if existing.status == TripMember.Status.PENDING:
                return Response({"detail": "Your request is already pending."}, status=400)
            if existing.status == TripMember.Status.REMOVED:
                return Response({"detail": "You have been removed from this trip."}, status=403)
            if existing.status != TripMember.Status.REJECTED:
                # Unreachable today; a guard so a newly added status can never
                # silently become an IntegrityError.
                return Response(
                    {"detail": "You already have a membership record for this trip."},
                    status=400,
                )

        if trip.spots_left() <= 0:
            return Response({"detail": "This trip is full."}, status=400)

        if existing:   # only a REJECTED row reaches here re-open it
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

        # A removed member has nothing to "leave" or "withdraw" the chief
        # already ended their membership. Hard-deleting the row here would erase
        # that decision and let them straight back in via POST /join/, which
        # explicitly refuses REMOVED members. Keep the row so the ban holds.
        if member.status == TripMember.Status.REMOVED:
            return Response({"detail": "You have been removed from this trip."}, status=403)

        # Refund (minus fee) if still within the cutoff window, else forfeit.
        from apps.payments.services import handle_member_leaving
        handle_member_leaving(trip, request.user)

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

        err = _require_group_access(trip, request.user)
        if err:
            return err

        # Only the chief manages join requests, so only the chief sees people
        # who aren't in the group yet (pending / rejected / removed). Members
        # see the group itself.
        members = trip.members.all()
        if not _is_chief(trip, request.user):
            members = [m for m in members if m.status in _IN_GROUP_STATUSES]
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
        from django.conf import settings
        if action == "approve":
            # Approving is not idempotent it admits to the group chat and, on a
            # paid trip, opens a fresh Payment row. Re-approving someone already
            # in (or already billed) would bill them a second time and prompt a
            # second charge, so refuse rather than repeat the side effects.
            if member.status in TripMember.OCCUPYING_STATUSES:
                return Response(
                    {"detail": (
                        "This member is already awaiting payment."
                        if member.status == TripMember.Status.AWAITING_PAYMENT
                        else "This member is already approved."
                    )},
                    status=400,
                )
            if member.status == TripMember.Status.REMOVED:
                return Response(
                    {"detail": "This member was removed from the trip. "
                               "They need to request to join again."},
                    status=400,
                )
            if trip.spots_left() <= 0:
                return Response({"detail": "Trip is full."}, status=400)
            member.approved_at = timezone.now()
            member.approved_by = request.user

            # Pay-after-approval: when enabled and the trip has an entry fee, the
            # member is parked at AWAITING_PAYMENT and must pay to be admitted.
            # Free trips (or payments disabled) admit the member immediately.
            from apps.payments.services import admit_member_to_group, start_member_payment
            requires_payment = settings.PAYMENTS_ENABLED and trip.entry_price and trip.entry_price > 0
            if requires_payment:
                member.status = TripMember.Status.AWAITING_PAYMENT
                member.save(update_fields=["status", "approved_at", "approved_by"])
                start_member_payment(trip, member, approved_by=request.user)
            else:
                member.status = TripMember.Status.APPROVED
                member.save(update_fields=["status", "approved_at", "approved_by"])
                admit_member_to_group(trip, member, approved_by=request.user)
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

        # Settle their money BEFORE the removal is recorded. Being removed is not
        # the member's choice, so the departure-cutoff forfeit that applies when
        # someone leaves voluntarily must never apply here: without this, an
        # organizer could approve a member, take their payment, remove them, and
        # keep the money at payout. A removed member is always refunded (less the
        # processing fee, as every refund is).
        from apps.payments.services import refund_removed_member
        refunded = refund_removed_member(trip, member.user)

        from django.utils import timezone
        member.status = TripMember.Status.REMOVED
        member.removed_at = timezone.now()
        member.save(update_fields=["status", "removed_at"])
        # Remove from group chat
        from apps.chat.models import ConversationMember
        conv = trip.group_chats.first()
        if conv:
            ConversationMember.objects.filter(conversation=conv, user=member.user).delete()

        # 200 rather than 204 so the organizer's UI can say what was refunded.
        return Response({
            "removed":  True,
            "refunded": str(refunded) if refunded is not None else None,
        }, status=200)


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

        # Stops carry meeting-point addresses, coordinates and per-stop check-in
        # identities group data, not public data. TripDetailSerializer applies
        # the same rule via its own `_viewer_in_group` check, so the public trip
        # page can't be used to route around this guard.
        err = _require_group_access(trip, request.user)
        if err:
            return err

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
        if stop.is_system:
            return Response({"detail": "The meeting-point check-in can't be edited."}, status=400)
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
        if stop.is_system:
            return Response({"detail": "The meeting-point check-in can't be removed."}, status=400)
        stop.delete()
        return Response(status=204)


# ─── Public views (no auth) ───────────────────────────────────────────────────

class PublicTripListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from django.utils import timezone
        # Only show trips that haven't started yet hide anything whose start
        # date has passed so travellers can't mistakenly join a past trip
        # (independent of the daily status-flip task).
        trips = Trip.objects.filter(
            status=Trip.Status.PUBLISHED,
            visibility=Trip.Visibility.PUBLIC,
            date_start__gte=timezone.now().date(),
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
    GET  /api/trips/{trip_id}/reports/           organizer views concerns raised
                                                  ABOUT them (reporter withheld)
    GET  /api/trips/{trip_id}/reports/?mine=1     anyone views reports THEY filed
                                                  on this trip
    POST /api/trips/{trip_id}/reports/            file a trip-scoped report

    Trip-scoped only. A concern that is not about a trip goes to
    GeneralReportView, which stamps scope=general.
    """
    permission_classes = [IsAuthenticated]

    def _membership(self, trip, user):
        """(is_chief, is_member) for this user on this trip."""
        is_chief  = _is_chief(trip, user)
        is_member = TripMember.objects.filter(
            trip=trip, user=user, status=TripMember.Status.APPROVED
        ).exists()
        return is_chief, is_member

    def get(self, request, trip_id):
        try:
            trip = Trip.objects.get(id=trip_id)
        except Trip.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        # "Reports I filed" available to any approved member, including the
        # organizer. This is how a chief follows up on a concern they raised.
        if request.query_params.get("mine"):
            is_chief, is_member = self._membership(trip, request.user)
            if not (is_chief or is_member):
                return Response({"detail": "You are not on this trip."}, status=403)
            mine = trip.incident_reports.filter(
                reporter=request.user
            ).order_by("-created_at")
            return Response([
                {
                    "id":               str(r.id),
                    "reference_number": r.reference_number,
                    "incident_type":    r.incident_type,
                    "description":      r.description,
                    "evidence_urls":    r.evidence_urls,
                    "status":           r.status,
                    "created_at":       r.created_at,
                    "response":         r.response,
                    "responded_at":     r.responded_at,
                }
                for r in mine
            ])

        if not _is_chief(trip, request.user):
            return Response({"detail": "Only the organizer can view this."}, status=403)

        # Only what was raised AGAINST the organizer. The previous version
        # returned every report on the trip, which meant a report the chief
        # filed themselves came straight back to them rendered as "a concern was
        # raised about your trip", and a report naming one member was shown to
        # the organizer as if it accused them.
        reports = trip.incident_reports.filter(
            Q(reported_user=request.user) | Q(reported_user__isnull=True)
        ).exclude(reporter=request.user).order_by("-created_at")

        return Response([
            {
                "id":            str(r.id),
                "incident_type": r.incident_type,
                "description":   r.description,      # the claim; reporter identity withheld
                "status":        r.status,
                "created_at":    r.created_at,
                "response":      r.response,
                "responded_at":  r.responded_at,
            }
            for r in reports
        ])

    def post(self, request, trip_id):
        try:
            trip = Trip.objects.select_related("chief").get(id=trip_id)
        except Trip.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        is_chief, is_member = self._membership(trip, request.user)
        if not (is_chief or is_member):
            return Response(
                {"detail": "You must be on this trip to file a report about it."},
                status=403,
            )

        serializer = IncidentReportSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        # Whoever is named must actually be on this trip. Without this check the
        # member picker is an arbitrary "file a report against any user id"
        # endpoint wearing a trip feature's clothes.
        reported = serializer.validated_data.get("reported_user")
        if reported is not None:
            if reported.pk == request.user.pk:
                return Response(
                    {"detail": "You can't file a report against yourself."}, status=400
                )
            on_trip = (
                trip.chief_id == reported.pk
                or TripMember.objects.filter(
                    trip=trip, user=reported, status=TripMember.Status.APPROVED
                ).exists()
            )
            if not on_trip:
                return Response(
                    {"detail": "That person isn't on this trip."}, status=400
                )

        report = serializer.save(
            trip          = trip,
            reporter      = request.user,
            scope         = IncidentReport.Scope.TRIP,
            origin        = IncidentReport.Origin.GROUP_DASHBOARD,
            reporter_role = (
                IncidentReport.ReporterRole.CHIEF if is_chief
                else IncidentReport.ReporterRole.MEMBER
            ),
        )

        # A member's trip-level dispute is with the organizer, so default the
        # reported party to the chief. An ORGANIZER's is not otherwise the
        # chief becomes the accused in their own complaint, and then reads it
        # back to themselves in OrganizerReportCard.
        if not report.reported_user_id and not is_chief and trip.chief_id:
            report.reported_user = trip.chief
            report.save(update_fields=["reported_user"])

        _acknowledge_report(report)
        _notify_reported_party(report)

        return Response(IncidentReportSerializer(report).data, status=201)


class GeneralReportView(APIView):
    """
    GET  /api/reports/    every report this user has filed, trip-scoped or not
    POST /api/reports/    file a general (non-trip) report

    The counterpart to IncidentReportView. Same record, same admin queue, same
    reference number the only difference is that `scope` says this concern is
    not about a particular trip, so nothing gets a payout freeze and no
    organizer is asked to answer for it.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        reports = IncidentReport.objects.filter(
            reporter=request.user
        ).select_related("trip").order_by("-created_at")
        return Response([
            {
                "id":               str(r.id),
                "reference_number": r.reference_number,
                "scope":            r.scope,
                "trip_id":          str(r.trip_id) if r.trip_id else None,
                "trip_title":       r.trip.title if r.trip_id else None,
                "incident_type":    r.incident_type,
                "description":      r.description,
                "evidence_urls":    r.evidence_urls,
                "status":           r.status,
                "created_at":       r.created_at,
            }
            for r in reports
        ])

    def post(self, request):
        serializer = IncidentReportSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        # Support chat lets the user optionally attach a trip they were on. If
        # they do, this becomes a trip-scoped report filed through a different
        # door and `origin` records which door.
        trip     = None
        trip_id  = request.data.get("trip")
        is_chief = False
        if trip_id:
            try:
                trip = Trip.objects.select_related("chief").get(id=trip_id)
            except (Trip.DoesNotExist, ValueError, ValidationError):
                return Response({"detail": "Trip not found."}, status=400)
            is_chief  = _is_chief(trip, request.user)
            is_member = TripMember.objects.filter(
                trip=trip, user=request.user, status=TripMember.Status.APPROVED
            ).exists()
            if not (is_chief or is_member):
                return Response(
                    {"detail": "You can only attach a trip you were on."}, status=403
                )

        report = serializer.save(
            trip          = trip,
            reporter      = request.user,
            scope         = IncidentReport.Scope.TRIP if trip else IncidentReport.Scope.GENERAL,
            origin        = IncidentReport.Origin.SUPPORT_CHAT,
            reporter_role = (
                IncidentReport.ReporterRole.CHIEF if is_chief
                else IncidentReport.ReporterRole.MEMBER if trip
                else IncidentReport.ReporterRole.GUEST
            ),
        )
        if trip and not report.reported_user_id and not is_chief and trip.chief_id:
            report.reported_user = trip.chief
            report.save(update_fields=["reported_user"])

        _acknowledge_report(report)
        if trip:
            _notify_reported_party(report)

        return Response(IncidentReportSerializer(report).data, status=201)


class ReportEvidenceUploadView(APIView):
    """
    POST /api/reports/evidence/   multipart, key `file`

    Returns { "url": "..." } to put in `evidence_urls` when filing. Separate
    from the report POST so a photo uploads while the person is still typing
    the 50-character description, and so one failed upload doesn't throw away
    the whole account of what happened.

    Goes through save_image, which strips EXIF. That matters more here than
    anywhere else in the app: a harassment photo still carrying the reporter's
    GPS coordinates is a location leak straight onto an admin screen.
    """
    permission_classes = [IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser]

    ALLOWED  = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
    MAX_SIZE = 10 * 1024 * 1024

    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "No file provided. Use key 'file'."}, status=400)
        if getattr(file, "content_type", "") not in self.ALLOWED:
            return Response(
                {"detail": "Evidence must be an image (JPEG, PNG, WebP or HEIC)."},
                status=400,
            )
        if file.size > self.MAX_SIZE:
            return Response({"detail": "Image exceeds 10 MB limit."}, status=400)

        # Keyed by reporter, not by trip: evidence uploads before the report row
        # exists, and a general report has no trip to key on.
        key = f"reports/{request.user.pk}/{uuid.uuid4().hex}.jpg"
        try:
            url = save_image(file, key, max_px=1600, request=request)
        except Exception:
            return Response({"detail": "Couldn't process that image."}, status=400)
        return Response({"url": url}, status=201)


class IncidentRespondView(APIView):
    """
    POST /api/trips/{trip_id}/reports/{report_id}/respond/
    The reported organizer submits their side of the story + evidence.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, trip_id, report_id):
        from django.utils import timezone
        try:
            report = IncidentReport.objects.select_related("trip").get(id=report_id, trip_id=trip_id)
        except IncidentReport.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        if not (report.trip.chief_id and report.trip.chief_id == request.user.pk):
            return Response({"detail": "Only the trip organizer can respond to this."}, status=403)

        evidence = request.data.get("evidence_urls") or []
        report.response               = (request.data.get("response") or "").strip()
        report.response_evidence_urls = evidence[:5] if isinstance(evidence, list) else []
        report.responded_at           = timezone.now()
        report.save(update_fields=["response", "response_evidence_urls", "responded_at", "updated_at"])
        return Response({"responded": True})


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
                title=f"Group chat started {trip.title}",
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

        # ── Check-in window ──────────────────────────────────────────────────
        # Nothing counts until shortly before the trip is due to leave.
        #
        # Check-ins are the evidence departure runs on: the organizer's partial
        # payout is timed from them. Without a window
        # they could be collected days in advance someone stands at the meeting
        # point once, in geofence, and is banked as "present" for a trip they
        # never turn up to. The hour of slack is for people who arrive early.
        from django.utils import timezone as _tz
        from datetime import timedelta as _td

        hours    = settings.CHECKIN_WINDOW_HOURS_BEFORE_START
        opens_at = _trip_start_datetime(trip) - _td(hours=hours)
        if _tz.now() < opens_at:
            return Response({
                "detail": (
                    f"Check-in opens {hours} hour{'s' if hours != 1 else ''} before the trip "
                    f"starts ({opens_at.strftime('%d %b %Y, %H:%M')} UTC)."
                ),
                "opens_at": opens_at.isoformat(),
            }, status=400)

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
            lat, lng = float(lat), float(lng)
            point = Point(lng, lat, srid=4326)
        except (TypeError, ValueError):
            return Response({"detail": "Invalid lat/lng values."}, status=400)

        try:
            accuracy = float(request.data.get("accuracy_meters"))
        except (TypeError, ValueError):
            accuracy = None

        # ── Geofence ─────────────────────────────────────────────────────────
        # A check-in is the trip's proof-of-presence: departure and, in turn, the
        # timing of the organizer's partial payout rest on these rows. So
        # the coordinates must actually be near the stop we can't take the
        # client's word for it.
        distance    = None
        is_verified = False
        if stop.location:
            distance = _haversine_meters(lat, lng, stop.location.y, stop.location.x)

            # Allow the stop's own radius plus the device's reported GPS accuracy,
            # so a member with a weak fix isn't blocked. The accuracy allowance is
            # capped a client can't claim a 50 km "accuracy" to walk through the
            # fence.
            tolerance_cap = settings.CHECKIN_ACCURACY_TOLERANCE_METERS
            allowance     = min(accuracy, tolerance_cap) if accuracy and accuracy > 0 else 0
            limit         = (stop.geofence_radius or 100) + allowance

            if distance > limit:
                return Response({
                    "detail": (
                        f"You're too far from \"{stop.name}\" to check in. "
                        f"Get within {int(limit)} m and try again."
                    ),
                    "distance_meters": round(distance),
                    "required_within_meters": int(limit),
                }, status=400)
            is_verified = True
        # else: the organizer never set coordinates for this stop, so there is
        # nothing to verify against. The check-in is accepted but recorded as
        # unverified so a reviewer can tell the difference.

        CheckIn.objects.create(
            trip=trip,
            member=request.user,
            stop=stop,
            location_at_checkin=point,
            accuracy_meters=accuracy,
            distance_meters=distance,
            is_verified=is_verified,
        )
        return Response({
            "checked_in":      True,
            "stop":            stop.name,
            "already":         False,
            "verified":        is_verified,
            "distance_meters": round(distance) if distance is not None else None,
        }, status=201)
