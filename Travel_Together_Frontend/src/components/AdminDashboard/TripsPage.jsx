import { useEffect, useState, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, AlertTriangle, Map } from "lucide-react";
import { adminApi } from "../../services/api";
import toast from "react-hot-toast";

const STATUSES = ["", "draft", "published", "active", "completed", "archived"];

const STATUS_STYLE = {
  draft:     "bg-slate-500/15 text-slate-400",
  published: "bg-blue-500/15 text-blue-400",
  active:    "bg-green-500/15 text-green-400",
  completed: "bg-purple-500/15 text-purple-400",
  archived:  "bg-slate-600/15 text-slate-500",
};

function StatusBadge({ value }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLE[value] ?? "bg-slate-500/15 text-slate-400"}`}>
      {value}
    </span>
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
      .catch(() => toast.error("Failed to update trip"))
      .finally(() => setSaving(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-50 w-full max-w-xs bg-[#0b1e30] border-l border-white/10 h-full p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold">Change trip status</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <p className="text-slate-400 text-sm">Select a new status for this trip.</p>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="bg-[#071422] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-[#FF6B35]/50"
        >
          <option value="">— pick status —</option>
          {STATUSES.filter(Boolean).map(s => (
            <option key={s} value={s} className="capitalize">{s}</option>
          ))}
        </select>
        <button
          disabled={!status || saving}
          onClick={save}
          className="mt-auto w-full bg-[#FF6B35] hover:bg-[#e55a25] text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : "Apply"}
        </button>
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
    setLoading(true);
    setError(null);
    adminApi.getTrips({ page, search: search || undefined, status: status || undefined })
      .then(r => setData(r.data))
      .catch(() => setError("Failed to load trips."))
      .finally(() => setLoading(false));
  }, [page, search, status]);

  useEffect(() => { load(); }, [load]);

  const totalPages = data ? Math.ceil(data.count / 20) : 1;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-white font-bold text-xl">Trips</h1>
        <p className="text-slate-500 text-sm mt-0.5">{data?.count ?? "—"} total trips</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by title or destination…"
            className="w-full bg-[#0b1e30] border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#FF6B35]/50"
          />
        </div>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="bg-[#0b1e30] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-[#FF6B35]/50"
        >
          {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s || "All statuses"}</option>)}
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <div className="bg-[#0b1e30] rounded-xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-slate-500 font-medium px-4 py-3">Trip</th>
                <th className="text-left text-slate-500 font-medium px-4 py-3">Status</th>
                <th className="text-left text-slate-500 font-medium px-4 py-3 hidden sm:table-cell">Chief</th>
                <th className="text-left text-slate-500 font-medium px-4 py-3 hidden md:table-cell">Dates</th>
                <th className="text-left text-slate-500 font-medium px-4 py-3 hidden lg:table-cell">Members</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12">
                  <div className="flex justify-center"><div className="w-6 h-6 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin" /></div>
                </td></tr>
              ) : data?.results?.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-slate-500 py-12">No trips found.</td></tr>
              ) : data?.results?.map(t => (
                <tr key={t.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#FF6B35]/10 flex items-center justify-center flex-shrink-0">
                        <Map size={14} className="text-[#FF6B35]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate">{t.title}</p>
                        <p className="text-slate-500 text-xs truncate">{t.destination}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge value={t.status} /></td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <p className="text-slate-300 text-xs">{t.chief?.username ?? t.chief?.email ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-slate-400 text-xs">
                    {t.date_start} → {t.date_end}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-slate-300">
                    {t.member_count} / {t.spots_total}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelected(t.id)}
                      className="text-xs text-slate-400 hover:text-white border border-white/10 hover:border-white/25 rounded-lg px-3 py-1.5 transition-colors"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <span className="text-slate-500 text-xs">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft size={16} />
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selected && <TripDrawer tripId={selected} onClose={() => setSelected(null)} onUpdate={load} />}
    </div>
  );
}
