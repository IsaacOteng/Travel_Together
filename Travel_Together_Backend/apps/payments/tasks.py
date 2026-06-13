from celery import shared_task


@shared_task
def expire_unpaid_approvals():
    """
    Lapse approvals where the member never paid before the deadline, freeing the
    spot for someone else. Runs hourly (see CELERY_BEAT_SCHEDULE).

    A lapsed member is set back to REJECTED (so the spot is released and they may
    re-request), and their pending Payment is marked FAILED.
    """
    from django.utils import timezone
    from apps.trips.models import TripMember
    from .models import Payment

    now = timezone.now()
    overdue = (
        Payment.objects
        .filter(status=Payment.Status.PENDING, due_at__lt=now)
        .select_related("trip", "user")
    )

    expired = 0
    for payment in overdue:
        payment.status = Payment.Status.FAILED
        payment.save(update_fields=["status", "updated_at"])

        member = TripMember.objects.filter(
            trip=payment.trip,
            user=payment.user,
            status=TripMember.Status.AWAITING_PAYMENT,
        ).first()
        if member:
            member.status          = TripMember.Status.REJECTED
            member.rejected_reason = "Payment deadline passed"
            member.save(update_fields=["status", "rejected_reason"])
            expired += 1

    return {"expired_approvals": expired}


@shared_task
def release_due_payouts():
    """
    Daily sweep: release the FINAL payout for completed trips whose dispute window
    has elapsed (ended_at + DISPUTE_WINDOW_HOURS in the past) and that haven't had
    a final payout yet.
    """
    from datetime import timedelta
    from django.conf import settings
    from django.utils import timezone
    from apps.trips.models import Trip
    from .models import Payout
    from .services import release_final_payout

    cutoff = timezone.now() - timedelta(hours=getattr(settings, "DISPUTE_WINDOW_HOURS", 48))
    trips = Trip.objects.filter(
        status=Trip.Status.COMPLETED,
        ended_at__isnull=False,
        ended_at__lt=cutoff,
    )

    released = 0
    for trip in trips:
        if Payout.objects.filter(trip=trip, kind=Payout.Kind.FINAL).exists():
            continue
        release_final_payout(trip)
        released += 1

    return {"final_payouts": released}
