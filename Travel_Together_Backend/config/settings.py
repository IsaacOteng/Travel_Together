import environ
import os
from pathlib import Path
from datetime import timedelta

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent

# ─── Environment ──────────────────────────────────────────────────────────────
env = environ.Env(DEBUG=(bool, False))
environ.Env.read_env(BASE_DIR / ".env")

# ─── Core ─────────────────────────────────────────────────────────────────────
SECRET_KEY = env("SECRET_KEY")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

# ─── Installed Apps ───────────────────────────────────────────────────────────
INSTALLED_APPS = [
    # Daphne must come before staticfiles
    "daphne",

    # Django built-ins
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.gis",          # GeoDjango / PostGIS

    # Third-party
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "channels",
    "django_celery_beat",
    "social_django",

    # Our apps
    "apps.users",
    "apps.trips",
    "apps.chat",
    "apps.streaks",
    "apps.polls",
    "apps.safety",
    "apps.karma",
    "apps.notifications",
]

# ─── Middleware ────────────────────────────────────────────────────────────────
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "social_django.context_processors.backends",
                "social_django.context_processors.login_redirect",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ─── Database (PostGIS) ───────────────────────────────────────────────────────
DATABASES = {
    "default": env.db("DATABASE_URL")
}
DATABASES["default"]["ENGINE"] = "django.contrib.gis.db.backends.postgis"

# ─── Custom User Model ────────────────────────────────────────────────────────
AUTH_USER_MODEL = "users.User"

# ─── Password Validation ──────────────────────────────────────────────────────
# Passwordless — no passwords are ever set by users
AUTH_PASSWORD_VALIDATORS = []

# ─── Internationalisation ─────────────────────────────────────────────────────
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ─── Static & Media ───────────────────────────────────────────────────────────
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ─── Cloudflare R2 (object storage) ──────────────────────────────────────────
# Set USE_R2=true in production. All four values below are required when enabled.
# Leave USE_R2 unset (or false) for local development — files go to MEDIA_ROOT.
USE_R2               = env.bool("USE_R2", default=False)
R2_BUCKET_NAME       = env("R2_BUCKET_NAME",       default="")
R2_ACCESS_KEY_ID     = env("R2_ACCESS_KEY_ID",     default="")
R2_SECRET_ACCESS_KEY = env("R2_SECRET_ACCESS_KEY", default="")
R2_ENDPOINT_URL      = env("R2_ENDPOINT_URL",      default="")
# Optional: set to your R2 custom domain (e.g. media.traveltogether.app)
# so uploaded file URLs use your domain instead of the raw R2 endpoint.
R2_PUBLIC_DOMAIN     = env("R2_PUBLIC_DOMAIN",     default="")

# ─── CORS ─────────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost:5173", "http://localhost:3000"],
)
# Bearer tokens in Authorization header — no cookies, no credentials needed.
CORS_ALLOW_CREDENTIALS = False
CORS_ALLOW_HEADERS = [
    "accept",
    "authorization",
    "content-type",
    "x-csrftoken",
]

# ─── Django REST Framework ────────────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
}

# ─── JWT ──────────────────────────────────────────────────────────────────────
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=env.int("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", default=15)
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=env.int("JWT_REFRESH_TOKEN_LIFETIME_DAYS", default=30)
    ),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    # Tokens are sent via Authorization: Bearer header — no cookies needed.
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# ─── Apple Sign In ────────────────────────────────────────────────────────────
APPLE_APP_BUNDLE_ID = env("APPLE_APP_BUNDLE_ID", default="")

# ─── Channels (WebSocket) + Cache ────────────────────────────────────────────
_REDIS_URL = env("REDIS_URL", default="")
if _REDIS_URL:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {"hosts": [_REDIS_URL]},
        },
    }
else:
    # No Redis available — use in-process layer (dev only, single worker)
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        },
    }

if _REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": _REDIS_URL,
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        }
    }

# ─── Celery ───────────────────────────────────────────────────────────────────
CELERY_BROKER_URL = env("REDIS_URL", default="redis://localhost:6379/0")
CELERY_RESULT_BACKEND = env("REDIS_URL", default="redis://localhost:6379/0")
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "UTC"
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"

from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    # SOS auto-detection — every 5 minutes
    "check-stationary-members": {
        "task":     "tasks.sos.check_stationary_members",
        "schedule": crontab(minute="*/5"),
    },
    "check-route-deviation": {
        "task":     "tasks.sos.check_route_deviation",
        "schedule": crontab(minute="*/5"),
    },
    # SOS escalation — every 15 minutes
    "escalate-unresolved-alerts": {
        "task":     "tasks.sos.escalate_unresolved_alerts",
        "schedule": crontab(minute="*/15"),
    },
    # Trip lifecycle — daily at midnight UTC
    "mark-trips-active": {
        "task":     "tasks.cleanup.mark_trips_active",
        "schedule": crontab(hour=0, minute=0),
    },
    "mark-trips-completed": {
        "task":     "tasks.cleanup.mark_trips_completed",
        "schedule": crontab(hour=0, minute=5),
    },
    # Trip reminders — daily at 10 AM UTC (24h before trips starting tomorrow)
    "send-trip-reminders": {
        "task":     "tasks.recap.send_trip_reminders_daily",
        "schedule": crontab(hour=10, minute=0),
    },
    # Nightly cleanup — 2 AM UTC
    "purge-expired-otps": {
        "task":     "tasks.cleanup.purge_expired_otps",
        "schedule": crontab(hour=2, minute=0),
    },
    "purge-old-notifications": {
        "task":     "tasks.cleanup.purge_old_notifications",
        "schedule": crontab(hour=2, minute=10),
    },
    "purge-old-locations": {
        "task":     "tasks.cleanup.purge_old_locations",
        "schedule": crontab(hour=2, minute=20),
    },
    "purge-deleted-users": {
        "task":     "tasks.cleanup.purge_deleted_users",
        "schedule": crontab(hour=2, minute=30),
    },
}

# ─── Email ────────────────────────────────────────────────────────────────────
EMAIL_BACKEND = env(
    "EMAIL_BACKEND",
    default="django.core.mail.backends.console.EmailBackend",
)
EMAIL_HOST = env("EMAIL_HOST", default="smtp.gmail.com")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="TravelTogether <noreply@traveltogether.app>")

# ─── Africa's Talking (SMS) ───────────────────────────────────────────────────
AT_USERNAME  = env("AT_USERNAME",  default="sandbox")
AT_API_KEY   = env("AT_API_KEY",   default="")
AT_SENDER_ID = env("AT_SENDER",    default="TravelTgtr")

# ─── Social Auth (Google OAuth) ───────────────────────────────────────────────
SOCIAL_AUTH_GOOGLE_OAUTH2_KEY = env("GOOGLE_CLIENT_ID", default="")
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET = env("GOOGLE_CLIENT_SECRET", default="")
SOCIAL_AUTH_GOOGLE_OAUTH2_SCOPE = ["email", "profile"]
AUTHENTICATION_BACKENDS = [
    "social_core.backends.google.GoogleOAuth2",
    "django.contrib.auth.backends.ModelBackend",
]

# ─── Production security headers ─────────────────────────────────────────────
# These are safe to set in all environments; they only take effect over HTTPS.
if not DEBUG:
    SECURE_SSL_REDIRECT          = True
    SECURE_HSTS_SECONDS          = 31536000   # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD          = True
    SESSION_COOKIE_SECURE        = True
    CSRF_COOKIE_SECURE           = True
    SECURE_BROWSER_XSS_FILTER   = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS              = "DENY"

# ─── GeoDjango (Windows — PostGIS bundle paths) ───────────────────────────────
# These point to the GDAL/GEOS DLLs that ship with the PostGIS installer.
# Adjust version numbers if your install differs.
if os.name == "nt":
    GDAL_LIBRARY_PATH = env(
        "GDAL_LIBRARY_PATH",
        default=r"C:\Program Files\PostgreSQL\16\bin\libgdal-35.dll",
    )
    GEOS_LIBRARY_PATH = env(
        "GEOS_LIBRARY_PATH",
        default=r"C:\Program Files\PostgreSQL\16\bin\libgeos_c.dll",
    )
