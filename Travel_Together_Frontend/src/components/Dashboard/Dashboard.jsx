import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Compass, Shield, Flame, Star, Plus, Settings } from "lucide-react";
import AppNav from "../shared/AppNav.jsx";
import MobileBottomNav from "../shared/MobileBottomNav.jsx";
import ThemeToggle from "../shared/ThemeToggle.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { tripsApi, usersApi } from "../../services/api.js";
import KarmaRing from "./KarmaRing.jsx";
import { JoinedSection, SavedSection, CreatedSection } from "./Sections.jsx";
import toast from "react-hot-toast";
import { displayName } from "../../utils/name.js";

const TABS = [
  { id: "joined",  label: "Joined"  },
  { id: "saved",   label: "Saved"   },
  { id: "created", label: "Organising" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [winW, setWinW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);

  const [myTrips,    setMyTrips]    = useState([]);
  const [savedTrips, setSavedTrips] = useState([]);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);

  /* `?s=` used to toggle an expanded section; it now selects the tab, so the
     "N saved" link in AppNav still lands where it always did. */
  const param = searchParams.get("s");
  const tab = TABS.some(t => t.id === param) ? param : "joined";
  const setTab = useCallback(
    (id) => setSearchParams(id === "joined" ? {} : { s: id }),
    [setSearchParams]
  );

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

  const refreshMyTrips = useCallback(() => {
    tripsApi.list()
      .then(r => setMyTrips(Array.isArray(r.data) ? r.data : (r.data.results ?? [])))
      .catch(() => {});
  }, []);

  const handleDeleteTrip = useCallback(async (id) => {
    setMyTrips(prev => prev.filter(t => t.id !== id));
    try {
      await tripsApi.delete(id);
      toast.success("Trip deleted.");
    } catch (e) {
      // The server refuses to erase a trip other people are part of. Say why
      // rather than letting the row silently reappear.
      toast.error(e?.response?.data?.detail || "Couldn't delete that trip.");
      refreshMyTrips();
    }
  }, [refreshMyTrips]);

  const handleCancelTrip = useCallback(async (id) => {
    try {
      const { data } = await tripsApi.cancelTrip(id);
      setMyTrips(prev => prev.map(t => (
        t.id === id ? { ...t, status: data.status ?? "cancelled", my_actions: null } : t
      )));
      toast.success(data?.detail || "Trip cancelled. Everyone is being refunded.");
      refreshMyTrips();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Couldn't cancel that trip.");
    }
  }, [refreshMyTrips]);

  const handleLeaveTrip = useCallback(async (id) => {
    setMyTrips(prev => prev.filter(t => t.id !== id));
    try { await tripsApi.leave(id); }
    catch { tripsApi.list().then(r => setMyTrips(Array.isArray(r.data) ? r.data : (r.data.results ?? []))).catch(() => {}); }
  }, []);

  const handleEndTrip = useCallback(async (id) => {
    try {
      const { data } = await tripsApi.endTrip(id);
      setMyTrips(prev => prev.map(t => t.id === id ? { ...t, status: data.status ?? "completed" } : t));
      refreshMyTrips();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Couldn't end that trip.");
    }
  }, [refreshMyTrips]);

  const goToTrip  = useCallback(id => navigate(`/trip/${id}`),            [navigate]);
  const goToGroup = useCallback(id => navigate(`/group-dashboard/${id}`), [navigate]);
  const goBrowse  = useCallback(()  => navigate("/discover"),             [navigate]);
  const goCreate  = useCallback(()  => navigate("/create-trip"),          [navigate]);

  const name       = displayName(user);
  const initials   = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const karmaScore = user?.travel_karma ?? 0;
  const karmaLevel = user?.karma_level  ?? "Explorer";
  const mobile     = winW < 768;

  const counts = { joined: joinedTrips.length, saved: savedTrips.length, created: createdTrips.length };

  /* Four plain readouts. The old version drew progress bars against an
     arbitrary /200 scale, so a 50% check-in rate rendered as a quarter-full
     bar — a chart that actively misinformed. */
  const quickStats = [
    { icon: Compass, label: "Trips",      value: String(stats?.trips_total ?? myTrips.length) },
    { icon: Shield,  label: "Check-ins",  value: stats?.checkin_rate != null ? `${stats.checkin_rate}%` : "—" },
    { icon: Flame,   label: "Streak",     value: "0" },
    { icon: Star,    label: "Rating",     value: stats?.avg_rating ? stats.avg_rating.toFixed(1) : "—" },
  ];

  const ProfileBand = (
    <section className="rounded-3xl border border-line bg-surface p-6 sm:p-7">
      <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:gap-10">
        <div className="flex min-w-0 flex-1 items-center gap-5">
          <KarmaRing score={karmaScore} level={karmaLevel} size={mobile ? 88 : 104} />
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[14px] font-semibold text-accent">
                  {initials}
                </span>
              )}
              <div className="min-w-0">
                <h1 className="m-0 truncate font-display text-[20px] font-semibold leading-tight text-ink">
                  {name}
                </h1>
                <p className="m-0 mt-0.5 truncate text-[13px] text-ink-mute">@{user?.username || "—"}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={goCreate}
                className="flex cursor-pointer items-center gap-2 rounded-full border-none bg-accent px-5 py-2.5 text-[14px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover">
                <Plus size={16} /> Create a trip
              </button>
              <button onClick={() => navigate("/settings")}
                className="flex cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-[14px] font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent">
                <Settings size={15} /> Settings
              </button>
            </div>
          </div>
        </div>

        <dl className="grid shrink-0 grid-cols-4 gap-px overflow-hidden rounded-2xl bg-line lg:w-[420px]">
          {quickStats.map(s => (
            <div key={s.label} className="flex flex-col items-center gap-1 bg-surface px-2 py-4">
              <s.icon size={14} className="text-accent" />
              <dd className="m-0 font-display text-[19px] font-semibold leading-none text-ink">{s.value}</dd>
              <dt className="text-[10.5px] uppercase tracking-[0.1em] text-ink-mute">{s.label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );

  const Tabs = (
    <div className="scrollbar-none flex gap-2 overflow-x-auto" role="tablist">
      {TABS.map(t => (
        <button
          key={t.id}
          role="tab"
          aria-selected={tab === t.id}
          onClick={() => setTab(t.id)}
          className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 py-2.5 text-[14px] transition-colors ${
            tab === t.id
              ? "border-accent bg-accent font-semibold text-accent-ink"
              : "border-line bg-surface font-medium text-ink-soft hover:border-accent hover:text-accent"
          }`}
        >
          {t.label}
          <span className={`text-[12.5px] ${tab === t.id ? "text-accent-ink/70" : "text-ink-mute"}`}>
            {counts[t.id]}
          </span>
        </button>
      ))}
    </div>
  );

  const panel =
    tab === "saved" ? (
      <SavedSection
        loading={loading} trips={savedTrips}
        onNavigate={goToTrip} onUnsave={handleUnsaveTrip} onBrowse={goBrowse}
      />
    ) : tab === "created" ? (
      <CreatedSection
        loading={loading} trips={createdTrips}
        onViewTrip={goToTrip} onManage={goToGroup}
        onDelete={handleDeleteTrip} onCancel={handleCancelTrip} onEndTrip={handleEndTrip}
        onCreate={goCreate}
      />
    ) : (
      <JoinedSection
        loading={loading} trips={joinedTrips}
        onNavigate={goToTrip} onViewGroup={goToGroup} onLeave={handleLeaveTrip}
        onBrowse={goBrowse}
      />
    );

  return (
    <div className="min-h-screen bg-ground font-sans">
      {mobile ? (
        <header className="sticky top-0 z-100 flex items-center justify-between border-b border-line bg-ground/95 px-4 py-3 backdrop-blur-md">
          <span className="font-display text-[18px] font-semibold text-ink">My trips</span>
          <ThemeToggle />
        </header>
      ) : (
        <AppNav />
      )}

      <div className={mobile ? "px-4 pb-24 pt-5" : "tt-shell block py-9"}>
        {ProfileBand}

        <div className="sticky top-18 z-40 -mx-4 mt-8 bg-ground px-4 py-3 sm:mx-0 sm:px-0">
          {Tabs}
        </div>

        <div className="mt-5" style={{ animation: "ttFadeUp .3s ease both" }} key={tab}>
          {panel}
        </div>
      </div>

      {mobile && <MobileBottomNav />}
    </div>
  );
}
