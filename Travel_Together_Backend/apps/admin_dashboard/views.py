from django.utils import timezone
from django.db.models import Count, Sum, Q
from django.core.exceptions import ValidationError
from datetime import timedelta

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser

from apps.trips.checkin_stats import meeting_point_stats

from apps.users.models import User
from apps.trips.models import Trip, IncidentReport, TripMember
from apps.safety.models import SOSAlert
from apps.karma.models import KarmaLog
from apps.chat.models import Message
from apps.streaks.models import Streak
from apps.payments.models import Payment, Payout


# ─── Overview / Stats ─────────────────────────────────────────────────────────

class AdminStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        now = timezone.now()
        last_7  = now - timedelta(days=7)
        last_30 = now - timedelta(days=30)

        trip_status_counts = (
            Trip.objects.values("status")
            .annotate(count=Count("id"))
        )
        trip_by_status = {row["status"]: row["count"] for row in trip_status_counts}

        return Response({
            "users": {
                "total":       User.objects.count(),
                "new_7d":      User.objects.filter(created_at__gte=last_7).count(),
                "new_30d":     User.objects.filter(created_at__gte=last_30).count(),
                "verified":    User.objects.filter(is_verified_traveller=True).count(),
                "onboarded":   User.objects.filter(onboarding_complete=True).count(),
            },
            "trips": {
                "total":     Trip.objects.count(),
                "draft":     trip_by_status.get("draft", 0),
                "published": trip_by_status.get("published", 0),
                "active":    trip_by_status.get("active", 0),
                "completed": trip_by_status.get("completed", 0),
                "archived":  trip_by_status.get("archived", 0),
                "new_7d":    Trip.objects.filter(created_at__gte=last_7).count(),
            },
            "safety": {
                "sos_active":      SOSAlert.objects.filter(status="active").count(),
                "sos_total":       SOSAlert.objects.count(),
                "incidents_pending": IncidentReport.objects.filter(status="pending").count(),
                "incidents_total":  IncidentReport.objects.count(),
            },
            "activity": {
                "messages_7d": Message.objects.filter(created_at__gte=last_7).count(),
                "streaks_7d":  Streak.objects.filter(created_at__gte=last_7).count(),
                "karma_given_7d": KarmaLog.objects.filter(
                    created_at__gte=last_7, delta__gt=0
                ).aggregate(total=Sum("delta"))["total"] or 0,
            },
            "payments": {
                "in_escrow":  str(Payment.objects.filter(status="held").aggregate(t=Sum("amount"))["t"] or 0),
                "released":   str(Payment.objects.filter(status="released").aggregate(t=Sum("amount"))["t"] or 0),
                "refunded":   str(Payment.objects.filter(status="refunded").aggregate(t=Sum("amount"))["t"] or 0),
                "held_count": Payment.objects.filter(status="held").count(),
            },
        })


# ─── Users ────────────────────────────────────────────────────────────────────

class AdminUsersView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = User.objects.all().order_by("-created_at")

        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(email__icontains=search) |
                Q(username__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )

        karma_level = request.query_params.get("karma_level")
        if karma_level:
            qs = qs.filter(karma_level=karma_level)

        is_active = request.query_params.get("is_active")
        if is_active is not None:
            qs = qs.filter(is_active=is_active == "true")

        # Pagination
        page     = max(int(request.query_params.get("page", 1)), 1)
        per_page = 20
        total    = qs.count()
        qs       = qs[(page - 1) * per_page : page * per_page]

        users = [
            {
                "id":                   str(u.id),
                "email":                u.email,
                "username":             u.username,
                "first_name":           u.first_name,
                "last_name":            u.last_name,
                "avatar_url":           u.avatar_url,
                "travel_karma":         u.travel_karma,
                "karma_level":          u.karma_level,
                "is_active":            u.is_active,
                "is_staff":             u.is_staff,
                "is_verified_traveller":u.is_verified_traveller,
                "email_verified":       u.email_verified,
                "onboarding_complete":  u.onboarding_complete,
                "date_joined":          u.created_at,
                "country":              u.country,
                "city":                 u.city,
            }
            for u in qs
        ]

        return Response({"count": total, "page": page, "results": users})


class AdminUserDetailView(APIView):
    permission_classes = [IsAdminUser]

    def _get_user(self, user_id):
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None

    def get(self, request, user_id):
        user = self._get_user(user_id)
        if not user:
            return Response({"detail": "User not found."}, status=404)

        trip_count = TripMember.objects.filter(user=user, status="approved").count()
        led_count  = Trip.objects.filter(chief=user).count()

        return Response({
            "id":                   str(user.id),
            "email":                user.email,
            "username":             user.username,
            "first_name":           user.first_name,
            "last_name":            user.last_name,
            "avatar_url":           user.avatar_url,
            "travel_karma":         user.travel_karma,
            "karma_level":          user.karma_level,
            "is_active":            user.is_active,
            "is_staff":             user.is_staff,
            "is_verified_traveller":user.is_verified_traveller,
            "email_verified":       user.email_verified,
            "onboarding_complete":  user.onboarding_complete,
            "date_joined":          user.date_joined,
            "country":              user.country,
            "city":                 user.city,
            "bio":                  user.bio,
            "gender":               user.gender,
            "nationality":          user.nationality,
            "trips_joined":         trip_count,
            "trips_led":            led_count,
            "sos_alerts":           SOSAlert.objects.filter(member=user).count(),
            "incidents_filed":      IncidentReport.objects.filter(reporter=user).count(),
        })

    def patch(self, request, user_id):
        user = self._get_user(user_id)
        if not user:
            return Response({"detail": "User not found."}, status=404)

        allowed = {"is_active", "is_verified_traveller", "is_staff"}
        for field in allowed:
            if field in request.data:
                setattr(user, field, request.data[field])
        user.save(update_fields=[f for f in allowed if f in request.data])

        return Response({"detail": "User updated.", "is_active": user.is_active})


# ─── Trips ────────────────────────────────────────────────────────────────────

class AdminTripsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = Trip.objects.select_related("chief").order_by("-created_at")

        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(title__icontains=search) | Q(destination__icontains=search)
            )

        trip_status = request.query_params.get("status")
        if trip_status:
            qs = qs.filter(status=trip_status)

        if request.query_params.get("flagged") in ("1", "true", "True"):
            qs = qs.filter(flagged_for_review=True)

        page     = max(int(request.query_params.get("page", 1)), 1)
        per_page = 20
        total    = qs.count()
        qs       = qs[(page - 1) * per_page : page * per_page]

        trips = [
            {
                "id":          str(t.id),
                "title":       t.title,
                "destination": t.destination,
                "status":      t.status,
                "visibility":  t.visibility,
                "flagged_for_review": t.flagged_for_review,
                "flag_reason":        t.flag_reason,
                "date_start":  t.date_start,
                "date_end":    t.date_end,
                "spots_total": t.spots_total,
                "entry_price": str(t.entry_price),
                "group_karma": t.group_karma,
                "created_at":  t.created_at,
                # Departure evidence: what the organizer was allowed to leave on,
                # and the live rate now. A dispute over "did this trip happen?"
                # is settled with these, so an admin shouldn't have to go digging
                # through check-in rows to see them.
                "departure_confirmed_at":    t.departure_confirmed_at,
                "departure_checkin_percent": t.departure_checkin_percent,
                "checkin_percent_now":       meeting_point_stats(t)[2],
                "chief": {
                    "id":       str(t.chief.id) if t.chief else None,
                    "email":    t.chief.email   if t.chief else None,
                    "username": t.chief.username if t.chief else None,
                    "avatar_url": t.chief.avatar_url if t.chief else None,
                },
                "member_count": t.approved_members_count(),
            }
            for t in qs
        ]

        return Response({"count": total, "page": page, "results": trips})


class AdminTripDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, trip_id):
        try:
            trip = Trip.objects.get(id=trip_id)
        except Trip.DoesNotExist:
            return Response({"detail": "Trip not found."}, status=404)

        allowed = {"status", "visibility", "flagged_for_review"}
        for field in allowed:
            if field in request.data:
                setattr(trip, field, request.data[field])
        changed = [f for f in allowed if f in request.data]
        if "flagged_for_review" in changed and not trip.flagged_for_review:
            trip.flag_reason = None
            changed.append("flag_reason")
        trip.save(update_fields=changed)

        return Response({"detail": "Trip updated.", "status": trip.status,
                         "flagged_for_review": trip.flagged_for_review})


# ─── SOS Alerts ───────────────────────────────────────────────────────────────

class AdminSOSAlertsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = SOSAlert.objects.select_related("member", "trip").order_by("-created_at")

        alert_status = request.query_params.get("status")
        if alert_status:
            qs = qs.filter(status=alert_status)

        page     = max(int(request.query_params.get("page", 1)), 1)
        per_page = 20
        total    = qs.count()
        qs       = qs[(page - 1) * per_page : page * per_page]

        alerts = [
            {
                "id":           str(a.id),
                "trigger_type": a.trigger_type,
                "status":       a.status,
                "created_at":   a.created_at,
                "resolved_at":  a.resolved_at,
                "emergency_contact_notified": a.emergency_contact_notified,
                "chief_notified": a.chief_notified,
                "resolution_notes": a.resolution_notes,
                "member": {
                    "id":       str(a.member.id),
                    "email":    a.member.email,
                    "username": a.member.username,
                    "avatar_url": a.member.avatar_url,
                },
                "trip": {
                    "id":    str(a.trip.id),
                    "title": a.trip.title,
                },
            }
            for a in qs
        ]

        return Response({"count": total, "page": page, "results": alerts})


class AdminSOSAlertDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, alert_id):
        try:
            alert = SOSAlert.objects.get(id=alert_id)
        except SOSAlert.DoesNotExist:
            return Response({"detail": "Alert not found."}, status=404)

        new_status = request.data.get("status")
        if new_status not in ("resolved", "false_alarm"):
            return Response({"detail": "status must be 'resolved' or 'false_alarm'."}, status=400)

        alert.status = new_status
        alert.resolution_notes = request.data.get("resolution_notes", alert.resolution_notes)
        alert.resolved_at = timezone.now()
        alert.resolved_by = request.user
        alert.save(update_fields=["status", "resolution_notes", "resolved_at", "resolved_by"])

        return Response({"detail": "Alert updated.", "status": alert.status})


# ─── Incident Reports ─────────────────────────────────────────────────────────

class AdminIncidentsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = IncidentReport.objects.select_related("reporter", "reported_user", "trip").order_by("-created_at")

        report_status = request.query_params.get("status")
        if report_status:
            qs = qs.filter(status=report_status)

        incident_type = request.query_params.get("type")
        if incident_type:
            qs = qs.filter(incident_type=incident_type)

        # "Is this about a trip, or about us?" the split the inbox is triaged
        # on. A trip report has a payout to freeze and an organizer to hear
        # from; a general one has neither and is worked differently.
        scope = request.query_params.get("scope")
        if scope in (IncidentReport.Scope.TRIP, IncidentReport.Scope.GENERAL):
            qs = qs.filter(scope=scope)

        page     = max(int(request.query_params.get("page", 1)), 1)
        per_page = 20
        total    = qs.count()
        qs       = qs[(page - 1) * per_page : page * per_page]

        from decimal import Decimal

        def held_amount(trip):
            # A general report freezes nothing there is no trip and so no
            # escrow to hold. Returning "0" rather than skipping the key keeps
            # the shape of every row identical for the client.
            if trip is None:
                return str(Decimal("0"))
            return str(
                Payment.objects.filter(trip=trip, status="held")
                .aggregate(t=Sum("amount"))["t"] or Decimal("0")
            )

        incidents = [
            {
                "id":               str(r.id),
                "incident_type":    r.incident_type,
                "status":           r.status,
                "description":      r.description,                 # reporter's side
                "evidence_urls":    r.evidence_urls,
                "response":         r.response,                    # organizer's side
                "response_evidence_urls": r.response_evidence_urls,
                "responded_at":     r.responded_at,
                "reference_number": r.reference_number,
                "created_at":       r.created_at,
                "scope":            r.scope,           # about a trip, or about us
                "origin":           r.origin,          # which surface it came through
                "reporter_role":    r.reporter_role,   # who they were at filing time
                "frozen_amount":    held_amount(r.trip),          # money on hold pending this case
                "reporter": {
                    "id":       str(r.reporter.id),
                    "email":    r.reporter.email,
                    "username": r.reporter.username,
                },
                "reported_user": {
                    "id":       str(r.reported_user.id)    if r.reported_user else None,
                    "email":    r.reported_user.email      if r.reported_user else None,
                    "username": r.reported_user.username   if r.reported_user else None,
                } if r.reported_user else None,
                "trip": {
                    "id":    str(r.trip.id),
                    "title": r.trip.title,
                } if r.trip_id else None,
            }
            for r in qs
        ]

        return Response({"count": total, "page": page, "results": incidents})


def _tell_reporter(incident, status, note=None):
    """
    Close the loop in the reporter's Travel Together thread.

    This is the half that was missing: a report used to change status entirely
    inside the admin dashboard, and the person who filed it never found out.
    Best-effort the decision is already committed, and a chat write that
    fails must not roll it back.
    """
    try:
        from apps.chat.support import post_status_change, post_official
        if status:
            post_status_change(incident, status, note)
        elif note:
            post_official(
                incident.reporter,
                f"About {incident.reference_number}:\n\n{note}",
            )
    except Exception:
        pass


class AdminIncidentDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, incident_id):
        try:
            incident = IncidentReport.objects.select_related("trip").get(id=incident_id)
        except IncidentReport.DoesNotExist:
            return Response({"detail": "Incident not found."}, status=404)

        action = request.data.get("action")

        # Resolution actions that move money:
        # Anything an admin writes here reaches the person who filed the report.
        # Optional, and never auto-generated from internal notes an admin has
        # to choose the words that go to the member.
        note = (request.data.get("note") or "").strip() or None

        if action == "uphold":
            # Side with the reporter: refund every held payment, cancel the trip,
            # penalise the organizer. (Any already-released partial is a clawback
            # matter handled separately.)
            if not incident.trip_id:
                return Response(
                    {"detail": "Only a trip report can be upheld there is no trip "
                               "to cancel or payment to refund. Resolve it instead."},
                    status=400,
                )
            from apps.payments.services import cancel_trip
            cancel_trip(incident.trip, by_organizer=True,
                        reason=f"report {incident.reference_number} upheld")
            incident.status = IncidentReport.ReportStatus.RESOLVED
            incident.save(update_fields=["status", "updated_at"])
            _tell_reporter(incident, incident.status, note)
            return Response({"detail": "Report upheld trip cancelled and members refunded.",
                             "status": incident.status})

        if action == "dismiss":
            incident.status = IncidentReport.ReportStatus.DISMISSED
            incident.save(update_fields=["status", "updated_at"])
            _tell_reporter(incident, incident.status, note)
            return Response({"detail": "Report dismissed held payouts will resume.",
                             "status": incident.status})

        # Plain status change (e.g. move to under_review while investigating).
        allowed_statuses = ("pending", "under_review", "resolved", "dismissed")
        new_status = request.data.get("status")
        if new_status and new_status not in allowed_statuses:
            return Response({"detail": f"Invalid status. Choices: {allowed_statuses}"}, status=400)
        if new_status:
            changed = new_status != incident.status
            incident.status = new_status
            incident.save(update_fields=["status", "updated_at"])
            # Only on a real transition. Re-saving "under_review" while working a
            # case must not spam the member with the same line each time.
            if changed:
                _tell_reporter(incident, new_status, note)
        elif note:
            _tell_reporter(incident, None, note)
        return Response({"detail": "Incident updated.", "status": incident.status})


# ─── Karma Leaderboard ────────────────────────────────────────────────────────

class AdminLeaderboardView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        users = (
            User.objects.filter(is_active=True)
            .order_by("-travel_karma")[:50]
        )
        return Response([
            {
                "id":          str(u.id),
                "username":    u.username,
                "first_name":  u.first_name,
                "last_name":   u.last_name,
                "avatar_url":  u.avatar_url,
                "travel_karma":u.travel_karma,
                "karma_level": u.karma_level,
            }
            for u in users
        ])


# ─── Payments ledger ──────────────────────────────────────────────────────────

def _mask_ref(ref):
    return f"••••{ref[-6:]}" if ref else None


class AdminPaymentsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = Payment.objects.select_related("user", "trip").order_by("-created_at")

        status_f = request.query_params.get("status")
        if status_f:
            qs = qs.filter(status=status_f)

        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(Q(user__email__icontains=search) | Q(trip__title__icontains=search))

        from decimal import Decimal
        def total(s):
            return str(qs.filter(status=s).aggregate(t=Sum("amount"))["t"] or Decimal("0"))
        summary = {s: total(s) for s in ("held", "released", "refunded", "pending", "failed")}

        page     = max(int(request.query_params.get("page", 1)), 1)
        per_page = 20
        total_ct = qs.count()
        rows     = qs[(page - 1) * per_page : page * per_page]

        results = [
            {
                "id":               str(p.id),
                "status":           p.status,
                "amount":           str(p.amount),
                "fee":              str(p.fee),
                "currency":         p.currency,
                "reference_masked": _mask_ref(p.paystack_ref),
                "created_at":       p.created_at,
                "paid_at":          p.paid_at,
                "refunded_at":      p.refunded_at,
                "user":  {"id": str(p.user.id),  "email": p.user.email, "username": p.user.username},
                "trip":  {"id": str(p.trip.id),  "title": p.trip.title},
            }
            for p in rows
        ]
        return Response({"count": total_ct, "page": page, "summary": summary, "results": results})


class AdminPaymentRefundView(APIView):
    """Manual refund for dispute resolution (e.g. a trip that collapsed after a
    partial release). Only held payments can be refunded."""
    permission_classes = [IsAdminUser]

    def post(self, request, payment_id):
        from apps.payments.services import refund_payment
        from apps.payments import paystack

        try:
            payment = Payment.objects.select_related("user", "trip").get(id=payment_id)
        except Payment.DoesNotExist:
            return Response({"detail": "Payment not found."}, status=404)

        # platform_funded = admin discretionary refund for strictly-our-fault cases
        # (refunds even non-escrowed money; the platform covers it). Default off.
        force = request.data.get("platform_funded") in (True, "true", "True", "1")

        if payment.status != Payment.Status.HELD and not force:
            return Response(
                {"detail": f"Only held payments can be refunded (this one is {payment.status}). "
                           f"Use platform_funded to issue a discretionary refund."},
                status=400,
            )
        try:
            amount = refund_payment(payment, reason="admin_refund", force=force)
        except paystack.PaystackError as exc:
            return Response({"detail": str(exc)}, status=502)

        return Response({
            "refunded":        True,
            "amount":          str(amount) if amount is not None else None,
            "status":          payment.status,
            "platform_funded": force,
        })


class AdminPayoutRisksView(APIView):
    """
    Ring-detection signal: payout numbers shared by more than one organizer 
    a classic mule/collusion pattern worth a manual look.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        from django.db.models import Count
        from apps.payments.models import PayoutMethod

        dupes = (
            PayoutMethod.objects.values("account_number", "bank_code")
            .annotate(n=Count("id")).filter(n__gt=1).order_by("-n")
        )
        results = []
        for d in dupes:
            holders = (
                PayoutMethod.objects.filter(account_number=d["account_number"])
                .select_related("user")
            )
            results.append({
                "account_masked": f"••••{d['account_number'][-4:]}",
                "bank_code":      d["bank_code"],
                "count":          d["n"],
                "users": [
                    {"id": str(m.user.id), "email": m.user.email, "username": m.user.username}
                    for m in holders
                ],
            })
        return Response({"results": results})


class AdminPayoutsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = Payout.objects.select_related("organizer", "trip").order_by("-created_at")

        status_f = request.query_params.get("status")
        if status_f:
            qs = qs.filter(status=status_f)

        page     = max(int(request.query_params.get("page", 1)), 1)
        per_page = 20
        total_ct = qs.count()
        rows     = qs[(page - 1) * per_page : page * per_page]

        results = [
            {
                "id":         str(po.id),
                "kind":       po.kind,
                "status":     po.status,
                "amount":     str(po.amount),
                "created_at": po.created_at,
                "paid_at":    po.paid_at,
                "trip":       {"id": str(po.trip.id), "title": po.trip.title},
                "organizer":  {
                    "id":    str(po.organizer.id) if po.organizer else None,
                    "email": po.organizer.email   if po.organizer else None,
                },
            }
            for po in rows
        ]
        return Response({"count": total_ct, "page": page, "results": results})


# ─── Messaging members as Travel Together ─────────────────────────────────────

class AdminSupportInboxView(APIView):
    """
    GET /api/admin-dashboard/support/

        ?search=      email / username / name
        ?awaiting=1   only threads whose newest message came from the member
        ?page=

    The queue side of the Travel Together thread. Without this an admin could
    only reply to a member they already knew to look up, which is no use at all
    for the case this exists for: somebody wrote in and is waiting.

    Threads with no messages are left out. One is created the moment a member
    opens Chat, so including them would bury the handful of real conversations
    under a row for every account on the platform.
    """
    permission_classes = [IsAdminUser]

    PER_PAGE = 20

    def get(self, request):
        from django.db.models import Max, OuterRef, Subquery
        from apps.chat.models import Conversation

        # The newest surviving message decides both the ordering and whether
        # the thread is still waiting on us, so it is worth the two subqueries
        # to have both available before paginating.
        newest = (
            Message.objects
            .filter(conversation=OuterRef("pk"), is_deleted=False)
            .order_by("-created_at")
        )
        qs = (
            Conversation.objects
            .filter(type=Conversation.Type.SUPPORT)
            .annotate(
                last_activity   = Max("messages__created_at", filter=Q(messages__is_deleted=False)),
                last_is_official= Subquery(newest.values("is_official")[:1]),
            )
            .filter(last_activity__isnull=False)
            .prefetch_related("memberships__user")
            .order_by("-last_activity")
        )

        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(memberships__user__email__icontains=search)      |
                Q(memberships__user__username__icontains=search)   |
                Q(memberships__user__first_name__icontains=search) |
                Q(memberships__user__last_name__icontains=search)
            )

        if request.query_params.get("awaiting") in ("1", "true"):
            qs = qs.filter(last_is_official=False)

        page  = max(int(request.query_params.get("page", 1)), 1)
        total = qs.count()
        rows  = list(qs[(page - 1) * self.PER_PAGE : page * self.PER_PAGE])

        # One DISTINCT ON instead of a "latest message" query per row. Postgres
        # only allows it when the leading ORDER BY matches the distinct column.
        previews = {
            m.conversation_id: m
            for m in (
                Message.objects
                .filter(conversation_id__in=[c.id for c in rows], is_deleted=False)
                .order_by("conversation_id", "-created_at")
                .distinct("conversation_id")
            )
        }

        results = []
        for conv in rows:
            membership = next(iter(conv.memberships.all()), None)
            u = membership.user if membership else None
            msg = previews.get(conv.id)
            results.append({
                "conversation_id": str(conv.id),
                "user": {
                    "id":         str(u.id),
                    "email":      u.email,
                    "username":   u.username,
                    "first_name": u.first_name,
                    "last_name":  u.last_name,
                    "avatar_url": u.avatar_url,
                    "is_active":  u.is_active,
                } if u else None,
                "last_message": {
                    "text":         msg.text,
                    "message_type": msg.message_type,
                    "is_official":  msg.is_official,
                    "created_at":   msg.created_at,
                } if msg else None,
                "awaiting_reply": conv.last_is_official is False,
                "last_activity":  conv.last_activity,
            })

        # A thread whose only member has been deleted has nobody to reply to.
        results = [r for r in results if r["user"]]

        return Response({"count": total, "page": page, "results": results})


class AdminSupportThreadView(APIView):
    """
    GET  /api/admin-dashboard/support/<user_id>/   read one user's thread
    POST /api/admin-dashboard/support/<user_id>/   reply into it

    The admin side of the Travel Together thread. Staff never join the
    conversation they post into it, so the thread shows one identity to the
    member and no individual admin is exposed to someone they just ruled
    against. See apps.chat.support for the invariants.
    """
    permission_classes = [IsAdminUser]

    def _user(self, user_id):
        from apps.users.models import User
        return User.objects.filter(id=user_id).first()

    @staticmethod
    def _user_block(u):
        return {
            "id":         str(u.id),
            "email":      u.email,
            "username":   u.username,
            "first_name": u.first_name,
            "last_name":  u.last_name,
            "avatar_url": u.avatar_url,
            "is_active":  u.is_active,
        }

    def get(self, request, user_id):
        from apps.chat.support import get_support_conversation
        from apps.chat.serializers import MessageSerializer

        user = self._user(user_id)
        if not user:
            return Response({"detail": "User not found."}, status=404)

        conv = get_support_conversation(user, create=False)
        if not conv:
            # Nothing said yet in either direction. An empty thread is the
            # honest answer; creating one here would put a blank Travel Together
            # row in the member's chat list just because an admin looked.
            return Response({
                "conversation_id": None,
                "user":            self._user_block(user),
                "messages":        [],
            })

        msgs = conv.messages.filter(is_deleted=False).order_by("created_at")[:200]
        return Response({
            "conversation_id": str(conv.id),
            "user":            self._user_block(user),
            "messages":        MessageSerializer(msgs, many=True).data,
        })

    def post(self, request, user_id):
        from apps.chat.support import post_official
        from apps.chat.serializers import MessageSerializer

        user = self._user(user_id)
        if not user:
            return Response({"detail": "User not found."}, status=404)

        text = (request.data.get("text") or "").strip()
        if not text:
            return Response({"detail": "Message text is required."}, status=400)

        msg = post_official(user, text, media_url=request.data.get("media_url") or None)
        return Response(MessageSerializer(msg).data, status=201)


class AdminBroadcastView(APIView):
    """
    POST /api/admin-dashboard/broadcast/
        { "text": "...", "trip_id": "<uuid>" }   every approved member + chief
        { "text": "...", "user_ids": [...] }     a named list

    One official message, delivered into each recipient's own Travel Together
    thread rather than into the trip group chat. Deliberate: an announcement in
    the group chat is a message members can reply to in front of each other,
    and "your organizer is under investigation" is not a group conversation.

    There is no send-to-everyone option here on purpose. A broadcast to the
    whole user base is a different thing with different blast radius, and it
    should not be one missing filter away from a routine trip announcement.
    """
    permission_classes = [IsAdminUser]

    MAX_RECIPIENTS = 500

    def post(self, request):
        from apps.users.models import User
        from apps.chat.support import post_official

        text = (request.data.get("text") or "").strip()
        if not text:
            return Response({"detail": "Message text is required."}, status=400)

        trip_id  = request.data.get("trip_id")
        user_ids = request.data.get("user_ids")

        if trip_id:
            try:
                trip = Trip.objects.select_related("chief").get(id=trip_id)
            except (Trip.DoesNotExist, ValueError, ValidationError):
                return Response({"detail": "Trip not found."}, status=404)
            ids = set(
                TripMember.objects.filter(
                    trip=trip, status=TripMember.Status.APPROVED
                ).values_list("user_id", flat=True)
            )
            if trip.chief_id:
                ids.add(trip.chief_id)
            recipients = User.objects.filter(id__in=ids)
        elif user_ids:
            if not isinstance(user_ids, list):
                return Response({"detail": "user_ids must be a list."}, status=400)
            recipients = User.objects.filter(id__in=user_ids[:self.MAX_RECIPIENTS])
        else:
            return Response(
                {"detail": "Provide either trip_id or user_ids."}, status=400
            )

        recipients = list(recipients[:self.MAX_RECIPIENTS])
        if not recipients:
            return Response({"detail": "No recipients matched."}, status=400)

        sent = 0
        for user in recipients:
            try:
                post_official(user, text)
                sent += 1
            except Exception:
                # One bad thread must not swallow the rest of the broadcast.
                continue

        return Response({"sent": sent, "recipients": len(recipients)}, status=201)
