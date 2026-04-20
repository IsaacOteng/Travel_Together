import axios from "axios";

// ─── Base instance ────────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

// ─── Token storage (localStorage for persistence across refreshes) ────────────

const TOKEN_KEY   = "tt_access";
const REFRESH_KEY = "tt_refresh";

export const tokenStore = {
  getAccess:      ()      => localStorage.getItem(TOKEN_KEY),
  getRefresh:     ()      => localStorage.getItem(REFRESH_KEY),
  set:            (a, r)  => { localStorage.setItem(TOKEN_KEY, a); localStorage.setItem(REFRESH_KEY, r); },
  clear:          ()      => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(REFRESH_KEY); },
};

// ─── Request interceptor — attach Bearer token ────────────────────────────────

api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Response interceptor — auto-refresh on 401 ───────────────────────────────

let _refreshing   = false;
let _refreshQueue = [];

const _processQueue = (error, token = null) => {
  _refreshQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  _refreshQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    // Only intercept 401s that haven't already been retried
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // No refresh token means the user is a guest or already logged out.
    // Reject silently — do NOT dispatch session-expired (would redirect guests).
    const refresh = tokenStore.getRefresh();
    if (!refresh) {
      return Promise.reject(error);
    }

    if (_refreshing) {
      // Queue the request until the ongoing refresh resolves
      return new Promise((resolve, reject) => {
        _refreshQueue.push({
          resolve: (token) => { original.headers.Authorization = `Bearer ${token}`; resolve(api(original)); },
          reject,
        });
      });
    }

    original._retry = true;
    _refreshing = true;

    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/auth/token/refresh/`,
        { refresh },
      );

      tokenStore.set(data.access, data.refresh);
      api.defaults.headers.common.Authorization = `Bearer ${data.access}`;
      _processQueue(null, data.access);

      original.headers.Authorization = `Bearer ${data.access}`;
      return api(original);
    } catch (refreshError) {
      _processQueue(refreshError, null);
      tokenStore.clear();
      // Authenticated user's session genuinely expired — let the app know
      window.dispatchEvent(new Event("tt:session-expired"));
      return Promise.reject(refreshError);
    } finally {
      _refreshing = false;
    }
  },
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  sendOtp:      (email)              => api.post("/api/auth/send-otp/",        { email }),
  verifyOtp:    (email, code)        => api.post("/api/auth/verify-otp/",      { email, code }),
  refreshToken: (refresh)            => api.post("/api/auth/token/refresh/",   { refresh }),
  logout:       ()                   => api.post("/api/auth/logout/"),
  firebaseAuth: (id_token)            => api.post("/api/auth/firebase/",        { id_token }),
  googleAuth:   (id_token)           => api.post("/api/auth/google/",          { id_token }),
  appleAuth:    (id_token, first_name, last_name) =>
                                        api.post("/api/auth/apple/",           { id_token, first_name, last_name }),
  checkUsername:(username)           => api.get("/api/auth/check-username/",   { params: { username } }),
  deleteAccount:()                   => api.delete("/api/auth/account/"),
};

// ─── Users / Profile ──────────────────────────────────────────────────────────

export const usersApi = {
  getMe:              ()       => api.get("/api/users/me/"),
  updateMe:           (data)   => api.patch("/api/users/me/", data),
  onboardingStep:     (data)   => api.patch("/api/users/me/profile/", data),
  getPublicProfile:   (id)     => api.get(`/api/users/${id}/`),
  getMyStats:         ()       => api.get("/api/users/me/stats/"),
  getMyTrips:         ()       => api.get("/api/users/me/trips/"),
  getPreferences:     ()       => api.get("/api/users/me/preferences/"),
  updatePreferences:  (data)   => api.patch("/api/users/me/preferences/", data),
  getSettings:        ()       => api.get("/api/users/me/settings/"),
  updateSettings:     (data)   => api.patch("/api/users/me/settings/", data),

  // Emergency contacts
  getContacts:        ()             => api.get("/api/users/me/emergency-contacts/"),
  addContact:         (data)         => api.post("/api/users/me/emergency-contacts/", data),
  updateContact:      (id, data)     => api.patch(`/api/users/me/emergency-contacts/${id}/`, data),
  deleteContact:      (id)           => api.delete(`/api/users/me/emergency-contacts/${id}/`),
};

// ─── Karma / Badges ───────────────────────────────────────────────────────────

export const karmaApi = {
  getMyKarma:     ()  => api.get("/api/karma/"),
  getMyBadges:    ()  => api.get("/api/karma/badges/"),
  getAllBadges:    ()  => api.get("/api/karma/badges/all/"),  // catalogue with earned flag
  getLeaderboard: ()  => api.get("/api/karma/leaderboard/"),
};

// ─── Trips ────────────────────────────────────────────────────────────────────

export const tripsApi = {
  list:           (params)     => api.get("/api/trips/",                        { params }),
  saved:          ()           => api.get("/api/trips/saved/"),
  unsave:         (id)         => api.delete(`/api/trips/${id}/save/`),
  create:         (data)       => api.post("/api/trips/",                       data),
  publish:        (id)         => api.post(`/api/trips/${id}/publish/`),
  endTrip:        (id)         => api.post(`/api/trips/${id}/end/`),
  itinerary:      (id)         => api.get(`/api/trips/${id}/itinerary/`),
  addStop:        (id, data)   => api.post(`/api/trips/${id}/itinerary/`, data),
  deleteStop:     (id, stopId) => api.delete(`/api/trips/${id}/itinerary/${stopId}/`),
  delete:         (id)         => api.delete(`/api/trips/${id}/`),
  get:            (id)         => api.get(`/api/trips/${id}/`),
  update:         (id, data)   => api.patch(`/api/trips/${id}/`,                data),
  join:           (id)         => api.post(`/api/trips/${id}/join/`),
  members:        (id)         => api.get(`/api/trips/${id}/members/`),
  approveMember:  (id, userId) => api.patch(`/api/trips/${id}/members/${userId}/`, { action: "approve" }),
  declineMember:  (id, userId) => api.patch(`/api/trips/${id}/members/${userId}/`, { action: "reject" }),
  getRatings:        (id)         => api.get(`/api/trips/${id}/ratings/`),
  submitRating:      (id, data)   => api.post(`/api/trips/${id}/ratings/`,         data),
  fileReport:        (id, data)   => api.post(`/api/trips/${id}/reports/`,         data),
  groupConversation: (id)         => api.get(`/api/trips/${id}/conversation/`),
  triggerSOS:        (id, data)   => api.post(`/api/trips/${id}/sos/`, data),
  checkin:           (id, data)   => api.post(`/api/trips/${id}/checkin/`, data),
  getCheckins:       (id)         => api.get(`/api/trips/${id}/checkin/`),
  uploadImages:      (id, files)  => {
    const fd = new FormData();
    files.forEach(f => fd.append("images", f));
    return api.post(`/api/trips/${id}/images/`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// ─── Polls ────────────────────────────────────────────────────────────────────

export const pollsApi = {
  list:   (tripId)           => api.get(`/api/trips/${tripId}/polls/`),
  create: (tripId, data)     => api.post(`/api/trips/${tripId}/polls/`,            data),
  vote:   (tripId, pollId, data) => api.post(`/api/trips/${tripId}/polls/${pollId}/vote/`, data),
  lock:   (tripId, pollId)   => api.post(`/api/trips/${tripId}/polls/${pollId}/lock/`),
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const notificationsApi = {
  list:       (params)  => api.get("/api/notifications/",           { params }),
  markRead:   (id)      => api.patch(`/api/notifications/${id}/`),
  markAllRead:()        => api.post("/api/notifications/mark-all-read/"),
};

// ─── Chat / Conversations ─────────────────────────────────────────────────────

export const chatApi = {
  list:        ()               => api.get("/api/conversations/"),
  get:         (id)             => api.get(`/api/conversations/${id}/`),
  messages:    (id, params)     => api.get(`/api/conversations/${id}/messages/`, { params }),
  sendMessage:   (id, data)       => api.post(`/api/conversations/${id}/messages/`, data),
  deleteMessage: (id, msgId)     => api.delete(`/api/conversations/${id}/messages/${msgId}/`),
  markRead:      (id)            => api.post(`/api/conversations/${id}/read/`),
  startDM:       (userId)        => api.post("/api/conversations/", { user_id: userId }),
  uploadMedia:   (id, file)      => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post(`/api/conversations/${id}/upload/`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

export default api;
