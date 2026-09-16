import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Shield, Compass, Plus, X, Loader2,
} from "lucide-react";
import { FILTERS } from './constants.js';
import AppNav from '../shared/AppNav.jsx';
import NotificationBell from '../Notifications/NotificationBell.jsx';
import NotificationsPanel from '../Notifications/NotificationsPanel.jsx';
import GuestDialog from '../shared/GuestDialog.jsx';
import ThemeToggle from '../shared/ThemeToggle.jsx';
import { useNotifications } from '../../context/NotificationsContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api.js';
import { formatDriveTime } from "../../utils/driveTime.js";
import { displayName } from "../../utils/name.js";
import MobileBottomNav from '../shared/MobileBottomNav.jsx';
import TripFeedCard from './TripFeedCard.jsx';
import MobileTripCard from './MobileTripCard.jsx';
import TripCardSkeleton from './TripCardSkeleton.jsx';
import SortMenu from './SortMenu.jsx';
import FeaturedTrip from './FeaturedTrip.jsx';
import SafetyGuideModal from './SafetyGuideModal.jsx';
import { officialLogo } from "../../assets/logos";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
function absUrl(url) {
  if (!url) return url;
  return url.startsWith("/") ? `${API_BASE}${url}` : url;
}

/* ── normalise API trip → component shape ───────────────────── */
function normalise(t) {
  const entryPrice = t.entry_price != null ? parseFloat(t.entry_price) : 0;
  return {
    ...t,
    spotsTotal:   t.spots_total,
    spotsFilled:  (t.spots_total || 0) - (t.spots_left || 0),
    dateStart:    t.date_start,
    dateEnd:      t.date_end,
    entryPrice,
    price:        entryPrice,   // legacy alias
    karma:        t.group_karma ?? 0,
    saved:        t.is_saved    ?? false,
    media:        t.images?.length
                    ? t.images.map(img => ({ type: "image", url: absUrl(img.image_url ?? img.url) })).filter(img => img.url)
                    : t.cover_image
                    ? [{ type: "image", url: absUrl(t.cover_image) }]
                    : [],
    chief: {
      id:         t.chief_id,
      name:       displayName({ first_name: t.chief_first_name, last_name: t.chief_last_name }, "Organiser"),
      username:   t.chief_username || "",
      avatarUrl:  absUrl(t.chief_avatar_url) || null,
      trips:      t.chief_trip_count ?? 0,
      rating:     t.chief_rating     ?? 0,
      karma:      t.chief_karma      ?? 0,
    },
    membersPreview: (t.members_preview || []).map(m => ({
      id:        m.user_id,
      username:  m.username,
      first_name: m.first_name,
      last_name:  m.last_name,
      avatar_url: absUrl(m.avatar_url) || null,
    })),
    tags:         t.tags || [],
    meetingPlace: t.meeting_point || t.meetingPlace || t.meeting_place || "",
    drive:        formatDriveTime(t.drive_time || t.drive),
    distance:     t.distance_km   ? `${t.distance_km} km` : "",
    mapCoords:    (t.destination_lat && t.destination_lng)
                    ? { lat: t.destination_lat, lng: t.destination_lng }
                    : (t.latitude && t.longitude)
                    ? { lat: parseFloat(t.latitude), lng: parseFloat(t.longitude) }
                    : null,
  };
}

const SORTS = [
  { id: "soonest",  label: "Leaving soonest" },
  { id: "price",    label: "Lowest price"    },
  { id: "spots",    label: "Most spots left" },
  { id: "rated",    label: "Top organisers"  },
];

export default function Discover() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { unreadCount, resetUnread } = useNotifications();
  const [trips,        setTrips]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [searching,    setSearching]    = useState(false);
  const [error,        setError]        = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery,  setSearchQuery]  = useState("");
  const [showNotifs,   setShowNotifs]   = useState(false);
  const [guestDialog,  setGuestDialog]  = useState({ open: false, reason: "" });
  const [showSafety,   setShowSafety]   = useState(false);
  const [sortBy,       setSortBy]       = useState("soonest");

  const [winW, setWinW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);

  useEffect(() => {
    const onResize = () => setWinW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* ── fetch public trips (re-runs when search query changes) ── */
  const debounceRef = useRef(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    const isInitial = isFirstLoad.current;
    const delay = isInitial ? 0 : 350;
    debounceRef.current = setTimeout(async () => {
      if (isInitial) setLoading(true); else setSearching(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.set("q", searchQuery.trim());
        const { data } = await api.get(`/api/public/trips/?${params}`);
        const results = data.results ?? data;
        setTrips(results.map(normalise));
      } catch {
        setError("Couldn't load trips. Check your connection and try again.");
      } finally {
        if (isInitial) { setLoading(false); isFirstLoad.current = false; }
        else setSearching(false);
      }
    }, delay);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  const mobile = winW < 768;

  const requireAuth = (reason, fn) => {
    if (!user) { setGuestDialog({ open: true, reason }); return; }
    fn();
  };

  const handleSave = async (id) => {
    if (!user) { setGuestDialog({ open: true, reason: "Save trips you're interested in" }); return; }
    setTrips(ts => ts.map(t => t.id === id ? { ...t, saved: !t.saved } : t));
    try {
      const trip = trips.find(t => t.id === id);
      if (trip?.saved) {
        await api.delete(`/api/trips/${id}/save/`);
      } else {
        await api.post(`/api/trips/${id}/save/`);
      }
    } catch {
      setTrips(ts => ts.map(t => t.id === id ? { ...t, saved: !t.saved } : t));
    }
  };

  const handleView = trip => navigate(`/trip/${trip.id}`);

  const ts = (d) => { const n = new Date(d).getTime(); return Number.isNaN(n) ? Infinity : n; };

  const sortTrips = (list) => [...list].sort((a, b) => {
    switch (sortBy) {
      case "price":  return a.entryPrice - b.entryPrice;
      case "spots":  return (b.spotsTotal - b.spotsFilled) - (a.spotsTotal - a.spotsFilled);
      case "rated":  return (b.chief.rating ?? 0) - (a.chief.rating ?? 0);
      default:       return ts(a.dateStart) - ts(b.dateStart);
    }
  });

  const open = trips.filter(t => t.status !== "completed");
  const filtered = sortTrips(open.filter(t =>
    activeFilter === "All" || t.tags.some(tag => tag.toLowerCase() === activeFilter.toLowerCase())
  ));
  const savedCount = trips.filter(t => t.saved).length;

  /* Featured slot only makes sense on the unfiltered view, and only when
     there is more than one trip to choose between. */
  const featured = (!isFilteringNow() && filtered.length > 1)
    ? [...open].sort((a, b) => ts(a.dateStart) - ts(b.dateStart))[0]
    : null;
  const gridTrips = featured ? filtered.filter(t => t.id !== featured.id) : filtered;

  function isFilteringNow() {
    return activeFilter !== "All" || searchQuery.trim() !== "";
  }

  const clearAll = () => { setSearchQuery(""); setActiveFilter("All"); };
  const isFiltering = isFilteringNow();

  /* ── empty state, shared by both breakpoints ─────────────── */
  const emptyState = (
    <div className="flex flex-col items-center px-6 py-24 text-center">
      <Compass size={34} className="text-ink-mute" strokeWidth={1.5} />
      <p className="mt-5 font-display text-[21px] font-semibold text-ink">
        No trips match that
      </p>
      <p className="mt-2 max-w-[34ch] text-[14px] leading-relaxed text-ink-soft">
        {isFiltering
          ? "Try a different filter, or widen your search."
          : "There are no trips listed yet. Be the first to organise one."}
      </p>
      {isFiltering ? (
        <button
          onClick={clearAll}
          className="mt-6 cursor-pointer rounded-full border border-line bg-surface px-5 py-2.5 text-[14px] font-medium text-ink transition-colors hover:border-accent hover:text-accent"
        >
          Clear filters
        </button>
      ) : (
        <button
          onClick={() => requireAuth("Create and organise your own trip", () => navigate('/create-trip'))}
          className="mt-6 cursor-pointer rounded-full border-none bg-accent px-5 py-2.5 text-[14px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
        >
          Create a trip
        </button>
      )}
    </div>
  );

  const errorState = (
    <div className="flex flex-col items-center px-6 py-24 text-center">
      <p className="font-display text-[21px] font-semibold text-ink">
        Something went wrong
      </p>
      <p className="mt-2 max-w-[34ch] text-[14px] leading-relaxed text-ink-soft">{error}</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-6 cursor-pointer rounded-full border-none bg-accent px-5 py-2.5 text-[14px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
      >
        Try again
      </button>
    </div>
  );

  /* ── filter chips, shared ────────────────────────────────── */
  const filterChips = (
    <>
      {FILTERS.map(f => (
        <button
          key={f}
          onClick={() => setActiveFilter(f)}
          aria-pressed={activeFilter === f}
          className={`shrink-0 cursor-pointer rounded-full border px-4 py-1.5 text-[13px] transition-colors ${
            activeFilter === f
              ? "border-accent bg-accent font-semibold text-accent-ink"
              : "border-line bg-surface font-medium text-ink-soft hover:border-accent hover:text-accent"
          }`}
        >
          {f}
        </button>
      ))}
    </>
  );

  /* ── MOBILE ──────────────────────────────────────────────── */
  if (mobile) {
    return (
      <div className="flex min-h-screen flex-col bg-ground font-sans">
        <header className="sticky top-0 z-100 border-b border-line bg-ground/95 px-3.5 py-3 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <img
              src={officialLogo}
              alt="Travel Together"
              className="h-9 w-9 shrink-0"
              onError={e => { e.target.style.display = "none"; }}
            />
            <div className="relative flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute"
              />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search trips, places…"
                aria-label="Search trips"
                className="w-full rounded-full border border-line bg-surface py-2.5 pl-10 pr-9 text-[13.5px] text-ink outline-none placeholder:text-ink-mute focus:border-accent"
              />
              {searching && (
                <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-accent" />
              )}
              {!searching && searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 flex -translate-y-1/2 cursor-pointer items-center border-none bg-transparent p-0 text-ink-mute"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <ThemeToggle />
            <NotificationBell
              count={user ? unreadCount : 0}
              onClick={() => requireAuth("View notifications", () => setShowNotifs(true))}
            />
          </div>
        </header>
        <NotificationsPanel open={showNotifs} onClose={() => { setShowNotifs(false); resetUnread(); }} />

        <div className="scrollbar-none flex shrink-0 gap-2 overflow-x-auto border-b border-line px-3.5 py-3">
          {filterChips}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-3.5 py-2.5">
          <span className="text-[12.5px] text-ink-mute">
            {searching ? "Searching…" : `${filtered.length} trip${filtered.length !== 1 ? "s" : ""}`}
          </span>
          <SortMenu options={SORTS} value={sortBy} onChange={setSortBy} compact />
        </div>

        <div className="flex-1 overflow-y-auto pb-[88px] pt-1">
          {loading ? (
            <div className="px-3.5 pt-3">
              {[0, 1].map(i => <div key={i} className="mb-3"><TripCardSkeleton /></div>)}
            </div>
          ) : error ? errorState
            : filtered.length === 0 ? emptyState
            : filtered.map((trip, i) => (
                <div key={trip.id} style={{ animation: `ttFadeUp .35s ease ${i * 0.05}s both` }}>
                  <MobileTripCard trip={trip} onView={handleView} onSave={handleSave} />
                </div>
              ))}
        </div>

        <MobileBottomNav />

        <button
          onClick={() => requireAuth("Create and organise your own trip", () => navigate('/create-trip'))}
          aria-label="Create a trip"
          className="fixed bottom-[74px] right-4 z-150 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-none bg-accent text-accent-ink shadow-[0_8px_24px_var(--tt-shadow-lg)]"
        >
          <Plus size={24} strokeWidth={2.2} />
        </button>

        <GuestDialog
          open={guestDialog.open}
          reason={guestDialog.reason}
          onClose={() => setGuestDialog({ open: false, reason: "" })}
          onSignUp={() => navigate('/signup')}
        />
      </div>
    );
  }

  /* ── DESKTOP ─────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-ground font-sans">
      <AppNav
        showSearch
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        savedCount={savedCount}
      />

      {/* Working toolbar, not a marketing hero. This is a signed-in app screen:
          the job here is to search, filter and sort — so those get the space. */}
      <div className="border-b border-line bg-ground-alt">
        <div className="tt-shell block py-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search
                size={17}
                className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-ink-mute"
              />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Where do you want to go?"
                aria-label="Search trips and destinations"
                className="w-full rounded-full border border-line bg-surface py-3.5 pl-13 pr-11 text-[15px] text-ink outline-none transition-colors placeholder:text-ink-mute focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
              {searching && (
                <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-accent" />
              )}
              {!searching && searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-4 top-1/2 flex -translate-y-1/2 cursor-pointer items-center border-none bg-transparent p-0 text-ink-mute hover:text-ink"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <button
              onClick={() => requireAuth("Create and organise your own trip", () => navigate('/create-trip'))}
              className="flex cursor-pointer items-center gap-2 rounded-full border-none bg-accent px-6 py-3.5 text-[14.5px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
            >
              <Plus size={17} strokeWidth={2.2} /> Create a trip
            </button>
            <button
              onClick={() => setShowSafety(true)}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-5 py-3.5 text-[14px] font-medium text-ink transition-colors hover:border-accent hover:text-accent"
            >
              <Shield size={15} /> Safety
            </button>
          </div>
        </div>
      </div>

      {/* filters + sort stick under the nav */}
      <div className="sticky top-18 z-40 border-b border-line bg-ground">
        <div className="tt-shell flex items-center gap-3 py-3.5">
          <div className="scrollbar-none flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
            {filterChips}
          </div>

          <div className="flex shrink-0 items-center gap-3 pl-2">
            <span className="hidden text-[13px] text-ink-mute sm:inline">
              {searching ? "Searching…" : `${filtered.length} trip${filtered.length !== 1 ? "s" : ""}`}
            </span>
            <SortMenu options={SORTS} value={sortBy} onChange={setSortBy} />
          </div>
        </div>
      </div>

      <div className="tt-shell py-8">
        {loading ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-3 xl:grid-cols-4">
            {[0, 1, 2, 3, 4, 5, 6, 7].map(i => <TripCardSkeleton key={i} />)}
          </div>
        ) : error ? errorState
          : filtered.length === 0 ? emptyState
          : (
            <>
              {featured && (
                <div className="mb-10" style={{ animation: "ttFadeUp .35s ease both" }}>
                  <FeaturedTrip trip={featured} onView={handleView} onSave={handleSave} />
                </div>
              )}

              {featured && (
                <div className="mb-6 flex items-center gap-4">
                  <h2 className="font-display text-[19px] font-semibold text-ink">
                    Everything else
                  </h2>
                  <span className="h-px flex-1 bg-line" aria-hidden="true" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-3 xl:grid-cols-4">
                {gridTrips.map((trip, i) => (
                  <div key={trip.id} style={{ animation: `ttFadeUp .35s ease ${Math.min(i, 8) * 0.05}s both` }}>
                    <TripFeedCard trip={trip} onView={handleView} onSave={handleSave} />
                  </div>
                ))}
              </div>
            </>
          )}
      </div>

      <GuestDialog
        open={guestDialog.open}
        reason={guestDialog.reason}
        onClose={() => setGuestDialog({ open: false, reason: "" })}
        onSignUp={() => navigate('/signup')}
      />

      <SafetyGuideModal open={showSafety} onClose={() => setShowSafety(false)} />
    </div>
  );
}
