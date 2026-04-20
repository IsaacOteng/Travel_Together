from django.urls import path
from apps.trips.views import PublicTripListView, PublicTripDetailView

urlpatterns = [
    path("trips/",              PublicTripListView.as_view(),  name="public-trip-list"),
    path("trips/<uuid:trip_id>/", PublicTripDetailView.as_view(), name="public-trip-detail"),
]
