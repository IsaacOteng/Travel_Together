from django.urls import path
from apps.notifications.views import (
    NotificationListView,
    NotificationDetailView,
    MarkAllReadView,
    UnreadCountView,
)

urlpatterns = [
    path("",                          NotificationListView.as_view(),   name="notification-list"),
    path("unread-count/",             UnreadCountView.as_view(),        name="notification-unread-count"),
    path("mark-all-read/",            MarkAllReadView.as_view(),        name="notification-mark-all-read"),
    path("<uuid:notification_id>/",   NotificationDetailView.as_view(), name="notification-detail"),
]
