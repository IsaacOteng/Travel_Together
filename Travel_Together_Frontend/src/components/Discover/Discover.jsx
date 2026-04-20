import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { fmtDate } from "../../utils/date.js";
import {
  MapPin, Search, Share2, ChevronRight,
  Users, Calendar, Filter, Shield,
  Car, Compass, TrendingUp,
  Heart, Plus,
} from "lucide-react";
import { FILTERS } from './constants.js';
import AppNav from '../shared/AppNav.jsx';
import NotificationBell from '../Notifications/NotificationBell.jsx';
import NotificationsPanel from '../Notifications/NotificationsPanel.jsx';
import GuestDialog from '../shared/GuestDialog.jsx';
import { useNotifications } from '../../context/NotificationsContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api.js';

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
      name:       [t.chief_first_name, t.chief_last_name].filter(Boolean).join(" ") || t.chief_username || "Organiser",
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
    drive:        t.drive_time    || t.drive        || "",
    distance:     t.distance_km   ? `${t.distance_km} km` : "",
    mapCoords:    (t.destination_lat && t.destination_lng)
                    ? { lat: t.destination_lat, lng: t.destination_lng }
                    : (t.latitude && t.longitude)
                    ? { lat: parseFloat(t.latitude), lng: parseFloat(t.longitude) }
                    : null,
  };
}
import MobileBottomNav from '../shared/MobileBottomNav.jsx';
import TripFeedCard from './TripFeedCard.jsx';
import MobileTripCard from './MobileTripCard.jsx';

export default function Discover({ onJoinTrip }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { unreadCount, resetUnread } = useNotifications();
  const [trips,        setTrips]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [searching,    setSearching]    = useState(false);
  const [error,        setError]        = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery,  setSearchQuery]  = useState("");
  const [mobileTab,    setMobileTab]    = useState("home");
  const [showNotifs,   setShowNotifs]   = useState(false);
  const [searchFocused,setSearchFocused]= useState(false);
  const [guestDialog,  setGuestDialog]  = useState({ open: false, reason: "" });

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
        setError("Couldn't load trips. Pull to refresh.");
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

  const filtered = trips.filter(t => {
    if (t.status === "completed") return false;
    return activeFilter === "All" || t.tags.some(tag => tag.toLowerCase() === activeFilter.toLowerCase());
  });
  const savedCount = trips.filter(t => t.saved).length;

  /* ── loading / error overlay ─────────────────────────────── */
  if (loading) return (
    <div className="min-h-screen bg-[#071422] flex items-center justify-center">
      <div style={{ width:36, height:36, borderRadius:"50%", border:"3px solid rgba(255,107,53,0.2)", borderTopColor:"#FF6B35", animation:"spin .7s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (error) return (
    <div className="min-h-screen bg-[#071422] flex flex-col items-center justify-center gap-3">
      <p className="text-white/40 text-[14px]">{error}</p>
      <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-xl bg-[#FF6B35] text-white text-[13px] font-semibold cursor-pointer">Retry</button>
    </div>
  );

  /* ── MOBILE ── */
  if (mobile) {
    return (
      <div className="min-h-screen bg-[#071422] font-sans tracking-normal flex flex-col">
        <style>{`
          @keyframes slideUp   { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
          @keyframes slideInUp { from{opacity:0;transform:translateY(100%)} to{opacity:1;transform:translateY(0)} }
          @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
          * { -webkit-tap-highlight-color: transparent; }
          ::-webkit-scrollbar { display: none; }
        `}</style>

        <header className="sticky top-0 z-[100] bg-[rgba(7,20,34,0.96)] backdrop-blur-xl border-b border-white/[0.06] px-3.5 py-3">
          <div className="flex items-center gap-2.5">
            <img
              src="/src/assets/official_logo_nobg.png"
              alt="Travel Together"
              className="w-9 h-9 flex-shrink-0"
              onError={e => { e.target.style.display = "none"; }}
            />
            <div className="relative flex-1">
              <Search size={14} className="absolute left-[11px] top-1/2 -translate-y-1/2 text-white/35 pointer-events-none" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search trips, places…"
                className="w-full bg-white/[0.08] border border-white/10 rounded-3xl py-[9px] pr-3.5 pl-[34px] text-[13px] text-white outline-none box-border"
              />
              {searching && (
                <div className="absolute right-[11px] top-1/2 -translate-y-1/2"
                  style={{ width:13, height:13, borderRadius:"50%", border:"2px solid rgba(255,107,53,0.25)", borderTopColor:"#FF6B35", animation:"spin .7s linear infinite" }}
                />
              )}
            </div>
            <NotificationBell
              count={unreadCount}
              onClick={() => requireAuth("View notifications", () => setShowNotifs(true))}
            />
          </div>
        </header>
        <NotificationsPanel open={showNotifs} onClose={() => { setShowNotifs(false); resetUnread(); }} />

        <div className="flex gap-2 px-3.5 py-2.5 overflow-x-auto scrollbar-none bg-[rgba(7,20,34,0.5)] border-b border-white/[0.04] flex-shrink-0">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className="px-3.5 py-1.5 rounded-full text-[12px] cursor-pointer flex-shrink-0 transition-all duration-150 font-medium"
              style={{
                border: `1px solid ${activeFilter === f ? "#FF6B35" : "rgba(255,255,255,0.08)"}`,
                background: activeFilter === f ? "#FF6B35" : "rgba(255,255,255,0.07)",
                color: activeFilter === f ? "#fff" : "rgba(255,255,255,0.5)",
                fontWeight: activeFilter === f ? 700 : 500,
              }}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pt-1 pb-[88px]">
          {filtered.map((trip, i) => (
            <div key={trip.id} style={{ animation: `slideUp .3s ease ${i * 0.05}s both` }}>
              <MobileTripCard trip={trip} onView={handleView} onSave={handleSave} />
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-20 px-5 text-white/30">
              <Compass size={36} className="mb-3.5 opacity-30 mx-auto" />
              <p className="text-sm m-0">No trips found</p>
            </div>
          )}
        </div>

        <MobileBottomNav />

        {/* FAB — create trip */}
        <button
          onClick={() => requireAuth("Create and organise your own trip", () => navigate('/create-trip'))}
          className="fixed bottom-[74px] right-4 z-[150] w-14 h-14 rounded-full border-none cursor-pointer flex items-center justify-center shadow-lg"
          style={{ background: "linear-gradient(135deg,#FF6B35,#ff8c5a)", boxShadow: "0 4px 20px rgba(255,107,53,0.5)" }}
        >
          <Plus size={24} color="#fff" strokeWidth={2.5} />
        </button>

        <GuestDialog
          open={guestDialog.open}
          reason={guestDialog.reason}
          onClose={() => setGuestDialog({ open: false, reason: "" })}
        />
      </div>
    );
  }

  /* ── DESKTOP ── */
  return (
    <div className="min-h-screen bg-[#071422] font-sans tracking-normal">
      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }
        @keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        .ttf:hover { background: rgba(255,107,53,0.15) !important; border-color: rgba(255,107,53,0.4) !important; color: #FF6B35 !important; }
      `}</style>

      <AppNav
        showSearch
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        savedCount={savedCount}
      />

      <div
        className="px-8 pt-12 pb-8 border-b border-white/[0.04]"
        style={{ background: "linear-gradient(180deg,rgba(255,107,53,0.05) 0%,transparent 100%)" }}
      >
        <p className="m-0 mb-1.5 text-[12px] text-[rgba(255,107,53,0.8)] font-bold tracking-[0.1em] uppercase">✦ Discover</p>
        <h1 className="m-0 mb-2 text-[22px] font-semibold text-white font-serif tracking-[-0.4px] leading-[1.25]">
          Find your next <span className="text-[#FF6B35]">travel group</span>
        </h1>
        <p className="m-0 text-[13px] text-white/45 leading-[1.6]">Join real trips, meet verified travelers, travel safer together.</p>
      </div>

      <div className="px-8 py-4 border-b border-white/[0.05] flex items-center gap-2.5 overflow-x-auto scrollbar-none">
        <Filter size={14} color="rgba(255,255,255,0.3)" className="flex-shrink-0" />
        {FILTERS.map(f => (
          <button
            key={f}
            className="ttf px-4 py-[7px] rounded-full flex-shrink-0 text-[12px] cursor-pointer transition-all duration-150"
            onClick={() => setActiveFilter(f)}
            style={{
              background: activeFilter === f ? "#FF6B35" : "rgba(255,255,255,0.06)",
              color: activeFilter === f ? "#fff" : "rgba(255,255,255,0.5)",
              fontWeight: activeFilter === f ? 700 : 500,
              border: `1.5px solid ${activeFilter === f ? "#FF6B35" : "rgba(255,255,255,0.08)"}`,
              boxShadow: activeFilter === f ? "0 4px 12px rgba(255,107,53,.25)" : "none",
            }}
          >
            {f}
          </button>
        ))}
        <div className="ml-auto text-[12px] text-white/30 flex-shrink-0">
          {filtered.length} trip{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="flex gap-7 max-w-[1280px] mx-auto px-8 py-7">
        <div className="flex-1 min-w-0">
          {filtered.length === 0 ? (
            <div className="text-center py-20 px-5 text-white/30">
              <Compass size={40} className="mb-4 opacity-30 mx-auto" />
              <p className="text-base m-0">No trips match your search</p>
            </div>
          ) : (
            <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))" }}>
              {filtered.map((trip, i) => (
                <div key={trip.id} style={{ animation: `slideUp .3s ease ${i * 0.06}s both` }}>
                  <TripFeedCard trip={trip} onView={handleView} onSave={handleSave} />
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="w-[260px] flex-shrink-0 flex flex-col gap-4">
          {/* trending */}
          <div className="bg-white/[0.04] rounded-[18px] border border-white/[0.07] p-[18px]">
            <div className="text-[10px] font-bold tracking-[0.08em] uppercase text-white/30 mb-3.5">Trending this week</div>
            {trips.slice().sort((a, b) => b.karma - a.karma).slice(0, 3).map((t, i) => (
              <div
                key={t.id}
                onClick={() => handleView(t)}
                className="flex gap-2.5 items-center cursor-pointer px-2 py-1.5 rounded-[10px] transition-colors duration-150 hover:bg-white/5"
                style={{ marginBottom: i < 2 ? 12 : 0 }}
              >
                <span className="text-lg font-extrabold text-[rgba(255,107,53,0.4)] w-[22px] text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-white/80 overflow-hidden text-ellipsis whitespace-nowrap">{t.title}</div>
                  <div className="text-[10px] text-white/35 mt-[1px]">{fmtDate(t.dateStart)}</div>
                </div>
                <ChevronRight size={13} color="rgba(255,255,255,0.2)" />
              </div>
            ))}
          </div>

          {/* safety */}
          <div
            className="rounded-[18px] border border-[rgba(30,90,160,0.3)] p-[18px]"
            style={{ background: "linear-gradient(135deg,rgba(30,58,95,0.6),rgba(30,58,95,0.3))" }}
          >
            <div className="flex items-center gap-2 mb-2.5">
              <Shield size={16} color="#60a5fa" />
              <span className="text-[12px] font-bold text-[#60a5fa]">Travel safely</span>
            </div>
            <p className="m-0 mb-3 text-[11px] text-white/45 leading-[1.6]">
              All trip organizers are identity-verified. Check karma scores before joining.
            </p>
            <button className="px-3.5 py-[7px] rounded-lg border border-[rgba(96,165,250,0.3)] bg-[rgba(96,165,250,0.1)] text-[#60a5fa] text-[11px] font-semibold cursor-pointer">
              Learn more
            </button>
          </div>

          {/* saved trips */}
          {savedCount > 0 && (
            <div className="bg-white/[0.04] rounded-[18px] border border-white/[0.07] p-[18px]">
              <div className="text-[10px] font-bold tracking-[0.08em] uppercase text-white/30 mb-3 flex items-center gap-1.5">
                <Heart size={11} fill="rgba(255,107,53,0.6)" color="rgba(255,107,53,0.6)" /> Saved trips
              </div>
              {trips.filter(t => t.saved).map(t => (
                <div
                  key={t.id}
                  onClick={() => handleView(t)}
                  className="flex gap-2.5 items-center mb-2.5 cursor-pointer rounded-[10px] px-2 py-1.5 transition-colors duration-150 hover:bg-white/5"
                >
                  {t.media?.[0]?.url
                    ? <img src={t.media[0].url} alt="" className="w-10 h-8 object-cover rounded-[6px] flex-shrink-0" />
                    : <div className="w-10 h-8 rounded-[6px] bg-white/10 flex-shrink-0" />
                  }
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold text-white/80 overflow-hidden text-ellipsis whitespace-nowrap">{t.title}</div>
                    <div className="text-[10px] text-white/35">{fmtDate(t.dateStart)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* Desktop FAB */}
      <button
        onClick={() => requireAuth("Create and organise your own trip", () => navigate('/create-trip'))}
        className="fixed bottom-8 right-8 z-[150] flex items-center gap-2 px-5 py-3 rounded-full border-none cursor-pointer font-bold text-[13px] text-white shadow-lg transition-transform hover:-translate-y-0.5"
        style={{ background: "linear-gradient(135deg,#FF6B35,#ff8c5a)", boxShadow: "0 4px 24px rgba(255,107,53,0.45)" }}
      >
        <Plus size={18} strokeWidth={2.5} /> Create a Trip
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