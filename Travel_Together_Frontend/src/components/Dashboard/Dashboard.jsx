import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fmtDate } from "../../utils/date.js";
import {
  MapPin, Calendar, Users, ChevronRight, ChevronLeft,
  Compass, Shield, Flame, Star, Plus, Clock,
  Heart, Edit3, X, Trash2, FlagOff, LayoutDashboard,
} from "lucide-react";
import AppNav from '../shared/AppNav.jsx';
import MobileBottomNav from '../shared/MobileBottomNav.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { tripsApi, usersApi } from '../../services/api.js';

/* ── constants ── */
const PREVIEW_COUNT = 2;

/* ── karma ring ── */
function KarmaRing({ score, level }) {
  const r = 38; const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(score / 600, 1);
  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg width="96" height="96" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7"/>
        <circle cx="48" cy="48" r={r} fill="none" stroke="#FF6B35" strokeWidth="7"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }}/>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-black text-white leading-none">{score}</span>
        <span className="text-[9px] text-[#FF6B35] font-bold tracking-widest uppercase mt-0.5">{level}</span>
      </div>
    </div>
  );
}

/* ── empty state ── */
function EmptyState({ msg }) {
  return <div className="py-6 text-center text-[12px] text-white/20">{msg}</div>;
}

/* ── trip row variants ── */
function JoinedRow({ trip, onNavigate, onViewGroup }) {
  const navigate    = useNavigate();
  const isCompleted = trip.tripStatus === "completed";
  const approved    = trip.joinStatus === "approved";
  return (
    <div
      onClick={() => onNavigate?.(trip.id)}
      className="flex items-center gap-3.5 p-3.5 rounded-xl border border-white/[0.07] bg-white/[0.03] cursor-pointer hover:bg-white/[0.06] hover:border-white/10 transition-all duration-150"
    >
      <div className="w-10 h-10 rounded-xl flex-shrink-0 bg-gradient-to-br from-[#1E3A5F] to-[#2d5f8a] flex items-center justify-center">
        <MapPin size={15} color="#FF6B35"/>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-white/90 truncate">{trip.title}</div>
        <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
          <span className="flex items-center gap-1 text-[11px] text-white/35"><Calendar size={10}/>{trip.date}</span>
          <span className="flex items-center gap-1 text-[11px] text-white/35"><Users size={10}/>{trip.members}</span>
          <span className="text-[11px] text-white/25">· {trip.chief}</span>
          {!isCompleted && trip.daysLeft !== null && (
            <span className="flex items-center gap-1 text-[11px] text-white/25">
              <Clock size={9}/>{trip.daysLeft === 0 ? "today" : `in ${trip.daysLeft}d`}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {isCompleted ? (
          <>
            <button
              onClick={e => { e.stopPropagation(); navigate(`/trips/${trip.id}/rate`); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white/60 border border-white/[0.1] bg-white/[0.05] hover:text-white/80 hover:bg-white/[0.09] transition-colors cursor-pointer"
            >
              <Star size={10} className="fill-current" /> Rate Crew
            </button>
          </>
        ) : (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${approved ? "bg-green-400/15 text-green-400" : "bg-orange-400/15 text-orange-400"}`}>
            {approved ? "Approved" : "Pending"}
          </span>
        )}
        <button
          onClick={e => { e.stopPropagation(); onViewGroup?.(trip.id); }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white/50 border border-white/[0.08] bg-white/[0.04] hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          <LayoutDashboard size={10}/> View Group
        </button>
      </div>
    </div>
  );
}

function SavedRow({ trip, onNavigate, onUnsave }) {
  const [removing, setRemoving] = useState(false);
  const isCompleted = trip.status === "completed";

  async function handleUnsave(e) {
    e.stopPropagation();
    if (removing) return;
    setRemoving(true);
    try {
      await onUnsave?.(trip.id);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div
      onClick={() => onNavigate?.(trip.id)}
      className="flex items-center gap-3.5 p-3.5 rounded-xl border border-white/[0.07] bg-white/[0.03] cursor-pointer hover:bg-white/[0.06] hover:border-white/10 transition-all duration-150"
    >
      <div className="w-10 h-10 rounded-xl flex-shrink-0 bg-gradient-to-br from-[#3d1a2a] to-[#7a2050] flex items-center justify-center">
        <Heart size={15} color="#f472b6" fill="#f472b6"/>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-white/90 truncate">{trip.title}</div>
        <div className="flex items-center gap-2.5 mt-0.5">
          <span className="flex items-center gap-1 text-[11px] text-white/35"><Calendar size={10}/>{trip.date}</span>
          <span className="flex items-center gap-1 text-[11px] text-white/35"><Users size={10}/>{trip.members}</span>
          {!isCompleted && <span className="text-[11px] text-white/25">· {trip.spots} left</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {isCompleted && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-400/15 text-blue-400">Completed</span>
        )}
        <button
          onClick={handleUnsave}
          disabled={removing}
          className="w-6 h-6 rounded-full flex items-center justify-center bg-white/[0.05] border border-white/[0.08] text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer disabled:opacity-40"
          title="Remove from saved"
        >
          {removing ? <span className="text-[9px]">…</span> : <X size={11}/>}
        </button>
      </div>
    </div>
  );
}

function CreatedRow({ trip, onViewTrip, onManage, onDelete, onEndTrip }) {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmEnd,    setConfirmEnd]    = useState(false);
  const [ending,        setEnding]        = useState(false);

  const canEnd = trip.status === "active" || trip.status === "published";

  const statusMap = {
    active:    { label: "Active",     cls: "bg-[#FF6B35]/15 text-[#FF6B35]" },
    published: { label: "Published",  cls: "bg-green-400/15 text-green-400" },
    draft:     { label: "Draft",      cls: "bg-white/[0.07] text-white/40"  },
    completed: { label: "Completed",  cls: "bg-blue-400/15 text-blue-400"   },
  };
  const s = statusMap[trip.status] || statusMap.draft;

  async function handleEnd(e) {
    e.stopPropagation();
    if (ending) return;
    setEnding(true);
    try {
      await onEndTrip?.(trip.id);
    } finally {
      setEnding(false);
      setConfirmEnd(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/10 transition-all duration-150 overflow-hidden">
      {/* Top row: icon + title + status — click → Trip Details */}
      <div className="flex items-center gap-3 px-3.5 pt-3.5 pb-2 cursor-pointer" onClick={() => onViewTrip?.(trip.id)}>
        <div className="w-9 h-9 rounded-xl flex-shrink-0 bg-gradient-to-br from-[#3d1a0f] to-[#7a3520] flex items-center justify-center">
          <Edit3 size={14} color="#fb923c"/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-white/90 truncate">{trip.title}</div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="flex items-center gap-1 text-[11px] text-white/35"><Calendar size={10}/>{trip.date}</span>
            <span className="flex items-center gap-1 text-[11px] text-white/35"><Users size={10}/>{trip.members}/{trip.maxMembers}</span>
            {trip.requests > 0 && (
              <span className="text-[11px] text-[#FF6B35]/80 font-semibold">{trip.requests} req</span>
            )}
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${s.cls}`}>{s.label}</span>
      </div>

      {/* Bottom row: action buttons — right-aligned */}
      <div className="flex items-center justify-end gap-2 px-3.5 pb-3 pt-1 border-t border-white/[0.04]">
        {/* Rate Your Crew — completed trips only */}
        {trip.status === "completed" && (
          <button
            onClick={e => { e.stopPropagation(); navigate(`/trips/${trip.id}/rate`); }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white/60 border border-white/[0.1] bg-white/[0.05] hover:text-white/80 hover:bg-white/[0.09] transition-colors cursor-pointer"
          >
            <Star size={10} className="fill-current" /> Rate Crew
          </button>
        )}

        {/* Manage → Group Dashboard */}
        <button
          onClick={e => { e.stopPropagation(); onManage?.(trip.id); }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white/50 border border-white/[0.08] bg-white/[0.04] hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          <LayoutDashboard size={10}/> Manage
        </button>

        {/* End Trip */}
        {canEnd && (
          confirmEnd ? (
            <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
              <span className="text-[10px] text-amber-400/80">End trip?</span>
              <button onClick={handleEnd} disabled={ending}
                className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-lg cursor-pointer">
                {ending ? "…" : "Yes"}
              </button>
              <button onClick={e => { e.stopPropagation(); setConfirmEnd(false); }}
                className="text-[10px] text-white/40 bg-white/[0.05] border border-white/10 px-2 py-0.5 rounded-lg cursor-pointer">
                No
              </button>
            </div>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); setConfirmEnd(true); setConfirmDelete(false); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-amber-400 border border-amber-400/25 bg-amber-400/[0.07] hover:bg-amber-400/15 transition-colors cursor-pointer"
            >
              <FlagOff size={10}/> End Trip
            </button>
          )
        )}

        {/* Delete */}
        {confirmDelete ? (
          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            <span className="text-[10px] text-red-400/80">Delete?</span>
            <button onClick={e => { e.stopPropagation(); onDelete?.(trip.id); }}
              className="text-[10px] font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 rounded-lg cursor-pointer">
              Yes, delete
            </button>
            <button onClick={e => { e.stopPropagation(); setConfirmDelete(false); }}
              className="text-[10px] text-white/40 bg-white/[0.05] border border-white/10 px-2 py-0.5 rounded-lg cursor-pointer">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={e => { e.stopPropagation(); setConfirmDelete(true); setConfirmEnd(false); }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-red-400 border border-red-400/20 bg-red-400/[0.07] hover:bg-red-400/15 transition-colors cursor-pointer"
          >
            <Trash2 size={10}/> Delete
          </button>
        )}
      </div>
    </div>
  );
}

/* ── section header ── */
function SectionHeader({ title, count, hasMore, onViewAll, onBack, expanded }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        {expanded && (
          <button onClick={onBack} className="bg-transparent border-none cursor-pointer text-white/40 hover:text-white/70 flex transition-colors">
            <ChevronLeft size={16}/>
          </button>
        )}
        <h2 className="m-0 text-[11px] font-bold tracking-[0.08em] uppercase text-white/30">{title}</h2>
        <span className="text-[10px] text-white/20 font-medium bg-white/[0.05] px-1.5 py-0.5 rounded-full">{count}</span>
      </div>
      {!expanded && hasMore && (
        <button onClick={onViewAll} className="flex items-center gap-1 text-[12px] text-[#FF6B35] font-semibold bg-transparent border-none cursor-pointer hover:text-[#ff8c5a] transition-colors">
          View all <ChevronRight size={12}/>
        </button>
      )}
    </div>
  );
}

/* ── section components (module-level to preserve row state across Dashboard re-renders) ── */

function JoinedSection({ loading, trips, full, onExpand, onCollapse, onNavigate, onViewGroup }) {
  const items = full ? trips : trips.slice(0, PREVIEW_COUNT);
  const rows = items.map(t => ({
    id:         t.id,
    title:      t.title || t.destination,
    date:       fmtDate(t.date_start),
    joinStatus: t.my_status || "pending",
    tripStatus: t.status    || "published",
    members:    t.member_count ?? 0,
    daysLeft:   t.date_start
                  ? Math.max(0, Math.ceil((new Date(t.date_start) - Date.now()) / 86400000))
                  : null,
    chief:      t.chief_username || "Organiser",
  }));
  return (
    <div>
      <SectionHeader
        title="Trips I've Joined"
        count={trips.length}
        hasMore={trips.length > PREVIEW_COUNT}
        onViewAll={onExpand}
        onBack={onCollapse}
        expanded={full}
      />
      {loading ? (
        <EmptyState msg="Loading…"/>
      ) : rows.length === 0 ? (
        <EmptyState msg="No joined trips yet"/>
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map(t => (
            <JoinedRow key={t.id} trip={t} onNavigate={onNavigate} onViewGroup={onViewGroup}/>
          ))}
        </div>
      )}
      {!full && trips.length > PREVIEW_COUNT && (
        <div className="mt-2 text-center">
          <span className="text-[11px] text-white/20">+{trips.length - PREVIEW_COUNT} more</span>
        </div>
      )}
    </div>
  );
}

function SavedSection({ loading, trips, full, onExpand, onCollapse, onNavigate, onUnsave }) {
  const items = full ? trips : trips.slice(0, PREVIEW_COUNT);
  const rows = items.map(t => ({
    id:      t.id,
    title:   t.title || t.destination,
    date:    fmtDate(t.date_start),
    members: t.member_count ?? 0,
    spots:   t.spots_left   ?? 0,
    status:  t.status       || "published",
  }));
  return (
    <div>
      <SectionHeader
        title="Saved Trips"
        count={trips.length}
        hasMore={trips.length > PREVIEW_COUNT}
        onViewAll={onExpand}
        onBack={onCollapse}
        expanded={full}
      />
      {loading ? (
        <EmptyState msg="Loading…"/>
      ) : rows.length === 0 ? (
        <EmptyState msg="No saved trips yet"/>
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map(t => (
            <SavedRow key={t.id} trip={t} onNavigate={onNavigate} onUnsave={onUnsave}/>
          ))}
        </div>
      )}
      {!full && trips.length > PREVIEW_COUNT && (
        <div className="mt-2 text-center">
          <span className="text-[11px] text-white/20">+{trips.length - PREVIEW_COUNT} more</span>
        </div>
      )}
    </div>
  );
}

function CreatedSection({ loading, trips, full, onExpand, onCollapse, onViewTrip, onManage, onDelete, onEndTrip }) {
  const items = full ? trips : trips.slice(0, PREVIEW_COUNT);
  const rows = items.map(t => ({
    id:         t.id,
    title:      t.title || t.destination,
    date:       fmtDate(t.date_start),
    status:     t.status,
    members:    t.member_count     ?? 0,
    maxMembers: t.spots_total      ?? 0,
    requests:   t.pending_requests ?? 0,
  }));
  return (
    <div>
      <SectionHeader
        title="Trips I've Created"
        count={trips.length}
        hasMore={trips.length > PREVIEW_COUNT}
        onViewAll={onExpand}
        onBack={onCollapse}
        expanded={full}
      />
      {loading ? (
        <EmptyState msg="Loading…"/>
      ) : rows.length === 0 ? (
        <EmptyState msg="No trips created yet"/>
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map(t => (
            <CreatedRow
              key={t.id}
              trip={t}
              onViewTrip={onViewTrip}
              onManage={onManage}
              onDelete={onDelete}
              onEndTrip={onEndTrip}
            />
          ))}
        </div>
      )}
      {!full && trips.length > PREVIEW_COUNT && (
        <div className="mt-2 text-center">
          <span className="text-[11px] text-white/20">+{trips.length - PREVIEW_COUNT} more</span>
        </div>
      )}
    </div>
  );
}

/* ── root ── */
export default function Dashboard() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [winW, setWinW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);

  // trip data
  const [myTrips,    setMyTrips]    = useState([]);
  const [savedTrips, setSavedTrips] = useState([]);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);

  const expandedParam = searchParams.get("s");
  const [expanded, setExpanded] = useState(expandedParam || null);

  // Keep expanded in sync with URL — handles browser back/forward correctly
  useEffect(() => {
    setExpanded(expandedParam || null);
  }, [expandedParam]);

  useEffect(() => {
    const h = () => setWinW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  /* ── fetch trips + stats + fresh user ── */
  useEffect(() => {
    refreshUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [myRes, savedRes, statsRes] = await Promise.all([
          tripsApi.list(),
          tripsApi.saved(),
          usersApi.getMyStats().catch(() => ({ data: null })),
        ]);
        setMyTrips(Array.isArray(myRes.data) ? myRes.data : (myRes.data.results ?? []));
        setSavedTrips(Array.isArray(savedRes.data) ? savedRes.data : (savedRes.data.results ?? []));
        setStats(statsRes.data);
      } catch {
        // silently fall back to empty — UI shows empty states
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Split my trips into joined vs created
  const userId      = String(user?.id ?? "");
  const joinedTrips  = myTrips.filter(t => String(t.chief_id) !== userId);
  const createdTrips = myTrips.filter(t => String(t.chief_id) === userId);

  /* ── action handlers ── */
  const handleUnsaveTrip = useCallback(async (id) => {
    setSavedTrips(prev => prev.filter(t => t.id !== id));
    try { await tripsApi.unsave(id); }
    catch { tripsApi.saved().then(r => setSavedTrips(Array.isArray(r.data) ? r.data : (r.data.results ?? []))).catch(() => {}); }
  }, []);

  const handleDeleteTrip = useCallback(async (id) => {
    setMyTrips(prev => prev.filter(t => t.id !== id));
    try { await tripsApi.delete(id); }
    catch { tripsApi.list().then(r => setMyTrips(Array.isArray(r.data) ? r.data : (r.data.results ?? []))).catch(() => {}); }
  }, []);

  const handleEndTrip = useCallback(async (id) => {
    try {
      const { data } = await tripsApi.endTrip(id);
      setMyTrips(prev => prev.map(t => t.id === id ? { ...t, status: data.status ?? "completed" } : t));
    } catch { /* button resets its own loading state */ }
  }, []);

  /* ── navigation callbacks (stable refs) ── */
  const goToTrip  = useCallback(id => navigate(`/trip/${id}`),             [navigate]);
  const goToGroup = useCallback(id => navigate(`/group-dashboard/${id}`),  [navigate]);

  const openSection  = useCallback((key) => { setExpanded(key); setSearchParams({ s: key }); }, [setSearchParams]);
  const closeSection = useCallback(()    => { setExpanded(null); setSearchParams({}); },        [setSearchParams]);

  /* ── derived display values ── */
  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.username || "Traveller";
  const initials    = displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const karmaScore  = user?.travel_karma ?? 0;
  const karmaLevel  = user?.karma_level  ?? "Explorer";

  const KARMA_BREAKDOWN_LABELS = [
    { label: "Trips completed",   key: "trips_completed",  color: "#FF6B35" },
    { label: "On-time check-ins", key: "checkins_on_time", color: "#60a5fa" },
    { label: "Group ratings",     key: "ratings_received", color: "#4ade80" },
    { label: "Streaks",           key: "streak_count",     color: "#fb923c" },
  ];
  const statsMap = {
    trips_completed:  stats?.trips_completed ?? 0,
    checkins_on_time: stats?.checkin_rate    ?? 0,
    ratings_received: stats?.ratings_count   ?? 0,
    streak_count:     0,
  };
  const karmaBreakdown = KARMA_BREAKDOWN_LABELS.map(k => ({ ...k, val: statsMap[k.key] ?? 0 }));

  const quickStats = [
    { icon: Compass, label: "Trips",     value: String(stats?.trips_total ?? myTrips.length) },
    { icon: Shield,  label: "Check-ins", value: stats?.checkin_rate != null ? `${stats.checkin_rate}%` : "—" },
    { icon: Flame,   label: "Streaks",   value: "0" },
    { icon: Star,    label: "Rating",    value: stats?.avg_rating ? stats.avg_rating.toFixed(1) : "—" },
  ];

  const mobile = winW < 768;

  /* ── shared section props ── */
  const joinedProps  = { loading, trips: joinedTrips,  onNavigate: goToTrip,  onViewGroup: goToGroup,  onCollapse: closeSection };
  const savedProps   = { loading, trips: savedTrips,   onNavigate: goToTrip,  onUnsave: handleUnsaveTrip, onCollapse: closeSection };
  const createdProps = { loading, trips: createdTrips, onViewTrip: goToTrip,  onManage: goToGroup, onDelete: handleDeleteTrip, onEndTrip: handleEndTrip, onCollapse: closeSection };

  /* ── main content ── */
  let mainContent;
  if (expanded === "joined") {
    mainContent = <JoinedSection  {...joinedProps}  full />;
  } else if (expanded === "saved") {
    mainContent = <SavedSection   {...savedProps}   full />;
  } else if (expanded === "created") {
    mainContent = <CreatedSection {...createdProps} full />;
  } else {
    mainContent = (
      <div className="flex flex-col gap-8">
        <JoinedSection  {...joinedProps}  onExpand={() => openSection("joined")}  />
        <div className="border-t border-white/[0.04]"/>
        <SavedSection   {...savedProps}   onExpand={() => openSection("saved")}   />
        <div className="border-t border-white/[0.04]"/>
        <CreatedSection {...createdProps} onExpand={() => openSection("created")} />
      </div>
    );
  }

  /* ── user card ── */
  const UserCard = (
    <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5">
      <div className="flex items-center gap-3.5 mb-5">
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt={displayName}
            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
            style={{ boxShadow: "0 4px 14px rgba(255,107,53,.35)" }} />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#ff8c5a] flex items-center justify-center text-[17px] font-black text-white font-serif flex-shrink-0"
            style={{ boxShadow: "0 4px 14px rgba(255,107,53,.35)" }}>
            {initials}
          </div>
        )}
        <div>
          <div className="text-[15px] font-bold text-white font-serif leading-tight">{displayName}</div>
          <div className="text-[11px] text-white/35 mt-0.5">@{user?.username || "—"}</div>
        </div>
      </div>

<div className="flex items-center gap-4 mb-5">
        <KarmaRing score={karmaScore} level={karmaLevel}/>
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          {karmaBreakdown.map(k => (
            <div key={k.label}>
              <div className="flex justify-between mb-0.5">
                <span className="text-[9px] text-white/30 tracking-wide">{k.label}</span>
                <span className="text-[9px] font-bold" style={{ color: k.color }}>{k.val}</span>
              </div>
              <div className="h-[3px] bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min((k.val / 200) * 100, 100)}%`, background: k.color, transition: "width 1s ease" }}/>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {quickStats.map(s => (
          <div key={s.label} className="bg-white/[0.04] border border-white/[0.05] rounded-xl p-3 flex flex-col items-center gap-1">
            <s.icon size={13} color="#FF6B35"/>
            <span className="text-[16px] font-black text-white leading-none">{s.value}</span>
            <span className="text-[9px] text-white/30 uppercase tracking-wide">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const CreateBtn = (
    <button
      onClick={() => navigate('/create-trip')}
      className="w-full py-3 rounded-xl border-none bg-gradient-to-r from-[#FF6B35] to-[#ff8c5a] text-white text-[13px] font-bold cursor-pointer flex items-center justify-center gap-2 transition-all"
      style={{ boxShadow: "0 4px 16px rgba(255,107,53,.30)" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(255,107,53,.40)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)";    e.currentTarget.style.boxShadow = "0 4px 16px rgba(255,107,53,.30)"; }}
    >
      <Plus size={15}/> Create a Trip
    </button>
  );

  /* ── mobile ── */
  if (mobile) {
    return (
      <div className="min-h-screen bg-[#071422] font-sans pb-[78px]">
        <style>{`::-webkit-scrollbar{display:none}`}</style>
        <header className="sticky top-0 z-[100] bg-[rgba(7,20,34,0.96)] backdrop-blur-xl border-b border-white/[0.06] px-4 py-3 flex items-center gap-2">
          <div className="w-7 h-7 rounded-[7px] bg-gradient-to-br from-[#FF6B35] to-[#ff8c5a] flex items-center justify-center flex-shrink-0">
            <Compass size={14} color="#fff"/>
          </div>
          <span className="text-[15px] font-bold text-white">My Trips</span>
        </header>
        <div className="p-4 flex flex-col gap-5">
          {UserCard}
          {CreateBtn}
          {mainContent}
        </div>
        <MobileBottomNav/>
      </div>
    );
  }

  /* ── desktop ── */
  return (
    <div className="min-h-screen bg-[#071422] font-sans">
      <style>{`
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:99px}
        @keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <AppNav/>

      <div className="max-w-[1100px] mx-auto px-8 py-8 flex gap-7">
        <aside className="w-[280px] flex-shrink-0 flex flex-col gap-4 self-start sticky top-[76px]">
          {UserCard}
          {CreateBtn}
        </aside>
        <div className="flex-1 min-w-0" style={{ animation: "slideUp .3s ease both" }}>
          {mainContent}
        </div>
      </div>
    </div>
  );
}
