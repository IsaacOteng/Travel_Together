"""
Meeting-point check-in statistics.

One implementation, used everywhere the "did this trip actually set off?"
question is asked: the departure endpoint, the partial-payout tier, and the
end-of-trip anomaly sweep. These three used to compute it separately, which is
how they would quietly drift apart — a trip could be judged to have enough
evidence to depart and not enough to be paid, using different arithmetic for
the same underlying fact.
"""

from django.conf import settings


def meeting_point_stats(trip):
    """
    How many of a trip's real members have proved they were at the meeting point.

    Returns (checked_in, expected, percent):

        checked_in  members (excluding the organizer) with a meeting-point check-in
        expected    approved members excluding the organizer
        percent     0-100 int, or None when there is nobody to count

    The organizer is excluded on both sides on purpose. Their own check-in is
    self-attestation — counting it would let a solo trip look half-attended, and
    it is the organizer the evidence is meant to hold to account.
    """
    from .models import CheckIn, TripMember

    meeting = trip.itinerary.filter(is_system=True).first()

    expected_ids = set(
        trip.members
        .filter(status=TripMember.Status.APPROVED)
        .exclude(role=TripMember.Role.CHIEF)
        .values_list("user_id", flat=True)
    )
    if not expected_ids or meeting is None:
        return 0, len(expected_ids), None

    checked_ids = set(
        CheckIn.objects.filter(trip=trip, stop=meeting).values_list("member_id", flat=True)
    )
    checked_in = len(expected_ids & checked_ids)
    expected   = len(expected_ids)
    return checked_in, expected, round(100 * checked_in / expected)


def evidence_tier(percent):
    """
    Turn a check-in percentage into how the partial payout should be treated.

    Departure itself is never blocked by this (see TripDepartView) — a trip with
    silent members still has to be able to leave. What the evidence buys is
    *speed*: the more members who proved they were there, the sooner the
    organizer's money moves, and the less exposure there is if it turns out the
    trip never happened.

      "strong"   >= PARTIAL_FAST_RELEASE_CHECKIN_PERCENT  → normal short hold
      "weak"     >= ANOMALY_MIN_CHECKIN_PERCENT           → long hold, more time to object
      "insufficient"                                      → no partial at all

    `percent` of None (nobody to count) is "insufficient": there is no evidence,
    so nothing is released early.
    """
    if percent is None:
        return "insufficient"
    if percent >= settings.PARTIAL_FAST_RELEASE_CHECKIN_PERCENT:
        return "strong"
    if percent >= settings.ANOMALY_MIN_CHECKIN_PERCENT:
        return "weak"
    return "insufficient"


def partial_hold_hours(percent):
    """Hours after departure before the partial may release, or None for never."""
    tier = evidence_tier(percent)
    if tier == "strong":
        return settings.DEPARTURE_GRACE_HOURS
    if tier == "weak":
        return settings.PARTIAL_RELEASE_LOW_EVIDENCE_HOURS
    return None
