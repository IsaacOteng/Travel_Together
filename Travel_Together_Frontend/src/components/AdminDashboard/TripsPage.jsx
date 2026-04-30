import { useEffect, useState, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, AlertTriangle, Map, Users } from "lucide-react";
import { adminApi } from "../../services/api";
import toast from "react-hot-toast";

const STATUSES = ["", "draft", "published", "active", "completed", "archived"];

const STATUS_META = {
  draft:     { bg: "bg-slate-500/15",  text: "text-slate-400",  ring: "ring-slate-500/20"  },
  published: { bg: "bg-blue-500/15",   text: "text-blue-400",   ring: "ring-blue-500/20"   },
  active:    { bg: "bg-green-500/15",  text: "text-green-400",  ring: "ring-green-500/20"  },
  completed: { bg: "bg-purple-500/15", text: "text-purple-400", ring: "ring-purple-500/20" },
  archived:  { bg: "bg-slate-600/15",  text: "text-slate-500",  ring: "ring-slate-600/20"  },
};

function StatusPill({ value }) {
  const m = STATUS_META[value] ?? STATUS_META.draft;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ring-1 ${m.bg} ${m.text} ${m.ring}`}>
      {value}
    </span>
  );
}

function Skeleton({ className }) {
  return <div className={`bg-white/5 rounded-lg animate-pulse ${className}`} />;
}

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

function TripDrawer({ tripId, onClose, onUpdate }) {
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const save = () => {
    if (!status) return;
    setSaving(true);
    adminApi.updateTrip(tripId, { status })
      .then(() => { toast.success("Trip updated"); onUpdate(); onClose(); })
      .catch(() => toast.error("Failed to update"))
      .finally(() => setSaving(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 w-full max-w-xs bg-[#0a1929] border-l border-white/6 h-full flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/6">
          <p className="text-white font-semibold">Edit trip status</p>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 text-lg leading-none">×</button>
        </div>
        <div className="flex-1 p-6 space-y-4">
          <p className="text-slate-400 text-sm">Select a new status for this trip.</p>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="w-full bg-[#060f1a] border border-white/6 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-[#FF6B35]/50">
            <option value="">— choose status —</option>
            {STATUSES.filter(Boolean).map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
        </div>
        <div className="p-6 border-t border-white/6">
          <button disabled={!status || saving} onClick={save}
            className="w-full bg-[#FF6B35] hover:bg-[#e55a25] text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {saving ? "Saving…" : "Apply status"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TripsPage() {
  const [data,     setData]    = useState(null);
  const [loading,  setLoading] = useState(true);
  const [search,   setSearch]  = useState("");
  const [status,   setStatus]  = useState("");
  const [page,     setPage]    = useState(1);
  const [selected, setSelected] = useState(null);
  const [error,    setError]   = useState(null);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    adminApi.getTrips({ page, search: search || undefined, status: status || undefined })
      .then(r => setData(r.data))
      .catch(() => setError("Failed to load trips."))
      .finally(() => setLoading(false));
  }, [page, search, status]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="text-white font-bold text-2xl tracking-tight">Trips</h1>
        <p className="text-slate-500 text-sm mt-0.5">{data?.count ?? "—"} total trips</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-52">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search title or destination…"
            className="w-full bg-[#0d1f33] border border-white/6 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#FF6B35]/50 transition-colors" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUSES.map(s => (
            <button key={s} onClick={() => { setStatus(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors capitalize
                ${status === s ? "bg-[#FF6B35] text-white" : "bg-[#0d1f33] border border-white/6 text-slate-400 hover:text-white hover:border-white/10"}`}>
              {s || "All"}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-sm">
          <AlertTriangle size={16} className="shrink-0" /> {error}
          <button onClick={load} className="ml-auto text-xs underline">Retry</button>
        </div>
      )}

      <div className="bg-[#0d1f33] rounded-2xl border border-white/6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/6">
                <th className="text-left text-slate-500 font-semibold uppercase tracking-wider px-5 py-3.5">Trip</th>
                <th className="text-left text-slate-500 font-semibold uppercase tracking-wider px-5 py-3.5">Status</th>
                <th className="text-left text-slate-500 font-semibold uppercase tracking-wider px-5 py-3.5 hidden sm:table-cell">Chief</th>
                <th className="text-left text-slate-500 font-semibold uppercase tracking-wider px-5 py-3.5 hidden md:table-cell">Dates</th>
                <th className="text-left text-slate-500 font-semibold uppercase tracking-wider px-5 py-3.5 hidden lg:table-cell">Spots</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3.5"><div className="flex items-center gap-3"><Skeleton className="w-8 h-8 rounded-xl shrink-0" /><div className="space-y-1.5"><Skeleton className="h-3 w-32" /><Skeleton className="h-2.5 w-24" /></div></div></td>
                    <td className="px-5 py-3.5"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="px-5 py-3.5 hidden sm:table-cell"><Skeleton className="h-3 w-20" /></td>
                    <td className="px-5 py-3.5 hidden md:table-cell"><Skeleton className="h-3 w-28" /></td>
                    <td className="px-5 py-3.5 hidden lg:table-cell"><Skeleton className="h-3 w-10" /></td>
                    <td className="px-5 py-3.5"><Skeleton className="h-6 w-12 rounded-lg" /></td>
                  </tr>
                ))
              ) : data?.results?.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-slate-500 py-16">No trips match your filters.</td></tr>
              ) : data?.results?.map(t => (
                <tr key={t.id} className="hover:bg-white/2 transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#FF6B35]/10 flex items-center justify-center shrink-0">
                        <Map size={13} className="text-[#FF6B35]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-slate-200 font-medium truncate group-hover:text-white transition-colors">{t.title}</p>
                        <p className="text-slate-500 truncate">{t.destination}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5"><StatusPill value={t.status} /></td>
                  <td className="px-5 py-3.5 text-slate-400 hidden sm:table-cell">
                    {t.chief?.username ?? t.chief?.email ?? "—"}
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 hidden md:table-cell">
                    {t.date_start} → {t.date_end}
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    <div className="flex items-center gap-1 text-slate-300">
                      <Users size={11} className="text-slate-500" />
                      {t.member_count}/{t.spots_total}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button onClick={() => setSelected(t.id)}
                      className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white border border-white/6 hover:border-white/10 hover:bg-white/5 transition-colors text-xs">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Paginator page={page} total={data?.count ?? 0} perPage={20} onChange={setPage} />
      </div>

      {selected && <TripDrawer tripId={selected} onClose={() => setSelected(null)} onUpdate={load} />}
    </div>
  );
}
