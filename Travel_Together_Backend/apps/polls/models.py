import uuid
from django.contrib.gis.db import models


# ─── Poll ─────────────────────────────────────────────────────────────────────

class Poll(models.Model):
    class PollType(models.TextChoices):
        YES_NO          = "yes_no",          "Yes / No"
        MULTIPLE_CHOICE = "multiple_choice", "Multiple Choice"
        RATING          = "rating",          "Rating"

    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip                = models.ForeignKey("trips.Trip", on_delete=models.CASCADE, related_name="polls")
    created_by          = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="polls_created")
    question            = models.CharField(max_length=300)
    poll_type           = models.CharField(max_length=20, choices=PollType.choices)
    expires_at          = models.DateTimeField(null=True, blank=True)
    is_locked           = models.BooleanField(default=False)
    location_context    = models.PointField(null=True, blank=True)  # optional location this poll relates to
    time_impact_minutes = models.IntegerField(null=True, blank=True)
    budget_impact_ghs   = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    created_at          = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table   = "polls_poll"
        verbose_name = "Poll"

    def __str__(self):
        return f"{self.poll_type}: {self.question[:60]}"


# ─── Poll Option ──────────────────────────────────────────────────────────────

class PollOption(models.Model):
    poll  = models.ForeignKey(Poll, on_delete=models.CASCADE, related_name="options")
    text  = models.CharField(max_length=200)
    order = models.IntegerField(default=0)

    class Meta:
        db_table   = "polls_polloption"
        verbose_name = "Poll Option"
        ordering   = ["poll", "order"]

    def __str__(self):
        return f"{self.text} (Poll {self.poll_id})"


# ─── Poll Vote ────────────────────────────────────────────────────────────────
# Single table for all poll types.
# Serializer enforces that only the correct field is populated based on poll_type.

class PollVote(models.Model):
    poll         = models.ForeignKey(Poll, on_delete=models.CASCADE, related_name="votes")
    user         = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="poll_votes")
    option       = models.ForeignKey(
                        PollOption,
                        on_delete=models.CASCADE,
                        null=True,
                        blank=True,
                        related_name="votes",
                    )                                    # multiple_choice only
    yes_no_value = models.BooleanField(null=True, blank=True)  # yes_no only
    rating_value = models.IntegerField(null=True, blank=True)  # rating only (1–5)
    voted_at     = models.DateTimeField(auto_now_add=True)
    changed_at   = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table      = "polls_pollvote"
        verbose_name  = "Poll Vote"
        unique_together = [("poll", "user")]

    def __str__(self):
        return f"{self.user.email} voted on poll {self.poll_id}"
