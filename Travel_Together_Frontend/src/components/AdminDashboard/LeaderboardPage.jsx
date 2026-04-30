import { useEffect, useState } from "react";
import { BarChart2, AlertTriangle, Crown, RefreshCw } from "lucide-react";
import { adminApi } from "../../services/api";

const LEVEL_META = {
  Legend:    { color: "#fbbf24", bg: "bg-yellow-500/15", text: "text-yellow-400" },
  Navigator: { color: "#60a5fa", bg: "bg-blue-500/15",   text: "text-blue-400"   },
  Explorer:  { color: "#64748b", bg: "bg-slate-500/15",  text: "text-slate-400"  },
};

const MEDAL = { 1: { emoji: "🥇", ring: "ring-yellow-400/30", glow: "shadow-yellow-500/10" },
                2: { emoji: "🥈", ring: "ring-slate-400/30",  glow: "shadow-slate-400/10"  },
                3: { emoji: "🥉", ring: "ring-orange-600/30", glow: "shadow-orange-600/10" } };

function Skeleton({ className }) {
  return <div className={`bg-white/5 rounded-lg animate-pulse ${className}`} />;
}

export default function LeaderboardPage() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = () => {
    setLoading(true); setError(null);
    adminApi.getLeaderboard()
      .then(r => setUsers(r.data))
      .catch(() => setError("Failed to load leaderboard."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  /* Top 3 podium */
  const top3 = users.slice(0, 3);
  const rest  = users.slice(3);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-bold text-2xl tracking-tight">Leaderboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Top 50 travellers by karma</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-white/6 transition-colors disabled:opacity-40 text-xs">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-sm">
          <AlertTriangle size={18} className="shrink-0" /> {error}
          <button onClick={load} className="ml-auto text-xs underline">Retry</button>
        </div>
      )}

      {/* Podium */}
      {!loading && top3.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[top3[1], top3[0], top3[2]].map((u, i) => {
            if (!u) return <div key={i} />;
            const rank = i === 1 ? 1 : i === 0 ? 2 : 3;
            const m = MEDAL[rank];
            const lm = LEVEL_META[u.karma_level] ?? LEVEL_META.Explorer;
            return (
              <div key={u.id}
                className={`relative bg-[#0d1f33] rounded-2xl border border-white/6 p-5 text-center flex flex-col items-center gap-3 transition-all
                  ${rank === 1 ? "ring-1 ring-yellow-400/20 shadow-lg shadow-yellow-500/5 -mt-2" : ""}`}>
                {rank === 1 && <Crown size={16} className="absolute -top-2 text-yellow-400" />}
                <div className="text-2xl">{m.emoji}</div>
                {u.avatar_url
                  ? <img src={u.avatar_url} alt="" className={`w-12 h-12 rounded-full object-cover ring-2 ${m.ring} shadow-lg ${m.glow}`} />
                  : <div className={`w-12 h-12 rounded-full ring-2 ${m.ring} flex items-center justify-center text-white font-bold text-lg`}
                      style={{ background: `linear-gradient(135deg, ${lm.color}33, ${lm.color}11)` }}>
                      {u.first_name?.[0] ?? "?"}
                    </div>
                }
                <div>
                  <p className="text-white font-semibold text-sm">{u.first_name} {u.last_name}</p>
                  <p className="text-slate-500 text-xs">@{u.username ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[#FF6B35] font-bold text-lg">{u.travel_karma.toLocaleString()}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${lm.bg} ${lm.text}`}>
                    {u.karma_level}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full table */}
      <div className="bg-[#0d1f33] rounded-2xl border border-white/6 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/6 flex items-center gap-2">
          <BarChart2 size={14} className="text-[#FF6B35]" />
          <span className="text-slate-300 font-semibold text-xs uppercase tracking-wider">Full rankings</span>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/4">
              <th className="text-left text-slate-500 font-semibold uppercase tracking-wider px-5 py-3 w-16">Rank</th>
              <th className="text-left text-slate-500 font-semibold uppercase tracking-wider px-5 py-3">Traveller</th>
              <th className="text-left text-slate-500 font-semibold uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Level</th>
              <th className="text-right text-slate-500 font-semibold uppercase tracking-wider px-5 py-3">Karma</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/4">
            {loading ? (
              [...Array(10)].map((_, i) => (
                <tr key={i}>
                  <td className="px-5 py-3"><Skeleton className="h-3 w-6" /></td>
                  <td className="px-5 py-3"><div className="flex items-center gap-3"><Skeleton className="w-7 h-7 rounded-full shrink-0" /><div className="space-y-1.5"><Skeleton className="h-3 w-28" /><Skeleton className="h-2.5 w-20" /></div></div></td>
                  <td className="px-5 py-3 hidden sm:table-cell"><Skeleton className="h-5 w-16 rounded-full" /></td>
                  <td className="px-5 py-3 text-right"><Skeleton className="h-3 w-12 ml-auto" /></td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr><td colSpan={4} className="text-center text-slate-500 py-16">No users yet.</td></tr>
            ) : users.map((u, i) => {
              const rank = i + 1;
              const lm = LEVEL_META[u.karma_level] ?? LEVEL_META.Explorer;
              const m  = MEDAL[rank];
              return (
                <tr key={u.id} className={`transition-colors ${rank <= 3 ? "bg-white/1" : "hover:bg-white/2"}`}>
                  <td className="px-5 py-3 text-center">
                    {m
                      ? <span className="text-base">{m.emoji}</span>
                      : <span className="text-slate-600 font-mono">{rank}</span>
                    }
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-white/10" />
                        : <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ backgroundColor: `${lm.color}22`, color: lm.color }}>
                            {u.first_name?.[0] ?? "?"}
                          </div>
                      }
                      <div>
                        <p className="text-slate-200 font-medium">{u.first_name} {u.last_name}</p>
                        <p className="text-slate-500">@{u.username ?? "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 hidden sm:table-cell">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${lm.bg} ${lm.text}`}>
                      {u.karma_level}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-[#FF6B35] font-bold">{u.travel_karma.toLocaleString()}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
