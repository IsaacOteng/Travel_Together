from django.urls import path
from apps.users.views import (
    MeView,
    OnboardingProfileView,
    PublicProfileView,
    UserPreferencesView,
    NotificationSettingsView,
    EmergencyContactListView,
    EmergencyContactDetailView,
    MyProfileStatsView,
    MyTripsView,
)

urlpatterns = [
    # Own profile
    path("me/",                 MeView.as_view(),                   name="users-me"),
    path("me/profile/",         OnboardingProfileView.as_view(),    name="users-me-profile"),
    path("me/stats/",           MyProfileStatsView.as_view(),       name="users-me-stats"),
    path("me/trips/",           MyTripsView.as_view(),              name="users-me-trips"),
    path("me/preferences/",     UserPreferencesView.as_view(),      name="users-me-preferences"),
    path("me/settings/",        NotificationSettingsView.as_view(), name="users-me-settings"),

    # Emergency contacts
    path("me/emergency-contacts/",
         EmergencyContactListView.as_view(),
         name="users-emergency-contacts"),
    path("me/emergency-contacts/<uuid:contact_id>/",
         EmergencyContactDetailView.as_view(),
         name="users-emergency-contact-detail"),

    # Public profiles
    path("<uuid:user_id>/",     PublicProfileView.as_view(),        name="users-public-profile"),
]
