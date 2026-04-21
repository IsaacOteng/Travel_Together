from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.users.models import User
from .models import KarmaLog, Badge, UserBadge
from .serializers import KarmaLogSerializer, BadgeSerializer, UserBadgeSerializer


# ─── My karma summary + log ───────────────────────────────────────────────────

class MyKarmaView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        qs   = KarmaLog.objects.filter(user=user).order_by("-created_at")

        # Pagination
        try:
            page      = max(int(request.query_params.get("page", 1)), 1)
            page_size = min(int(request.query_params.get("page_size", 20)), 50)
        except (TypeError, ValueError):
            return Response({"detail": "page and page_size must be integers."}, status=400)
        offset    = (page - 1) * page_size
        total     = qs.count()

        # Breakdown by reason
        from django.db.models import Sum
        breakdown = {}
        for entry in KarmaLog.objects.filter(user=user).values("reason").annotate(total=Sum("delta")):
            breakdown[entry["reason"]] = entry["total"]

        return Response({
            "travel_karma": user.travel_karma,
            "karma_level":  user.karma_level,
            "breakdown":    breakdown,
            "count":        total,
            "page":         page,
            "results":      KarmaLogSerializer(qs[offset: offset + page_size], many=True).data,
        })


# ─── Public karma view (another user) ────────────────────────────────────────

class UserKarmaView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=404)

        return Response({
            "user_id":      str(user.id),
            "username":     user.username,
            "travel_karma": user.travel_karma,
            "karma_level":  user.karma_level,
        })


# ─── My badges ────────────────────────────────────────────────────────────────

class MyBadgesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        badges = UserBadge.objects.filter(user=request.user).select_related(
            "badge", "trip"
        ).order_by("-earned_at")
        return Response(UserBadgeSerializer(badges, many=True).data)


# ─── All badges (catalogue) ───────────────────────────────────────────────────

class BadgeCatalogueView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        badges      = Badge.objects.all().order_by("rarity", "label")
        earned_slugs = set(
            UserBadge.objects.filter(user=request.user).values_list("badge__slug", flat=True)
        )
        data = []
        for badge in badges:
            entry         = BadgeSerializer(badge).data
            entry["earned"] = badge.slug in earned_slugs
            data.append(entry)
        return Response(data)


# ─── Leaderboard (top karma users) ───────────────────────────────────────────

class KarmaLeaderboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        limit = min(int(request.query_params.get("limit", 20)), 50)
        users = User.objects.filter(
            is_active=True, onboarding_complete=True
        ).order_by("-travel_karma")[:limit]

        return Response([
            {
                "rank":         i + 1,
                "user_id":      str(u.id),
                "username":     u.username,
                "first_name":   u.first_name,
                "avatar_url":   u.avatar_url,
                "travel_karma": u.travel_karma,
                "karma_level":  u.karma_level,
            }
            for i, u in enumerate(users)
        ])
