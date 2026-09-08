import logging
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
    url = settings.REDIS_URL or settings.CELERY_BROKER_URL
    # Short timeouts: a rate-limit lookup must never hang a login request while
    # a dead Redis waits for the default 30s socket timeout.
    return redis_lib.from_url(
        url,
        decode_responses=True,
        socket_connect_timeout=1,
        socket_timeout=1,
    )


# ─── OTP Rate Limiting ────────────────────────────────────────────────────────
# Two independent limits, both of which must pass before an OTP is sent:
#
#   • per email 3 sends / 15 min. Stops one address being mail-bombed.
#   • per IP   15 sends / hour.  Stops one caller walking a list of addresses.
#
# The per-IP limit is the one that matters for abuse. /api/auth/send-otp/ is
# AllowAny and creates a User row for any address it is handed, so without it a
# single script can mint unlimited accounts and send mail from our domain to
# arbitrary strangers each request under the email limit, because each uses a
# different email. It is set well above what a real person on a shared/NAT
# connection would need.
#
# Availability note: this is spam control, not an authentication control the
# OTP itself is bcrypt-hashed, expiring, and attempt-locked in the database.
# So if Redis is unreachable we log and FAIL OPEN rather than take sign-in down
# with it. Losing throttling for the duration of an outage is a far smaller
# problem than nobody being able to log in.

_OTP_RATE_LIMIT  = 3
_OTP_RATE_WINDOW = 15 * 60      # seconds

_IP_RATE_LIMIT   = 15
_IP_RATE_WINDOW  = 60 * 60      # seconds

_log = logging.getLogger(__name__)


def _is_limited(key: str, limit: int) -> bool:
    """True if `key`'s counter has reached `limit`. Fails open on Redis errors."""
    try:
        count = _get_redis().get(key)
    except redis_lib.RedisError as exc:
        _log.warning("Rate-limit check unavailable (%s) allowing request.", exc)
        return False
    return bool(count and int(count) >= limit)


def _increment(key: str, window: int) -> None:
    """Increment `key`, setting its TTL on first use. Best-effort."""
    try:
        pipe = _get_redis().pipeline()
        pipe.incr(key)
        pipe.expire(key, window)
        pipe.execute()
    except redis_lib.RedisError as exc:
        _log.warning("Could not record rate counter %s (%s).", key, exc)


def is_otp_rate_limited(email: str) -> bool:
    """Return True if this email has hit the send limit. Fails open."""
    return _is_limited(f"otp_rate:{email.lower()}", _OTP_RATE_LIMIT)


def increment_otp_rate(email: str) -> None:
    """Increment the OTP send counter; sets TTL on first use. Best-effort."""
    _increment(f"otp_rate:{email.lower()}", _OTP_RATE_WINDOW)


def clear_otp_rate(email: str) -> None:
    """
    Delete the rate-limit key for an email (e.g. after account reactivation).

    Deliberately does NOT touch the caller's IP counter: that one exists to cap
    how much a single source can do overall, so letting a user reset it by
    reactivating would defeat it.
    """
    try:
        _get_redis().delete(f"otp_rate:{email.lower()}")
    except redis_lib.RedisError as exc:
        _log.warning("Could not clear OTP rate key (%s).", exc)


def is_ip_rate_limited(ip: str) -> bool:
    """Return True if this IP has hit the hourly send limit. Fails open."""
    if not ip:
        return False
    return _is_limited(f"otp_ip_rate:{ip}", _IP_RATE_LIMIT)


def increment_ip_rate(ip: str) -> None:
    """Increment the per-IP OTP send counter. Best-effort."""
    if not ip:
        return
    _increment(f"otp_ip_rate:{ip}", _IP_RATE_WINDOW)


# ─── Networking ───────────────────────────────────────────────────────────────

def get_client_ip(request) -> str:
    """
    The caller's IP address.

    X-Forwarded-For is only honoured when TRUST_PROXY_HEADERS is on, because any
    client can set that header themselves. Trusting it unconditionally would
    make the per-IP rate limit above meaningless (send a different XFF value each
    request and every request looks like a new caller) and would poison the IP we
    record against each OTP. Turn the setting on only where a reverse proxy you
    control actually sets the header.
    """
    if settings.TRUST_PROXY_HEADERS:
        xff = request.META.get("HTTP_X_FORWARDED_FOR")
        if xff:
            return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")
