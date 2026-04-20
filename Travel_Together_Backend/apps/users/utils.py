import re
import secrets
import bcrypt
import redis as redis_lib
from django.conf import settings


# ─── OTP ──────────────────────────────────────────────────────────────────────

def generate_otp() -> str:
    """Return a cryptographically random 6-digit string."""
    return str(secrets.randbelow(1_000_000)).zfill(6)


def hash_otp(code: str) -> str:
    """Bcrypt-hash a plain OTP code for storage."""
    return bcrypt.hashpw(code.encode(), bcrypt.gensalt()).decode()


def verify_otp_hash(code: str, hashed: str) -> bool:
    """Constant-time comparison of a plain OTP against its stored hash."""
    return bcrypt.checkpw(code.encode(), hashed.encode())


# ─── Username generation ──────────────────────────────────────────────────────

_RESERVED = {"admin", "traveler", "explorer", "wanderer", "tripper", "nomad"}

def generate_unique_username(email: str) -> str:
    """
    Derive a unique username from the email prefix.
    e.g. junior.bandez@gmail.com → junior_bandez, then junior_bandez_4f2a if taken.
    """
    from apps.users.models import User  # local import to avoid circular

    prefix = email.split("@")[0].lower()
    base   = re.sub(r"[^a-z0-9._]", "_", prefix)   # replace invalid chars
    base   = re.sub(r"[._]{2,}", "_", base)          # collapse consecutive separators
    base   = base.strip("._")[:16] or "traveler"     # strip edges, max 16 chars

    candidate = base
    if candidate not in _RESERVED and not User.objects.filter(username=candidate).exists():
        return candidate

    for _ in range(10):
        suffix = secrets.token_hex(2)               # e.g. "4f2a"
        candidate = f"{base}_{suffix}"[:20]
        if candidate not in _RESERVED and not User.objects.filter(username=candidate).exists():
            return candidate

    return f"user_{secrets.token_hex(4)}"[:20]


# ─── Redis ────────────────────────────────────────────────────────────────────

def _get_redis() -> redis_lib.Redis:
    url = getattr(settings, "REDIS_URL", settings.CELERY_BROKER_URL)
    return redis_lib.from_url(url, decode_responses=True)


# ─── OTP Rate Limiting ────────────────────────────────────────────────────────
# Max 3 OTP send requests per email per 15-minute window.

_OTP_RATE_LIMIT  = 3
_OTP_RATE_WINDOW = 15 * 60  # seconds


def is_otp_rate_limited(email: str) -> bool:
    """Return True if this email has hit the send limit."""
    r = _get_redis()
    key = f"otp_rate:{email.lower()}"
    count = r.get(key)
    return bool(count and int(count) >= _OTP_RATE_LIMIT)


def increment_otp_rate(email: str) -> None:
    """Increment the OTP send counter; sets TTL on first use."""
    r = _get_redis()
    key = f"otp_rate:{email.lower()}"
    pipe = r.pipeline()
    pipe.incr(key)
    pipe.expire(key, _OTP_RATE_WINDOW)
    pipe.execute()


def clear_otp_rate(email: str) -> None:
    """Delete the rate-limit key for an email (e.g. after account reactivation)."""
    _get_redis().delete(f"otp_rate:{email.lower()}")


# ─── Networking ───────────────────────────────────────────────────────────────

def get_client_ip(request) -> str:
    """Extract the real client IP, respecting X-Forwarded-For."""
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")
