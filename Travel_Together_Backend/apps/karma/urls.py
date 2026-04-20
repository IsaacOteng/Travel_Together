from django.urls import path
from apps.karma.views import (
    MyKarmaView,
    UserKarmaView,
    MyBadgesView,
    BadgeCatalogueView,
    KarmaLeaderboardView,
)

urlpatterns = [
    path("",                    MyKarmaView.as_view(),          name="karma-me"),
    path("badges/",             MyBadgesView.as_view(),         name="karma-my-badges"),
    path("badges/all/",         BadgeCatalogueView.as_view(),   name="karma-badge-catalogue"),
    path("leaderboard/",        KarmaLeaderboardView.as_view(), name="karma-leaderboard"),
    path("users/<uuid:user_id>/", UserKarmaView.as_view(),      name="karma-user"),
]
