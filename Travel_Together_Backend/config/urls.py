from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),

    # Auth
    path("api/auth/", include("apps.users.urls.auth")),

    # Users
    path("api/users/", include("apps.users.urls.users")),

    # Trips
    path("api/trips/", include("apps.trips.urls")),

    # Conversations / Chat (REST)
    path("api/conversations/", include("apps.chat.urls")),

    # Notifications
    path("api/notifications/", include("apps.notifications.urls")),

    # Polls (nested under trips)
    path("api/trips/", include("apps.polls.urls")),

    # Safety / SOS
    path("api/trips/", include("apps.safety.urls")),
    path("api/safety/", include("apps.safety.urls")),

    # Karma
    path("api/karma/", include("apps.karma.urls")),

    # Streaks
    path("api/trips/", include("apps.streaks.urls")),

    # Admin dashboard
    path("api/admin-dashboard/", include("apps.admin_dashboard.urls")),

    # Public endpoints (no auth)
    path("api/public/", include("apps.trips.urls_public")),

    # Social auth (Google OAuth)
    path("social/", include("social_django.urls", namespace="social")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
