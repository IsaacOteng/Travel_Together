# Travel Together — Frontend Documentation
> For backend developers wiring the Django API to this React frontend.

---

## Table of Contents
1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Routing](#routing)
4. [User Flow](#user-flow)
5. [Shared Components](#shared-components)
6. [Page-by-Page Breakdown](#page-by-page-breakdown)
7. [Data Shapes](#data-shapes)
8. [Backend Wiring Guide](#backend-wiring-guide)
9. [Authentication](#authentication)
10. [API Endpoint Map](#api-endpoint-map)

---

## Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| React | 19 | UI framework |
| Vite | 7 | Build tool / dev server |
| Tailwind CSS | 4 | Styling |
| react-router-dom | 6 | Client-side routing |
| lucide-react | — | Icons |

Dev server runs on `http://localhost:5173`

---

## Project Structure

```
src/
├── App.jsx                          # Route definitions + route wrappers
├── main.jsx                         # Entry point — wraps app in BrowserRouter
├── assets/                          # Static images (logo, signup photo)
├── Globalstyles.css                 # Shared CSS classes (onboarding)
│
└── components/
    ├── shared/
    │   ├── AppNav.jsx               # Top navigation bar (all main-app pages)
    │   └── MobileBottomNav.jsx      # Fixed bottom nav (mobile, all main-app pages)
    │
    ├── LandingPage/
    │   └── LandingPage.jsx
    │
    ├── Authentication/
    │   ├── SignUp.jsx               # Login / Sign up form
    │   └── Verify.jsx               # OTP verification
    │
    ├── Onboarding/
    │   ├── OnboardingDetails/       # Steps 1–3: name, nationality, travel prefs
    │   ├── OnboardingBridge.jsx     # Transition screen between onboarding steps
    │   └── ProfileSetup/            # Avatar, bio, emergency contact
    │
    ├── Discover/
    │   ├── Discover.jsx             # Main feed page
    │   ├── constants.js             # Mock TRIPS + FILTERS arrays
    │   ├── helpers.jsx              # Avatar component
    │   ├── TripFeedCard.jsx         # Desktop trip card
    │   ├── MobileTripCard.jsx       # Mobile trip card
    │   ├── TripDetailModal.jsx      # Desktop trip detail
    │   ├── MobileTripDetail.jsx     # Mobile trip detail
    │   └── ShareToast.jsx           # Share confirmation toast
    │
    ├── Dashboard/
    │   ├── Dashboard.jsx            # My Trips page (joined/saved/created)
    │   ├── GroupDashboard.jsx       # Active trip group view
    │   └── TripWelcome.jsx          # Join request approved screen
    │
    ├── Chat/
    │   └── ChatPage.jsx             # Messaging (DM + group)
    │
    ├── Profile/
    │   └── ProfilePage.jsx          # User profile, badges, trip history
    │
    ├── Settings/
    │   └── SettingsPage.jsx         # Notifications, privacy, SOS, contacts
    │
    └── CreateTripPage/
        ├── CreateTripPage.jsx       # 4-step trip creation wizard
        ├── Step1.jsx                # Cover photos (file upload)
        ├── Step2.jsx                # Title, destination, dates, group size
        ├── Step3.jsx                # Itinerary / stops
        ├── Step4.jsx                # Price, karma, rules — publish
        └── SuccessScreen.jsx        # Post-publish confirmation
```

---

## Routing

All routes are defined in `src/App.jsx`. The app uses `BrowserRouter` (set in `main.jsx`).

| URL | Component | Auth required |
|-----|-----------|---------------|
| `/` | LandingPage | No |
| `/signup` | SignUp | No |
| `/verify` | Verify | No |
| `/onboarding` | OnboardingDetails | No |
| `/onboarding/bridge` | OnboardingBridge | No |
| `/onboarding/profile` | ProfileSetup | No |
| `/discover` | Discover | Yes |
| `/dashboard` | Dashboard | Yes |
| `/chat` | ChatPage | Yes |
| `/profile` | ProfilePage | Yes |
| `/settings` | SettingsPage | Yes |
| `/create-trip` | CreateTripPage | Yes |
| `/group-dashboard` | GroupDashboard | Yes |
| `/trip-welcome` | TripWelcome | Yes |

> **Note:** Auth guards are not yet implemented on routes. Add a `PrivateRoute` wrapper in `App.jsx` that checks for a valid JWT token and redirects to `/signup` if not found.

### Route Wrapper Pattern

Each route in `App.jsx` uses a wrapper function that calls `useNavigate()` and passes callbacks as props:

```jsx
function DiscoverRoute() {
  const nav = useNavigate();
  return <Discover onJoinTrip={() => nav('/trip-welcome')} />;
}
```

This pattern keeps components clean while still allowing navigation to be triggered from within them.

### Cross-Route State

Two pieces of state are currently passed between routes via `sessionStorage`:

| Key | Value | Set in | Read in |
|-----|-------|--------|---------|
| `tt_email` | User's email | `SignUp.jsx` on submit | `Verify.jsx` to display masked email |
| `tt_firstName` | User's first name | `OnboardingDetails` on complete | `OnboardingBridge` for personalised greeting |

**When wiring backend:** replace both with JWT token storage. Store the token in `localStorage` or `httpOnly` cookie on successful verify, then read it from there everywhere.

---

## User Flow

```
Landing Page
    │
    ▼
Sign Up (/signup)
    │  onVerify(email) → stores email in sessionStorage
    ▼
Verify OTP (/verify)
    │  onVerified() → navigate to /onboarding
    ▼
Onboarding Details (/onboarding)   ← 3 steps: name/DOB, nationality, travel prefs
    │  onComplete(firstName) → stores firstName in sessionStorage
    ▼
Onboarding Bridge (/onboarding/bridge)   ← personalised welcome screen
    │  onContinue()
    ▼
Profile Setup (/onboarding/profile)   ← avatar, bio, emergency contact
    │  onComplete()
    ▼
Discover (/discover)   ← main app entry point
```

### Main App Navigation (post-onboarding)

Users move between 3 primary sections via `AppNav` (desktop) and `MobileBottomNav` (mobile):

```
Discover (/discover)
My Trips (/dashboard)
Chat     (/chat)
Profile  ← avatar click on AppNav → /profile
Settings ← settings button on ProfilePage → /settings
```

### Trip Flow

```
Discover → view trip → Send Join Request
    │
    ▼
TripWelcome (/trip-welcome)   ← approval simulation
    │  onEnterDashboard()
    ▼
Dashboard (/dashboard)   ← trip now appears in "Joined" section

Dashboard → Created trip row → Manage
    │
    ▼
GroupDashboard (/group-dashboard)   ← active trip management
```

### Create Trip Flow

```
Discover or Dashboard → FAB button "Create a Trip"
    │
    ▼
CreateTripPage (/create-trip)
    Step 1: Upload cover photos (up to 5, first = cover)
    Step 2: Title, destination, country, dates, group size
    Step 3: Add stops / itinerary
    Step 4: Price, karma requirement, rules → Publish
    │
    ▼
SuccessScreen → onGoToDashboard() → /dashboard
```

---

## Shared Components

### `AppNav.jsx`
**Used by:** Discover, Dashboard, Chat, Profile, Settings, GroupDashboard, CreateTripPage

Props accepted:
```jsx
<AppNav
  showSearch={true}          // shows search bar (Discover only)
  searchQuery={string}       // controlled search value
  onSearch={fn}              // onChange handler
  savedCount={number}        // shows heart badge if > 0, links to /dashboard?s=saved
  rightExtra={<JSX />}       // slot for page-specific buttons (e.g. SOS, Settings)
/>
```

The avatar (top-right) always navigates to `/profile`.
The logo always navigates to `/discover`.
Active tab is detected via `useLocation().pathname`.

---

### `MobileBottomNav.jsx`
**Used by:** All main-app pages on mobile (< 768px)

4 tabs, all use `useNavigate()`:
- Home → `/discover`
- Chat → `/chat`
- My Trips → `/dashboard`
- Profile → `/profile`

Active tab highlighted in orange (`#FF6B35`) based on current pathname.

---

## Page-by-Page Breakdown

### `SignUp.jsx`
- Renders a login/signup form (single form, backend decides new vs returning)
- Props: `onVerify(email)`, `onSignIn()`
- On submit: calls `onVerify(email)` which stores email in sessionStorage and navigates to `/verify`
- **Wire:** `POST /api/auth/signup/` — on success call `onVerify(email)`

---

### `Verify.jsx`
- 6-box OTP input, auto-advances on each digit
- Props: `email`, `onVerified()`, `onBack()`
- **Hardcoded check at line 61** — only `"111111"` passes in dev
- `TODO` comment marks the exact replacement point
- **Wire:** `POST /api/auth/verify/` with `{ email, code }` — on success store JWT and call `onVerified()`

---

### `OnboardingDetails.jsx`
- 3-step form: Step1 (name, DOB), Step2 (nationality, country), Step3 (travel style, preferences)
- All steps share a single `form` state object patched via `patch()` callback
- Props: `onComplete(firstName)`
- **Wire:** `POST /api/users/me/onboarding/` with full form on Step 3 completion

---

### `ProfileSetup.jsx`
- Avatar selection, bio, emergency contact
- Props: `onComplete()`
- **Wire:** `PATCH /api/users/me/` — on success call `onComplete()`

---

### `Discover.jsx`
- Loads trip feed, filter pills, search
- Saved state is local (optimistic) — needs API backing
- Props: `onJoinTrip()` — called from TripDetailModal when user sends join request
- `savedCount` passed to `AppNav` from local state
- **Wire:**
  - `GET /api/trips/?filter=&search=` for feed
  - `POST /api/trips/{id}/save/` + `DELETE /api/trips/{id}/save/` for save toggle
  - `POST /api/trips/{id}/join/` for join request → then call `onJoinTrip()`

---

### `Dashboard.jsx`
- Three trip sections: Joined, Saved, Created
- URL param `?s=joined|saved|created` expands the matching section
- Saved badge in AppNav links to `/dashboard?s=saved`
- Create Trip button navigates to `/create-trip`
- **Wire:**
  - `GET /api/users/me/trips/joined/` → replace `JOINED_TRIPS`
  - `GET /api/users/me/saved-trips/` → replace `SAVED_TRIPS`
  - `GET /api/users/me/trips/created/` → replace `CREATED_TRIPS`
  - `DELETE /api/trips/{id}/save/` for the × unsave button in Saved section
  - `GET /api/users/me/` for the karma ring + stats (`USER`, `KARMA_BREAKDOWN`, `QUICK_STATS`)

---

### `GroupDashboard.jsx`
- Active trip view with: trip header, quick actions, health/checkin, map, itinerary, join requests, members
- SOS overlay triggers an emergency alert (needs real contact/GPS integration)
- Back button (`ArrowLeft`) navigates to `/dashboard`
- Trip Active badge + SOS button injected into AppNav via `rightExtra` prop
- **Wire:**
  - `GET /api/trips/{id}/` for trip details
  - `GET /api/trips/{id}/members/` for member list
  - `GET /api/trips/{id}/itinerary/` for stops
  - `PATCH /api/trips/{id}/members/{userId}/checkin/` for check-in
  - `POST /api/trips/{id}/sos/` for SOS alert

---

### `ChatPage.jsx`
- Responsive: mobile = list/chat toggle view; desktop = 3-pane layout
- Supports both DM and group conversations
- Message types: text, image, audio (audio has play/pause)
- **Wire:**
  - `GET /api/conversations/` for conversation list
  - `GET /api/conversations/{id}/messages/` for messages
  - `POST /api/conversations/{id}/messages/` for sending
  - WebSocket `ws://…/ws/chat/{conversationId}/` for real-time (wire last)

---

### `ProfilePage.jsx`
- Shows karma ring + breakdown, achievement badges, reliability stats, trip history
- Edit Profile modal — `onSave(formData)` updates local state (needs API backing)
- Settings button → `/settings`
- Props: none (uses `useNavigate` internally)
- **Wire:**
  - `GET /api/users/me/` for profile data
  - `GET /api/users/me/badges/` for badges
  - `GET /api/users/me/trips/history/` for past trips
  - `PATCH /api/users/me/` for edit profile save

---

### `SettingsPage.jsx`
- Sections: Profile, Notifications, Location, SOS, Emergency Contacts, Privacy, Account
- Emergency contacts: add/remove via modal
- Delete account modal
- Back button uses `navigate(-1)`
- **Wire:**
  - `GET /api/users/me/settings/` for initial state
  - `PATCH /api/users/me/settings/` for toggle saves
  - `POST /api/users/me/emergency-contacts/` for add contact
  - `DELETE /api/users/me/emergency-contacts/{id}/` for remove
  - `DELETE /api/users/me/` for account deletion

---

### `CreateTripPage.jsx`
- 4-step wizard with shared `form` state
- `patch(fields)` merges partial updates into form
- Step 1: `images[]` — `File` objects from device, previewed with `URL.createObjectURL()`
- Step 4 publish button has `publishing` loading state with `setTimeout` placeholder
- Props: `onClose()`, `onGoToDashboard()`
- **Wire:**
  - `POST /api/trips/` with `multipart/form-data` (images are `File` objects)
  - On success call `onGoToDashboard()`

Form object shape at publish:
```js
{
  images: [File, File, ...],   // max 5, first = cover
  title: string,
  destination: string,
  country: string,
  dateStart: string,
  dateEnd: string,
  groupSize: number,
  stops: [{ name, location, notes, day }],
  price: number,
  karmaRequired: number,
  rules: string,
}
```

---

## Data Shapes

### User (from `/api/users/me/`)
```js
{
  id, name, username, email,
  nationality, city, country,
  bio, avatar_url,
  karma, level,           // level: "Explorer" | "Navigator" | "Legend"
  verified: bool,
  join_date,
  trips_total, trips_completed,
  checkin_rate,           // 0–100
  avg_rating,             // 0–5
  saved_trips_count,      // for AppNav badge
  karma_breakdown: {
    trips_completed, on_time_checkins, group_ratings, streaks
  },
  quick_stats: {
    trips, checkin_rate, streaks, rating
  }
}
```

### Trip (from `/api/trips/`)
```js
{
  id, title, destination, country,
  date_start, date_end, days,
  spots_left, total_spots,
  members_count,
  karma,                  // karma points for joining
  tags: [string],
  chief: { name, avatar_url },
  media: [{ url, type }], // first = cover
  saved: bool,            // per-user, from SavedTrip join
  status: "open" | "full" | "active" | "completed",
  join_status: null | "pending" | "approved" | "rejected"
}
```

### Message (from `/api/conversations/{id}/messages/`)
```js
{
  id, conversation_id,
  sender: { id, name, avatar_url },
  type: "text" | "image" | "audio",
  text: string,
  media_url: string | null,
  duration: number | null,  // audio seconds
  sent_at,
  status: "sent" | "delivered" | "read"
}
```

### Conversation (from `/api/conversations/`)
```js
{
  id,
  type: "group" | "dm",
  name, cover_url,
  last_message: { text, sent_at },
  unread_count,
  participants: [{ id, name }]
}
```

---

## Backend Wiring Guide

### Step 1 — Install axios (or use fetch)
```bash
npm install axios
```

Create `src/api/client.js`:
```js
import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:8000/api',
});

client.interceptors.request.use(config => {
  const token = localStorage.getItem('tt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default client;
```

---

### Step 2 — Wire Auth (start here)

**`Verify.jsx` — line 61, replace the hardcoded check:**

```js
// BEFORE (mock)
if (fullCode !== "111111") { ... }

// AFTER
try {
  const res = await client.post('/auth/verify/', {
    email: email,
    code: fullCode,
  });
  localStorage.setItem('tt_token', res.data.access);
  onVerified();
} catch {
  setError("Incorrect code. Please try again.");
  setIsShaking(true);
  ...
}
```

**`SignUp.jsx` — on form submit:**
```js
const res = await client.post('/auth/signup/', { email, password });
sessionStorage.setItem('tt_email', email);
onVerify(email);
```

---

### Step 3 — Wire the Trip Feed

**`Discover/constants.js`** — currently exports a static `TRIPS` array.

Replace in `Discover.jsx`:
```js
// BEFORE
const [trips, setTrips] = useState(TRIPS);

// AFTER
const [trips, setTrips] = useState([]);
useEffect(() => {
  client.get('/trips/').then(res => setTrips(res.data));
}, []);
```

The `saved` boolean on each trip will come from the API (Django annotates it based on the requesting user's `SavedTrip` records).

---

### Step 4 — Wire Save/Unsave

**`Discover.jsx` — `handleSave` function:**
```js
// BEFORE
const handleSave = id => setTrips(ts => ts.map(t => t.id === id ? { ...t, saved: !t.saved } : t));

// AFTER
const handleSave = async id => {
  const trip = trips.find(t => t.id === id);
  // optimistic update
  setTrips(ts => ts.map(t => t.id === id ? { ...t, saved: !t.saved } : t));
  try {
    if (trip.saved) {
      await client.delete(`/trips/${id}/save/`);
    } else {
      await client.post(`/trips/${id}/save/`);
    }
  } catch {
    // revert on failure
    setTrips(ts => ts.map(t => t.id === id ? { ...t, saved: trip.saved } : t));
  }
};
```

---

### Step 5 — Wire Dashboard Sections

**`Dashboard.jsx`** — replace mock arrays:
```js
const [joinedTrips,  setJoinedTrips]  = useState([]);
const [savedTrips,   setSavedTrips]   = useState([]);
const [createdTrips, setCreatedTrips] = useState([]);
const [user,         setUser]         = useState(null);

useEffect(() => {
  Promise.all([
    client.get('/users/me/'),
    client.get('/users/me/trips/joined/'),
    client.get('/users/me/saved-trips/'),
    client.get('/users/me/trips/created/'),
  ]).then(([u, joined, saved, created]) => {
    setUser(u.data);
    setJoinedTrips(joined.data);
    setSavedTrips(saved.data);
    setCreatedTrips(created.data);
  });
}, []);
```

---

### Step 6 — Wire Create Trip

**`CreateTripPage/Step4.jsx`** — replace the `setTimeout`:
```js
// BEFORE
setTimeout(() => { setPublishing(false); onPublish(); }, 1600);

// AFTER
const formData = new FormData();
form.images.forEach(img => formData.append('images', img));
formData.append('title', form.title);
// ... append all other fields

try {
  await client.post('/trips/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  setPublishing(false);
  onPublish();
} catch (err) {
  setPublishing(false);
  // show error
}
```

---

### Step 7 — Add Route Protection

In `App.jsx`, add a `PrivateRoute` wrapper:

```jsx
function PrivateRoute({ children }) {
  const token = localStorage.getItem('tt_token');
  return token ? children : <Navigate to="/signup" replace />;
}

// Then wrap all post-auth routes:
<Route path="/discover" element={<PrivateRoute><DiscoverRoute /></PrivateRoute>} />
```

---

## Authentication

### JWT Token Flow
```
POST /api/auth/signup/   →  { access, refresh } + user object
POST /api/auth/verify/   →  { access, refresh }  (after OTP)
POST /api/auth/refresh/  →  { access }           (token refresh)
```

Store `access` token in `localStorage` under key `tt_token`.  
The axios interceptor in `client.js` (Step 1 above) attaches it automatically to every request.

### When token expires
Add a response interceptor in `client.js`:
```js
client.interceptors.response.use(
  res => res,
  async err => {
    if (err.response?.status === 401) {
      const refresh = localStorage.getItem('tt_refresh');
      const { data } = await axios.post('/api/auth/refresh/', { refresh });
      localStorage.setItem('tt_token', data.access);
      return client(err.config); // retry original request
    }
    return Promise.reject(err);
  }
);
```

---

## API Endpoint Map

### Auth
| Method | Endpoint | Body | Returns |
|--------|----------|------|---------|
| POST | `/api/auth/signup/` | `{ email, password }` | `{ access, refresh, user }` |
| POST | `/api/auth/verify/` | `{ email, code }` | `{ access, refresh }` |
| POST | `/api/auth/refresh/` | `{ refresh }` | `{ access }` |
| POST | `/api/auth/logout/` | `{ refresh }` | `204` |

### Users
| Method | Endpoint | Body | Returns |
|--------|----------|------|---------|
| GET | `/api/users/me/` | — | User object (full) |
| PATCH | `/api/users/me/` | partial User fields | Updated User |
| PATCH | `/api/users/me/onboarding/` | onboarding form fields | `200` |
| GET | `/api/users/me/badges/` | — | `[Badge]` |
| GET | `/api/users/me/trips/history/` | — | `[Trip]` |
| DELETE | `/api/users/me/` | — | `204` |

### Trips
| Method | Endpoint | Body | Returns |
|--------|----------|------|---------|
| GET | `/api/trips/` | `?filter=&search=` | `[Trip]` |
| POST | `/api/trips/` | `multipart/form-data` | Created Trip |
| GET | `/api/trips/{id}/` | — | Trip (full) |
| POST | `/api/trips/{id}/save/` | — | `201` |
| DELETE | `/api/trips/{id}/save/` | — | `204` |
| POST | `/api/trips/{id}/join/` | — | `{ status: "pending" }` |
| GET | `/api/users/me/trips/joined/` | — | `[Trip]` |
| GET | `/api/users/me/trips/created/` | — | `[Trip]` |
| GET | `/api/users/me/saved-trips/` | — | `[Trip]` |

### Group Dashboard
| Method | Endpoint | Body | Returns |
|--------|----------|------|---------|
| GET | `/api/trips/{id}/members/` | — | `[Member]` |
| GET | `/api/trips/{id}/itinerary/` | — | `[Stop]` |
| PATCH | `/api/trips/{id}/members/{uid}/checkin/` | — | `200` |
| GET | `/api/trips/{id}/requests/` | — | `[JoinRequest]` |
| PATCH | `/api/trips/{id}/requests/{uid}/` | `{ action: "approve"|"reject" }` | `200` |
| POST | `/api/trips/{id}/sos/` | `{ lat, lng, message }` | `201` |

### Chat
| Method | Endpoint | Body | Returns |
|--------|----------|------|---------|
| GET | `/api/conversations/` | — | `[Conversation]` |
| GET | `/api/conversations/{id}/messages/` | — | `[Message]` |
| POST | `/api/conversations/{id}/messages/` | `{ type, text?, media? }` | Created Message |

### Settings / Emergency Contacts
| Method | Endpoint | Body | Returns |
|--------|----------|------|---------|
| GET | `/api/users/me/settings/` | — | Settings object |
| PATCH | `/api/users/me/settings/` | partial settings | Updated |
| POST | `/api/users/me/emergency-contacts/` | `{ name, phone, relationship }` | Created |
| DELETE | `/api/users/me/emergency-contacts/{id}/` | — | `204` |

---

*Document generated for Travel Together v1.0 frontend — April 2026*
