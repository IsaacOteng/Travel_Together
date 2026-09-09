import { useState } from "react";
import { Flag, X, ShieldAlert, Users, Banknote, Ban, MoreHorizontal } from "lucide-react";
import { tripsApi } from "../../services/api.js";
import toast from "react-hot-toast";

/**
 * A member raising a problem — at any point from approval to the end of the
 * dispute window, not only once the trip is over.
 *
 * Things go wrong while a trip is happening: the organizer never shows at the
 * meeting point, the vehicle isn't what was sold, somebody is being harassed.
 * Until now the only way to say so was the post-trip prompt, which meant the
 * report arrived after the money had already moved. This files the same
 * IncidentReport the organizer answers in OrganizerReportCard and the admin
 * team resolves, and it freezes the payout while it stands.
 *
 * The reporter's identity is never shown to the organizer — see
 * IncidentReportView.get — so raising a problem mid-trip can't be retaliated
 * against by someone the reporter is currently in a van with.
 */

const TYPES = [
  { value: "safety",         label: "Safety",       icon: ShieldAlert,     hint: "Someone is at risk, or the trip feels unsafe" },
  { value: "harassment",     label: "Harassment",   icon: Users,           hint: "Abusive or threatening behaviour" },
  { value: "fraud",          label: "Fraud",        icon: Banknote,        hint: "The trip isn't what was paid for" },
  { value: "rule_violation", label: "Rules",        icon: Ban,             hint: "The trip's rules are being broken" },
  { value: "other",          label: "Other",        icon: MoreHorizontal,  hint: "Something else went wrong" },
];

const MIN_CHARS = 50;   // mirrors IncidentReportSerializer.validate_description

export default function ReportIssueModal({ tripId, onClose, onFiled }) {
  const [type, setType] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const trimmed  = text.trim();
  const short    = trimmed.length < MIN_CHARS;
  const canSubmit = type && !short && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      await tripsApi.fileReport(tripId, { incident_type: type, description: trimmed });
      toast.success("Report filed. The team will review it.");
      onFiled?.();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Couldn't file the report.");
    } finally { setBusy(false); }
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget && !busy) onClose(); }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[2000] flex items-center justify-center p-4"
      style={{ animation: "fadeIn .2s ease" }}
    >
      <div
        className="bg-[#0d1b2a] border border-white/10 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
        style={{ animation: "slideUp .25s ease" }}
      >
        <div className="flex items-center gap-3 p-5 pb-3">
          <div className="w-10 h-10 rounded-full bg-amber-400/15 border border-amber-400/30 flex items-center justify-center flex-shrink-0">
            <Flag size={16} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-bold text-white">Report an issue</h2>
            <p className="text-[10.5px] text-white/35">Your name is never shown to the organizer</p>
          </div>
          <button onClick={onClose} disabled={busy}
            className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/[0.12] transition-colors disabled:opacity-40">
            <X size={14} className="text-white/50" />
          </button>
        </div>

        <div className="px-5 pb-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/25 mb-2">What kind of problem?</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {TYPES.map(({ value, label, icon: Icon, hint }) => {
              const active = type === value;
              return (
                <button key={value} onClick={() => setType(value)} disabled={busy} title={hint}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer disabled:cursor-not-allowed
                    ${active
                      ? "border-amber-400/50 bg-amber-400/[0.12]"
                      : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07]"}
                    ${value === "other" ? "col-span-2" : ""}`}>
                  <Icon size={14} className={active ? "text-amber-400" : "text-white/35"} />
                  <span className={`text-[12px] font-semibold ${active ? "text-white" : "text-white/55"}`}>{label}</span>
                </button>
              );
            })}
          </div>

          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/25 mb-2">What happened?</p>
          <textarea
            value={text} onChange={e => setText(e.target.value)} rows={5} disabled={busy}
            placeholder="Be specific — where you were, when, and who was involved. The more detail, the faster the team can act."
            className="w-full rounded-xl px-3 py-2.5 text-[12.5px] text-white bg-white/[0.06] border border-white/10 outline-none placeholder:text-white/25 focus:border-amber-400/60 resize-none"
          />
          <div className="flex items-center justify-between mt-1.5 mb-4">
            <span className={`text-[10.5px] ${short ? "text-white/30" : "text-green-400/70"}`}>
              {short ? `${MIN_CHARS - trimmed.length} more characters needed` : "Enough detail to file"}
            </span>
            <span className="text-[10.5px] text-white/25 tabular-nums">{trimmed.length}/{MIN_CHARS}</span>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5 mb-4">
            <p className="text-[11px] text-white/40 leading-snug">
              Filing a report puts the organizer's payout on hold until the team reviews it.
              If someone is in immediate danger, use <span className="text-red-400/80 font-semibold">SOS</span> instead — it alerts the group straight away.
            </p>
          </div>

          <div className="flex gap-2">
            <button onClick={submit} disabled={!canSubmit}
              className="flex-1 py-2.5 rounded-xl text-[12.5px] font-bold text-[#071422] bg-amber-400 border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
              {busy ? "Filing…" : "File report"}
            </button>
            <button onClick={onClose} disabled={busy}
              className="px-4 py-2.5 rounded-xl text-[12px] font-semibold text-white/50 border border-white/10 bg-transparent cursor-pointer hover:text-white/80 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
