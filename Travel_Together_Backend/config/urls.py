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

    # Payments (Paystack checkout + webhook)
    path("api/payments/", include("apps.payments.urls")),

    # Public endpoints (no auth)
    path("api/public/", include("apps.trips.urls_public")),

    # Social auth (Google OAuth)
    path("social/", include("social_django.urls", namespace="social")),
]

# Always serve MEDIA_ROOT. Gating this on DEBUG meant every previously-uploaded
# avatar and trip photo 404'd the moment DEBUG was turned off; gating it on
# USE_R2 did the same the moment R2 was switched on, because files uploaded
# before the switch still had /media/ URLs stored in the database. In production
# MEDIA_ROOT is empty (everything lives in R2), so this route matches nothing
# there -- it only rescues files that predate the move to object storage.
# Use `manage.py migrate_media_to_r2` to push any such leftovers into R2.
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
