import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.contrib.gis.db import models
from django.contrib.postgres.fields import ArrayField
from django.utils import timezone


# ─── Manager ──────────────────────────────────────────────────────────────────

class UserManager(BaseUserManager):
    def create_user(self, email, **extra_fields):
        if not email:
            raise ValueError("Email is required.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_active", True)
        user = self.create_user(email, **extra_fields)
        # Superusers get a usable password for admin login only
        if password:
            user.set_password(password)
            
            user.save(using=self._db)
        return user



# ─── User ─────────────────────────────────────────────────────────────────────

class User(AbstractBaseUser):
    class KarmaLevel(models.TextChoices):
        EXPLORER  = "Explorer",  "Explorer"
        NAVIGATOR = "Navigator", "Navigator"
        LEGEND    = "Legend",    "Legend"

    class LocationMode(models.TextChoices):
        PRECISE     = "precise",     "Precise"
        APPROXIMATE = "approximate", "Approximate"
        OFF         = "off",         "Off"

    class SOSSensitivity(models.TextChoices):
        HIGH   = "high",   "High"
        MEDIUM = "medium", "Medium"
        LOW    = "low",    "Low"

    class Gender(models.TextChoices):
        MALE       = "Male",              "Male"
        FEMALE     = "Female",            "Female"
        NON_BINARY = "Non-binary",        "Non-binary"
        PREFER_NOT = "Prefer not to say", "Prefer not to say"

    id                    = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email                 = models.EmailField(unique=True)
    username              = models.CharField(max_length=30, unique=True, null=True, blank=True)
    first_name            = models.CharField(max_length=100, null=True, blank=True)
    last_name             = models.CharField(max_length=100, null=True, blank=True)
    date_of_birth         = models.DateField(null=True, blank=True)
    gender                = models.CharField(max_length=20, choices=Gender.choices, null=True, blank=True)
    nationality           = models.CharField(max_length=100, null=True, blank=True)
    city                  = models.CharField(max_length=100, null=True, blank=True)
    country               = models.CharField(max_length=100, null=True, blank=True)
    dial_code             = models.CharField(max_length=10, null=True, blank=True)
    phone_number          = models.CharField(max_length=20, null=True, blank=True)
    bio                   = models.TextField(max_length=200, null=True, blank=True)
    avatar_url            = models.TextField(null=True, blank=True)
    cover_url             = models.TextField(null=True, blank=True)
    cover_position        = models.CharField(max_length=20, default="50% 50%")
    travel_karma          = models.IntegerField(default=0)
    karma_level           = models.CharField(max_length=20, choices=KarmaLevel.choices, default=KarmaLevel.EXPLORER)
    email_verified        = models.BooleanField(default=False)
    is_verified_traveller = models.BooleanField(default=False)
    google_uid            = models.CharField(max_length=255, unique=True, null=True, blank=True)
    apple_uid             = models.CharField(max_length=255, unique=True, null=True, blank=True)
    onboarding_complete   = models.BooleanField(default=False)
    location_mode         = models.CharField(max_length=20, choices=LocationMode.choices, default=LocationMode.PRECISE)
    sos_sensitivity       = models.CharField(max_length=10, choices=SOSSensitivity.choices, default=SOSSensitivity.MEDIUM)
    two_factor_enabled    = models.BooleanField(default=False)
    username_changed_at   = models.DateTimeField(null=True, blank=True)
    name_changed_at       = models.DateTimeField(null=True, blank=True)
    is_active             = models.BooleanField(default=True)
    is_staff              = models.BooleanField(default=False)
    deactivated_at        = models.DateTimeField(null=True, blank=True)
    deleted_at            = models.DateTimeField(null=True, blank=True)
    last_seen             = models.DateTimeField(null=True, blank=True)
    created_at            = models.DateTimeField(auto_now_add=True)
    updated_at            = models.DateTimeField(auto_now=True)

    # No password field used — set_unusable_password() called in manager
    USERNAME_FIELD  = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        db_table   = "users_user"
        verbose_name = "User"

    def __str__(self):
        return self.email

    def has_perm(self, perm, obj=None):
        return self.is_staff

    def has_module_perms(self, app_label):
        return self.is_staff



# ─── Email Verification (OTP) ─────────────────────────────────────────────────

class EmailVerification(models.Model):
    class Purpose(models.TextChoices):
        LOGIN          = "login",          "Login"
        DELETE_ACCOUNT = "delete_account", "Delete Account"
        DEACTIVATE     = "deactivate",     "Deactivate"
        EMAIL_CHANGE   = "email_change",   "Email Change"

    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user          = models.ForeignKey(User, on_delete=models.CASCADE, related_name="otp_codes")
    code          = models.CharField(max_length=60)          # stored as bcrypt hash
    purpose       = models.CharField(max_length=30, choices=Purpose.choices)
    is_used       = models.BooleanField(default=False)
    attempt_count = models.IntegerField(default=0)
    expires_at    = models.DateTimeField()
    ip_address    = models.GenericIPAddressField(null=True, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table   = "users_emailverification"
        verbose_name = "Email Verification"

    def is_expired(self):
        return timezone.now() > self.expires_at

    def is_locked(self):
        return self.attempt_count >= 5

    def __str__(self):
        return f"{self.user.email} — {self.purpose} ({self.created_at:%Y-%m-%d %H:%M})"


# ─── Emergency Contact ────────────────────────────────────────────────────────

class EmergencyContact(models.Model):
    class Relationship(models.TextChoices):
        PARENT   = "Parent",   "Parent"
        GUARDIAN = "Guardian", "Guardian"
        SIBLING  = "Sibling",  "Sibling"
        FRIEND   = "Friend",   "Friend"
        PARTNER  = "Partner",  "Partner"
        OTHER    = "Other",    "Other"

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user         = models.ForeignKey(User, on_delete=models.CASCADE, related_name="emergency_contacts")
    name         = models.CharField(max_length=100)
    phone        = models.CharField(max_length=20)
    dial_code    = models.CharField(max_length=10)
    relationship = models.CharField(max_length=30, choices=Relationship.choices)
    email        = models.EmailField(null=True, blank=True)
    is_verified  = models.BooleanField(default=False)
    priority     = models.IntegerField(default=1)           # 1 = primary, up to 3
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table   = "users_emergencycontact"
        verbose_name = "Emergency Contact"
        ordering   = ["priority"]

    def __str__(self):
        return f"{self.name} ({self.relationship}) — {self.user.email}"


# ─── Notification Settings ────────────────────────────────────────────────────

class NotificationSettings(models.Model):
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user                = models.OneToOneField(User, on_delete=models.CASCADE, related_name="notification_settings")
    notif_sos           = models.BooleanField(default=True)   # cannot be disabled
    notif_chat          = models.BooleanField(default=True)
    notif_join_requests = models.BooleanField(default=True)
    notif_proximity     = models.BooleanField(default=True)
    notif_reminders     = models.BooleanField(default=True)
    notif_karma         = models.BooleanField(default=False)
    quiet_hours_start   = models.TimeField(null=True, blank=True)
    quiet_hours_end     = models.TimeField(null=True, blank=True)
    updated_at          = models.DateTimeField(auto_now=True)

    class Meta:
        db_table   = "users_notificationsettings"
        verbose_name = "Notification Settings"

    def __str__(self):
        return f"Notification settings — {self.user.email}"


# ─── User Preferences (trip style, set during onboarding) ────────────────────

class UserPreferences(models.Model):
    user       = models.OneToOneField(User, on_delete=models.CASCADE, related_name="preferences")
    trip_types = ArrayField(models.CharField(max_length=50), default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table   = "users_userpreferences"
        verbose_name = "User Preferences"

    def __str__(self):
        return f"Preferences — {self.user.email}"


# ─── User Location (real-time GPS) ───────────────────────────────────────────

class UserLocation(models.Model):
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user            = models.ForeignKey(User, on_delete=models.CASCADE, related_name="locations")
    trip            = models.ForeignKey("trips.Trip", on_delete=models.CASCADE, related_name="member_locations")
    location        = models.PointField()                    # PostGIS POINT(lng lat), spatial_index=True by default
    accuracy_meters = models.FloatField(null=True, blank=True)
    heading         = models.FloatField(null=True, blank=True)   # 0-360 compass bearing
    speed           = models.FloatField(null=True, blank=True)   # m/s
    battery_level   = models.IntegerField(null=True, blank=True) # 0-100
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        db_table      = "users_userlocation"
        verbose_name  = "User Location"
        unique_together = [("user", "trip")]
        indexes = [
            models.Index(fields=["trip", "-updated_at"]),
        ]

    def __str__(self):
        return f"{self.user.email} @ trip {self.trip_id}"
