# TravelTogether — Frontend

React + Vite + Tailwind CSS frontend for the TravelTogether group travel app.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | React 19, Vite 7 |
| Styling | Tailwind CSS 4 |
| Routing | React Router DOM 7 |
| HTTP | Axios (with JWT interceptor) |
| Auth | Firebase (Google Sign-In) · Email OTP |
| Maps | Leaflet + React Leaflet |
| Real-time | WebSocket (Django Channels) |
| Notifications | react-hot-toast |
| Icons | Lucide React |

---

## Authentication

TravelTogether uses **passwordless authentication only**.

### Email OTP flow

```
/signup  →  user enters email
         →  POST /api/auth/send-otp/
/verify  →  user enters 6-digit code
         →  POST /api/auth/verify-otp/
         →  JWT tokens stored, user routed to /onboarding or /discover
```

### Google Sign-In flow

```
/signup  →  user clicks "Continue with Google"
         →  Firebase popup opens
         →  id_token sent to POST /api/auth/firebase/
         →  JWT tokens stored, user routed to /onboarding or /discover
```

### Session management

- JWT tokens are stored via `tokenStore` (in-memory + localStorage)
- Axios interceptor automatically calls `POST /api/auth/token/refresh/` on any `401` response and retries the original request — the user never sees a login screen mid-session
- On app load, `AuthContext` checks for a stored token and calls `GET /api/users/me/` to restore the session
- `is_new_user: true` in the auth response routes new users to `/onboarding`, returning users go straight to `/discover`

---

## Pages & Routes

| Route | Auth | Description |
|---|---|---|
| `/` | Public | Landing page |
| `/signup` | Public | Email + Google sign-in |
| `/verify` | Public | OTP verification |
| `/onboarding` | Protected | Profile setup wizard |
| `/discover` | Public (limited) | Browse and search trips |
| `/trip/:tripId` | Public | Shareable public trip page |
| `/dashboard` | Protected | Personal trip dashboard |
| `/group-dashboard/:tripId` | Protected | Group trip dashboard |
| `/trip-welcome` | Protected | Post-join welcome screen |
| `/create-trip` | Protected | Multi-step trip creation |
| `/chat` | Protected | In-app messaging |
| `/profile` | Protected | Own profile page |
| `/profile/:userId` | Protected | Public profile view |
| `/trips/:tripId/rate` | Protected | Rate a completed trip |
| `/settings` | Protected | Account & notification settings |

---

## Project structure

```
src/
├── components/
│   ├── Authentication/     # SignUp, Verify (OTP)
│   ├── LandingPage/        # Marketing landing page
│   ├── Onboarding/
│   │   ├── ProfileSetup/       # Multi-step wizard (photo, bio, trip prefs, emergency contacts)
│   │   └── OnboardingDetails/  # Personal details, nationality, location
│   ├── Discover/           # Trip feed, search, map, trip detail modal
│   ├── Dashboard/          # Personal dashboard, group dashboard, trip welcome
│   ├── CreateTripPage/     # 4-step trip creation wizard
│   ├── Chat/               # Real-time messaging
│   ├── Profile/            # Own profile, public profile
│   ├── Notifications/      # Notification bell, notifications panel
│   ├── Rating/             # Post-trip rating page
│   ├── Settings/           # Account settings
│   └── shared/             # AppNav, MobileBottomNav, ProtectedRoute, GuestDialog, OnboardingGate
├── context/
│   ├── AuthContext.jsx             # Global auth state, login/logout, session restore
│   ├── NotificationsContext.jsx    # WebSocket-powered real-time notifications
│   └── ChatUnreadContext.jsx       # Unread message counts
├── services/
│   ├── api.js              # Axios instance, tokenStore, all API methods
│   └── firebase.js         # Firebase app init, Google auth provider
└── utils/
    └── date.js             # Date formatting helpers
```

---

## Environment variables

Create a `.env` file in the `Travel_Together_Frontend/` directory:

```env
VITE_API_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=1:xxx:web:xxx
```

---

## Running locally

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev
```

The app runs at `http://localhost:5173` by default.

---

## Key implementation notes

### Axios interceptor (`services/api.js`)

Every API call goes through a single Axios instance. A response interceptor catches `401` errors, silently refreshes the token pair, and retries the failed request. If the refresh itself fails (session truly expired), a `tt:session-expired` event is dispatched and `AuthContext` redirects to the landing page.

### OnboardingGate

Wraps protected routes to ensure users who have a valid token but haven't completed onboarding are redirected to `/onboarding` rather than seeing the main app.

### Real-time (WebSocket)

`NotificationsContext` opens a WebSocket to `ws://localhost:8000/ws/notifications/` on login and tears it down on logout. The same pattern is used for chat and live location in the group dashboard.

### Responsive layout

All pages are fully responsive. Mobile users see a bottom navigation bar (`MobileBottomNav`); desktop users see a side navigation (`AppNav`).
