"""Chat access rules."""

from apps.trips.models import TripMember


def users_share_a_trip(user_a, user_b) -> bool:
    """
    True if both users hold an APPROVED membership on the same trip.

    This is the gate on direct messages. APPROVED is the meaningful line because
    it is the status a member only reaches once the organizer has approved them
    AND, on a paid trip, their money has actually arrived confirm_payment is
    what moves AWAITING_PAYMENT → APPROVED. So "approved on a shared trip"
    already encodes "both paid, both enrolled" without needing to re-check
    Payment rows here, and a free trip has nothing to pay.

    Deliberately excluded:
      • PENDING applicants   someone who has asked to join is not enrolled.
      • AWAITING_PAYMENT     approved but hasn't paid; not enrolled yet.
      • the organizer ↔ a prospective joiner. An organizer must not be able to
        DM (or be DM'd by) someone still deciding whether to join, which is
        where pressure and off-platform side-deals would happen. The organizer
        holds an APPROVED chief membership, so they can DM real members only.

    Trip status is not filtered: people who actually travelled together should
    still be able to talk afterwards, which is also when ratings and disputes
    get sorted out.
    """
    if user_a is None or user_b is None:
        return False
    if user_a.pk == user_b.pk:
        return False

    mine = TripMember.objects.filter(
        user=user_a, status=TripMember.Status.APPROVED,
    ).values_list("trip_id", flat=True)

    return TripMember.objects.filter(
        user=user_b, status=TripMember.Status.APPROVED, trip_id__in=mine,
    ).exists()


#: Shown whenever the rule above refuses. Kept in one place so REST and
#: WebSocket give the caller the same explanation.
DM_NOT_ALLOWED_DETAIL = (
    "You can only message people you're travelling with. Direct messages open "
    "once you've both joined the same trip and confirmed your spots."
)
