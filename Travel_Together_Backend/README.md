# TravelTogether — Backend

Django + DRF + Django Channels + Celery + PostGIS backend for the TravelTogether group travel app.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Django 4.2, Django REST Framework 3.15 |
| Real-time | Django Channels 4 + Daphne (ASGI) |
| Task queue | Celery 5 + Redis |
| Database | PostgreSQL + PostGIS (GeoDjango) |
| Auth | Passwordless OTP · Google OAuth · Apple Sign In · JWT (httpOnly cookies) |

---

## Authentication

TravelTogether uses **passwordless authentication only**. No passwords are ever created, stored, or accepted.

### How it works

```
Email OTP flow:
  POST /api/auth/send-otp/    →  email delivered (or silently rate-limited)
  POST /api/auth/verify-otp/  →  JWT cookies set, { is_new_user } returned

Google / Apple:
  POST /api/auth/google/      →  verify id_token server-side → JWT cookies set
  POST /api/auth/apple/       →  verify id_token server-side → JWT cookies set

Session management:
  POST /api/auth/token/refresh/  →  rotate refresh token, reset cookies
  POST /api/auth/logout/         →  clear both cookies
  DELETE /api/auth/account/      →  fresh OTP required, soft-deletes account
```

### Endpoints

| Method | URL | Auth required | Description |
|---|---|---|---|
| POST | `/api/auth/send-otp/` | No | Send 6-digit OTP to email |
| POST | `/api/auth/verify-otp/` | No | Verify OTP, receive JWT cookies |
| POST | `/api/auth/token/refresh/` | No (cookie) | Rotate refresh token |
| POST | `/api/auth/google/` | No | Sign in with Google id_token |
| POST | `/api/auth/apple/` | No | Sign in with Apple id_token |
| POST | `/api/auth/logout/` | No | Clear JWT cookies |
| DELETE | `/api/auth/account/` | Yes | Delete account (OTP confirmation) |

### JWT cookies

Both tokens are set as **httpOnly, SameSite=Lax** cookies — never in the response body.

| Cookie | Lifetime | Purpose |
|---|---|---|
| `access_token` | 15 minutes | Authenticates API requests |
| `refresh_token` | 30 days (rolling) | Issues a new token pair on every refresh |

The custom `CookieJWTAuthentication` class (`apps/users/authentication.py`) reads the access token from the cookie. It falls back to the `Authorization: Bearer` header for Postman/curl testing.

### Persistent sessions (stay logged in)

The refresh token uses a **rolling window**. Every time `POST /api/auth/token/refresh/` is called, a completely new token pair is issued and the 30-day window resets. This means:

- A user who opens the app daily will **never need to log in again**
- A user who goes inactive for exactly 30 days will be prompted to log in
- The frontend axios interceptor should catch `401` responses, silently call `/token/refresh/`, and retry the original request — the user never sees a login screen unless their refresh token has genuinely expired

```
Access token expires  →  frontend calls /token/refresh/  →  new 15min access token
                                                          →  new 30-day refresh token (window resets)

Refresh token expires →  frontend gets 401 with { "detail": "Session expired..." }
                      →  redirect to login
```

### `is_new_user` flag

`verify-otp`, `google/`, and `apple/` all return:
```json
{ "is_new_user": true }
```
when `onboarding_complete` is `False` on the user record. The frontend uses this to route to onboarding vs the main dashboard.

### OTP security

- Codes are **6 digits**, generated with `secrets.randbelow` (cryptographically secure)
- Stored **bcrypt-hashed** — plaintext is never written to the database
- **15-minute TTL** via `expires_at` field
- **Locked after 5 wrong attempts** (`attempt_count` on `EmailVerification`)
- **Rate limited**: max 3 sends per email per 15-minute window, enforced in Redis
- `send-otp` always returns `{ "email_sent": true }` regardless of whether the email exists — **no email enumeration**
- Previous unused OTPs are invalidated when a new one is issued

### Google Sign In

- Frontend passes the Google `id_token` from `@react-native-google-signin/google-signin` or equivalent
- Backend verifies it via Google's `tokeninfo` endpoint (no extra library needed)
- Checks `aud` matches `GOOGLE_CLIENT_ID` and `email_verified` is true
- Creates user on first sign-in; syncs `google_uid` if user already exists via OTP

### Apple Sign In

- Frontend passes the Apple `id_token` — Apple only provides name on the **first** sign-in, so the frontend must also forward `first_name` and `last_name` at that point
- Backend fetches Apple's JWKS from `https://appleid.apple.com/auth/keys` and verifies the RS256 JWT signature
- Checks `iss` = `https://appleid.apple.com` and `aud` = `APPLE_APP_BUNDLE_ID`
- Lookup order: `apple_uid` first, then `email` (handles users who signed up via OTP)

### Account deletion

Requires the authenticated user to provide a fresh OTP sent with `purpose=delete_account`:
1. Call `POST /api/auth/send-otp/` (the frontend must trigger a separate "send deletion code" call — this is not the login OTP)
2. Call `DELETE /api/auth/account/` with `{ "email": "...", "code": "..." }`

The account is **soft-deleted** (`is_active=False`, `deleted_at` set). The `permanent_delete_accounts` Celery task handles final data purge after the grace period.

---

## Environment variables

```env
# Core
SECRET_KEY=
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=postgis://user:pass@localhost:5433/travel_together

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT lifetimes (optional — defaults shown)
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=15
JWT_REFRESH_TOKEN_LIFETIME_DAYS=30

# Email
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Apple Sign In
APPLE_APP_BUNDLE_ID=com.yourcompany.traveltogether

# GeoDjango (Windows only)
GDAL_LIBRARY_PATH=C:\Program Files\PostgreSQL\16\bin\libgdal-35.dll
GEOS_LIBRARY_PATH=C:\Program Files\PostgreSQL\16\bin\libgeos_c.dll
```

---

## Running locally

```bash
# 1. Activate virtualenv
source venv/Scripts/activate        # Windows
source venv/bin/activate            # Mac/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Apply migrations
python manage.py migrate

# 4. Start Django (ASGI via Daphne)
python manage.py runserver

# 5. Start Celery worker (separate terminal)
celery -A config worker -l info

# 6. Start Celery Beat scheduler (separate terminal)
celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

---

## Project structure

```
TravelTogether/
├── apps/
│   ├── users/          # Auth, profiles, settings, emergency contacts
│   ├── trips/          # Trip CRUD, members, itinerary, ratings, incidents
│   ├── chat/           # Conversations, messages, read receipts
│   ├── streaks/        # Geofence-validated video posts
│   ├── polls/          # Yes/No, multiple choice, rating polls
│   ├── safety/         # SOS alerts and actions
│   ├── karma/          # Karma ledger, badges
│   └── notifications/  # Push/in-app notifications
├── consumers/          # WebSocket consumers (location, chat, alerts)
├── tasks/              # Celery tasks (email, sos, karma, recap, cleanup)
└── config/             # Settings, URLs, ASGI
```
