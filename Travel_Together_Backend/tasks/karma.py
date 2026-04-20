"""
Karma tasks
-----------
award_trip_completion_karma  — called when a trip is marked completed
award_rating_karma           — called after a TripRating is saved
check_karma_level_up         — checks and notifies if user levelled up
"""

from celery import shared_task


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def award_trip_completion_karma(self, trip_id: str):
    """
    Award karma to every approved member of a completed trip.
    +10 for each member, +15 bonus for the chief.
    """
    try:
        from apps.trips.models import Trip, TripMember
        from apps.karma.utils import award_karma
        from apps.notifications.utils import push

        try:
            trip = Trip.objects.get(id=trip_id)
        except Trip.DoesNotExist:
            return

        members = TripMember.objects.filter(
            trip=trip, status=TripMember.Status.APPROVED
        ).select_related("user")

        for member in members:
            delta = 15 if member.role == TripMember.Role.CHIEF else 10
            award_karma(
                user        = member.user,
                delta       = delta,
                reason      = "trip_completed",
                description = f"Completed trip: {trip.title}",
                trip        = trip,
            )
            push(
                recipient  = member.user,
                notif_type = "karma_level",
                title      = "Karma earned",
                body       = f"You earned +{delta} karma for completing '{trip.title}'.",
                trip       = trip,
                data       = {"delta": delta, "new_total": member.user.travel_karma},
            )
            check_karma_level_up.delay(str(member.user.id))

    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def award_rating_karma(self, rated_user_id: str, trip_id: str, overall: int):
    """
    Award karma based on a received rating (1–5 stars → 2–10 points).
    Called after each TripRating is created.
    """
    try:
        from apps.users.models import User
        from apps.trips.models import Trip
        from apps.karma.utils import award_karma
        from apps.notifications.utils import push

        try:
            user = User.objects.get(id=rated_user_id)
            trip = Trip.objects.get(id=trip_id)
        except (User.DoesNotExist, Trip.DoesNotExist):
            return

        delta = overall * 2   # 1★ = 2pts, 5★ = 10pts
        award_karma(
            user        = user,
            delta       = delta,
            reason      = "group_rating",
            description = f"Received a {overall}★ rating on '{trip.title}'",
            trip        = trip,
        )
        push(
            recipient  = user,
            notif_type = "karma_level",
            title      = "New rating",
            body       = f"You received a {overall}★ rating on '{trip.title}' (+{delta} karma).",
            trip       = trip,
            data       = {"delta": delta, "rating": overall},
        )
        check_karma_level_up.delay(str(user.id))

    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task
def check_karma_level_up(user_id: str):
    """
    Re-read the user's karma level and notify if it changed since the last check.
    Uses cache to track the last notified level.
    """
    from apps.users.models import User
    from apps.notifications.utils import push
    from django.core.cache import cache

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return

    cache_key     = f"karma_level_notified:{user_id}"
    last_notified = cache.get(cache_key)

    if last_notified != user.karma_level:
        if last_notified is not None:   # skip notification on very first save
            push(
                recipient  = user,
                notif_type = "karma_level",
                title      = "Level up!",
                body       = f"Congratulations — you're now a {user.karma_level}!",
                data       = {"level": user.karma_level, "total": user.travel_karma},
            )
        cache.set(cache_key, user.karma_level, timeout=None)
