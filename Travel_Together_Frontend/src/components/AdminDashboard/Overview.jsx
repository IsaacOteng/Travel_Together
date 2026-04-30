import { useEffect, useState } from "react";
import {
  Users, Map, ShieldAlert, FileWarning,
  MessageSquare, Video, Zap, TrendingUp,
  AlertTriangle, RefreshCw,
} from "lucide-react";
import { adminApi } from "../../services/api";

function fmt(n) {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/* ── Stat card ─────────────────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, color = "#FF6B35", urgent = false, loading }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 border transition-all
      ${urgent
        ? "bg-red-950/40 border-red-500/30 shadow-lg shadow-red-950/20"
        : "bg-[#0d1f33] border-white/6 hover:border-white/10"
      }`}
    >
      {urgent && (
        <div className="absolute inset-0 bg-linear-to-br from-red-500/5 to-transparent pointer-events-none" />
      )}
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}18` }}>
          <Icon size={18} style={{ color }} />
        </div>
        {urgent && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-500/15 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            URGENT
          </span>
        )}
      </div>
      {loading
        ? <div className="h-8 w-20 bg-white/5 rounded-lg animate-pulse mb-1" />
        : <p className="text-white text-3xl font-bold tracking-tight">{fmt(value)}</p>
      }
      <p className="text-slate-400 text-xs mt-1 font-medium">{label}</p>
      {sub && <p className="text-slate-600 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

/* ── Trip breakdown ─────────────────────────────────────────────────────────── */
const TRIP_STATUSES = [
  { key: "active",    label: "Active",    color: "#4ade80" },
  { key: "published", label: "Published", color: "#60a5fa" },
  { key: "draft",     label: "Draft",     color: "#64748b" },
  { key: "completed", label: "Completed", color: "#a855f7" },
  { key: "archived",  label: "Archived",  color: "#334155" },
];

function TripBreakdown({ trips, loading }) {
  if (loading) return (
    <div className="bg-[#0d1f33] rounded-2xl border border-white/6 p-5 col-span-full md:col-span-2">
      <div className="h-4 w-32 bg-white/5 rounded animate-pulse mb-5" />
      <div className="h-3 rounded-full bg-white/5 animate-pulse mb-5" />
      <div className="grid grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />)}
      </div>
    </div>
  );

  const total = Math.max(trips?.total || 1, 1);

  return (
    <div className="bg-[#0d1f33] rounded-2xl border border-white/6 p-5 col-span-full md:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <p className="text-slate-300 font-semibold text-sm">Trip breakdown</p>
        <span className="text-slate-500 text-xs">{trips?.total ?? 0} total</span>
      </div>
      <div className="flex h-2.5 rounded-full overflow-hidden gap-px mb-5 bg-white/5">
        {TRIP_STATUSES.map(s => {
          const pct = ((trips?.[s.key] || 0) / total) * 100;
          return pct > 0 ? (
            <div key={s.key} title={`${s.label}: ${trips?.[s.key]}`}
              style={{ flex: pct, backgroundColor: s.color, minWidth: 4 }} />
          ) : null;
        })}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {TRIP_STATUSES.map(s => (
          <div key={s.key} className="bg-white/3 rounded-xl p-3 text-center">
            <p className="text-white font-bold text-lg">{trips?.[s.key] ?? 0}</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-slate-500 text-[10px] capitalize">{s.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Activity panel ─────────────────────────────────────────────────────────── */
function ActivityPanel({ activity, users, loading }) {
  const rows = [
    { label: "Messages sent (7d)",  value: activity?.messages_7d,  color: "#a855f7", Icon: MessageSquare },
    { label: "Streaks posted (7d)", value: activity?.streaks_7d,   color: "#f43f5e", Icon: Video         },
    { label: "Karma awarded (7d)",  value: activity?.karma_given_7d ? `+${fmt(activity.karma_given_7d)}` : "—", color: "#fbbf24", Icon: Zap },
    { label: "Onboarded users",     value: users?.onboarded,       color: "#4ade80", Icon: TrendingUp    },
    { label: "Verified travellers", value: users?.verified,        color: "#60a5fa", Icon: Users         },
    { label: "New users (30d)",     value: users?.new_30d,         color: "#FF6B35", Icon: TrendingUp    },
  ];

  return (
    <div className="bg-[#0d1f33] rounded-2xl border border-white/6 p-5 col-span-full md:col-span-2">
      <p className="text-slate-300 font-semibold text-sm mb-4">Activity snapshot</p>
      <div className="space-y-1">
        {rows.map(({ label, value, color, Icon }) => (
          <div key={label} className="flex items-center justify-between py-2.5 border-b border-white/4 last:border-0">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
                <Icon size={12} style={{ color }} />
              </div>
              <span className="text-slate-400 text-xs">{label}</span>
            </div>
            {loading
              ? <div className="h-4 w-10 bg-white/5 rounded animate-pulse" />
              : <span className="font-semibold text-xs" style={{ color }}>{fmt(value)}</span>
            }
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Overview page ──────────────────────────────────────────────────────────── */
export default function Overview() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    adminApi.getStats()
      .then(r => setStats(r.data))
      .catch(() => setError("Failed to load stats. Check your connection."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const { users, trips, safety, activity } = stats ?? {};

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-bold text-2xl tracking-tight">Overview</h1>
          <p className="text-slate-500 text-sm mt-0.5">Live snapshot of the platform</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-white/6 transition-colors disabled:opacity-40 text-xs">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
          <AlertTriangle size={18} className="shrink-0" />
          <span className="text-sm">{error}</span>
          <button onClick={load} className="ml-auto text-xs underline hover:no-underline">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}       label="Total users"       value={users?.total}              sub={`+${users?.new_7d ?? 0} this week`}        loading={loading} />
        <StatCard icon={Map}         label="Total trips"       value={trips?.total}              sub={`+${trips?.new_7d ?? 0} this week`}         loading={loading} color="#60a5fa" />
        <StatCard icon={ShieldAlert} label="Active SOS alerts" value={safety?.sos_active}        sub={`${safety?.sos_total ?? 0} all-time`}       loading={loading} color="#f43f5e" urgent={!loading && (safety?.sos_active ?? 0) > 0} />
        <StatCard icon={FileWarning} label="Pending incidents" value={safety?.incidents_pending} sub={`${safety?.incidents_total ?? 0} all-time`} loading={loading} color="#fbbf24" urgent={!loading && (safety?.incidents_pending ?? 0) > 0} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <TripBreakdown trips={trips} loading={loading} />
        <ActivityPanel activity={activity} users={users} loading={loading} />
      </div>
    </div>
  );
}
