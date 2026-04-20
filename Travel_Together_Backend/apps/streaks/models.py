import uuid
from django.contrib.gis.db import models


# ─── Streak ───────────────────────────────────────────────────────────────────

class Streak(models.Model):
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip                = models.ForeignKey("trips.Trip", on_delete=models.CASCADE, related_name="streaks")
    user                = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="streaks")
    stop                = models.ForeignKey(
                                "trips.ItineraryStop",
                                on_delete=models.SET_NULL,
                                null=True,
                                blank=True,
                                related_name="streaks",
                            )
    video_url           = models.TextField()
    video_key           = models.CharField(max_length=500)        # storage key (S3/R2)
    thumbnail_url       = models.TextField(null=True, blank=True)
    duration_seconds    = models.FloatField()                     # max 10s enforced in serializer
    location            = models.PointField()                     # PostGIS, spatial_index=True by default
    accuracy_meters     = models.FloatField(null=True, blank=True)
    watermark_coords    = models.PointField(null=True, blank=True) # coords burned into video watermark
    watermark_timestamp = models.DateTimeField(null=True, blank=True)
    geofence_validated  = models.BooleanField(default=False)      # True if location within stop geofence
    is_in_recap         = models.BooleanField(default=False)      # included in auto-generated recap
    engagement_count    = models.IntegerField(default=0)          # denormalised reaction count
    created_at          = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table   = "streaks_streak"
        verbose_name = "Streak"
        indexes    = [
            models.Index(fields=["trip", "-created_at"]),
            models.Index(fields=["stop", "-created_at"]),
        ]

    def __str__(self):
        return f"Streak by {self.user.email} @ {self.trip.title}"


# ─── Streak Reaction ──────────────────────────────────────────────────────────

class StreakReaction(models.Model):
    class Reaction(models.TextChoices):
        LIKE  = "like",  "Like"
        FIRE  = "fire",  "Fire"
        HEART = "heart", "Heart"
        WOW   = "wow",   "Wow"

    streak    = models.ForeignKey(Streak, on_delete=models.CASCADE, related_name="reactions")
    user      = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="streak_reactions")
    reaction  = models.CharField(max_length=10, choices=Reaction.choices)
    reacted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table      = "streaks_streakreaction"
        verbose_name  = "Streak Reaction"
        unique_together = [("streak", "user")]

    def __str__(self):
        return f"{self.user.email} {self.reaction} on {self.streak_id}"
