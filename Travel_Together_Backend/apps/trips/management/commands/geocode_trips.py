"""
Management command: geocode_trips

Backfills destination_point for all trips that have a destination
string but no stored coordinates.

Usage:
    python manage.py geocode_trips           # process all un-geocoded trips
    python manage.py geocode_trips --limit 50  # process at most 50 trips
    python manage.py geocode_trips --dry-run   # report count only, no changes
"""
from django.core.management.base import BaseCommand
from apps.trips.models import Trip
from apps.trips.geocoding import geocode_trip


class Command(BaseCommand):
    help = "Geocode trips that have a destination text but no stored coordinates."

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Maximum number of trips to process (default: all).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report how many trips need geocoding without making changes.",
        )

    def handle(self, *args, **options):
        qs = Trip.objects.filter(
            destination_point__isnull=True,
        ).exclude(destination="").order_by("created_at")

        if options["dry_run"]:
            self.stdout.write(
                self.style.WARNING(
                    f"{qs.count()} trip(s) need geocoding (dry run — no changes made)."
                )
            )
            return

        limit = options["limit"]
        if limit:
            qs = qs[:limit]

        total     = qs.count()
        succeeded = 0
        failed    = 0

        self.stdout.write(f"Processing {total} trip(s)…")

        for trip in qs:
            updated = geocode_trip(trip)
            if updated:
                succeeded += 1
                self.stdout.write(
                    self.style.SUCCESS(f"  OK [{trip.id}] {trip.destination}")
                )
            else:
                failed += 1
                self.stdout.write(
                    self.style.WARNING(f"  -- [{trip.id}] {trip.destination} - could not resolve")
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone — {succeeded} geocoded, {failed} unresolvable out of {total} trips."
            )
        )
