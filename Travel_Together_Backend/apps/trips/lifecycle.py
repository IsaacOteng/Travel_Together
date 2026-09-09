"""
Which way out a trip has.

An organizer can leave a trip behind in three different ways, and they are not
interchangeable:

    delete   the trip is erased. Only ever allowed while nobody else is
             involved — a draft, or a published trip nobody joined.
    cancel   the trip is called off. Money goes back, members are told, the
             record survives. This is the exit at every other point, including
             after the group has set off: a trip abandoned halfway (weather,
             illness, the group turns back) is a cancellation, not a completion.
    end      the trip ran to its finish. Starts the clock on paying the
             organizer, so it is only available once the trip actually departed
             AND its scheduled end time has arrived.

Keeping the rule in one place stops the API and the UI from disagreeing about
which buttons a trip should show.
"""

from datetime import datetime, time as dt_time, timedelta

from django.conf import settings
from django.utils import timezone as tz


# ── when a trip is due to start and finish ───────────────────────────────────

def _aware(value):
    return tz.make_aware(value, tz.get_default_timezone()) if tz.is_naive(value) else value


def trip_start_datetime(trip):
    """
    When the trip is due to set off, as an aware datetime.

    start_time is optional, so a trip that only has a date starts at 00:00 on
    that date — the organizer said "this day", and we shouldn't invent an hour
    they'd then be blocked by.
    """
    return _aware(datetime.combine(trip.date_start, trip.start_time or dt_time.min))


def trip_end_datetime(trip):
    """
    When the trip is due to finish, as an aware datetime.

    end_time is optional; without one the trip runs to the end of its last day,
    so the organizer is not cut short by a time they never set.
    """
    end_date = trip.date_end or trip.date_start
    return _aware(datetime.combine(end_date, trip.end_time or dt_time.max.replace(microsecond=0)))


# ── who has a stake ──────────────────────────────────────────────────────────

def has_stakeholders(trip):
    """
    True when someone other than the organizer has a stake in this trip — they
    hold a spot, or their money is sitting in escrow.

    This is the line between deleting and cancelling.
    """
    from apps.payments.models import Payment
    from .models import TripMember

    has_joiners = trip.members.exclude(role=TripMember.Role.CHIEF).filter(
        status__in=[TripMember.Status.APPROVED, TripMember.Status.AWAITING_PAYMENT]
    ).exists()
    if has_joiners:
        return True
    return Payment.objects.filter(trip=trip, status=Payment.Status.HELD).exists()


# ── the three exits ──────────────────────────────────────────────────────────

def can_delete(trip):
    """A trip can only be erased while it is nobody else's business."""
    from .models import Trip

    if trip.status in (Trip.Status.ACTIVE, Trip.Status.COMPLETED, Trip.Status.ARCHIVED):
        return False
    return not has_stakeholders(trip)


def can_cancel(trip):
    """
    Calling the trip off is available until it is over — including mid-trip.

    A group that has to turn back needs a way to close the trip immediately
    rather than leaving it ACTIVE (with live location sharing running) until the
    nightly sweep notices. That exit refunds the members, which is why it is
    cancellation rather than an early completion.
    """
    from .models import Trip

    return trip.status not in (
        Trip.Status.COMPLETED, Trip.Status.CANCELLED, Trip.Status.ARCHIVED,
    )


def is_late_cancellation(trip, now=None):
    """
    True when cancelling now lands inside the window where members are already
    committed — LATE_CANCEL_WINDOW_HOURS before departure, and any time after.

    A trip already under way is always a late cancellation: the members are on it.
    """
    if trip.departure_confirmed_at:
        return True
    now = now or tz.now()
    return now >= trip_start_datetime(trip) - timedelta(hours=settings.LATE_CANCEL_WINDOW_HOURS)


def can_end(trip, now=None):
    """
    Ending is for a trip that ran its course.

    Two conditions, both about honesty rather than bookkeeping: the group has to
    have actually departed (otherwise ending pays the organizer for a trip that
    never happened), and the scheduled end time has to have arrived (otherwise
    "completed" is a claim about a trip that is still out there). A trip cut
    short before its end time is cancelled instead — see can_cancel.

    A trip nobody joined has nothing at stake and can always be closed.
    """
    from .models import Trip

    if trip.status not in (Trip.Status.PUBLISHED, Trip.Status.ACTIVE):
        return False
    if not has_stakeholders(trip):
        return True
    if not trip.departure_confirmed_at:
        return False
    return (now or tz.now()) >= trip_end_datetime(trip)
