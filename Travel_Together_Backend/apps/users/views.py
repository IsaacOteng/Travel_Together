import json
import os
import uuid
import urllib.request
import urllib.error
from datetime import timedelta

import jwt
from jwt.algorithms import RSAAlgorithm

from django.conf import settings
from django.utils import timezone

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import User, EmailVerification, NotificationSettings, UserPreferences, EmergencyContact
from .serializers import (
    SendOTPSerializer,
    VerifyOTPSerializer,
    GoogleAuthSerializer,
    AppleAuthSerializer,
    UserMeSerializer,
    UserMeUpdateSerializer,
    UserPublicSerializer,
    OnboardingSerializer,
    NotificationSettingsSerializer,
    UserPreferencesSerializer,
    EmergencyContactSerializer,
)
from .utils import (
    generate_otp,
    hash_otp,
    verify_otp_hash,
    get_client_ip,
    is_otp_rate_limited,
    increment_otp_rate,
    generate_unique_username,
    clear_otp_rate,
)
from tasks.email import send_otp_email


# ─── Avatar upload helper ─────────────────────────────────────────────────────

def _save_avatar(request, file) -> str:
    """Save an uploaded avatar file and return its absolute media URL."""
    ext = os.path.splitext(file.name)[1].lower() or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    rel_path = f"avatars/{filename}"
    abs_dir  = os.path.join(settings.MEDIA_ROOT, "avatars")
    os.makedirs(abs_dir, exist_ok=True)
    abs_path = os.path.join(abs_dir, filename)
    with open(abs_path, "wb") as dest:
        for chunk in file.chunks():
            dest.write(chunk)
    return request.build_absolute_uri(f"{settings.MEDIA_URL}{rel_path}")


# ─── Token helper ─────────────────────────────────────────────────────────────

def _issue_tokens(user: User) -> RefreshToken:
    """Create a JWT refresh token (access token embedded inside)."""
    return RefreshToken.for_user(user)


def _token_response(refresh: RefreshToken) -> dict:
    """Return access + refresh tokens as a plain dict for the response body."""
    return {
        "access":  str(refresh.access_token),
        "refresh": str(refresh),
    }


# ─── OTP: Send ────────────────────────────────────────────────────────────────

class SendOTPView(APIView):
    """
    POST /api/auth/send-otp/
    Body: { "email": "user@example.com" }
    Always returns { "email_sent": true } to prevent email enumeration.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SendOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        ip    = get_client_ip(request)

        # Rate limit check — still return 200 to prevent enumeration
        if not is_otp_rate_limited(email):
            user, created = User.objects.get_or_create(
                email=email,
                defaults={"is_active": True},
            )
            if not created and not user.is_active:
                # Reactivate a previously deleted account — full fresh start
                user.is_active           = True
                user.deleted_at          = None
                user.onboarding_complete = False
                user.avatar_url          = None
                user.cover_url           = None
                user.save(update_fields=["is_active", "deleted_at", "onboarding_complete", "avatar_url", "cover_url"])
                # Clear all data tied to the old account
                from .models import EmergencyContact
                EmergencyContact.objects.filter(user=user).delete()
                clear_otp_rate(email)   # reset rate limit so OTP can be sent immediately
                created = True  # treat as new so username is (re)generated below
            if created and not user.username:
                user.username = generate_unique_username(email)
                user.save(update_fields=["username"])

            # Invalidate any previous unused OTPs for login purpose
            EmailVerification.objects.filter(
                user=user,
                purpose=EmailVerification.Purpose.LOGIN,
                is_used=False,
            ).update(is_used=True)

            # Generate and store new OTP
            code   = generate_otp()
            hashed = hash_otp(code)
            EmailVerification.objects.create(
                user=user,
                code=hashed,
                purpose=EmailVerification.Purpose.LOGIN,
                expires_at=timezone.now() + timedelta(minutes=15),
                ip_address=ip,
            )

            increment_otp_rate(email)
            try:
                send_otp_email.delay(email, code, "login")
            except Exception:
                # Celery/Redis unavailable — run synchronously so OTP still arrives
                send_otp_email(email, code, "login")

        return Response({"email_sent": True}, status=status.HTTP_200_OK)


# ─── OTP: Verify ──────────────────────────────────────────────────────────────

class VerifyOTPView(APIView):
    """
    POST /api/auth/verify-otp/
    Body: { "email": "...", "code": "123456" }
    Returns: { "is_new_user": bool }
    Sets httpOnly JWT cookies on success.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        code  = serializer.validated_data["code"]

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"detail": "No active code found. Please request a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Find the latest valid OTP for this user
        otp = (
            EmailVerification.objects
            .filter(
                user=user,
                purpose=EmailVerification.Purpose.LOGIN,
                is_used=False,
            )
            .order_by("-created_at")
            .first()
        )

        if otp is None:
            return Response(
                {"detail": "No active code found. Please request a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if otp.is_locked():
            return Response(
                {"detail": "Too many attempts. Request a new code."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        if otp.is_expired():
            return Response(
                {"detail": "Code has expired. Request a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not verify_otp_hash(code, otp.code):
            otp.attempt_count += 1
            otp.save(update_fields=["attempt_count"])
            return Response(
                {"detail": "That code is incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Mark OTP used and verify email
        otp.is_used = True
        otp.save(update_fields=["is_used"])

        if not user.email_verified:
            user.email_verified = True
            user.save(update_fields=["email_verified"])

        # Ensure every account always has a username
        if not user.username:
            user.username = generate_unique_username(user.email)
            user.save(update_fields=["username"])

        is_new_user = not user.onboarding_complete
        refresh     = _issue_tokens(user)
        return Response(
            {"is_new_user": is_new_user, **_token_response(refresh)},
            status=status.HTTP_200_OK,
        )


# ─── Token Refresh ────────────────────────────────────────────────────────────

class TokenRefreshView(APIView):
    """
    POST /api/auth/token/refresh/
    Body: { "refresh": "<refresh_token>" }
    Implements rolling sessions: validates the existing refresh token,
    then issues a completely fresh token pair so the 30-day window resets on
    every use. Users who open the app at least once per 30 days never need to
    log in again.
    Returns 401 only when the refresh token has actually expired or is invalid.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get("refresh")

        if not refresh_token:
            return Response(
                {"detail": "No refresh token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            old_refresh = RefreshToken(refresh_token)
            user_id = old_refresh["user_id"]
        except (TokenError, KeyError):
            return Response(
                {"detail": "Session expired. Please log in again."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            user = User.objects.get(id=user_id, is_active=True)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Issue a brand-new token pair — rolls the 30-day window forward
        new_refresh = _issue_tokens(user)
        return Response(_token_response(new_refresh), status=status.HTTP_200_OK)


# ─── Google OAuth ─────────────────────────────────────────────────────────────

def _verify_google_token(id_token: str) -> dict:
    """
    Verify a Google id_token using Google's tokeninfo endpoint.
    Returns the token payload dict on success, raises ValueError on failure.
    """
    url = f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
    try:
        with urllib.request.urlopen(url, timeout=5) as resp:
            payload = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        raise ValueError(f"Google token verification failed: {e.code}")
    except Exception as e:
        raise ValueError(f"Google token verification error: {e}")

    client_id = settings.SOCIAL_AUTH_GOOGLE_OAUTH2_KEY
    if client_id and payload.get("aud") != client_id:
        raise ValueError("Google token audience mismatch.")
    if payload.get("email_verified") != "true":
        raise ValueError("Google email not verified.")

    return payload


class GoogleAuthView(APIView):
    """
    POST /api/auth/google/
    Body: { "id_token": "<google_id_token>" }
    Returns: { "is_new_user": bool }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            payload = _verify_google_token(serializer.validated_data["id_token"])
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        email      = payload.get("email", "").lower()
        google_uid = payload.get("sub")

        if not email or not google_uid:
            return Response(
                {"detail": "Could not retrieve email from Google token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "google_uid":     google_uid,
                "email_verified": True,
                "first_name":     payload.get("given_name", ""),
                "last_name":      payload.get("family_name", ""),
                "avatar_url":     payload.get("picture", ""),
                "is_active":      True,
            },
        )

        # Sync google_uid if missing (user signed up via OTP first)
        if not user.google_uid:
            user.google_uid = google_uid
            user.email_verified = True
            user.save(update_fields=["google_uid", "email_verified"])

        is_new_user = not user.onboarding_complete
        refresh     = _issue_tokens(user)
        return Response(
            {"is_new_user": is_new_user, **_token_response(refresh)},
            status=status.HTTP_200_OK,
        )


# ─── Apple Sign In ────────────────────────────────────────────────────────────

_APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys"
_APPLE_ISSUER   = "https://appleid.apple.com"


def _fetch_apple_public_key(kid: str):
    """Fetch Apple's JWKS and return the RSA public key matching `kid`."""
    try:
        with urllib.request.urlopen(_APPLE_JWKS_URL, timeout=5) as resp:
            keys = json.loads(resp.read().decode())["keys"]
    except Exception as e:
        raise ValueError(f"Failed to fetch Apple public keys: {e}")

    key_data = next((k for k in keys if k["kid"] == kid), None)
    if key_data is None:
        raise ValueError("Apple signing key not found.")

    return RSAAlgorithm.from_jwk(json.dumps(key_data))


def _verify_apple_token(id_token: str) -> dict:
    """
    Verify an Apple id_token using Apple's public JWKS.
    Returns the decoded payload dict on success, raises ValueError on failure.
    """
    try:
        header = jwt.get_unverified_header(id_token)
    except Exception:
        raise ValueError("Invalid Apple token format.")

    public_key = _fetch_apple_public_key(header["kid"])
    bundle_id  = settings.APPLE_APP_BUNDLE_ID

    try:
        payload = jwt.decode(
            id_token,
            public_key,
            algorithms=["RS256"],
            audience=bundle_id if bundle_id else None,
            options={"verify_aud": bool(bundle_id)},
        )
    except jwt.ExpiredSignatureError:
        raise ValueError("Apple token has expired.")
    except jwt.InvalidTokenError as e:
        raise ValueError(f"Apple token invalid: {e}")

    if payload.get("iss") != _APPLE_ISSUER:
        raise ValueError("Invalid Apple token issuer.")

    return payload


class AppleAuthView(APIView):
    """
    POST /api/auth/apple/
    Body: { "id_token": "...", "first_name": "...", "last_name": "..." }
    Returns: { "is_new_user": bool }
    Apple only sends name on the FIRST sign-in; frontend must forward it then.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = AppleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            payload = _verify_apple_token(data["id_token"])
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        apple_uid = payload.get("sub")
        email     = payload.get("email", "").lower()

        if not apple_uid:
            return Response(
                {"detail": "Could not retrieve user ID from Apple token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Try to find existing user by apple_uid first, then by email
        user = (
            User.objects.filter(apple_uid=apple_uid).first()
            or (User.objects.filter(email=email).first() if email else None)
        )

        if user is None:
            if not email:
                return Response(
                    {"detail": "Email is required for first-time Apple sign-in."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user = User.objects.create(
                email=email,
                apple_uid=apple_uid,
                email_verified=True,
                first_name=data.get("first_name", ""),
                last_name=data.get("last_name", ""),
                is_active=True,
            )
        else:
            # Sync apple_uid if missing
            update_fields = []
            if not user.apple_uid:
                user.apple_uid = apple_uid
                update_fields.append("apple_uid")
            if not user.email_verified:
                user.email_verified = True
                update_fields.append("email_verified")
            if update_fields:
                user.save(update_fields=update_fields)

        is_new_user = not user.onboarding_complete
        refresh     = _issue_tokens(user)
        return Response(
            {"is_new_user": is_new_user, **_token_response(refresh)},
            status=status.HTTP_200_OK,
        )


# ─── Firebase Auth ───────────────────────────────────────────────────────────

class FirebaseAuthView(APIView):
    """
    POST /api/auth/firebase/
    Body: { "id_token": "<firebase_id_token>" }
    Accepts tokens from any Firebase provider (Google, Apple, etc.).
    Returns: { "access": "...", "refresh": "...", "is_new_user": bool }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        id_token = request.data.get("id_token", "").strip()
        if not id_token:
            return Response({"detail": "id_token required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from firebase_admin import auth as firebase_auth
            from .firebase_init import get_firebase_app
            get_firebase_app()
            decoded = firebase_auth.verify_id_token(id_token)
        except Exception as e:
            import traceback; traceback.print_exc()
            return Response(
                {"detail": f"Firebase token verification failed: {e}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        uid      = decoded.get("uid", "")
        email    = decoded.get("email", "").lower().strip()
        provider = decoded.get("firebase", {}).get("sign_in_provider", "")
        name     = decoded.get("name", "")
        picture  = decoded.get("picture", "")

        if not email:
            return Response(
                {"detail": "Email not available from this sign-in provider."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Extract first/last name from Firebase claims
        first_name = decoded.get("given_name") or (name.split()[0] if name else "")
        last_name  = decoded.get("family_name") or (" ".join(name.split()[1:]) if name and " " in name else "")

        user = User.objects.filter(email=email).first()

        if user is None:
            user = User.objects.create(
                email=email,
                email_verified=True,
                first_name=first_name,
                last_name=last_name,
                avatar_url=picture or "",
                is_active=True,
            )
            if "google" in provider:
                user.google_uid = uid
            elif "apple" in provider:
                user.apple_uid = uid
            user.username = generate_unique_username(email)
            user.save()
        else:
            update_fields = []
            if "google" in provider and not user.google_uid:
                user.google_uid = uid
                update_fields.append("google_uid")
            elif "apple" in provider and not user.apple_uid:
                user.apple_uid = uid
                update_fields.append("apple_uid")
            if not user.email_verified:
                user.email_verified = True
                update_fields.append("email_verified")
            if not user.username:
                user.username = generate_unique_username(email)
                update_fields.append("username")
            if update_fields:
                user.save(update_fields=update_fields)

        is_new_user = not user.onboarding_complete
        refresh     = _issue_tokens(user)
        return Response(
            {"is_new_user": is_new_user, **_token_response(refresh)},
            status=status.HTTP_200_OK,
        )


# ─── Logout ───────────────────────────────────────────────────────────────────

class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Body: { "refresh": "<refresh_token>" }  (optional — client should discard tokens regardless)
    The client is responsible for discarding stored tokens.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        # Optionally blacklist the refresh token if BLACKLIST_AFTER_ROTATION is enabled.
        # For now we rely on token expiry — client drops both tokens on logout.
        return Response({"logged_out": True}, status=status.HTTP_200_OK)


# ─── Account Delete ───────────────────────────────────────────────────────────

class AccountDeleteView(APIView):
    """
    DELETE /api/auth/account/
    Authenticated user only — no OTP required.
    Frees the username immediately so others can claim it.
    Soft-deletes the account; Celery handles permanent cleanup after grace period.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        user = request.user
        user.username   = None            # free username for others immediately
        user.is_active  = False
        user.deleted_at = timezone.now()
        user.save(update_fields=["username", "is_active", "deleted_at"])
        return Response({"deleted": True}, status=status.HTTP_200_OK)


# ─── Username availability ────────────────────────────────────────────────────

class CheckUsernameView(APIView):
    """
    GET /api/auth/check-username/?username=xxx
    Public — used during onboarding before the user is fully set up.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        username = request.query_params.get("username", "").lower().strip()
        if not username:
            return Response(
                {"detail": "username parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Only treat as taken if the user who holds it has completed onboarding.
        # Usernames chosen mid-onboarding (never finished) remain available.
        taken = User.objects.filter(username=username, onboarding_complete=True).exists()
        return Response({"available": not taken}, status=status.HTTP_200_OK)


# ─── My profile ───────────────────────────────────────────────────────────────

class MeView(APIView):
    """
    GET  /api/users/me/   — full profile + nested settings + preferences
    PATCH /api/users/me/  — post-onboarding edits (name, bio, avatar, city…)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Ensure related rows exist so the nested serializer never returns null
        NotificationSettings.objects.get_or_create(user=request.user)
        UserPreferences.objects.get_or_create(user=request.user)
        # Back-fill missing username (covers accounts created before auto-generation)
        if not request.user.username:
            request.user.username = generate_unique_username(request.user.email)
            request.user.save(update_fields=["username"])
        serializer = UserMeSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        # Handle file uploads before running the serializer
        update_fields = []
        avatar_file = request.FILES.get("avatar")
        if avatar_file:
            request.user.avatar_url = _save_avatar(request, avatar_file)
            update_fields.append("avatar_url")
        cover_file = request.FILES.get("cover")
        if cover_file:
            request.user.cover_url = _save_avatar(request, cover_file)
            update_fields.append("cover_url")
        if update_fields:
            request.user.save(update_fields=update_fields)

        serializer = UserMeUpdateSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        # Return full profile after update
        NotificationSettings.objects.get_or_create(user=request.user)
        UserPreferences.objects.get_or_create(user=request.user)
        return Response(UserMeSerializer(request.user).data)


# ─── Onboarding profile setup ─────────────────────────────────────────────────

class OnboardingProfileView(APIView):
    """
    PATCH /api/users/me/profile/
    Called during onboarding steps. Each step sends only its own fields.
    When onboarding_complete=true is sent the flag is saved and the user
    is routed to the main app by the frontend.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        serializer = OnboardingSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        NotificationSettings.objects.get_or_create(user=request.user)
        UserPreferences.objects.get_or_create(user=request.user)
        return Response(UserMeSerializer(request.user).data)


# ─── Public profile ───────────────────────────────────────────────────────────

class PublicProfileView(APIView):
    """
    GET /api/users/{id}/
    Returns the public profile of any user including:
      - Base profile fields
      - Computed reliability stats (trips, check-in rate, avg rating)
      - Full badge catalogue with per-user earned flag
      - Trip history (approved memberships)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        from django.db.models import Avg, Count
        from apps.trips.models import TripMember, Trip, TripRating, CheckIn, ItineraryStop
        from apps.karma.models import Badge, UserBadge
        from apps.karma.serializers import BadgeSerializer

        try:
            user = User.objects.get(id=user_id, is_active=True)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        # ── Base profile ──────────────────────────────────────────────────────
        data = dict(UserPublicSerializer(user).data)

        # ── Reliability stats (mirrors MyProfileStatsView for this user) ─────
        approved_qs = TripMember.objects.filter(
            user=user, status=TripMember.Status.APPROVED
        )
        trips_total     = approved_qs.count()
        trips_completed = approved_qs.filter(trip__status=Trip.Status.COMPLETED).count()

        rating_data = TripRating.objects.filter(rated_user=user).aggregate(
            avg=Avg("overall"), count=Count("id")
        )
        avg_rating    = round(float(rating_data["avg"] or 0), 1)
        ratings_count = rating_data["count"]

        member_trip_ids = list(approved_qs.values_list("trip_id", flat=True))
        total_stops     = ItineraryStop.objects.filter(trip_id__in=member_trip_ids).count()
        user_checkins   = CheckIn.objects.filter(
            member=user, trip_id__in=member_trip_ids
        ).count()
        checkin_rate = round((user_checkins / total_stops * 100) if total_stops > 0 else 0)

        data["trips_total"]     = trips_total
        data["trips_completed"] = trips_completed   # overrides serializer's (chief-only) value
        data["avg_rating"]      = avg_rating
        data["ratings_count"]   = ratings_count
        data["checkin_rate"]    = checkin_rate

        # ── Badge catalogue with earned flag for this user ────────────────────
        all_badges   = Badge.objects.all().order_by("rarity", "label")
        earned_slugs = set(
            UserBadge.objects.filter(user=user).values_list("badge__slug", flat=True)
        )
        badge_list = []
        for badge in all_badges:
            entry           = BadgeSerializer(badge).data
            entry["earned"] = badge.slug in earned_slugs
            badge_list.append(entry)
        data["badges"] = badge_list

        # ── Trip history (approved memberships, newest first) ─────────────────
        memberships = (
            TripMember.objects
            .filter(user=user, status=TripMember.Status.APPROVED)
            .select_related("trip")
            .prefetch_related("trip__images")
            .order_by("-trip__date_start")
        )
        trips = []
        for m in memberships:
            t         = m.trip
            first_img = t.images.first()
            cover     = t.cover_url or (first_img.image_url if first_img else None)
            trips.append({
                "id":           str(t.id),
                "title":        t.title,
                "destination":  t.destination,
                "date_start":   str(t.date_start),
                "date_end":     str(t.date_end),
                "status":       t.status,
                "cover_image":  cover,
                "my_role":      m.role,
                "karma_earned": m.karma_earned,
            })
        data["trips"] = trips

        return Response(data)


# ─── My profile stats ─────────────────────────────────────────────────────────

class MyProfileStatsView(APIView):
    """
    GET /api/users/me/stats/
    Returns computed reliability stats: check-in rate, avg received rating,
    trip counts.  All values derived from real data — nothing hardcoded.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models import Avg, Count
        from apps.trips.models import TripMember, TripRating, CheckIn, ItineraryStop, Trip

        user = request.user

        # Approved memberships
        approved_qs = TripMember.objects.filter(
            user=user, status=TripMember.Status.APPROVED
        )
        trips_total     = approved_qs.count()
        trips_completed = approved_qs.filter(
            trip__status=Trip.Status.COMPLETED
        ).count()

        # Average rating received
        rating_data = TripRating.objects.filter(rated_user=user).aggregate(
            avg=Avg("overall"), count=Count("id")
        )
        avg_rating    = round(float(rating_data["avg"] or 0), 1)
        ratings_count = rating_data["count"]

        # Check-in rate across all trips user has been a member of
        member_trip_ids = list(approved_qs.values_list("trip_id", flat=True))
        total_stops  = ItineraryStop.objects.filter(trip_id__in=member_trip_ids).count()
        user_checkins = CheckIn.objects.filter(
            member=user, trip_id__in=member_trip_ids
        ).count()
        checkin_rate = round((user_checkins / total_stops * 100) if total_stops > 0 else 0)

        return Response({
            "trips_total":     trips_total,
            "trips_completed": trips_completed,
            "avg_rating":      avg_rating,
            "ratings_count":   ratings_count,
            "checkin_rate":    checkin_rate,
        })


# ─── My trips (as member) ─────────────────────────────────────────────────────

class MyTripsView(APIView):
    """
    GET /api/users/me/trips/
    All trips the authenticated user has been approved into, newest first.
    Includes cover image, role, karma earned, and trip status so the frontend
    can distinguish active (joinable/viewable) from completed.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.trips.models import TripMember, Trip

        memberships = (
            TripMember.objects
            .filter(user=request.user, status=TripMember.Status.APPROVED)
            .select_related("trip")
            .prefetch_related("trip__images")
            .order_by("-trip__date_start")
        )

        results = []
        for m in memberships:
            t = m.trip
            cover = None
            first_img = t.images.first()
            if t.cover_url:
                cover = t.cover_url
            elif first_img:
                cover = first_img.image_url

            results.append({
                "id":           str(t.id),
                "title":        t.title,
                "destination":  t.destination,
                "date_start":   str(t.date_start),
                "date_end":     str(t.date_end),
                "status":       t.status,
                "cover_image":  cover,
                "my_role":      m.role,
                "karma_earned": m.karma_earned,
            })

        return Response({"count": len(results), "results": results})


# ─── Preferences ──────────────────────────────────────────────────────────────

class UserPreferencesView(APIView):
    """
    GET   /api/users/me/preferences/
    PATCH /api/users/me/preferences/
    Trip style preferences set during onboarding ProfileSetup Step 1-2.
    """
    permission_classes = [IsAuthenticated]

    def _get_or_create(self, user):
        prefs, _ = UserPreferences.objects.get_or_create(user=user)
        return prefs

    def get(self, request):
        return Response(UserPreferencesSerializer(self._get_or_create(request.user)).data)

    def patch(self, request):
        prefs = self._get_or_create(request.user)
        serializer = UserPreferencesSerializer(prefs, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ─── Notification settings ────────────────────────────────────────────────────

class NotificationSettingsView(APIView):
    """
    GET   /api/users/me/settings/
    PATCH /api/users/me/settings/
    """
    permission_classes = [IsAuthenticated]

    def _get_or_create(self, user):
        settings_obj, _ = NotificationSettings.objects.get_or_create(user=user)
        return settings_obj

    def get(self, request):
        return Response(NotificationSettingsSerializer(self._get_or_create(request.user)).data)

    def patch(self, request):
        obj = self._get_or_create(request.user)
        serializer = NotificationSettingsSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ─── Emergency contacts ───────────────────────────────────────────────────────

class EmergencyContactListView(APIView):
    """
    GET  /api/users/me/emergency-contacts/   — list all contacts
    POST /api/users/me/emergency-contacts/   — add a contact (max 3)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        contacts = EmergencyContact.objects.filter(user=request.user)
        return Response(EmergencyContactSerializer(contacts, many=True).data)

    def post(self, request):
        serializer = EmergencyContactSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class EmergencyContactDetailView(APIView):
    """
    PATCH  /api/users/me/emergency-contacts/{id}/
    DELETE /api/users/me/emergency-contacts/{id}/
    """
    permission_classes = [IsAuthenticated]

    def _get_contact(self, request, contact_id):
        try:
            return EmergencyContact.objects.get(id=contact_id, user=request.user)
        except EmergencyContact.DoesNotExist:
            return None

    def patch(self, request, contact_id):
        contact = self._get_contact(request, contact_id)
        if not contact:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = EmergencyContactSerializer(
            contact, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, contact_id):
        contact = self._get_contact(request, contact_id)
        if not contact:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        contact.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
