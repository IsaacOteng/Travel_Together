"""
Geocoding utility for TravelTogether trips.

Uses Nominatim (OpenStreetMap) — free, no API key required.
Respects the 1 req/s rate-limit via a module-level lock + timestamp.
"""
import time
import logging
import threading
import requests
from django.contrib.gis.geos import Point

logger = logging.getLogger(__name__)

# ── Rate-limit state ─────────────────────────────────────────────────────────
_lock          = threading.Lock()
_last_call_at  = 0.0
_MIN_INTERVAL  = 1.1   # seconds — slightly over 1 s to be safe

NOMINATIM_URL  = "https://nominatim.openstreetmap.org/search"
USER_AGENT     = "TravelTogether/1.0 (contact@traveltogether.app)"
TIMEOUT        = 6     # seconds per request
MAX_RETRIES    = 2


def _rate_limited_get(params: dict) -> list:
    """Call Nominatim, honouring the 1 req/s policy."""
    global _last_call_at
    with _lock:
        now   = time.monotonic()
        wait  = _MIN_INTERVAL - (now - _last_call_at)
        if wait > 0:
            time.sleep(wait)
        _last_call_at = time.monotonic()

    resp = requests.get(
        NOMINATIM_URL,
        params   = {**params, "format": "json", "limit": 1},
        headers  = {"User-Agent": USER_AGENT, "Accept-Language": "en"},
        timeout  = TIMEOUT,
    )
    resp.raise_for_status()
    return resp.json()


_GHANA_KEYWORDS = {"ghana", "accra", "kumasi", "tamale", "takoradi", "sunyani",
                   "volta", "ashanti", "brong", "eastern", "western", "northern",
                   "central", "upper east", "upper west", "oti", "savannah",
                   "bono", "ahafo", "north east", "greater accra"}

def _looks_like_ghana(text: str) -> bool:
    t = text.lower()
    return any(kw in t for kw in _GHANA_KEYWORDS)


def _try_query(params: dict) -> Point | None:
    """Attempt one geocode query with retries. Returns Point or None."""
    for attempt in range(MAX_RETRIES):
        try:
            results = _rate_limited_get(params)
            if results:
                lat = float(results[0]["lat"])
                lng = float(results[0]["lon"])
                logger.debug("Geocoded %r → (%.5f, %.5f)", params.get("q"), lat, lng)
                return Point(x=lng, y=lat, srid=4326)
        except requests.RequestException as exc:
            logger.warning("Geocode attempt %d/%d failed: %s", attempt + 1, MAX_RETRIES, exc)
            if attempt < MAX_RETRIES - 1:
                time.sleep(2 ** attempt)
    return None


def geocode(place_name: str) -> Point | None:
    """
    Resolve a place name string to a PostGIS Point(lng, lat).
    Returns None if the place cannot be resolved.

    Strategy:
      1. If the query looks Ghana-related (or has no explicit country),
         try with countrycodes=gh first so local landmarks resolve correctly.
      2. If that returns nothing, try the full query globally.
      3. If that still fails, retry with only the first comma-segment.
    """
    if not place_name or not place_name.strip():
        return None

    query = place_name.strip()
    first_segment = query.split(",")[0].strip()

    # Build ordered list of (params) to try
    attempts = []

    # Ghana-scoped pass: use when the text hints at Ghana OR has no country at all
    has_country_hint = any(c.isalpha() and len(c) > 3 for c in query.split(",")[-1:])
    if _looks_like_ghana(query) or not has_country_hint:
        attempts.append({"q": query,         "countrycodes": "gh"})
        if first_segment.lower() != query.lower():
            attempts.append({"q": first_segment, "countrycodes": "gh"})

    # Global pass
    attempts.append({"q": query})
    if first_segment.lower() != query.lower():
        attempts.append({"q": first_segment})

    for params in attempts:
        point = _try_query(params)
        if point:
            return point

    logger.info("Could not geocode %r — map will fall back to client-side.", place_name)
    return None


def geocode_trip(trip) -> bool:
    """
    Resolve and persist coordinates for a single Trip instance.
    Returns True if coordinates were updated, False otherwise.
    Skips the trip if destination_point is already set.
    """
    if trip.destination_point:
        return False   # already have coords, nothing to do

    point = geocode(trip.destination)
    if point:
        trip.destination_point = point
        trip.save(update_fields=["destination_point"])
        return True
    return False
