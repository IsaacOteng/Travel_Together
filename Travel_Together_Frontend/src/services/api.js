import axios from "axios";

// ─── Base instance ────────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

// ─── Token storage (localStorage for persistence across refreshes) ────────────

const TOKEN_KEY   = "tt_access";
const REFRESH_KEY = "tt_refresh";

// localStorage stringifies whatever it is given, so a missing token would be
// stored as the literal "undefined" — a truthy value that then looks like a
// valid session forever while failing every request. Read and write through
// these guards so that can't happen.
const _read = (key) => {
  try {
    const v = localStorage.getItem(key);
    return v && v !== "undefined" && v !== "null" ? v : null;
  } catch { return null; }        // private mode / storage disabled
};

export const tokenStore = {
  getAccess:  () => _read(TOKEN_KEY),
  getRefresh: () => _read(REFRESH_KEY),
  set: (a, r) => {
    try {
      if (a) localStorage.setItem(TOKEN_KEY, a);
      // Never overwrite a good refresh token with nothing: a response that
      // omits it would otherwise end the session on the next page load.
      if (r) localStorage.setItem(REFRESH_KEY, r);
    } catch { /* storage unavailable — session lasts this tab only */ }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
    } catch { /* nothing to clear */ }
  },
};

// ─── Request interceptor attach Bearer token ────────────────────────────────

api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Response interceptor auto-refresh on 401 ───────────────────────────────

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
    // Reject silently do NOT dispatch session-expired (would redirect guests).
    const refresh = tokenStore.getRefresh();
    if (!refresh) {
      return Promise.reject(error);
    }

    // Mark it retried BEFORE either path below. A queued request is replayed
    // through api(original) too, so without this its own 401 would come back
    // through this interceptor unmarked and start a second refresh.
    original._retry = true;

    if (_refreshing) {
      // Queue the request until the ongoing refresh resolves
      return new Promise((resolve, reject) => {
        _refreshQueue.push({
          resolve: (token) => { original.headers.Authorization = `Bearer ${token}`; resolve(api(original)); },
          reject,
        });
      });
    }

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
      // Another tab may have rotated the token while this request was in
      // flight, in which case localStorage already holds a working one and
      // this failure is not the user's session ending. Retry once with it.
      const current = tokenStore.getRefresh();
      if (current && current !== refresh) {
        _refreshing = false;
        original._retry = false;
        return api(original);
      }

      // A network failure is not an expired session. Rejecting is right, but
      // wiping the tokens over a dropped connection would sign the user out
      // for being briefly offline, and they'd have to log in again for no
      // reason. Only an actual rejection from the server ends the session.
      const rejectedByServer = refreshError.response?.status === 401;
      _processQueue(refreshError, null);

      if (rejectedByServer) {
        tokenStore.clear();
        window.dispatchEvent(new Event("tt:session-expired"));
      }
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
  // The refresh token must be sent so the server can blacklist it. Without a
  // body, logout clears the browser but leaves the session alive server-side.
  logout:       (refresh)            => api.post("/api/auth/logout/", { refresh }),
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
  depart:         (id)         => api.post(`/api/trips/${id}/depart/`),
  endTrip:        (id)         => api.post(`/api/trips/${id}/end/`),
  itinerary:      (id)         => api.get(`/api/trips/${id}/itinerary/`),
  addStop:        (id, data)   => api.post(`/api/trips/${id}/itinerary/`, data),
  deleteStop:     (id, stopId) => api.delete(`/api/trips/${id}/itinerary/${stopId}/`),
  delete:         (id)         => api.delete(`/api/trips/${id}/`),
  get:            (id)         => api.get(`/api/trips/${id}/`),
  update:         (id, data)   => api.patch(`/api/trips/${id}/`,                data),
  join:           (id)         => api.post(`/api/trips/${id}/join/`),
  leave:          (id)         => api.delete(`/api/trips/${id}/join/`),
  members:        (id)         => api.get(`/api/trips/${id}/members/`),
  approveMember:  (id, userId) => api.patch(`/api/trips/${id}/members/${userId}/`, { action: "approve" }),
  declineMember:  (id, userId) => api.patch(`/api/trips/${id}/members/${userId}/`, { action: "reject" }),
  getRatings:        (id)         => api.get(`/api/trips/${id}/ratings/`),
  submitRating:      (id, data)   => api.post(`/api/trips/${id}/ratings/`,         data),
  fileReport:        (id, data)   => api.post(`/api/trips/${id}/reports/`,         data),
  getTripReports:    (id)         => api.get(`/api/trips/${id}/reports/`),
  respondReport:     (id, reportId, data) => api.post(`/api/trips/${id}/reports/${reportId}/respond/`, data),
  confirmTrip:       (id)         => api.post(`/api/trips/${id}/confirm/`),
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

// ─── Payments (Paystack escrow) ───────────────────────────────────────────────

export const paymentsApi = {
  initiate:        (tripId)    => api.post(`/api/payments/trips/${tripId}/initiate/`),
  verify:          (reference) => api.get(`/api/payments/verify/${reference}/`),
  getPayoutMethod: ()          => api.get("/api/payments/payout-method/"),
  setPayoutMethod: (data)      => api.put("/api/payments/payout-method/", data),
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

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

export const adminApi = {
  getStats:       ()                  => api.get("/api/admin-dashboard/stats/"),
  getUsers:       (params)            => api.get("/api/admin-dashboard/users/",      { params }),
  getUser:        (id)                => api.get(`/api/admin-dashboard/users/${id}/`),
  updateUser:     (id, data)          => api.patch(`/api/admin-dashboard/users/${id}/`, data),
  getTrips:       (params)            => api.get("/api/admin-dashboard/trips/",      { params }),
  updateTrip:     (id, data)          => api.patch(`/api/admin-dashboard/trips/${id}/`, data),
  getSOSAlerts:   (params)            => api.get("/api/admin-dashboard/sos-alerts/", { params }),
  updateSOSAlert: (id, data)          => api.patch(`/api/admin-dashboard/sos-alerts/${id}/`, data),
  getIncidents:   (params)            => api.get("/api/admin-dashboard/incidents/",  { params }),
  updateIncident: (id, data)          => api.patch(`/api/admin-dashboard/incidents/${id}/`, data),
  getLeaderboard: ()                  => api.get("/api/admin-dashboard/leaderboard/"),
  getPayments:    (params)            => api.get("/api/admin-dashboard/payments/",   { params }),
  refundPayment:  (id)                => api.post(`/api/admin-dashboard/payments/${id}/refund/`),
  getPayouts:     (params)            => api.get("/api/admin-dashboard/payouts/",    { params }),
  getPayoutRisks: ()                  => api.get("/api/admin-dashboard/payout-risks/"),
};

export default api;
