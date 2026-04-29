import { useEffect, useState, useCallback } from "react";
import { ShieldAlert, FileWarning, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle } from "lucide-react";
import { adminApi } from "../../services/api";
import toast from "react-hot-toast";

/* ─── Shared ──────────────────────────────────────────────────────────────── */

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors
        ${active ? "bg-[#FF6B35] text-white" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
    >
      {children}
    </button>
  );
}

function Paginator({ page, total, perPage, onChange }) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
      <span className="text-slate-500 text-xs">Page {page} of {totalPages}</span>
      <div className="flex gap-2">
        <button disabled={page <= 1} onClick={() => onChange(p => p - 1)}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronLeft size={16} />
        </button>
        <button disabled={page >= totalPages} onClick={() => onChange(p => p + 1)}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* ─── SOS Alerts ─────────────────────────────────────────────────────────── */

const SOS_STATUS_STYLE = {
  active:      "bg-red-500/15 text-red-400",
  resolved:    "bg-green-500/15 text-green-400",
  false_alarm: "bg-slate-500/15 text-slate-400",
};

const TRIGGER_LABEL = {
  manual:     "Manual",
  stationary: "Stationary",
  deviation:  "Route deviation",
};

function SOSResolveDrawer({ alert, onClose, onUpdate }) {
  const [newStatus, setNewStatus] = useState("resolved");
  const [notes,     setNotes]     = useState("");
  const [saving,    setSaving]    = useState(false);

  const save = () => {
    setSaving(true);
    adminApi.updateSOSAlert(alert.id, { status: newStatus, resolution_notes: notes })
      .then(() => { toast.success("Alert updated"); onUpdate(); onClose(); })
      .catch(() => toast.error("Failed to update alert"))
      .finally(() => setSaving(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-50 w-full max-w-sm bg-[#0b1e30] border-l border-white/10 h-full p-6 flex flex-col gap-5 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold">Resolve SOS alert</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="bg-white/5 rounded-xl p-4 space-y-2 text-sm">
          <p className="text-white font-medium">{alert.member?.username ?? alert.member?.email}</p>
          <p className="text-slate-400">Trip: <span className="text-slate-300">{alert.trip?.title}</span></p>
          <p className="text-slate-400">Trigger: <span className="text-slate-300">{TRIGGER_LABEL[alert.trigger_type] ?? alert.trigger_type}</span></p>
          <p className="text-slate-400">Triggered: <span className="text-slate-300">{new Date(alert.created_at).toLocaleString()}</span></p>
        </div>

        <div className="space-y-2">
          <label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Resolution</label>
          <select
            value={newStatus}
            onChange={e => setNewStatus(e.target.value)}
            className="w-full bg-[#071422] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-[#FF6B35]/50"
          >
            <option value="resolved">Resolved</option>
            <option value="false_alarm">False alarm</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Add resolution notes…"
            className="w-full bg-[#071422] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-[#FF6B35]/50 resize-none"
          />
        </div>

        <button
          disabled={saving}
          onClick={save}
          className="mt-auto w-full bg-[#FF6B35] hover:bg-[#e55a25] text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-40"
        >
          {saving ? "Saving…" : "Confirm resolution"}
        </button>
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
    setLoading(true);
    setError(null);
    adminApi.getSOSAlerts({ page, status: filter || undefined })
      .then(r => setData(r.data))
      .catch(() => setError("Failed to load SOS alerts."))
      .finally(() => setLoading(false));
  }, [page, filter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        {["", "active", "resolved", "false_alarm"].map(s => (
          <button
            key={s}
            onClick={() => { setFilter(s); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize
              ${filter === s ? "bg-[#FF6B35] text-white" : "text-slate-400 hover:text-white hover:bg-white/5 border border-white/10"}`}
          >
            {s || "All"}
          </button>
        ))}
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
                <th className="text-left text-slate-500 font-medium px-4 py-3">Member</th>
                <th className="text-left text-slate-500 font-medium px-4 py-3 hidden sm:table-cell">Trip</th>
                <th className="text-left text-slate-500 font-medium px-4 py-3">Trigger</th>
                <th className="text-left text-slate-500 font-medium px-4 py-3">Status</th>
                <th className="text-left text-slate-500 font-medium px-4 py-3 hidden md:table-cell">Time</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12">
                  <div className="flex justify-center"><div className="w-6 h-6 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin" /></div>
                </td></tr>
              ) : data?.results?.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-slate-500 py-12">No SOS alerts found.</td></tr>
              ) : data?.results?.map(a => (
                <tr key={a.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{a.member?.username ?? "—"}</p>
                    <p className="text-slate-500 text-xs">{a.member?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">{a.trip?.title ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-300 capitalize">{TRIGGER_LABEL[a.trigger_type] ?? a.trigger_type}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${SOS_STATUS_STYLE[a.status] ?? ""}`}>
                      {a.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell">
                    {new Date(a.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {a.status === "active" && (
                      <button
                        onClick={() => setSelected(a)}
                        className="text-xs text-[#FF6B35] hover:text-orange-400 border border-[#FF6B35]/30 hover:border-[#FF6B35]/60 rounded-lg px-3 py-1.5 transition-colors"
                      >
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Paginator page={page} total={data?.count ?? 0} perPage={20} onChange={setPage} />
      </div>

      {selected && <SOSResolveDrawer alert={selected} onClose={() => setSelected(null)} onUpdate={load} />}
    </div>
  );
}

/* ─── Incident Reports ───────────────────────────────────────────────────── */

const INCIDENT_STATUS_STYLE = {
  pending:      "bg-yellow-500/15 text-yellow-400",
  under_review: "bg-blue-500/15 text-blue-400",
  resolved:     "bg-green-500/15 text-green-400",
  dismissed:    "bg-slate-500/15 text-slate-400",
};

const INCIDENT_TYPE_STYLE = {
  safety:         "bg-red-500/15 text-red-400",
  harassment:     "bg-orange-500/15 text-orange-400",
  fraud:          "bg-purple-500/15 text-purple-400",
  rule_violation: "bg-yellow-500/15 text-yellow-400",
  other:          "bg-slate-500/15 text-slate-400",
};

function IncidentDrawer({ incident, onClose, onUpdate }) {
  const [newStatus, setNewStatus] = useState(incident.status);
  const [saving,    setSaving]    = useState(false);

  const save = () => {
    setSaving(true);
    adminApi.updateIncident(incident.id, { status: newStatus })
      .then(() => { toast.success("Incident updated"); onUpdate(); onClose(); })
      .catch(() => toast.error("Failed to update incident"))
      .finally(() => setSaving(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-50 w-full max-w-sm bg-[#0b1e30] border-l border-white/10 h-full p-6 flex flex-col gap-5 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold">Incident #{incident.reference_number}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="space-y-1 text-sm">
          <p className="text-slate-400">Type: <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${INCIDENT_TYPE_STYLE[incident.incident_type] ?? ""}`}>{incident.incident_type.replace("_", " ")}</span></p>
          <p className="text-slate-400">Trip: <span className="text-slate-300">{incident.trip?.title}</span></p>
          <p className="text-slate-400">Reporter: <span className="text-slate-300">{incident.reporter?.username ?? incident.reporter?.email}</span></p>
          {incident.reported_user && <p className="text-slate-400">Reported: <span className="text-slate-300">{incident.reported_user?.username ?? incident.reported_user?.email}</span></p>}
          <p className="text-slate-400">Filed: <span className="text-slate-300">{new Date(incident.created_at).toLocaleString()}</span></p>
        </div>

        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-slate-500 text-xs mb-2">Description</p>
          <p className="text-slate-300 text-sm leading-relaxed">{incident.description}</p>
        </div>

        <div className="space-y-2">
          <label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Update status</label>
          <select
            value={newStatus}
            onChange={e => setNewStatus(e.target.value)}
            className="w-full bg-[#071422] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-[#FF6B35]/50"
          >
            {["pending", "under_review", "resolved", "dismissed"].map(s => (
              <option key={s} value={s} className="capitalize">{s.replace("_", " ")}</option>
            ))}
          </select>
        </div>

        <button
          disabled={saving || newStatus === incident.status}
          onClick={save}
          className="mt-auto w-full bg-[#FF6B35] hover:bg-[#e55a25] text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-40"
        >
          {saving ? "Saving…" : "Update status"}
        </button>
      </div>
    </div>
  );
}

function IncidentsTab() {
  const [data,     setData]    = useState(null);
  const [loading,  setLoading] = useState(true);
  const [filter,   setFilter]  = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page,     setPage]    = useState(1);
  const [selected, setSelected] = useState(null);
  const [error,    setError]   = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    adminApi.getIncidents({ page, status: filter || undefined, type: typeFilter || undefined })
      .then(r => setData(r.data))
      .catch(() => setError("Failed to load incidents."))
      .finally(() => setLoading(false));
  }, [page, filter, typeFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-2">
          {["", "pending", "under_review", "resolved", "dismissed"].map(s => (
            <button key={s} onClick={() => { setFilter(s); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize
                ${filter === s ? "bg-[#FF6B35] text-white" : "text-slate-400 hover:text-white hover:bg-white/5 border border-white/10"}`}>
              {s ? s.replace("_", " ") : "All"}
            </button>
          ))}
        </div>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="bg-[#0b1e30] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-[#FF6B35]/50">
          <option value="">All types</option>
          {["safety", "harassment", "fraud", "rule_violation", "other"].map(t => (
            <option key={t} value={t} className="capitalize">{t.replace("_", " ")}</option>
          ))}
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
                <th className="text-left text-slate-500 font-medium px-4 py-3">Ref</th>
                <th className="text-left text-slate-500 font-medium px-4 py-3">Type</th>
                <th className="text-left text-slate-500 font-medium px-4 py-3 hidden sm:table-cell">Reporter</th>
                <th className="text-left text-slate-500 font-medium px-4 py-3 hidden md:table-cell">Trip</th>
                <th className="text-left text-slate-500 font-medium px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12">
                  <div className="flex justify-center"><div className="w-6 h-6 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin" /></div>
                </td></tr>
              ) : data?.results?.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-slate-500 py-12">No incidents found.</td></tr>
              ) : data?.results?.map(r => (
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3 text-slate-400 font-mono text-xs">{r.reference_number}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${INCIDENT_TYPE_STYLE[r.incident_type] ?? ""}`}>
                      {r.incident_type.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300 hidden sm:table-cell">{r.reporter?.username ?? r.reporter?.email ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400 hidden md:table-cell">{r.trip?.title ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${INCIDENT_STATUS_STYLE[r.status] ?? ""}`}>
                      {r.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelected(r)}
                      className="text-xs text-slate-400 hover:text-white border border-white/10 hover:border-white/25 rounded-lg px-3 py-1.5 transition-colors"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Paginator page={page} total={data?.count ?? 0} perPage={20} onChange={setPage} />
      </div>

      {selected && <IncidentDrawer incident={selected} onClose={() => setSelected(null)} onUpdate={load} />}
    </div>
  );
}

/* ─── Safety page ────────────────────────────────────────────────────────── */

export default function SafetyPage() {
  const [tab, setTab] = useState("sos");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-white font-bold text-xl">Safety</h1>
        <p className="text-slate-500 text-sm mt-0.5">Monitor SOS alerts and incident reports</p>
      </div>

      <div className="flex gap-2">
        <TabBtn active={tab === "sos"} onClick={() => setTab("sos")}>
          <span className="flex items-center gap-1.5"><ShieldAlert size={14} /> SOS Alerts</span>
        </TabBtn>
        <TabBtn active={tab === "incidents"} onClick={() => setTab("incidents")}>
          <span className="flex items-center gap-1.5"><FileWarning size={14} /> Incident Reports</span>
        </TabBtn>
      </div>

      {tab === "sos" ? <SOSTab /> : <IncidentsTab />}
    </div>
  );
}
