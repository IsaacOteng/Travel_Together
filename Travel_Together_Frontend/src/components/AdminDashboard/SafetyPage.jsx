import { useEffect, useState, useCallback } from "react";
import { ShieldAlert, FileWarning, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { adminApi } from "../../services/api";
import toast from "react-hot-toast";

/* ── Shared ─────────────────────────────────────────────────────────────────── */
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

function FilterBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors capitalize
        ${active ? "bg-[#FF6B35] text-white" : "bg-[#0d1f33] border border-white/6 text-slate-400 hover:text-white hover:border-white/10"}`}>
      {children}
    </button>
  );
}

/* ── SOS Alerts ─────────────────────────────────────────────────────────────── */
const SOS_STATUS = {
  active:      { bg: "bg-red-500/15",   text: "text-red-400",   ring: "ring-red-500/20"   },
  resolved:    { bg: "bg-green-500/15", text: "text-green-400", ring: "ring-green-500/20" },
  false_alarm: { bg: "bg-slate-500/15", text: "text-slate-400", ring: "ring-slate-500/20" },
};

const TRIGGER_LABEL = { manual: "Manual", stationary: "Stationary", deviation: "Route deviation" };

function SOSDrawer({ alert, onClose, onUpdate }) {
  const [newStatus, setNewStatus] = useState("resolved");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const save = () => {
    setSaving(true);
    adminApi.updateSOSAlert(alert.id, { status: newStatus, resolution_notes: notes })
      .then(() => { toast.success("Alert resolved"); onUpdate(); onClose(); })
      .catch(() => toast.error("Failed to update"))
      .finally(() => setSaving(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 w-full max-w-sm bg-[#0a1929] border-l border-white/6 h-full flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/6">
          <p className="text-white font-semibold flex items-center gap-2"><ShieldAlert size={15} className="text-red-400" /> Resolve SOS alert</p>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 text-lg leading-none">×</button>
        </div>

        <div className="flex-1 p-6 space-y-5 overflow-y-auto">
          <div className="bg-red-500/8 border border-red-500/20 rounded-2xl p-4 space-y-2 text-xs">
            <p className="text-white font-semibold">{alert.member?.username ?? alert.member?.email}</p>
            <p className="text-slate-400">Trip: <span className="text-slate-200">{alert.trip?.title}</span></p>
            <p className="text-slate-400">Trigger: <span className="text-slate-200">{TRIGGER_LABEL[alert.trigger_type] ?? alert.trigger_type}</span></p>
            <p className="text-slate-400">Time: <span className="text-slate-200">{new Date(alert.created_at).toLocaleString()}</span></p>
            {alert.resolution_notes && <p className="text-slate-400">Current notes: <span className="text-slate-200">{alert.resolution_notes}</span></p>}
          </div>

          <div className="space-y-2">
            <label className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest">Resolution type</label>
            <div className="grid grid-cols-2 gap-2">
              {[["resolved", "Resolved"], ["false_alarm", "False alarm"]].map(([v, l]) => (
                <button key={v} onClick={() => setNewStatus(v)}
                  className={`py-2.5 rounded-xl text-xs font-semibold transition-colors
                    ${newStatus === v ? "bg-[#FF6B35] text-white" : "bg-white/5 text-slate-400 hover:bg-white/8 hover:text-white border border-white/6"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
              placeholder="Add resolution details…"
              className="w-full bg-[#060f1a] border border-white/6 rounded-xl px-3 py-2.5 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-[#FF6B35]/50 resize-none" />
          </div>
        </div>

        <div className="p-6 border-t border-white/6">
          <button disabled={saving} onClick={save}
            className="w-full bg-[#FF6B35] hover:bg-[#e55a25] text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-40">
            {saving ? "Saving…" : "Confirm resolution"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SOSTab() {
  const [data,     setData]    = useState(null);
  const [loading,  setLoading] = useState(true);
  const [filter,   setFilter]  = useState("");
  const [page,     setPage]    = useState(1);
  const [selected, setSelected] = useState(null);
  const [error,    setError]   = useState(null);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    adminApi.getSOSAlerts({ page, status: filter || undefined })
      .then(r => setData(r.data))
      .catch(() => setError("Failed to load SOS alerts."))
      .finally(() => setLoading(false));
  }, [page, filter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 flex-wrap">
        {[["", "All"], ["active", "Active"], ["resolved", "Resolved"], ["false_alarm", "False alarm"]].map(([v, l]) => (
          <FilterBtn key={v} active={filter === v} onClick={() => { setFilter(v); setPage(1); }}>{l}</FilterBtn>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-3 text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-xs">
          <AlertTriangle size={15} className="shrink-0" /> {error}
          <button onClick={load} className="ml-auto underline">Retry</button>
        </div>
      )}

      <div className="bg-[#0d1f33] rounded-2xl border border-white/6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/6">
                <th className="text-left text-slate-500 font-semibold uppercase tracking-wider px-5 py-3.5">Member</th>
                <th className="text-left text-slate-500 font-semibold uppercase tracking-wider px-5 py-3.5 hidden sm:table-cell">Trip</th>
                <th className="text-left text-slate-500 font-semibold uppercase tracking-wider px-5 py-3.5">Trigger</th>
                <th className="text-left text-slate-500 font-semibold uppercase tracking-wider px-5 py-3.5">Status</th>
                <th className="text-left text-slate-500 font-semibold uppercase tracking-wider px-5 py-3.5 hidden md:table-cell">Time</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3.5"><div className="space-y-1.5"><Skeleton className="h-3 w-24" /><Skeleton className="h-2.5 w-32" /></div></td>
                    <td className="px-5 py-3.5 hidden sm:table-cell"><Skeleton className="h-3 w-28" /></td>
                    <td className="px-5 py-3.5"><Skeleton className="h-3 w-20" /></td>
                    <td className="px-5 py-3.5"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="px-5 py-3.5 hidden md:table-cell"><Skeleton className="h-3 w-28" /></td>
                    <td className="px-5 py-3.5" />
                  </tr>
                ))
              ) : data?.results?.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-slate-500 py-16">No SOS alerts found.</td></tr>
              ) : data?.results?.map(a => {
                const m = SOS_STATUS[a.status] ?? SOS_STATUS.active;
                return (
                  <tr key={a.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-slate-200 font-medium">{a.member?.username ?? "—"}</p>
                      <p className="text-slate-500">{a.member?.email}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 hidden sm:table-cell">{a.trip?.title ?? "—"}</td>
                    <td className="px-5 py-3.5 text-slate-300">{TRIGGER_LABEL[a.trigger_type] ?? a.trigger_type}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ${m.bg} ${m.text} ${m.ring}`}>
                        {a.status === "active" && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
                        {a.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell">{new Date(a.created_at).toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-right">
                      {a.status === "active" && (
                        <button onClick={() => setSelected(a)}
                          className="px-3 py-1.5 rounded-lg text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors text-xs font-medium">
                          Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Paginator page={page} total={data?.count ?? 0} perPage={20} onChange={setPage} />
      </div>

      {selected && <SOSDrawer alert={selected} onClose={() => setSelected(null)} onUpdate={load} />}
    </div>
  );
}

/* ── Incident Reports ────────────────────────────────────────────────────────── */
const INCIDENT_STATUS = {
  pending:      { bg: "bg-yellow-500/15", text: "text-yellow-400", ring: "ring-yellow-500/20" },
  under_review: { bg: "bg-blue-500/15",   text: "text-blue-400",   ring: "ring-blue-500/20"   },
  resolved:     { bg: "bg-green-500/15",  text: "text-green-400",  ring: "ring-green-500/20"  },
  dismissed:    { bg: "bg-slate-500/15",  text: "text-slate-400",  ring: "ring-slate-500/20"  },
};

const INCIDENT_TYPE = {
  safety:         { bg: "bg-red-500/15",    text: "text-red-400"    },
  harassment:     { bg: "bg-orange-500/15", text: "text-orange-400" },
  fraud:          { bg: "bg-purple-500/15", text: "text-purple-400" },
  rule_violation: { bg: "bg-yellow-500/15", text: "text-yellow-400" },
  other:          { bg: "bg-slate-500/15",  text: "text-slate-400"  },
};

function IncidentDrawer({ incident, onClose, onUpdate }) {
  const [newStatus, setNewStatus] = useState(incident.status);
  const [saving,    setSaving]    = useState(false);

  const save = () => {
    setSaving(true);
    adminApi.updateIncident(incident.id, { status: newStatus })
      .then(() => { toast.success("Incident updated"); onUpdate(); onClose(); })
      .catch(() => toast.error("Failed to update"))
      .finally(() => setSaving(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 w-full max-w-sm bg-[#0a1929] border-l border-white/6 h-full flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/6">
          <p className="text-white font-semibold text-sm">#{incident.reference_number}</p>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 text-lg leading-none">×</button>
        </div>

        <div className="flex-1 p-6 space-y-5 overflow-y-auto">
          <div className="space-y-2 text-xs">
            {[
              ["Type",     incident.incident_type?.replace("_", " ")],
              ["Trip",     incident.trip?.title],
              ["Reporter", incident.reporter?.username ?? incident.reporter?.email],
              ["Reported", incident.reported_user ? (incident.reported_user.username ?? incident.reported_user.email) : "—"],
              ["Filed",    new Date(incident.created_at).toLocaleString()],
            ].map(([k, v]) => (
              <div key={k} className="flex items-start gap-3">
                <span className="text-slate-500 w-20 shrink-0">{k}</span>
                <span className="text-slate-200 capitalize">{v ?? "—"}</span>
              </div>
            ))}
          </div>

          <div className="bg-white/3 border border-white/6 rounded-2xl p-4">
            <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest mb-2">Description</p>
            <p className="text-slate-300 text-xs leading-relaxed">{incident.description}</p>
          </div>

          <div className="space-y-2">
            <label className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest">Update status</label>
            <div className="grid grid-cols-2 gap-2">
              {["pending", "under_review", "resolved", "dismissed"].map(s => (
                <button key={s} onClick={() => setNewStatus(s)}
                  className={`py-2.5 rounded-xl text-xs font-semibold transition-colors capitalize
                    ${newStatus === s ? "bg-[#FF6B35] text-white" : "bg-white/5 text-slate-400 hover:bg-white/8 hover:text-white border border-white/6"}`}>
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/6">
          <button disabled={saving || newStatus === incident.status} onClick={save}
            className="w-full bg-[#FF6B35] hover:bg-[#e55a25] text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {saving ? "Saving…" : "Update status"}
          </button>
        </div>
      </div>
    </div>
  );
}

function IncidentsTab() {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page,       setPage]       = useState(1);
  const [selected,   setSelected]   = useState(null);
  const [error,      setError]      = useState(null);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    adminApi.getIncidents({ page, status: filter || undefined, type: typeFilter || undefined })
      .then(r => setData(r.data))
      .catch(() => setError("Failed to load incidents."))
      .finally(() => setLoading(false));
  }, [page, filter, typeFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {[["", "All"], ["pending", "Pending"], ["under_review", "Under review"], ["resolved", "Resolved"], ["dismissed", "Dismissed"]].map(([v, l]) => (
            <FilterBtn key={v} active={filter === v} onClick={() => { setFilter(v); setPage(1); }}>{l}</FilterBtn>
          ))}
        </div>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="bg-[#0d1f33] border border-white/6 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-[#FF6B35]/50">
          <option value="">All types</option>
          {["safety", "harassment", "fraud", "rule_violation", "other"].map(t => (
            <option key={t} value={t} className="capitalize">{t.replace("_", " ")}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-3 text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-xs">
          <AlertTriangle size={15} className="shrink-0" /> {error}
          <button onClick={load} className="ml-auto underline">Retry</button>
        </div>
      )}

      <div className="bg-[#0d1f33] rounded-2xl border border-white/6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/6">
                <th className="text-left text-slate-500 font-semibold uppercase tracking-wider px-5 py-3.5">Ref</th>
                <th className="text-left text-slate-500 font-semibold uppercase tracking-wider px-5 py-3.5">Type</th>
                <th className="text-left text-slate-500 font-semibold uppercase tracking-wider px-5 py-3.5 hidden sm:table-cell">Reporter</th>
                <th className="text-left text-slate-500 font-semibold uppercase tracking-wider px-5 py-3.5 hidden md:table-cell">Trip</th>
                <th className="text-left text-slate-500 font-semibold uppercase tracking-wider px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3.5"><Skeleton className="h-3 w-20" /></td>
                    <td className="px-5 py-3.5"><Skeleton className="h-5 w-20 rounded-full" /></td>
                    <td className="px-5 py-3.5 hidden sm:table-cell"><Skeleton className="h-3 w-24" /></td>
                    <td className="px-5 py-3.5 hidden md:table-cell"><Skeleton className="h-3 w-28" /></td>
                    <td className="px-5 py-3.5"><Skeleton className="h-5 w-20 rounded-full" /></td>
                    <td className="px-5 py-3.5"><Skeleton className="h-6 w-14 rounded-lg" /></td>
                  </tr>
                ))
              ) : data?.results?.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-slate-500 py-16">No incidents found.</td></tr>
              ) : data?.results?.map(r => {
                const sm = INCIDENT_STATUS[r.status] ?? INCIDENT_STATUS.pending;
                const tm = INCIDENT_TYPE[r.incident_type] ?? INCIDENT_TYPE.other;
                return (
                  <tr key={r.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-slate-400">{r.reference_number}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${tm.bg} ${tm.text}`}>
                        {r.incident_type.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-300 hidden sm:table-cell">{r.reporter?.username ?? r.reporter?.email ?? "—"}</td>
                    <td className="px-5 py-3.5 text-slate-400 hidden md:table-cell">{r.trip?.title ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 capitalize ${sm.bg} ${sm.text} ${sm.ring}`}>
                        {r.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => setSelected(r)}
                        className="px-3 py-1.5 rounded-lg text-slate-400 border border-white/6 hover:border-white/10 hover:bg-white/5 hover:text-white transition-colors text-xs">
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Paginator page={page} total={data?.count ?? 0} perPage={20} onChange={setPage} />
      </div>

      {selected && <IncidentDrawer incident={selected} onClose={() => setSelected(null)} onUpdate={load} />}
    </div>
  );
}

/* ── Safety page ─────────────────────────────────────────────────────────────── */
export default function SafetyPage() {
  const [tab, setTab] = useState("sos");

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="text-white font-bold text-2xl tracking-tight">Safety</h1>
        <p className="text-slate-500 text-sm mt-0.5">Monitor SOS alerts and incident reports</p>
      </div>

      <div className="flex gap-2 border-b border-white/6 pb-0">
        {[
          { id: "sos",       label: "SOS Alerts",        Icon: ShieldAlert },
          { id: "incidents", label: "Incident Reports",  Icon: FileWarning },
        ].map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors -mb-px
              ${tab === id
                ? "text-[#FF6B35] border-[#FF6B35]"
                : "text-slate-400 border-transparent hover:text-slate-200"}`}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === "sos" ? <SOSTab /> : <IncidentsTab />}
    </div>
  );
}
