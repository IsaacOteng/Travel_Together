from django.urls import path
from apps.trips.views import (
    TripListCreateView,
    TripDetailView,
    TripPublishView,
    TripEndView,
    TripImageListView,
    TripImageDetailView,
    JoinRequestView,
    TripMemberListView,
    TripMemberDetailView,
    TripSaveView,
    SavedTripListView,
    ItineraryListView,
    ItineraryStopDetailView,
    TripRatingView,
    IncidentReportView,
    TripGroupConversationView,
    TripCheckInView,
)

urlpatterns = [
    # My trips + create
    path("",                                    TripListCreateView.as_view(),       name="trip-list-create"),

    # Saved trips
    path("saved/",                              SavedTripListView.as_view(),        name="trip-saved-list"),

    # Trip detail
    path("<uuid:trip_id>/",                     TripDetailView.as_view(),           name="trip-detail"),
    path("<uuid:trip_id>/publish/",             TripPublishView.as_view(),          name="trip-publish"),
    path("<uuid:trip_id>/end/",                 TripEndView.as_view(),              name="trip-end"),

    # Images
    path("<uuid:trip_id>/images/",              TripImageListView.as_view(),        name="trip-images"),
    path("<uuid:trip_id>/images/<uuid:image_id>/", TripImageDetailView.as_view(),  name="trip-image-detail"),

    # Join / leave
    path("<uuid:trip_id>/join/",                JoinRequestView.as_view(),          name="trip-join"),

    # Members
    path("<uuid:trip_id>/members/",             TripMemberListView.as_view(),       name="trip-members"),
    path("<uuid:trip_id>/members/<uuid:user_id>/", TripMemberDetailView.as_view(), name="trip-member-detail"),

    # Save / unsave
    path("<uuid:trip_id>/save/",                TripSaveView.as_view(),             name="trip-save"),

    # Itinerary
    path("<uuid:trip_id>/itinerary/",           ItineraryListView.as_view(),        name="trip-itinerary"),
    path("<uuid:trip_id>/itinerary/<uuid:stop_id>/", ItineraryStopDetailView.as_view(), name="trip-stop-detail"),

    # Ratings (post-trip)
    path("<uuid:trip_id>/ratings/",             TripRatingView.as_view(),           name="trip-ratings"),

    # Incident reports
    path("<uuid:trip_id>/reports/",             IncidentReportView.as_view(),       name="trip-reports"),

    # Group conversation
    path("<uuid:trip_id>/conversation/",        TripGroupConversationView.as_view(), name="trip-conversation"),

    # Check-in
    path("<uuid:trip_id>/checkin/",             TripCheckInView.as_view(),           name="trip-checkin"),
]
