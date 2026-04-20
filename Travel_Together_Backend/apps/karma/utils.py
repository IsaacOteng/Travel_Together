"""
Karma utility — called by other apps to award or deduct karma and badges.

Usage:
    from apps.karma.utils import award_karma, award_badges

    award_karma(
        user        = user,
        delta       = 10,
        reason      = "trip_completed",
        description = "Completed trip: Alps Weekend",
        trip        = trip,   # optional
    )

    award_badges(user, trip=trip)  # call after any state change
"""

from apps.users.models import User
from .models import KarmaLog


# Karma thresholds for level progression
LEVEL_THRESHOLDS = {
    "Explorer":  0,
    "Navigator": 100,
    "Legend":    500,
}


def award_karma(user, delta, reason, description=None, trip=None):
    """
    Create a KarmaLog entry, update user.travel_karma, and recalculate karma_level.
    Returns the KarmaLog instance.
    """
    log = KarmaLog.objects.create(
        user        = user,
        delta       = delta,
        reason      = reason,
        description = description,
        trip        = trip,
    )

    # Update total karma (floor at 0 — no negative totals)
    user.travel_karma = max(0, user.travel_karma + delta)
    user.karma_level  = _calculate_level(user.travel_karma)
    user.save(update_fields=["travel_karma", "karma_level", "updated_at"])

    return log


def _calculate_level(total_karma):
    if total_karma >= LEVEL_THRESHOLDS["Legend"]:
        return User.KarmaLevel.LEGEND
    if total_karma >= LEVEL_THRESHOLDS["Navigator"]:
        return User.KarmaLevel.NAVIGATOR
    return User.KarmaLevel.EXPLORER


# ── Karma deltas for each reason ──────────────────────────────────────────────

KARMA_RULES = {
    "trip_completed":    10,
    "checkin_ontime":    5,
    "group_rating":      None,   # variable — pass delta explicitly
    "streak_engagement": 2,
    "penalty":           None,   # variable — pass delta explicitly (negative)
}


# ── Badge criteria ─────────────────────────────────────────────────────────────

def award_badges(user, trip=None):
    """
    Check all badge criteria for this user and award any not yet earned.
    Safe to call multiple times — uses get_or_create to avoid duplicates.
    Call this after: trip completion, rating submission, role change.
    """
    from apps.trips.models import Trip, TripMember, TripRating, CheckIn, ItineraryStop
    from .models import Badge, UserBadge

    earned_slugs = set(
        UserBadge.objects.filter(user=user).values_list("badge__slug", flat=True)
    )

    def maybe_award(slug, trip_context=None):
        if slug in earned_slugs:
            return
        try:
            badge = Badge.objects.get(slug=slug)
        except Badge.DoesNotExist:
            return
        UserBadge.objects.get_or_create(
            user=user, badge=badge,
            defaults={"trip": trip_context},
        )
        earned_slugs.add(slug)

    # ── Fetch completed approved memberships (with prefetch) ──────────────────
    completed_memberships = list(
        TripMember.objects.filter(
            user=user,
            status=TripMember.Status.APPROVED,
            trip__status=Trip.Status.COMPLETED,
        ).select_related("trip").prefetch_related("trip__tags")
    )
    completed_trips  = [m.trip for m in completed_memberships]
    completed_count  = len(completed_trips)

    # 1. First Summit — completed 1+ trip
    if completed_count >= 1:
        maybe_award("first-summit", completed_trips[0])

    # 2. Road Warrior — 10+ completed trips
    if completed_count >= 10:
        maybe_award("road-warrior")

    # 3. Beach Bum — 3+ completed beach trips (destination or tag)
    beach_count = sum(
        1 for t in completed_trips
        if "beach" in t.destination.lower()
        or any("beach" in tag.tag.lower() for tag in t.tags.all())
    )
    if beach_count >= 3:
        maybe_award("beach-bum")

    # 5. Globetrotter — 5+ distinct destination cities
    distinct_destinations = len({
        t.destination.split(",")[0].strip().lower()
        for t in completed_trips
    })
    if distinct_destinations >= 5:
        maybe_award("globetrotter")

    # 6. Perfect Attendance — 100% check-ins on at least one completed trip
    for membership in completed_memberships:
        t = membership.trip
        total_stops = ItineraryStop.objects.filter(trip=t).count()
        if total_stops == 0:
            continue
        user_checkins = CheckIn.objects.filter(trip=t, member=user).count()
        if user_checkins >= total_stops:
            maybe_award("perfect-attendance", t)
            break

    # 7. 5-Star Traveler — average received rating >= 4.8 with 3+ ratings
    overalls = list(
        TripRating.objects.filter(rated_user=user).values_list("overall", flat=True)
    )
    if len(overalls) >= 3 and (sum(overalls) / len(overalls)) >= 4.8:
        maybe_award("5-star-traveler")

