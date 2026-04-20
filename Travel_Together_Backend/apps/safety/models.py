import uuid
from django.contrib.gis.db import models


# ─── SOS Alert ────────────────────────────────────────────────────────────────

class SOSAlert(models.Model):
    class TriggerType(models.TextChoices):
        MANUAL     = "manual",     "Manual"
        STATIONARY = "stationary", "Stationary"
        DEVIATION  = "deviation",  "Route Deviation"

    class AlertStatus(models.TextChoices):
        ACTIVE      = "active",      "Active"
        RESOLVED    = "resolved",    "Resolved"
        FALSE_ALARM = "false_alarm", "False Alarm"

    id                         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip                       = models.ForeignKey("trips.Trip", on_delete=models.CASCADE, related_name="sos_alerts")
    member                     = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="sos_alerts")
    trigger_type               = models.CharField(max_length=15, choices=TriggerType.choices)
    location                   = models.PointField()                     # PostGIS, spatial_index=True by default
    accuracy_meters            = models.FloatField(null=True, blank=True)
    deviation_distance_m       = models.FloatField(null=True, blank=True)  # deviation trigger only
    stationary_minutes         = models.IntegerField(null=True, blank=True) # stationary trigger only
    status                     = models.CharField(max_length=15, choices=AlertStatus.choices, default=AlertStatus.ACTIVE)
    resolved_at                = models.DateTimeField(null=True, blank=True)
    resolved_by                = models.ForeignKey(
                                    "users.User",
                                    on_delete=models.SET_NULL,
                                    null=True,
                                    blank=True,
                                    related_name="sos_resolved",
                                )
    resolution_notes           = models.TextField(null=True, blank=True)
    emergency_contact_notified = models.BooleanField(default=False)
    chief_notified             = models.BooleanField(default=False)
    created_at                 = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table   = "safety_sosalert"
        verbose_name = "SOS Alert"
        indexes    = [
            models.Index(fields=["trip", "status"]),
        ]

    def __str__(self):
        return f"SOS [{self.trigger_type}] by {self.member.email} — {self.status}"


# ─── SOS Action ───────────────────────────────────────────────────────────────

class SOSAction(models.Model):
    class Action(models.TextChoices):
        CALLED_MEMBER  = "called_member",  "Called Member"
        CALLED_CONTACT = "called_contact", "Called Emergency Contact"
        SENT_LOCATION  = "sent_location",  "Sent Location"
        MARKED_SAFE    = "marked_safe",    "Marked Safe"
        ESCALATED      = "escalated",      "Escalated"

    alert      = models.ForeignKey(SOSAlert, on_delete=models.CASCADE, related_name="actions")
    taken_by   = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="sos_actions")
    action     = models.CharField(max_length=20, choices=Action.choices)
    notes      = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table   = "safety_sosaction"
        verbose_name = "SOS Action"

    def __str__(self):
        return f"{self.action} by {self.taken_by.email} on alert {self.alert_id}"
