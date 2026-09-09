"""
Payment state-machine services.

These functions own the transitions between membership and payment states so
the logic lives in one place (the trip view just calls into them):

    approve (free / payments off) ─────────────────► admit_member_to_group
    approve (payments on, paid trip) ──► start_member_payment ──┐
                                                                 │ member pays
    Paystack confirms charge (Phase 3) ──► confirm_payment ──────┘──► admit_member_to_group
"""

from datetime import timedelta
from django.conf import settings
from django.utils import timezone


def _stamp_join_request_decided(trip, member, decided):
    """Mark the chief's original join_request notification as resolved."""
    from apps.notifications.models import Notification as Notif
    Notif.objects.filter(
        notification_type="join_request",
        trip=trip,
        data__user_id=str(member.user.id),
    ).update(
        is_read=True,
        data={"trip_id": str(trip.id), "user_id": str(member.user.id), "decided": decided},
    )


def admit_member_to_group(trip, member, approved_by=None):
    """
    Member is fully in the group: add them to the group chat and notify them.

    Shared by the no-payment path (PAYMENTS_ENABLED off, or a free trip) and by
    confirm_payment once a paid member's money is received.
    """
    from apps.chat.models import ConversationMember as ConvMember
    from apps.notifications.utils import push

    conv = trip.group_chats.first()
    if conv:
        ConvMember.objects.get_or_create(
            conversation=conv, user=member.user,
            defaults={"is_admin": False},
        )

    _stamp_join_request_decided(trip, member, "approved")

    push(
        recipient  = member.user,
        notif_type = "join_approved",
        title      = "Join request approved!",
        body       = f"You've been approved to join \"{trip.title}\". Welcome to the group!",
        sender     = approved_by,
        trip       = trip,
        data       = {"trip_id": str(trip.id)},
    )


def start_member_payment(trip, member, approved_by=None):
    """
    Organizer approved the member, but they must pay to secure the spot.
    Creates a pending Payment with a deadline and prompts the member to pay.
    """
    from apps.notifications.utils import push
    from .models import Payment

    hours    = settings.PAYMENT_DEADLINE_HOURS
    deadline = timezone.now() + timedelta(hours=hours)

    payment = Payment.objects.create(
        trip   = trip,
        user   = member.user,
        amount = trip.entry_price,
        status = Payment.Status.PENDING,
        due_at = deadline,
    )

    _stamp_join_request_decided(trip, member, "approved")

    push(
        recipient  = member.user,
        notif_type = "payment_due",
        title      = "You're approved confirm your spot",
        body       = (
            f"You've been approved for \"{trip.title}\". "
            f"Pay GH₵{trip.entry_price} to secure your spot."
        ),
        sender     = approved_by,
        trip       = trip,
        action_url = f"/trip/{trip.id}",          # the public trip page → Pay button
        data       = {
            "trip_id":    str(trip.id),
            "payment_id": str(payment.id),
            "amount":     str(trip.entry_price),
            "due_at":     deadline.isoformat(),
        },
    )
    return payment


def confirm_payment(payment, fee=None, paid_amount=None, currency=None):
    """
    Called when Paystack confirms the charge (wired to the webhook in Phase 3).
    Marks the payment held and admits the member to the group. Idempotent.

    `fee` (GHS, optional) is the Paystack processing fee, recorded so refunds can
    deduct it from the member (the platform never eats the fee).

    `paid_amount` (GHS) and `currency` come from Paystack's own payload. When
    supplied they are checked against what we asked for: a "success" event only
    says money moved, not that the RIGHT money moved. Without this, a charge
    settled for a smaller amount (or in another currency) would admit the member
    at full price and inflate the organizer's escrow share. Mismatches are
    refused and logged rather than silently confirmed.
    """
    import logging
    from decimal import Decimal
    from django.db import transaction
    from apps.trips.models import TripMember
    from .models import Payment

    # The webhook and VerifyPaymentView both land here, often at the same moment
    # (Paystack fires the webhook while the member is being redirected back). The
    # idempotency guard below is a read-modify-write, so without a row lock both
    # callers can read PENDING, both proceed, and the member is admitted twice
    # double notifications, and a second pass at the member-state transition.
    # Re-read under the lock so the guard sees whatever the other caller committed.
    with transaction.atomic():
        payment = (
            Payment.objects
            .select_for_update()
            .select_related("trip", "user")
            .get(pk=payment.pk)
        )

        if payment.status == Payment.Status.HELD:
            return payment  # already confirmed safe to call again (idempotent)

        if currency is not None and str(currency).upper() != str(payment.currency).upper():
            logging.getLogger(__name__).error(
                "Payment %s currency mismatch: charged %s, expected %s not confirming.",
                payment.id, currency, payment.currency,
            )
            return payment

        if paid_amount is not None:
            try:
                paid = Decimal(str(paid_amount))
            except (TypeError, ValueError, ArithmeticError):
                paid = Decimal("0")
            # Overpayment is fine; underpayment is not.
            if paid < payment.amount:
                logging.getLogger(__name__).error(
                    "Payment %s underpaid: charged %s, expected %s not confirming.",
                    payment.id, paid, payment.amount,
                )
                return payment

        payment.status  = Payment.Status.HELD
        payment.paid_at = timezone.now()
        if fee is not None:
            payment.fee = fee
        payment.save(update_fields=["status", "paid_at", "fee", "updated_at"])

        member = (
            TripMember.objects
            .select_related("user")
            .filter(trip=payment.trip, user=payment.user)
            .first()
        )
        if member and member.status == TripMember.Status.AWAITING_PAYMENT:
            member.status = TripMember.Status.APPROVED
            member.save(update_fields=["status"])
            admit_member_to_group(payment.trip, member, approved_by=payment.trip.chief)

            # Tell the organizer the member paid and is now in the group.
            trip = payment.trip
            if trip.chief and trip.chief_id != payment.user_id:
                from apps.notifications.utils import push
                name = member.user.first_name or member.user.username or "A member"
                push(
                    recipient  = trip.chief,
                    notif_type = "payment_received",
                    title      = "Payment received",
                    body       = f"{name} paid and joined \"{trip.title}\".",
                    sender     = member.user,
                    trip       = trip,
                    action_url = f"/group-dashboard/{trip.id}",
                    data       = {"trip_id": str(trip.id)},
                )

        return payment


# ─── Refunds ──────────────────────────────────────────────────────────────────

def is_refund_eligible(trip):
    """Option-A cutoff: refundable only if the trip is still ≥ REFUND_CUTOFF_DAYS away."""
    days_out = (trip.date_start - timezone.now().date()).days
    return days_out >= settings.REFUND_CUTOFF_DAYS


def refund_payment(payment, reason="", notify=True, force=False):
    """
    Refund a held payment back to the member, **minus the Paystack fee** (the
    member bears the fee so the platform never goes into debt). Idempotent.
    Returns the refunded amount (Decimal) or None if nothing was refunded.
    """
    from decimal import Decimal
    from apps.notifications.utils import push
    from . import paystack
    from .models import Payment

    if payment.status == Payment.Status.REFUNDED:
        return None  # already refunded idempotent
    if payment.status != Payment.Status.HELD and not force:
        return None  # normally only escrowed money is refundable; `force` = admin
                     # discretionary, platform-funded refund (strictly-our-fault cases)

    refund_amt = max(payment.amount - (payment.fee or Decimal("0")), Decimal("0"))

    try:
        paystack.refund_transaction(payment.paystack_ref, amount=refund_amt)
    except paystack.PaystackError:
        # With real keys a genuine failure should surface; in dev/test (no keys)
        # let the state machine proceed so the flow stays demoable.
        if settings.PAYSTACK_SECRET_KEY:
            raise

    payment.status      = Payment.Status.REFUNDED
    payment.refunded_at = timezone.now()
    payment.save(update_fields=["status", "refunded_at", "updated_at"])

    if notify:
        push(
            recipient  = payment.user,
            notif_type = "refund_processed",
            title      = "Refund on its way",
            body       = (
                f"GH₵{refund_amt} has been refunded for \"{payment.trip.title}\" "
                f"(less the processing fee)."
            ),
            trip       = payment.trip,
            data       = {"trip_id": str(payment.trip_id), "amount": str(refund_amt)},
        )
    return refund_amt


def handle_member_leaving(trip, user):
    """
    Called when a member leaves / withdraws. Applies the refund cutoff:
        • still pending (never paid) → mark FAILED, nothing to refund
        • held + eligible (≥ cutoff)  → refund (minus fee)
        • held + too late / no-show   → forfeit; money stays in escrow for the organizer
    """
    if not settings.PAYMENTS_ENABLED:
        return None

    from .models import Payment

    held = Payment.objects.filter(trip=trip, user=user, status=Payment.Status.HELD).first()
    if held:
        if is_refund_eligible(trip):
            return refund_payment(held, reason="left_trip")
        return None  # forfeit stays held, flows to organizer at payout

    pending = Payment.objects.filter(trip=trip, user=user, status=Payment.Status.PENDING).first()
    if pending:
        pending.status = Payment.Status.FAILED
        pending.save(update_fields=["status", "updated_at"])
    return None


def refund_removed_member(trip, user):
    """
    Called when the ORGANIZER removes a member. Always refunds held money,
    ignoring the departure cutoff.

    This is deliberately not `handle_member_leaving`. That function applies the
    forfeit rule, which only makes sense when the member chose to walk away. A
    removal is the organizer's decision, so applying the same rule would let an
    organizer approve a member, collect the fee, remove them, and keep the money
    at payout. Returns the refunded amount, or None if there was nothing to
    refund.
    """
    if not settings.PAYMENTS_ENABLED:
        return None

    from .models import Payment

    held = Payment.objects.filter(trip=trip, user=user, status=Payment.Status.HELD).first()
    if held:
        return refund_payment(held, reason="removed_by_organizer")

    # Approved but never paid nothing was taken, so just close the pending row
    # out so it can't be paid after the fact.
    pending = Payment.objects.filter(trip=trip, user=user, status=Payment.Status.PENDING).first()
    if pending:
        pending.status = Payment.Status.FAILED
        pending.save(update_fields=["status", "updated_at"])
    return None


def cancel_trip(trip, by_organizer=False, reason=""):
    """
    Cancel a trip: refund every held payment (minus fee), notify members, set the
    trip to CANCELLED. If the organizer cancelled, apply a karma penalty (the only
    deterrent available, since we can't reclaim money from them).
    """
    from apps.trips.models import Trip, TripMember
    from apps.notifications.utils import push_many
    from .models import Payment

    for payment in Payment.objects.filter(trip=trip, status=Payment.Status.HELD):
        refund_payment(payment, reason="trip_cancelled", notify=False)

    affected = (
        TripMember.objects
        .filter(trip=trip)
        .exclude(status__in=[TripMember.Status.REJECTED, TripMember.Status.REMOVED])
        .select_related("user")
    )
    recipients = [m.user for m in affected if m.user_id != (trip.chief_id or None)]
    if recipients:
        push_many(
            recipients = recipients,
            notif_type = "trip_cancelled",
            title      = "Trip cancelled",
            body       = f"\"{trip.title}\" has been cancelled. Any payment you made is being refunded.",
            trip       = trip,
            data       = {"trip_id": str(trip.id)},
        )

    trip.status = Trip.Status.CANCELLED
    trip.save(update_fields=["status", "updated_at"])

    # Clawback: money that actually reached the organizer can't be pulled back
    # from escrow (it's gone), so it becomes a debt recovered from their future
    # payouts. We never cover this from our commission.
    #
    # Only PAID and PROCESSING count as "reached them". A PENDING payout was
    # recorded but never sent (no payout method configured, or no Paystack keys),
    # so charging the organizer for it would invent a debt for money they never
    # received. Cancel those rows instead they must not be paid out manually
    # after the trip they belong to has been cancelled.
    from decimal import Decimal
    from .models import Payout

    Payout.objects.filter(trip=trip, status=Payout.Status.PENDING).update(
        status=Payout.Status.FAILED
    )

    released = sum(
        (po.amount for po in Payout.objects.filter(
            trip=trip,
            status__in=[Payout.Status.PAID, Payout.Status.PROCESSING],
        )),
        Decimal("0"),
    )
    if released > 0 and trip.chief:
        trip.chief.clawback_owed = (trip.chief.clawback_owed or Decimal("0")) + released
        trip.chief.save(update_fields=["clawback_owed"])

    if by_organizer and trip.chief:
        _penalise_organizer_cancellation(trip)


def _penalise_organizer_cancellation(trip):
    """
    Charge the organizer for calling their own trip off.

    Two tiers. Cancelling weeks out is disappointing; cancelling once members
    have paid, booked time off and started travelling is a different thing, so
    inside LATE_CANCEL_WINDOW_HOURS of departure — or at any point after the
    group has set off — it costs more.

    Karma alone would not be a deterrent: it is shown on profiles and
    leaderboards but gates nothing, so an organizer could do this repeatedly and
    lose only a displayed number. A late cancellation therefore also puts them
    on payout probation: for that window they get no early (partial) payout on
    any trip, and their money stays fully escrowed until each trip completes.
    That is a real, felt cost, and it reuses the eligibility gate that already
    exists rather than inventing new machinery.
    """
    from datetime import timedelta
    from apps.karma.utils import award_karma
    from apps.trips.lifecycle import is_late_cancellation

    late    = is_late_cancellation(trip)
    penalty = (settings.ORGANIZER_LATE_CANCEL_KARMA_PENALTY if late
               else settings.ORGANIZER_CANCEL_KARMA_PENALTY)

    award_karma(
        user        = trip.chief,
        delta       = -penalty,
        reason      = "penalty",
        description = (f"Cancelled trip close to departure: {trip.title}" if late
                       else f"Cancelled trip: {trip.title}"),
        trip        = trip,
    )

    if not late:
        return

    chief = trip.chief
    until = timezone.now() + timedelta(days=settings.LATE_CANCEL_PAYOUT_PROBATION_DAYS)
    # Never shorten an existing probation — a second late cancellation extends it.
    if not chief.payout_probation_until or chief.payout_probation_until < until:
        chief.payout_probation_until = until
        chief.save(update_fields=["payout_probation_until"])

    from apps.notifications.utils import push
    push(
        recipient  = chief,
        notif_type = "karma_level",
        title      = "Late cancellation recorded",
        body       = (
            f"Cancelling \"{trip.title}\" so close to departure cost you {penalty} karma. "
            f"Until {until.strftime('%d %b %Y')}, your trip payments stay held until each "
            f"trip is completed — no early payouts."
        ),
        trip       = trip,
        data       = {"probation_until": until.isoformat(), "karma_delta": -penalty},
    )


# ─── Payouts (release escrow to the organizer) ────────────────────────────────

def _organizer_share(trip):
    """(held_total, commission, organizer_total) for the funds currently in escrow."""
    from decimal import Decimal
    from .models import Payment

    held_total = sum(
        (p.amount for p in Payment.objects.filter(trip=trip, status=Payment.Status.HELD)),
        Decimal("0"),
    )
    commission = (held_total * Decimal(settings.PLATFORM_COMMISSION_PERCENT) / 100)
    return held_total, commission, (held_total - commission)


def _already_paid_out(trip):
    from decimal import Decimal
    from .models import Payout
    return sum(
        (po.amount for po in Payout.objects.filter(trip=trip).exclude(status=Payout.Status.FAILED)),
        Decimal("0"),
    )


def _create_and_send_payout(trip, amount, kind):
    """Create a Payout row and attempt the Paystack transfer (best-effort in dev)."""
    from decimal import Decimal
    from apps.notifications.utils import push
    from . import paystack
    from .models import Payout, PayoutMethod

    # Pay down any clawback debt first recovered from this payout before the
    # organizer sees a cedi. If the debt swallows it entirely, nothing is sent.
    organizer = trip.chief
    if organizer and (organizer.clawback_owed or Decimal("0")) > 0:
        deduct = min(amount, organizer.clawback_owed)
        amount -= deduct
        organizer.clawback_owed -= deduct
        organizer.save(update_fields=["clawback_owed"])
        if amount <= 0:
            return None

    payout = Payout.objects.create(trip=trip, organizer=trip.chief, amount=amount, kind=kind)

    method = PayoutMethod.objects.filter(user=trip.chief).first() if trip.chief else None
    if method and method.recipient_code and settings.PAYSTACK_SECRET_KEY:
        reference = f"po_{payout.id.hex}"
        try:
            paystack.initiate_transfer(
                amount=amount,
                recipient_code=method.recipient_code,
                reason=f"{kind} payout {trip.title}",
                reference=reference,
            )
            payout.paystack_ref = reference
            payout.status       = Payout.Status.PROCESSING  # confirmed via transfer.success webhook
        except paystack.PaystackError:
            payout.status = Payout.Status.FAILED
        payout.save(update_fields=["paystack_ref", "status"])
    # else: no payout method / no keys → stays PENDING (manual or dev)

    if trip.chief:
        push(
            recipient  = trip.chief,
            notif_type = "payout_released",
            title      = "Payout released",
            body       = f"GH₵{amount} ({kind}) has been released for \"{trip.title}\".",
            trip       = trip,
            data       = {"trip_id": str(trip.id), "amount": str(amount), "kind": kind},
        )
    return payout


def _has_open_report(trip):
    """
    True if payouts should be frozen either an unresolved incident report or an
    anomaly flag (e.g. near-zero check-ins). The anti-collusion safety valve.
    """
    if getattr(trip, "flagged_for_review", False):
        return True
    from apps.trips.models import IncidentReport
    return IncidentReport.objects.filter(
        trip=trip,
        status__in=[IncidentReport.ReportStatus.PENDING, IncidentReport.ReportStatus.UNDER_REVIEW],
    ).exists()


def _organizer_is_established(user):
    """
    Whether an organizer is trusted enough for an at-departure partial release:
    a verified traveller, or one with a track record of completed trips. New /
    unverified organizers get NO partial their funds stay fully escrowed until
    completion, capping how much a fresh scammer account can grab early.
    """
    if not user:
        return False

    # Payout probation from a late cancellation outranks any standing the
    # organizer has otherwise earned — that is what makes it cost something.
    probation = getattr(user, "payout_probation_until", None)
    if probation and probation > timezone.now():
        return False

    if getattr(user, "is_verified_traveller", False):
        return True
    from apps.trips.models import Trip
    completed = Trip.objects.filter(chief=user, status=Trip.Status.COMPLETED).count()
    return completed >= settings.PARTIAL_RELEASE_MIN_COMPLETED_TRIPS


def partial_release_due_at(trip):
    """
    When this trip's partial payout becomes eligible, or None if it never does.

    The hold length is set by how many members proved they were at the meeting
    point — see apps.trips.checkin_stats. The rate is recomputed here rather
    than read from the snapshot taken at departure, so a member who checks in
    late still counts in the organizer's favour and can shorten the wait.
    """
    from datetime import timedelta
    from apps.trips.checkin_stats import meeting_point_stats, partial_hold_hours

    if not trip.departure_confirmed_at:
        return None
    _, _, percent = meeting_point_stats(trip)
    hours = partial_hold_hours(percent)
    if hours is None:
        return None      # evidence below the anomaly floor: nothing moves early
    return trip.departure_confirmed_at + timedelta(hours=hours)


def release_partial_payout(trip):
    """Release the partial (departure) portion of the organizer's share. One per trip."""
    from decimal import Decimal
    from django.utils import timezone as tz
    from .models import Payout

    if Payout.objects.filter(trip=trip, kind=Payout.Kind.PARTIAL).exists():
        return None
    if _has_open_report(trip):
        return None   # frozen trip is under investigation
    if not _organizer_is_established(trip.chief):
        return None   # new/unverified organizer no partial, full hold until completion

    # Evidence gate. Checked here as well as in the sweep so that any other
    # caller (an admin action, a retry, a future code path) gets the same
    # answer: a thinly-attested trip cannot be paid early by going around the
    # scheduler.
    due_at = partial_release_due_at(trip)
    if due_at is None or tz.now() < due_at:
        return None

    _, _, organizer_total = _organizer_share(trip)
    if organizer_total <= 0:
        return None
    pct     = Decimal(settings.PARTIAL_RELEASE_PERCENT) / 100
    partial = (organizer_total * pct).quantize(Decimal("0.01"))
    if partial <= 0:
        return None
    return _create_and_send_payout(trip, partial, Payout.Kind.PARTIAL)


def release_final_payout(trip):
    """Release the remaining organizer share after the dispute window. One per trip."""
    from decimal import Decimal
    from .models import Payment, Payout

    if Payout.objects.filter(trip=trip, kind=Payout.Kind.FINAL).exists():
        return None
    if _has_open_report(trip):
        return None   # under investigation hold everything; the daily sweep retries once resolved

    _, _, organizer_total = _organizer_share(trip)
    remaining = (organizer_total - _already_paid_out(trip)).quantize(Decimal("0.01"))

    payout = None
    if remaining > 0:
        payout = _create_and_send_payout(trip, remaining, Payout.Kind.FINAL)

    # Mark the trip's escrowed payments as fully released.
    Payment.objects.filter(trip=trip, status=Payment.Status.HELD).update(
        status=Payment.Status.RELEASED, released_at=timezone.now()
    )
    return payout
