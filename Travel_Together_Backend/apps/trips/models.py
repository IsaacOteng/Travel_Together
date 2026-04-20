import uuid
from django.contrib.gis.db import models
from django.utils import timezone


# ─── Trip ─────────────────────────────────────────────────────────────────────

class Trip(models.Model):
    class Status(models.TextChoices):
        DRAFT     = "draft",     "Draft"
        PUBLISHED = "published", "Published"
        ACTIVE    = "active",    "Active"
        COMPLETED = "completed", "Completed"
        ARCHIVED  = "archived",  "Archived"

    class Visibility(models.TextChoices):
        PUBLIC    = "public",    "Public"
        PRIVATE   = "private",   "Private"
        UNLISTED  = "unlisted",  "Unlisted"

    class DriveTime(models.TextChoices):
        UNDER_1H = "under_1h", "Under 1hr"
        H1_2     = "1_2h",    "1–2hrs"
        H2_4     = "2_4h",    "2–4hrs"
        H4_6     = "4_6h",    "4–6hrs"
        H6_PLUS  = "6h_plus", "6hrs+"

    id                      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title                   = models.CharField(max_length=200)
    destination             = models.CharField(max_length=200)
    destination_point       = models.PointField(null=True, blank=True)   # PostGIS, spatial_index=True by default
    meeting_point           = models.CharField(max_length=200, null=True, blank=True)
    meeting_point_coords    = models.PointField(null=True, blank=True)
    cover_url               = models.TextField(null=True, blank=True)
    description             = models.TextField(null=True, blank=True)
    date_start              = models.DateField()
    date_end                = models.DateField()
    drive_time              = models.CharField(max_length=10, choices=DriveTime.choices, null=True, blank=True)
    distance_km             = models.FloatField(null=True, blank=True)
    spots_total             = models.IntegerField(default=10)
    entry_price             = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    price_note              = models.CharField(max_length=200, null=True, blank=True)
    status                  = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    visibility              = models.CharField(max_length=20, choices=Visibility.choices, default=Visibility.PUBLIC)
    group_karma             = models.IntegerField(default=0)
    chief                   = models.ForeignKey(
                                "users.User",
                                on_delete=models.SET_NULL,
                                null=True,
                                related_name="led_trips",
                            )
    departure_confirmed_at  = models.DateTimeField(null=True, blank=True)
    ended_at                = models.DateTimeField(null=True, blank=True)
    created_at              = models.DateTimeField(auto_now_add=True)
    updated_at              = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "trips_trip"
        verbose_name = "Trip"
        indexes = [
            models.Index(fields=["status", "date_start"]),
            models.Index(fields=["chief"]),
        ]

    def __str__(self):
        return self.title


# ─── Trip Image ───────────────────────────────────────────────────────────────

class TripImage(models.Model):
    id        = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip      = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="images")
    image_url = models.TextField()
    image_key = models.CharField(max_length=500)   # storage key for deletion
    order     = models.IntegerField(default=0)     # 0 = cover image; max 4
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table      = "trips_tripimage"
        verbose_name  = "Trip Image"
        ordering      = ["order"]
        unique_together = [("trip", "order")]
        constraints   = [
            models.CheckConstraint(check=models.Q(order__lte=4), name="trip_image_order_max_4"),
        ]

    def __str__(self):
        return f"Image {self.order} — {self.trip.title}"


# ─── Trip Tag ─────────────────────────────────────────────────────────────────

class TripTag(models.Model):
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="tags")
    tag  = models.CharField(max_length=50)

    class Meta:
        db_table      = "trips_triptag"
        verbose_name  = "Trip Tag"
        unique_together = [("trip", "tag")]

    def __str__(self):
        return f"{self.tag} — {self.trip.title}"


# ─── Trip Price Cover ─────────────────────────────────────────────────────────

class TripPriceCover(models.Model):
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="price_covers")
    item = models.CharField(max_length=100)

    class Meta:
        db_table      = "trips_trippricecover"
        verbose_name  = "Trip Price Cover"
        unique_together = [("trip", "item")]

    def __str__(self):
        return f"{self.item} — {self.trip.title}"


# ─── Itinerary Stop ───────────────────────────────────────────────────────────

class ItineraryStop(models.Model):
    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip             = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="itinerary")
    order            = models.IntegerField()
    name             = models.CharField(max_length=200)
    location         = models.PointField(null=True, blank=True)  # PostGIS, spatial_index=True by default
    geofence_radius  = models.IntegerField(default=100)          # metres, 50–500
    arrival_time     = models.TimeField(null=True, blank=True)
    duration_minutes = models.IntegerField(null=True, blank=True)
    note             = models.TextField(null=True, blank=True)
    is_current       = models.BooleanField(default=False)        # at most one per trip
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        db_table   = "trips_itinerarystop"
        verbose_name = "Itinerary Stop"
        ordering   = ["trip", "order"]
        indexes    = [
            models.Index(fields=["trip", "order"]),
        ]

    def __str__(self):
        return f"Stop {self.order}: {self.name} ({self.trip.title})"


# ─── Trip Member ──────────────────────────────────────────────────────────────

class TripMember(models.Model):
    class Role(models.TextChoices):
        CHIEF  = "chief",  "Chief"
        SCOUT  = "scout",  "Scout"
        MEMBER = "member", "Member"

    class Status(models.TextChoices):
        PENDING  = "pending",  "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        REMOVED  = "removed",  "Removed"

    trip            = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="members")
    user            = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="trip_memberships")
    role            = models.CharField(max_length=10, choices=Role.choices, default=Role.MEMBER)
    status          = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    requested_at    = models.DateTimeField(auto_now_add=True)
    approved_at     = models.DateTimeField(null=True, blank=True)
    approved_by     = models.ForeignKey(
                        "users.User",
                        on_delete=models.SET_NULL,
                        null=True,
                        blank=True,
                        related_name="approved_members",
                    )
    rejected_reason = models.CharField(max_length=300, null=True, blank=True)
    removed_at      = models.DateTimeField(null=True, blank=True)
    karma_earned    = models.IntegerField(default=0)
    is_banned       = models.BooleanField(default=False)

    class Meta:
        db_table      = "trips_tripmember"
        verbose_name  = "Trip Member"
        unique_together = [("trip", "user")]
        indexes = [
            models.Index(fields=["trip", "status"]),
            models.Index(fields=["trip", "role"]),
        ]

    def __str__(self):
        return f"{self.user.email} — {self.role} @ {self.trip.title}"


# ─── Saved Trip ───────────────────────────────────────────────────────────────

class SavedTrip(models.Model):
    user     = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="saved_trips")
    trip     = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="saved_by")
    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table      = "trips_savedtrip"
        verbose_name  = "Saved Trip"
        unique_together = [("user", "trip")]

    def __str__(self):
        return f"{self.user.email} saved {self.trip.title}"


# ─── Check-in ─────────────────────────────────────────────────────────────────

class CheckIn(models.Model):
    trip                 = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="checkins")
    member               = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="checkins")
    stop                 = models.ForeignKey(ItineraryStop, on_delete=models.CASCADE, related_name="checkins")
    location_at_checkin  = models.PointField()
    accuracy_meters      = models.FloatField(null=True, blank=True)
    is_late              = models.BooleanField(default=False)
    checked_in_at        = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table      = "trips_checkin"
        verbose_name  = "Check-in"
        unique_together = [("trip", "member", "stop")]

    def __str__(self):
        return f"{self.member.email} checked in @ {self.stop.name}"


# ─── Trip Rating ──────────────────────────────────────────────────────────────

class TripRating(models.Model):
    trip         = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="ratings")
    rater        = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="ratings_given")
    rated_user   = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="ratings_received")
    overall      = models.IntegerField()                              # 1–5, required
    organisation = models.IntegerField(null=True, blank=True)        # 1–5
    safety       = models.IntegerField(null=True, blank=True)        # 1–5
    fun          = models.IntegerField(null=True, blank=True)        # 1–5
    value        = models.IntegerField(null=True, blank=True)        # 1–5
    review       = models.TextField(max_length=500, null=True, blank=True)
    is_anonymous = models.BooleanField(default=False)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table      = "trips_triprating"
        verbose_name  = "Trip Rating"
        unique_together = [("trip", "rater", "rated_user")]

    def __str__(self):
        return f"{self.rater.email} → {self.rated_user.email} ({self.overall}★)"


# ─── Incident Report ──────────────────────────────────────────────────────────

class IncidentReport(models.Model):
    class IncidentType(models.TextChoices):
        SAFETY         = "safety",         "Safety"
        HARASSMENT     = "harassment",     "Harassment"
        FRAUD          = "fraud",          "Fraud"
        RULE_VIOLATION = "rule_violation", "Rule Violation"
        OTHER          = "other",          "Other"

    class ReportStatus(models.TextChoices):
        PENDING      = "pending",      "Pending"
        UNDER_REVIEW = "under_review", "Under Review"
        RESOLVED     = "resolved",     "Resolved"
        DISMISSED    = "dismissed",    "Dismissed"

    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip             = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="incident_reports")
    reporter         = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="incident_reports")
    reported_user    = models.ForeignKey(
                           "users.User",
                           on_delete=models.SET_NULL,
                           null=True, blank=True,
                           related_name="incident_reports_against",
                       )
    incident_type    = models.CharField(max_length=20, choices=IncidentType.choices)
    description      = models.TextField()                            # min 50 chars enforced in serializer
    evidence_urls    = models.JSONField(default=list)               # up to 5 URLs
    status           = models.CharField(max_length=20, choices=ReportStatus.choices, default=ReportStatus.PENDING)
    reference_number = models.CharField(max_length=20, unique=True, blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        db_table   = "trips_incidentreport"
        verbose_name = "Incident Report"

    def save(self, *args, **kwargs):
        if not self.reference_number:
            self.reference_number = f"TT-{timezone.now().year}-{str(self.id)[:6].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.reference_number} — {self.incident_type}"
