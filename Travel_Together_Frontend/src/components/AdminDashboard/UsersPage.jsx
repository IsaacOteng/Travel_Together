import { useEffect, useState, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, CheckCircle, XCircle, Shield, AlertTriangle, User } from "lucide-react";
import { adminApi } from "../../services/api";
import toast from "react-hot-toast";

const KARMA_LEVELS = ["", "Explorer", "Navigator", "Legend"];

function Badge({ children, color = "slate" }) {
  const colors = {
    green:  "bg-green-500/15 text-green-400",
    red:    "bg-red-500/15 text-red-400",
    blue:   "bg-blue-500/15 text-blue-400",
    orange: "bg-orange-500/15 text-orange-400",
    purple: "bg-purple-500/15 text-purple-400",
    slate:  "bg-slate-500/15 text-slate-400",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}

function UserDrawer({ userId, onClose, onUpdate }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getUser(userId)
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, [userId]);

  const toggle = (field) => {
    adminApi.updateUser(userId, { [field]: !data[field] })
      .then(() => {
        setData(d => ({ ...d, [field]: !d[field] }));
        onUpdate();
        toast.success("User updated");
      })
      .catch(() => toast.error("Failed to update user"));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-50 w-full max-w-sm bg-[#0b1e30] border-l border-white/10 h-full overflow-y-auto p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold">User detail</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-7 h-7 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data ? (
          <>
            <div className="flex items-center gap-3">
              {data.avatar_url
                ? <img src={data.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover" />
                : <div className="w-14 h-14 rounded-full bg-[#FF6B35] flex items-center justify-center text-white text-xl font-bold">{data.first_name?.[0] ?? data.email?.[0]}</div>
              }
              <div>
                <p className="text-white font-semibold">{data.first_name} {data.last_name}</p>
                <p className="text-slate-400 text-sm">@{data.username ?? "—"}</p>
                <p className="text-slate-500 text-xs">{data.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Trips joined",    value: data.trips_joined },
                { label: "Trips led",       value: data.trips_led    },
                { label: "Karma",           value: data.travel_karma },
                { label: "Karma level",     value: data.karma_level  },
                { label: "SOS alerts",      value: data.sos_alerts   },
                { label: "Reports filed",   value: data.incidents_filed },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/5 rounded-lg p-3">
                  <p className="text-slate-500 text-xs">{label}</p>
                  <p className="text-white font-semibold mt-0.5">{value ?? "—"}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Actions</p>
              <button
                onClick={() => toggle("is_active")}
                className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${data.is_active
                    ? "bg-red-500/15 text-red-400 hover:bg-red-500/25"
                    : "bg-green-500/15 text-green-400 hover:bg-green-500/25"}`}
              >
                {data.is_active ? <XCircle size={15} /> : <CheckCircle size={15} />}
                {data.is_active ? "Deactivate account" : "Reactivate account"}
              </button>
              <button
                onClick={() => toggle("is_verified_traveller")}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors"
              >
                <Shield size={15} />
                {data.is_verified_traveller ? "Remove verified badge" : "Grant verified badge"}
              </button>
            </div>
          </>
        ) : (
          <p className="text-slate-500 text-sm">User not found.</p>
        )}
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [karma,    setKarma]    = useState("");
  const [isActive, setIsActive] = useState("");
  const [page,     setPage]     = useState(1);
  const [selected, setSelected] = useState(null);
  const [error,    setError]    = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = { page, search: search || undefined, karma_level: karma || undefined, is_active: isActive || undefined };
    adminApi.getUsers(params)
      .then(r => setData(r.data))
      .catch(() => setError("Failed to load users."))
      .finally(() => setLoading(false));
  }, [page, search, karma, isActive]);

  useEffect(() => { load(); }, [load]);

  const totalPages = data ? Math.ceil(data.count / 20) : 1;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-white font-bold text-xl">Users</h1>
        <p className="text-slate-500 text-sm mt-0.5">{data?.count ?? "—"} total users</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by email, username…"
            className="w-full bg-[#0b1e30] border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#FF6B35]/50"
          />
        </div>
        <select
          value={karma}
          onChange={e => { setKarma(e.target.value); setPage(1); }}
          className="bg-[#0b1e30] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-[#FF6B35]/50"
        >
          {KARMA_LEVELS.map(k => <option key={k} value={k}>{k || "All levels"}</option>)}
        </select>
        <select
          value={isActive}
          onChange={e => { setIsActive(e.target.value); setPage(1); }}
          className="bg-[#0b1e30] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-[#FF6B35]/50"
        >
          <option value="">All status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-[#0b1e30] rounded-xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-slate-500 font-medium px-4 py-3">User</th>
                <th className="text-left text-slate-500 font-medium px-4 py-3 hidden sm:table-cell">Karma</th>
                <th className="text-left text-slate-500 font-medium px-4 py-3 hidden md:table-cell">Location</th>
                <th className="text-left text-slate-500 font-medium px-4 py-3">Status</th>
                <th className="text-left text-slate-500 font-medium px-4 py-3 hidden lg:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center text-slate-500 py-12">
                  <div className="flex justify-center"><div className="w-6 h-6 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin" /></div>
                </td></tr>
              ) : data?.results?.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-slate-500 py-12">No users found.</td></tr>
              ) : data?.results?.map(u => (
                <tr
                  key={u.id}
                  onClick={() => setSelected(u.id)}
                  className="border-b border-white/5 hover:bg-white/3 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        : <div className="w-8 h-8 rounded-full bg-[#FF6B35]/20 flex items-center justify-center flex-shrink-0"><User size={14} className="text-[#FF6B35]" /></div>
                      }
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate">{u.first_name} {u.last_name}</p>
                        <p className="text-slate-500 text-xs truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div>
                      <span className="text-white font-medium">{u.travel_karma}</span>
                      <span className="text-slate-500 text-xs ml-1">· {u.karma_level}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 hidden md:table-cell">{u.city ?? "—"}{u.country ? `, ${u.country}` : ""}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Badge color={u.is_active ? "green" : "red"}>{u.is_active ? "Active" : "Inactive"}</Badge>
                      {u.is_verified_traveller && <Badge color="blue">Verified</Badge>}
                      {u.is_staff && <Badge color="orange">Staff</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
                    {u.date_joined ? new Date(u.date_joined).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <span className="text-slate-500 text-xs">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <UserDrawer userId={selected} onClose={() => setSelected(null)} onUpdate={load} />
      )}
    </div>
  );
}
