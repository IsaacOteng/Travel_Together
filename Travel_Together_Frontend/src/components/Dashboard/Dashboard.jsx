import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Compass, Shield, Flame, Star, Plus } from "lucide-react";
import AppNav from "../shared/AppNav.jsx";
import MobileBottomNav from "../shared/MobileBottomNav.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { tripsApi, usersApi } from "../../services/api.js";
import KarmaRing from "./KarmaRing.jsx";
import { JoinedSection, SavedSection, CreatedSection } from "./Sections.jsx";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [winW, setWinW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);

  const [myTrips,    setMyTrips]    = useState([]);
  const [savedTrips, setSavedTrips] = useState([]);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);

  const expandedParam = searchParams.get("s");
  const [expanded, setExpanded] = useState(expandedParam || null);

  useEffect(() => { setExpanded(expandedParam || null); }, [expandedParam]);

  useEffect(() => {
    const h = () => setWinW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

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
      } catch { /* silently fall back to empty states */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const userId       = String(user?.id ?? "");
  const joinedTrips  = myTrips.filter(t => String(t.chief_id) !== userId);
  const createdTrips = myTrips.filter(t => String(t.chief_id) === userId);

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

  const goToTrip  = useCallback(id => navigate(`/trip/${id}`),            [navigate]);
  const goToGroup = useCallback(id => navigate(`/group-dashboard/${id}`), [navigate]);

  const openSection  = useCallback((key) => { setExpanded(key); setSearchParams({ s: key }); }, [setSearchParams]);
  const closeSection = useCallback(()    => { setExpanded(null); setSearchParams({}); },        [setSearchParams]);

  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.username || "Traveller";
  const initials    = displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const karmaScore  = user?.travel_karma ?? 0;
  const karmaLevel  = user?.karma_level  ?? "Explorer";

  const karmaBreakdown = [
    { label: "Trips completed",   color: "#FF6B35", val: stats?.trips_completed ?? 0 },
    { label: "On-time check-ins", color: "#60a5fa", val: stats?.checkin_rate    ?? 0 },
    { label: "Group ratings",     color: "#4ade80", val: stats?.ratings_count   ?? 0 },
    { label: "Streaks",           color: "#fb923c", val: 0 },
  ];

  const quickStats = [
    { icon: Compass, label: "Trips",     value: String(stats?.trips_total ?? myTrips.length) },
    { icon: Shield,  label: "Check-ins", value: stats?.checkin_rate != null ? `${stats.checkin_rate}%` : "—" },
    { icon: Flame,   label: "Streaks",   value: "0" },
    { icon: Star,    label: "Rating",    value: stats?.avg_rating ? stats.avg_rating.toFixed(1) : "—" },
  ];

  const mobile = winW < 768;

  const joinedProps  = { loading, trips: joinedTrips,  onNavigate: goToTrip, onViewGroup: goToGroup,  onCollapse: closeSection };
  const savedProps   = { loading, trips: savedTrips,   onNavigate: goToTrip, onUnsave: handleUnsaveTrip, onCollapse: closeSection };
  const createdProps = { loading, trips: createdTrips, onViewTrip: goToTrip, onManage: goToGroup, onDelete: handleDeleteTrip, onEndTrip: handleEndTrip, onCollapse: closeSection };

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
      onClick={() => navigate("/create-trip")}
      className="w-full py-3 rounded-xl border-none bg-gradient-to-r from-[#FF6B35] to-[#ff8c5a] text-white text-[13px] font-bold cursor-pointer flex items-center justify-center gap-2 transition-all"
      style={{ boxShadow: "0 4px 16px rgba(255,107,53,.30)" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(255,107,53,.40)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)";    e.currentTarget.style.boxShadow = "0 4px 16px rgba(255,107,53,.30)"; }}
    >
      <Plus size={15}/> Create a Trip
    </button>
  );

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
