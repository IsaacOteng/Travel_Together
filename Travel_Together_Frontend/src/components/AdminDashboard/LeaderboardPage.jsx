import { useEffect, useState } from "react";
import { BarChart2, AlertTriangle, Crown } from "lucide-react";
import { adminApi } from "../../services/api";

const LEVEL_STYLE = {
  Legend:    "bg-yellow-500/15 text-yellow-400",
  Navigator: "bg-blue-500/15 text-blue-400",
  Explorer:  "bg-slate-500/15 text-slate-400",
};

const RANK_MEDAL = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function LeaderboardPage() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    adminApi.getLeaderboard()
      .then(r => setUsers(r.data))
      .catch(() => setError("Failed to load leaderboard."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-white font-bold text-xl">Karma Leaderboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">Top 50 travellers by travel karma</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-[#0b1e30] rounded-xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-slate-500 font-medium px-4 py-3 w-12">Rank</th>
                  <th className="text-left text-slate-500 font-medium px-4 py-3">Traveller</th>
                  <th className="text-left text-slate-500 font-medium px-4 py-3 hidden sm:table-cell">Level</th>
                  <th className="text-right text-slate-500 font-medium px-4 py-3">Karma</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={4} className="text-center text-slate-500 py-12">No users yet.</td></tr>
                ) : users.map((u, i) => {
                  const rank = i + 1;
                  return (
                    <tr key={u.id} className={`border-b border-white/5 transition-colors ${rank <= 3 ? "bg-white/2" : "hover:bg-white/3"}`}>
                      <td className="px-4 py-3 text-center">
                        {RANK_MEDAL[rank]
                          ? <span className="text-lg">{RANK_MEDAL[rank]}</span>
                          : <span className="text-slate-500 font-mono text-xs">{rank}</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {u.avatar_url
                            ? <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                            : (
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0
                                ${rank === 1 ? "bg-yellow-500" : rank === 2 ? "bg-slate-400" : rank === 3 ? "bg-orange-600" : "bg-[#FF6B35]/20"}`}>
                                {rank <= 3 ? <Crown size={14} /> : (u.first_name?.[0] ?? "?")}
                              </div>
                            )
                          }
                          <div>
                            <p className="text-white font-medium">{u.first_name} {u.last_name}</p>
                            <p className="text-slate-500 text-xs">@{u.username ?? "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${LEVEL_STYLE[u.karma_level] ?? ""}`}>
                          {u.karma_level}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[#FF6B35] font-bold">{u.travel_karma.toLocaleString()}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
