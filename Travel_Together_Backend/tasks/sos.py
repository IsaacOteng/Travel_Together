"""
SOS tasks
---------
notify_emergency_contacts  — one-shot: SMS every emergency contact when SOS fires
check_stationary_members   — periodic: detects members who haven't moved in X minutes
check_route_deviation      — periodic: detects members far from their current stop
escalate_unresolved_alerts — periodic: re-notifies if an SOS has been active too long
"""

from celery import shared_task


@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def notify_emergency_contacts(self, alert_id):
    """
    Send an SMS to every emergency contact of the member who triggered the SOS.
    Runs immediately after TriggerSOSView creates the alert.
    """
    from django.conf import settings
    from apps.safety.models import SOSAlert
    from apps.users.models import EmergencyContact

    try:
        alert  = SOSAlert.objects.select_related("member", "trip").get(id=alert_id)
        member = alert.member

        contacts = EmergencyContact.objects.filter(user=member)
        if not contacts.exists():
            return {"status": "no_contacts"}

        # Build location string
        lat = alert.location.y
        lng = alert.location.x
        maps_url  = f"https://www.google.com/maps?q={lat},{lng}"
        name      = member.first_name or member.username or "A traveler"
        trip_name = alert.trip.title

        message = (
            f"EMERGENCY ALERT\n"
            f"{name} has triggered an SOS on their trip '{trip_name}'.\n"
            f"Last known location: {maps_url}\n"
            f"Please try to reach them immediately."
        )

        import requests

        at_username = settings.AT_USERNAME
        at_api_key  = settings.AT_API_KEY
        at_sender   = getattr(settings, "AT_SENDER_ID", None)

        # Use sandbox or live endpoint depending on username
        if at_username == "sandbox":
            at_url = "https://api.sandbox.africastalking.com/version1/messaging"
        else:
            at_url = "https://api.africastalking.com/version1/messaging"

        headers = {
            "apiKey":       at_api_key,
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept":       "application/json",
        }

        results = []
        for contact in contacts:
            number = f"{contact.dial_code}{contact.phone}".replace(" ", "")
            payload = {
                "username": at_username,
                "to":       number,
                "message":  message,
            }
            if at_sender and at_username != "sandbox":
                payload["from"] = at_sender
            try:
                # verify=False works around SSL interception by antivirus/proxy on Windows
                resp = requests.post(at_url, data=payload, headers=headers, timeout=15, verify=False)
                results.append({"contact": contact.name, "number": number, "status": resp.status_code, "response": resp.text})
            except Exception as exc:
                results.append({"contact": contact.name, "number": number, "error": str(exc)})

        return {"status": "sent", "results": results}

    except SOSAlert.DoesNotExist:
        return {"status": "alert_not_found"}
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task
def check_stationary_members():
    """
    Run every 5 minutes. For each active trip, check if any member's
    UserLocation hasn't been updated in longer than their SOS sensitivity threshold.
    Triggers an automatic SOS if so.

    Sensitivity thresholds:
        high   → 15 minutes stationary
        medium → 30 minutes stationary
        low    → 60 minutes stationary
    """
    from django.utils import timezone
    from datetime import timedelta
    from django.contrib.gis.geos import Point
    from apps.trips.models import Trip, TripMember
    from apps.users.models import UserLocation
    from apps.safety.models import SOSAlert

    THRESHOLDS = {"high": 15, "medium": 30, "low": 60}

    active_trips = Trip.objects.filter(status=Trip.Status.ACTIVE)

    for trip in active_trips:
        members = TripMember.objects.filter(
            trip=trip, status=TripMember.Status.APPROVED
        ).select_related("user")

        for member in members:
            threshold_min = THRESHOLDS.get(member.user.sos_sensitivity, 30)
            cutoff        = timezone.now() - timedelta(minutes=threshold_min)

            loc = UserLocation.objects.filter(trip=trip, user=member.user).first()
            if not loc or loc.updated_at > cutoff:
                continue

            # Skip if already has an active stationary alert
            already_active = SOSAlert.objects.filter(
                trip=trip,
                member=member.user,
                status=SOSAlert.AlertStatus.ACTIVE,
                trigger_type=SOSAlert.TriggerType.STATIONARY,
            ).exists()
            if already_active:
                continue

            SOSAlert.objects.create(
                trip               = trip,
                member             = member.user,
                trigger_type       = SOSAlert.TriggerType.STATIONARY,
                location           = loc.location,
                accuracy_meters    = loc.accuracy_meters,
                stationary_minutes = threshold_min,
            )

            # Notify chief
            _notify_sos(trip, member.user, "stationary", threshold_min)


@shared_task
def check_route_deviation():
    """
    Run every 5 minutes. For each active trip with a current itinerary stop,
    check if any member is more than 500 m from that stop.
    Triggers a deviation SOS if so.
    """
    from apps.trips.models import Trip, TripMember, ItineraryStop
    from apps.users.models import UserLocation
    from apps.safety.models import SOSAlert

    DEVIATION_THRESHOLD_M = 500

    active_trips = Trip.objects.filter(status=Trip.Status.ACTIVE)

    for trip in active_trips:
        current_stop = ItineraryStop.objects.filter(trip=trip, is_current=True).first()
        if not current_stop or not current_stop.location:
            continue

        members = TripMember.objects.filter(
            trip=trip, status=TripMember.Status.APPROVED
        ).select_related("user")

        for member in members:
            loc = UserLocation.objects.filter(trip=trip, user=member.user).first()
            if not loc:
                continue

            # Calculate distance (rough: degrees * 111320 m/deg)
            distance_m = loc.location.distance(
                current_stop.location.transform(4326, clone=True)
            ) * 111320

            if distance_m <= DEVIATION_THRESHOLD_M:
                continue

            already_active = SOSAlert.objects.filter(
                trip=trip,
                member=member.user,
                status=SOSAlert.AlertStatus.ACTIVE,
                trigger_type=SOSAlert.TriggerType.DEVIATION,
            ).exists()
            if already_active:
                continue

            SOSAlert.objects.create(
                trip                 = trip,
                member               = member.user,
                trigger_type         = SOSAlert.TriggerType.DEVIATION,
                location             = loc.location,
                accuracy_meters      = loc.accuracy_meters,
                deviation_distance_m = distance_m,
            )

            _notify_sos(trip, member.user, "deviation", deviation_m=distance_m)


@shared_task
def escalate_unresolved_alerts():
    """
    Run every 15 minutes. Re-notify the trip chief about any SOS alert
    that has been active for more than 30 minutes without resolution.
    """
    from django.utils import timezone
    from datetime import timedelta
    from apps.safety.models import SOSAlert
    from apps.notifications.utils import push

    cutoff = timezone.now() - timedelta(minutes=30)
    stale_alerts = SOSAlert.objects.filter(
        status=SOSAlert.AlertStatus.ACTIVE,
        created_at__lte=cutoff,
    ).select_related("trip__chief", "member")

    for alert in stale_alerts:
        chief = alert.trip.chief
        if not chief:
            continue

        name = alert.member.first_name or alert.member.username or "A member"
        push(
            recipient  = chief,
            notif_type = "sos_alert",
            title      = "Unresolved SOS",
            body       = (
                f"{name}'s SOS alert on '{alert.trip.title}' has been active "
                f"for over 30 minutes and is still unresolved."
            ),
            trip       = alert.trip,
            action_url = f"/trips/{alert.trip_id}/safety/",
            data       = {"alert_id": str(alert.id)},
        )


# ── internal helper ───────────────────────────────────────────────────────────

def _notify_sos(trip, member, trigger_type, stationary_min=None, deviation_m=None):
    from apps.trips.models import TripMember
    from apps.notifications.utils import push_many

    approved = TripMember.objects.filter(
        trip=trip, status=TripMember.Status.APPROVED
    ).exclude(user=member).select_related("user")

    name = member.first_name or member.username or "A member"

    if trigger_type == "stationary":
        body = f"{name} hasn't moved in {stationary_min} minutes on trip '{trip.title}'."
    else:
        body = f"{name} is {int(deviation_m)}m away from the group on trip '{trip.title}'."

    push_many(
        recipients = [m.user for m in approved],
        notif_type = "sos_alert",
        title      = "Auto SOS Alert",
        body       = body,
        sender     = member,
        trip       = trip,
        action_url = f"/trips/{trip.id}/safety/",
    )
