"""
python manage.py seed_badges

Seeds (or updates) the 6 achievement badges into the Badge table.
Safe to run multiple times — uses update_or_create on slug.
"""

from django.core.management.base import BaseCommand
from apps.karma.models import Badge


BADGES = [
    {
        "slug":             "first-summit",
        "label":            "First Summit",
        "description":      "Completed your very first trip.",
        "icon":             "🏔️",
        "rarity":           Badge.Rarity.COMMON,
        "unlock_criteria":  {"completed_trips_min": 1},
    },
    {
        "slug":             "perfect-attendance",
        "label":            "Perfect Attendance",
        "description":      "Checked in at every itinerary stop on a trip.",
        "icon":             "✅",
        "rarity":           Badge.Rarity.RARE,
        "unlock_criteria":  {"checkin_rate_on_trip": 100},
    },
    {
        "slug":             "beach-bum",
        "label":            "Beach Bum",
        "description":      "Completed 3 or more beach trips.",
        "icon":             "🌊",
        "rarity":           Badge.Rarity.COMMON,
        "unlock_criteria":  {"beach_trips_min": 3},
    },
    {
        "slug":             "road-warrior",
        "label":            "Road Warrior",
        "description":      "Completed 10 or more trips.",
        "icon":             "🗺️",
        "rarity":           Badge.Rarity.EPIC,
        "unlock_criteria":  {"completed_trips_min": 10},
    },
    {
        "slug":             "globetrotter",
        "label":            "Globetrotter",
        "description":      "Visited 5 or more distinct destinations.",
        "icon":             "🌍",
        "rarity":           Badge.Rarity.EPIC,
        "unlock_criteria":  {"distinct_destinations_min": 5},
    },
    {
        "slug":             "5-star-traveler",
        "label":            "5-Star Traveler",
        "description":      "Maintained an average rating of 4.8 or higher (min 3 ratings).",
        "icon":             "⭐",
        "rarity":           Badge.Rarity.LEGENDARY,
        "unlock_criteria":  {"avg_rating_min": 4.8, "ratings_min": 3},
    },
]


class Command(BaseCommand):
    help = "Seed achievement badges into the Badge table."

    def handle(self, *args, **options):
        created = updated = 0
        for data in BADGES:
            _, was_created = Badge.objects.update_or_create(
                slug=data["slug"],
                defaults={k: v for k, v in data.items() if k != "slug"},
            )
            if was_created:
                created += 1
            else:
                updated += 1
        self.stdout.write(
            self.style.SUCCESS(
                f"Done — {created} created, {updated} updated."
            )
        )
