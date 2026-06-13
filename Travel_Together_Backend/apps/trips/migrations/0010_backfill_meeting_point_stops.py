from django.db import migrations

PUBLISHED_ACTIVE = ("published", "active")


def add_meeting_point_stops(apps, schema_editor):
    """
    Backfill the locked meeting-point check-in (order 0, is_system) onto existing
    published/active trips, so the departure / no-show flow works for trips that
    were created before the payments rollout. New trips get it on publish.
    """
    Trip          = apps.get_model("trips", "Trip")
    ItineraryStop = apps.get_model("trips", "ItineraryStop")

    for trip in Trip.objects.filter(status__in=PUBLISHED_ACTIVE):
        if trip.itinerary.filter(is_system=True).exists():
            continue
        # Make room at order 0 by bumping existing stops down.
        for stop in trip.itinerary.all().order_by("-order"):
            stop.order += 1
            stop.save(update_fields=["order"])
        ItineraryStop.objects.create(
            trip=trip,
            order=0,
            name=trip.meeting_point or "Meeting Point",
            location=trip.meeting_point_coords,
            is_system=True,
            note="Departure check-in point",
        )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("trips", "0009_itinerarystop_is_system"),
    ]

    operations = [
        migrations.RunPython(add_meeting_point_stops, noop),
    ]
