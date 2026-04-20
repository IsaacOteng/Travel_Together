from django.urls import path
from apps.safety.views import (
    TriggerSOSView,
    SOSAlertListView,
    SOSAlertDetailView,
    SOSActionView,
    MyActiveSOSView,
)

urlpatterns = [
    # My active SOS across all trips
    path("sos/active/",
         MyActiveSOSView.as_view(),
         name="sos-active"),

    # Trip-level SOS
    path("<uuid:trip_id>/sos/",
         TriggerSOSView.as_view(),
         name="sos-trigger"),
    path("<uuid:trip_id>/sos/alerts/",
         SOSAlertListView.as_view(),
         name="sos-alert-list"),
    path("<uuid:trip_id>/sos/alerts/<uuid:alert_id>/",
         SOSAlertDetailView.as_view(),
         name="sos-alert-detail"),
    path("<uuid:trip_id>/sos/alerts/<uuid:alert_id>/actions/",
         SOSActionView.as_view(),
         name="sos-action"),
]
