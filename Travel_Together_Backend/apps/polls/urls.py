from django.urls import path
from apps.polls.views import (
    PollListView,
    PollDetailView,
    PollLockView,
    VoteView,
    PollResultsView,
)

urlpatterns = [
    path("<uuid:trip_id>/polls/",                        PollListView.as_view(),    name="poll-list"),
    path("<uuid:trip_id>/polls/<uuid:poll_id>/",         PollDetailView.as_view(),  name="poll-detail"),
    path("<uuid:trip_id>/polls/<uuid:poll_id>/lock/",    PollLockView.as_view(),    name="poll-lock"),
    path("<uuid:trip_id>/polls/<uuid:poll_id>/vote/",    VoteView.as_view(),        name="poll-vote"),
    path("<uuid:trip_id>/polls/<uuid:poll_id>/results/", PollResultsView.as_view(), name="poll-results"),
]
