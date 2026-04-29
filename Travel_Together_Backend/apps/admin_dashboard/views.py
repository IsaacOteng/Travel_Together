from django.utils import timezone
from django.db.models import Count, Sum, Q
from datetime import timedelta

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser

from apps.users.models import User
from apps.trips.models import Trip, IncidentReport, TripMember
from apps.safety.models import SOSAlert
from apps.karma.models import KarmaLog
from apps.chat.models import Message
from apps.streaks.models import Streak


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
                "date_start":  t.date_start,
                "date_end":    t.date_end,
                "spots_total": t.spots_total,
                "entry_price": str(t.entry_price),
                "group_karma": t.group_karma,
                "created_at":  t.created_at,
                "chief": {
                    "id":       str(t.chief.id) if t.chief else None,
                    "email":    t.chief.email   if t.chief else None,
                    "username": t.chief.username if t.chief else None,
                    "avatar_url": t.chief.avatar_url if t.chief else None,
                },
                "member_count": TripMember.objects.filter(trip=t, status="approved").count(),
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

        allowed = {"status", "visibility"}
        for field in allowed:
            if field in request.data:
                setattr(trip, field, request.data[field])
        trip.save(update_fields=[f for f in allowed if f in request.data])

        return Response({"detail": "Trip updated.", "status": trip.status})


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

        page     = max(int(request.query_params.get("page", 1)), 1)
        per_page = 20
        total    = qs.count()
        qs       = qs[(page - 1) * per_page : page * per_page]

        incidents = [
            {
                "id":               str(r.id),
                "incident_type":    r.incident_type,
                "status":           r.status,
                "description":      r.description,
                "reference_number": r.reference_number,
                "created_at":       r.created_at,
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
                },
            }
            for r in qs
        ]

        return Response({"count": total, "page": page, "results": incidents})


class AdminIncidentDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, incident_id):
        try:
            incident = IncidentReport.objects.get(id=incident_id)
        except IncidentReport.DoesNotExist:
            return Response({"detail": "Incident not found."}, status=404)

        allowed_statuses = ("pending", "under_review", "resolved", "dismissed")
        new_status = request.data.get("status")
        if new_status and new_status not in allowed_statuses:
            return Response({"detail": f"Invalid status. Choices: {allowed_statuses}"}, status=400)

        if new_status:
            incident.status = new_status
            incident.save(update_fields=["status", "updated_at"])

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
