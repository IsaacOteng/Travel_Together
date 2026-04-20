"""
Cleanup tasks — run nightly via Celery Beat
--------------------------------------------
purge_expired_otps         — delete used/expired OTP records older than 24h
purge_deleted_users        — hard-delete users soft-deleted more than 30 days ago
purge_old_notifications    — delete read notifications older than 90 days
purge_old_locations        — delete UserLocation records for completed/archived trips
mark_trips_active          — flip published trips to active on their start date
mark_trips_completed       — flip active trips to completed on their end date
"""

from celery import shared_task


@shared_task
def purge_expired_otps():
    """Delete OTP records that are used or expired and older than 24 hours."""
    from django.utils import timezone
    from datetime import timedelta
    from apps.users.models import EmailVerification

    cutoff  = timezone.now() - timedelta(hours=24)
    deleted, _ = EmailVerification.objects.filter(
        expires_at__lt=cutoff
    ).delete()
    return {"purged_otps": deleted}


@shared_task
def purge_deleted_users():
    """Hard-delete user accounts that were soft-deleted more than 30 days ago."""
    from django.utils import timezone
    from datetime import timedelta
    from apps.users.models import User

    cutoff   = timezone.now() - timedelta(days=30)
    qs       = User.objects.filter(deleted_at__isnull=False, deleted_at__lt=cutoff)
    count    = qs.count()
    qs.delete()
    return {"purged_users": count}


@shared_task
def purge_old_notifications():
    """Delete read notifications older than 90 days."""
    from django.utils import timezone
    from datetime import timedelta
    from apps.notifications.models import Notification

    cutoff     = timezone.now() - timedelta(days=90)
    deleted, _ = Notification.objects.filter(
        is_read=True, created_at__lt=cutoff
    ).delete()
    return {"purged_notifications": deleted}


@shared_task
def purge_old_locations():
    """Delete UserLocation records for trips that are completed or archived."""
    from apps.users.models import UserLocation
    from apps.trips.models import Trip

    done_trips = Trip.objects.filter(
        status__in=[Trip.Status.COMPLETED, Trip.Status.ARCHIVED]
    ).values_list("id", flat=True)

    deleted, _ = UserLocation.objects.filter(trip_id__in=done_trips).delete()
    return {"purged_locations": deleted}


@shared_task
def mark_trips_active():
    """
    Flip PUBLISHED trips whose start date is today or in the past to ACTIVE.
    Run daily at midnight UTC.
    """
    from django.utils import timezone
    from apps.trips.models import Trip

    today   = timezone.now().date()
    updated = Trip.objects.filter(
        status=Trip.Status.PUBLISHED,
        date_start__lte=today,
    ).update(status=Trip.Status.ACTIVE)
    return {"activated_trips": updated}


@shared_task
def mark_trips_completed():
    """
    Flip ACTIVE trips whose end date has passed to COMPLETED,
    then trigger karma awards and recap generation for each.
    Run daily at midnight UTC.
    """
    from django.utils import timezone
    from apps.trips.models import Trip
    from tasks.karma import award_trip_completion_karma
    from tasks.recap import generate_trip_recap

    today       = timezone.now().date()
    finished    = list(Trip.objects.filter(
        status=Trip.Status.ACTIVE, date_end__lt=today
    ))

    trip_ids = [str(t.id) for t in finished]
    if trip_ids:
        Trip.objects.filter(id__in=trip_ids).update(status=Trip.Status.COMPLETED)
        for trip_id in trip_ids:
            award_trip_completion_karma.delay(trip_id)
            generate_trip_recap.delay(trip_id)

    return {"completed_trips": len(trip_ids)}
