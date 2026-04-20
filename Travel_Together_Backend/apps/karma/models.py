import uuid
from django.db import models


# ─── Karma Log (immutable ledger) ─────────────────────────────────────────────

class KarmaLog(models.Model):
    class Reason(models.TextChoices):
        TRIP_COMPLETED    = "trip_completed",    "Trip Completed"
        CHECKIN_ONTIME    = "checkin_ontime",    "Check-in On Time"
        GROUP_RATING      = "group_rating",      "Group Rating"
        STREAK_ENGAGEMENT = "streak_engagement", "Streak Engagement"
        PENALTY           = "penalty",           "Penalty"

    user        = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="karma_logs")
    trip        = models.ForeignKey(
                        "trips.Trip",
                        on_delete=models.SET_NULL,
                        null=True,
                        blank=True,
                        related_name="karma_logs",
                    )
    delta       = models.IntegerField()           # positive or negative karma change
    reason      = models.CharField(max_length=25, choices=Reason.choices)
    description = models.CharField(max_length=300, null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table   = "karma_karmalog"
        verbose_name = "Karma Log"
        indexes    = [
            models.Index(fields=["user", "-created_at"]),
        ]

    def __str__(self):
        sign = "+" if self.delta >= 0 else ""
        return f"{self.user.email} {sign}{self.delta} ({self.reason})"


# ─── Badge (admin-seeded) ─────────────────────────────────────────────────────

class Badge(models.Model):
    class Rarity(models.TextChoices):
        COMMON    = "common",    "Common"
        RARE      = "rare",      "Rare"
        EPIC      = "epic",      "Epic"
        LEGENDARY = "legendary", "Legendary"

    slug            = models.SlugField(max_length=100, unique=True)
    label           = models.CharField(max_length=100)
    description     = models.TextField()
    icon            = models.CharField(max_length=10)             # emoji
    rarity          = models.CharField(max_length=15, choices=Rarity.choices)
    unlock_criteria = models.JSONField(default=dict)             # flexible criteria spec

    class Meta:
        db_table   = "karma_badge"
        verbose_name = "Badge"

    def __str__(self):
        return f"{self.icon} {self.label} ({self.rarity})"


# ─── User Badge ───────────────────────────────────────────────────────────────

class UserBadge(models.Model):
    user      = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="badges")
    badge     = models.ForeignKey(Badge, on_delete=models.CASCADE, related_name="holders")
    trip      = models.ForeignKey(
                    "trips.Trip",
                    on_delete=models.SET_NULL,
                    null=True,
                    blank=True,
                    related_name="badges_awarded",
                )
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table      = "karma_userbadge"
        verbose_name  = "User Badge"
        unique_together = [("user", "badge")]

    def __str__(self):
        return f"{self.user.email} — {self.badge.label}"
