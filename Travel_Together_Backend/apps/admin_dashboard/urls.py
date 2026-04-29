from django.urls import path
from .views import (
    AdminStatsView,
    AdminUsersView,
    AdminUserDetailView,
    AdminTripsView,
    AdminTripDetailView,
    AdminSOSAlertsView,
    AdminSOSAlertDetailView,
    AdminIncidentsView,
    AdminIncidentDetailView,
    AdminLeaderboardView,
)

urlpatterns = [
    path("stats/",                    AdminStatsView.as_view()),
    path("users/",                    AdminUsersView.as_view()),
    path("users/<uuid:user_id>/",     AdminUserDetailView.as_view()),
    path("trips/",                    AdminTripsView.as_view()),
    path("trips/<uuid:trip_id>/",     AdminTripDetailView.as_view()),
    path("sos-alerts/",               AdminSOSAlertsView.as_view()),
    path("sos-alerts/<uuid:alert_id>/", AdminSOSAlertDetailView.as_view()),
    path("incidents/",                AdminIncidentsView.as_view()),
    path("incidents/<uuid:incident_id>/", AdminIncidentDetailView.as_view()),
    path("leaderboard/",              AdminLeaderboardView.as_view()),
]
