import { useEffect, useState, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, CheckCircle, XCircle, Shield, AlertTriangle, User } from "lucide-react";
import { adminApi } from "../../services/api";
import toast from "react-hot-toast";

const KARMA_LEVELS = ["", "Explorer", "Navigator", "Legend"];

const LEVEL_COLOR = { Legend: "#fbbf24", Navigator: "#60a5fa", Explorer: "#64748b" };

/* ── Shared atoms ───────────────────────────────────────────────────────────── */
function Badge({ children, color = "slate" }) {
  const map = {
    green:  "bg-green-500/15 text-green-400 ring-1 ring-green-500/20",
    red:    "bg-red-500/15 text-red-400 ring-1 ring-red-500/20",
    blue:   "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/20",
    orange: "bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/20",
    slate:  "bg-slate-500/15 text-slate-400 ring-1 ring-slate-500/20",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[color]}`}>
      {children}
    </span>
  );
}

function Skeleton({ className }) {
  return <div className={`bg-white/5 rounded-lg animate-pulse ${className}`} />;
}

/* ── User detail drawer ─────────────────────────────────────────────────────── */
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
      .then(() => { setData(d => ({ ...d, [field]: !d[field] })); onUpdate(); toast.success("Updated"); })
      .catch(() => toast.error("Failed to update"));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 w-full max-w-sm bg-[#0a1929] border-l border-white/6 h-full overflow-y-auto flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/6 sticky top-0 bg-[#0a1929] z-10">
          <p className="text-white font-semibold">User detail</p>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-lg leading-none">×</button>
        </div>

        <div className="flex-1 p-6 space-y-6">
          {loading ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3"><Skeleton className="w-14 h-14 rounded-full" /><div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div></div>
              <div className="grid grid-cols-2 gap-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
            </div>
          ) : data ? (
            <>
              {/* Avatar + name */}
              <div className="flex items-center gap-4">
                {data.avatar_url
                  ? <img src={data.avatar_url} alt="" className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white/10" />
                  : <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-[#FF6B35] to-[#c04a1a] flex items-center justify-center text-white text-xl font-bold">{data.first_name?.[0] ?? data.email?.[0]}</div>
                }
                <div>
                  <p className="text-white font-semibold">{[data.first_name, data.last_name].filter(Boolean).join(" ") || "—"}</p>
                  <p className="text-slate-400 text-xs mt-0.5">@{data.username ?? "no username"}</p>
                  <p className="text-slate-600 text-xs">{data.email}</p>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Trips joined",  value: data.trips_joined },
                  { label: "Trips led",     value: data.trips_led    },
                  { label: "Travel karma",  value: data.travel_karma },
                  { label: "Level",         value: data.karma_level  },
                  { label: "SOS alerts",    value: data.sos_alerts   },
                  { label: "Reports filed", value: data.incidents_filed },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white/3 rounded-xl p-3 border border-white/4">
                    <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wider">{label}</p>
                    <p className="text-white font-bold text-lg mt-0.5">{value ?? "—"}</p>
                  </div>
                ))}
              </div>

              {/* Flags */}
              <div className="flex flex-wrap gap-2">
                {data.is_active           && <Badge color="green">Active</Badge>}
                {!data.is_active          && <Badge color="red">Inactive</Badge>}
                {data.is_verified_traveller && <Badge color="blue">Verified traveller</Badge>}
                {data.email_verified      && <Badge color="green">Email verified</Badge>}
                {data.is_staff            && <Badge color="orange">Staff</Badge>}
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest">Actions</p>
                <button onClick={() => toggle("is_active")}
                  className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium transition-colors
                    ${data.is_active
                      ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 ring-1 ring-red-500/20"
                      : "bg-green-500/10 text-green-400 hover:bg-green-500/20 ring-1 ring-green-500/20"}`}>
                  {data.is_active ? <XCircle size={15} /> : <CheckCircle size={15} />}
                  {data.is_active ? "Deactivate account" : "Reactivate account"}
                </button>
                <button onClick={() => toggle("is_verified_traveller")}
                  className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 ring-1 ring-blue-500/20 transition-colors">
                  <Shield size={15} />
                  {data.is_verified_traveller ? "Remove verified badge" : "Grant verified badge"}
                </button>
              </div>
            </>
          ) : (
            <p className="text-slate-500 text-sm text-center pt-12">User not found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Table shared atoms ─────────────────────────────────────────────────────── */
function Paginator({ page, total, perPage, onChange }) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-white/6">
      <span className="text-slate-500 text-xs">Page {page} of {totalPages} · {total} total</span>
      <div className="flex gap-1">
        <button disabled={page <= 1} onClick={() => onChange(p => p - 1)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft size={15} />
        </button>
        <button disabled={page >= totalPages} onClick={() => onChange(p => p + 1)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

/* ── Users page ─────────────────────────────────────────────────────────────── */
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
    setLoading(true); setError(null);
    adminApi.getUsers({ page, search: search || undefined, karma_level: karma || undefined, is_active: isActive || undefined })
      .then(r => setData(r.data))
      .catch(() => setError("Failed to load users."))
      .finally(() => setLoading(false));
  }, [page, search, karma, isActive]);

  useEffect(() => { load(); }, [load]);

  const selectInput = "bg-[#0d1f33] border border-white/6 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-[#FF6B35]/50 transition-colors";

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="text-white font-bold text-2xl tracking-tight">Users</h1>
        <p className="text-slate-500 text-sm mt-0.5">{data?.count ?? "—"} registered accounts</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-52">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search email, username, name…"
            className="w-full bg-[#0d1f33] border border-white/6 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#FF6B35]/50 transition-colors" />
        </div>
        <select value={karma} onChange={e => { setKarma(e.target.value); setPage(1); }} className={selectInput}>
          {KARMA_LEVELS.map(k => <option key={k} value={k}>{k || "All levels"}</option>)}
        </select>
        <select value={isActive} onChange={e => { setIsActive(e.target.value); setPage(1); }} className={selectInput}>
          <option value="">All status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-3 text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-sm">
          <AlertTriangle size={16} className="shrink-0" /> {error}
          <button onClick={load} className="ml-auto text-xs underline">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#0d1f33] rounded-2xl border border-white/6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/6">
                <th className="text-left text-slate-500 font-semibold uppercase tracking-wider px-5 py-3.5">User</th>
                <th className="text-left text-slate-500 font-semibold uppercase tracking-wider px-5 py-3.5 hidden sm:table-cell">Karma</th>
                <th className="text-left text-slate-500 font-semibold uppercase tracking-wider px-5 py-3.5 hidden md:table-cell">Location</th>
                <th className="text-left text-slate-500 font-semibold uppercase tracking-wider px-5 py-3.5">Status</th>
                <th className="text-left text-slate-500 font-semibold uppercase tracking-wider px-5 py-3.5 hidden lg:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3.5"><div className="flex items-center gap-3"><Skeleton className="w-8 h-8 rounded-full shrink-0" /><div className="space-y-1.5"><Skeleton className="h-3 w-28" /><Skeleton className="h-2.5 w-36" /></div></div></td>
                    <td className="px-5 py-3.5 hidden sm:table-cell"><Skeleton className="h-3 w-16" /></td>
                    <td className="px-5 py-3.5 hidden md:table-cell"><Skeleton className="h-3 w-20" /></td>
                    <td className="px-5 py-3.5"><Skeleton className="h-5 w-14 rounded-full" /></td>
                    <td className="px-5 py-3.5 hidden lg:table-cell"><Skeleton className="h-3 w-20" /></td>
                  </tr>
                ))
              ) : data?.results?.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-slate-500 py-16">No users match your filters.</td></tr>
              ) : data?.results?.map(u => (
                <tr key={u.id} onClick={() => setSelected(u.id)}
                  className="hover:bg-white/2 cursor-pointer transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-white/10" />
                        : <div className="w-8 h-8 rounded-full bg-[#FF6B35]/15 flex items-center justify-center shrink-0"><User size={13} className="text-[#FF6B35]" /></div>
                      }
                      <div className="min-w-0">
                        <p className="text-slate-200 font-medium truncate group-hover:text-white transition-colors">
                          {[u.first_name, u.last_name].filter(Boolean).join(" ") || "—"}
                        </p>
                        <p className="text-slate-500 truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: LEVEL_COLOR[u.karma_level] ?? "#64748b" }} />
                      <span className="text-white font-semibold">{u.travel_karma}</span>
                      <span className="text-slate-500">· {u.karma_level}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 hidden md:table-cell">
                    {[u.city, u.country].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      <Badge color={u.is_active ? "green" : "red"}>{u.is_active ? "Active" : "Inactive"}</Badge>
                      {u.is_verified_traveller && <Badge color="blue">Verified</Badge>}
                      {u.is_staff && <Badge color="orange">Staff</Badge>}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 hidden lg:table-cell">
                    {u.date_joined ? new Date(u.date_joined).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Paginator page={page} total={data?.count ?? 0} perPage={20} onChange={setPage} />
      </div>

      {selected && <UserDrawer userId={selected} onClose={() => setSelected(null)} onUpdate={load} />}
    </div>
  );
}
