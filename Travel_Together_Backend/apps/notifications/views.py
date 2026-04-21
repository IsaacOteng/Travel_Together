from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """All notifications for the user, newest first. Pass ?unread=true to filter."""
        qs = Notification.objects.filter(recipient=request.user).order_by("-created_at")

        if request.query_params.get("unread") == "true":
            qs = qs.filter(is_read=False)

        # Simple pagination
        try:
            page      = max(int(request.query_params.get("page", 1)), 1)
            page_size = min(int(request.query_params.get("page_size", 20)), 50)
        except (TypeError, ValueError):
            return Response({"detail": "page and page_size must be integers."}, status=400)
        offset    = (page - 1) * page_size
        total     = qs.count()

        return Response({
            "count":        total,
            "unread_count": Notification.objects.filter(recipient=request.user, is_read=False).count(),
            "page":         page,
            "results":      NotificationSerializer(qs[offset: offset + page_size], many=True).data,
        })


class NotificationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, notification_id):
        """Mark a single notification as read."""
        try:
            notif = Notification.objects.get(id=notification_id, recipient=request.user)
        except Notification.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        notif.is_read = True
        notif.save(update_fields=["is_read"])
        return Response(NotificationSerializer(notif).data)


class MarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Mark all unread notifications as read."""
        count = Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({"marked_read": count})


class UnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({"unread_count": count})
