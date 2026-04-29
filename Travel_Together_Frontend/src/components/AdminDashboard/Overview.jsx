import { useEffect, useState } from "react";
import { Users, Map, ShieldAlert, FileWarning, MessageSquare, Zap, TrendingUp, AlertTriangle } from "lucide-react";
import { adminApi } from "../../services/api";

function StatCard({ icon: Icon, label, value, sub, accent = "#FF6B35", urgent = false }) {
  return (
    <div className={`bg-[#0b1e30] rounded-xl p-5 border ${urgent ? "border-red-500/40" : "border-white/5"} flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <span className="text-slate-400 text-sm">{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}22` }}>
          <Icon size={16} style={{ color: accent }} />
        </div>
      </div>
      <div>
        <p className="text-white text-2xl font-bold">{value ?? "—"}</p>
        {sub && <p className="text-slate-500 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function TripBreakdown({ trips }) {
  if (!trips) return null;
  const STATUSES = [
    { key: "active",    label: "Active",    color: "#4ade80" },
    { key: "published", label: "Published", color: "#60a5fa" },
    { key: "draft",     label: "Draft",     color: "#94a3b8" },
    { key: "completed", label: "Completed", color: "#a855f7" },
    { key: "archived",  label: "Archived",  color: "#475569" },
  ];
  const total = trips.total || 1;
  return (
    <div className="bg-[#0b1e30] rounded-xl p-5 border border-white/5 col-span-full md:col-span-2">
      <p className="text-slate-400 text-sm mb-4">Trip status breakdown</p>
      <div className="flex gap-1 h-3 rounded-full overflow-hidden mb-4">
        {STATUSES.map(s => (
          <div
            key={s.key}
            style={{ flex: trips[s.key] || 0, backgroundColor: s.color, minWidth: trips[s.key] ? 4 : 0 }}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {STATUSES.map(s => (
          <div key={s.key} className="text-center">
            <p className="text-white font-semibold text-lg">{trips[s.key] ?? 0}</p>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-slate-500 text-xs">{s.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityRow({ label, value, color }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
      <span className="text-slate-400 text-sm">{label}</span>
      <span className="font-semibold text-sm" style={{ color }}>{value ?? "—"}</span>
    </div>
  );
}

export default function Overview() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    adminApi.getStats()
      .then(r => setStats(r.data))
      .catch(() => setError("Failed to load stats."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
      <AlertTriangle size={18} /> {error}
    </div>
  );

  const { users, trips, safety, activity } = stats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white font-bold text-xl">Overview</h1>
        <p className="text-slate-500 text-sm mt-0.5">Live snapshot of the platform</p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users}        label="Total users"         value={users.total}        sub={`+${users.new_7d} this week`} />
        <StatCard icon={Map}          label="Total trips"         value={trips.total}        sub={`+${trips.new_7d} this week`}  accent="#60a5fa" />
        <StatCard icon={ShieldAlert}  label="Active SOS alerts"  value={safety.sos_active}  sub={`${safety.sos_total} total`}   accent="#f43f5e" urgent={safety.sos_active > 0} />
        <StatCard icon={FileWarning}  label="Pending incidents"  value={safety.incidents_pending} sub={`${safety.incidents_total} total`} accent="#fbbf24" urgent={safety.incidents_pending > 0} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* User sub-stats */}
        <div className="bg-[#0b1e30] rounded-xl p-5 border border-white/5 col-span-full md:col-span-2">
          <p className="text-slate-400 text-sm mb-4 flex items-center gap-2"><Users size={14} /> User details</p>
          <ActivityRow label="Onboarded"          value={users.onboarded}  color="#4ade80" />
          <ActivityRow label="Verified travellers" value={users.verified}   color="#60a5fa" />
          <ActivityRow label="New (30 days)"       value={users.new_30d}   color="#FF6B35" />
        </div>

        {/* Activity */}
        <div className="bg-[#0b1e30] rounded-xl p-5 border border-white/5 col-span-full md:col-span-2">
          <p className="text-slate-400 text-sm mb-4 flex items-center gap-2"><TrendingUp size={14} /> Last 7 days activity</p>
          <ActivityRow label="Messages sent"  value={activity.messages_7d}    color="#a855f7" />
          <ActivityRow label="Streaks posted" value={activity.streaks_7d}     color="#f43f5e" />
          <ActivityRow label="Karma awarded"  value={`+${activity.karma_given_7d}`} color="#fbbf24" />
        </div>

        {/* Trip breakdown */}
        <TripBreakdown trips={trips} />
      </div>
    </div>
  );
}
