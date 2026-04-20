"""
Recap tasks
-----------
generate_trip_recap  — selects the best streaks for a trip's recap reel
send_recap_notification — notifies members when the recap is ready
"""

from celery import shared_task


@shared_task(bind=True, max_retries=3, default_retry_delay=120)
def generate_trip_recap(self, trip_id: str):
    """
    Called when a trip is marked completed.
    Selects up to 20 streaks for the recap reel using this priority:
        1. Geofence-validated streaks (at the right location)
        2. Highest engagement (reactions)
        3. One per member max (spread coverage)
        4. Chronological order within those constraints
    Marks selected streaks with is_in_recap=True.
    """
    try:
        from apps.trips.models import Trip
        from apps.streaks.models import Streak
        from apps.notifications.utils import push_many
        from apps.trips.models import TripMember

        try:
            trip = Trip.objects.get(id=trip_id)
        except Trip.DoesNotExist:
            return

        MAX_RECAP_STREAKS = 20
        MAX_PER_MEMBER    = 3

        # Reset any previous recap selection
        Streak.objects.filter(trip=trip, is_in_recap=True).update(is_in_recap=False)

        # Pull all streaks ordered by validation then engagement
        all_streaks = list(
            Streak.objects.filter(trip=trip)
            .order_by("-geofence_validated", "-engagement_count", "created_at")
            .select_related("user")
        )

        selected      = []
        member_counts = {}

        for streak in all_streaks:
            if len(selected) >= MAX_RECAP_STREAKS:
                break
            uid   = str(streak.user_id)
            count = member_counts.get(uid, 0)
            if count >= MAX_PER_MEMBER:
                continue
            selected.append(streak)
            member_counts[uid] = count + 1

        if selected:
            Streak.objects.filter(id__in=[s.id for s in selected]).update(is_in_recap=True)

        # Notify all trip members the recap is ready
        approved = TripMember.objects.filter(
            trip=trip, status=TripMember.Status.APPROVED
        ).select_related("user")

        if selected:
            push_many(
                recipients = [m.user for m in approved],
                notif_type = "trip_reminder",
                title      = "Your trip recap is ready",
                body       = f"The recap for '{trip.title}' is ready — {len(selected)} moments selected.",
                trip       = trip,
                action_url = f"/trips/{trip.id}/recap/",
                data       = {"streak_count": len(selected)},
            )

    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task
def send_trip_reminder(trip_id: str):
    """
    Send a reminder 24 hours before a trip starts.
    Scheduled by Celery Beat using the trip's date_start.
    """
    from apps.trips.models import Trip, TripMember
    from apps.notifications.utils import push_many
    from django.utils import timezone
    from datetime import timedelta

    try:
        trip = Trip.objects.get(id=trip_id)
    except Trip.DoesNotExist:
        return

    if trip.status != Trip.Status.PUBLISHED:
        return

    approved = TripMember.objects.filter(
        trip=trip, status=TripMember.Status.APPROVED
    ).select_related("user")

    push_many(
        recipients = [m.user for m in approved],
        notif_type = "trip_reminder",
        title      = "Trip starting tomorrow",
        body       = f"'{trip.title}' starts tomorrow. Make sure you're ready!",
        trip       = trip,
        action_url = f"/trips/{trip.id}/",
        data       = {"date_start": str(trip.date_start)},
    )
