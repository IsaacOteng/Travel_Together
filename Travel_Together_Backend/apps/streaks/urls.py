from django.urls import path
from apps.streaks.views import (
    StreakListView,
    StreakDetailView,
    StreakReactView,
    TripRecapView,
)

urlpatterns = [
    path("<uuid:trip_id>/streaks/",
         StreakListView.as_view(),
         name="streak-list"),

    path("<uuid:trip_id>/streaks/<uuid:streak_id>/",
         StreakDetailView.as_view(),
         name="streak-detail"),

    path("<uuid:trip_id>/streaks/<uuid:streak_id>/react/",
         StreakReactView.as_view(),
         name="streak-react"),

    path("<uuid:trip_id>/recap/",
         TripRecapView.as_view(),
         name="trip-recap"),
]
