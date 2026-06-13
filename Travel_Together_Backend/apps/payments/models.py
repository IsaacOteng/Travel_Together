import uuid
from django.db import models


# ─── Payment ──────────────────────────────────────────────────────────────────

class Payment(models.Model):
    """
    A single member's entry-fee payment for a trip — the escrow ledger row.

    Lifecycle (the status we control; Paystack only moves the money):
        pending   — member is approved but hasn't paid yet (spot held until due_at)
        held      — paid; money sits in platform escrow
        released  — paid out to the organizer
        refunded  — returned to the member (minus fee)
        failed    — payment never completed / deadline lapsed
    """

    class Status(models.TextChoices):
        PENDING  = "pending",  "Pending"
        HELD     = "held",     "Held"
        RELEASED = "released", "Released"
        REFUNDED = "refunded", "Refunded"
        FAILED   = "failed",   "Failed"

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip         = models.ForeignKey("trips.Trip",  on_delete=models.CASCADE, related_name="payments")
    user         = models.ForeignKey("users.User",  on_delete=models.CASCADE, related_name="payments")
    amount       = models.DecimalField(max_digits=10, decimal_places=2)
    currency     = models.CharField(max_length=3, default="GHS")
    status       = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    fee          = models.DecimalField(max_digits=10, decimal_places=2, default=0)   # Paystack fee, for refund math
    paystack_ref = models.CharField(max_length=100, null=True, blank=True, db_index=True)  # set at checkout (Phase 3)
    due_at       = models.DateTimeField(null=True, blank=True)   # payment deadline
    paid_at      = models.DateTimeField(null=True, blank=True)
    released_at  = models.DateTimeField(null=True, blank=True)
    refunded_at  = models.DateTimeField(null=True, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        db_table     = "payments_payment"
        verbose_name = "Payment"
        ordering     = ["-created_at"]
        indexes = [
            models.Index(fields=["trip", "status"]),
            models.Index(fields=["user", "status"]),
        ]

    def __str__(self):
        return f"{self.user.email} — {self.amount} {self.currency} ({self.status}) @ {self.trip.title}"


# ─── Payout Method ────────────────────────────────────────────────────────────

class PayoutMethod(models.Model):
    """
    Where an organizer receives payouts. The name on the account does NOT need to
    match their verified identity (people use a family/business number) — the
    accountability anchor is their identity verification, not this name.

    In production the raw number is tokenised by Paystack into a recipient_code,
    so we store a token rather than the bare account number.
    """

    class Type(models.TextChoices):
        MOBILE_MONEY = "mobile_money", "Mobile Money"
        BANK         = "bank",         "Bank"

    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user           = models.OneToOneField("users.User", on_delete=models.CASCADE, related_name="payout_method")
    type           = models.CharField(max_length=15, choices=Type.choices, default=Type.MOBILE_MONEY)
    account_number = models.CharField(max_length=30)             # MoMo number or bank account
    bank_code      = models.CharField(max_length=20)             # Paystack provider/bank code (e.g. MTN)
    account_name   = models.CharField(max_length=120, blank=True)
    recipient_code = models.CharField(max_length=100, null=True, blank=True)   # Paystack transfer-recipient token
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        db_table     = "payments_payoutmethod"
        verbose_name = "Payout Method"

    def __str__(self):
        return f"{self.user.email} — {self.type} ••••{self.account_number[-4:]}"


# ─── Payout ───────────────────────────────────────────────────────────────────

class Payout(models.Model):
    """A transfer of escrowed funds to the organizer (one row per release event)."""

    class Kind(models.TextChoices):
        PARTIAL = "partial", "Partial (at departure)"
        FINAL   = "final",   "Final (after trip)"

    class Status(models.TextChoices):
        PENDING    = "pending",    "Pending"      # created, not yet sent (no method/keys)
        PROCESSING = "processing", "Processing"   # transfer initiated, awaiting confirmation
        PAID       = "paid",       "Paid"
        FAILED     = "failed",     "Failed"

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip         = models.ForeignKey("trips.Trip",  on_delete=models.CASCADE, related_name="payouts")
    organizer    = models.ForeignKey("users.User",  on_delete=models.SET_NULL, null=True, related_name="payouts")
    amount       = models.DecimalField(max_digits=10, decimal_places=2)
    kind         = models.CharField(max_length=10, choices=Kind.choices)
    status       = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    paystack_ref = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    paid_at      = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table     = "payments_payout"
        verbose_name = "Payout"
        ordering     = ["-created_at"]
        indexes = [models.Index(fields=["trip", "kind"])]

    def __str__(self):
        return f"{self.kind} payout {self.amount} → {self.trip.title} ({self.status})"
