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
      className="fixed inset-0 z-2000 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", animation: "ttFadeIn .2s ease" }}
    >
      <div
        className="bg-surface border border-line rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
        style={{ animation: "ttDialogIn .25s cubic-bezier(0.34,1.4,0.64,1)", boxShadow: "0 24px 64px var(--tt-shadow-lg)" }}
      >
        <div className="flex items-center gap-3 p-5 pb-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
            <Flag size={17} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="m-0 font-display text-[19px] font-semibold text-ink">Report an issue</h2>
            <p className="m-0 mt-0.5 text-[12.5px] text-ink-mute">Your name is never shown to the organiser</p>
          </div>
          <button onClick={onClose} disabled={busy}
            className="w-8 h-8 rounded-full bg-surface-alt border border-line flex items-center justify-center cursor-pointer hover:border-accent hover:text-accent transition-colors disabled:opacity-40">
            <X size={14} className="text-ink-soft" />
          </button>
        </div>

        <div className="px-5 pb-5">
          <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-mute">What kind of problem?</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {TYPES.map(({ value, label, icon: Icon, hint }) => {
              const active = type === value;
              return (
                <button key={value} onClick={() => setType(value)} disabled={busy} title={hint}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer disabled:cursor-not-allowed
                    ${active
                      ? "border-danger bg-danger-soft"
                      : "border-line bg-surface hover:border-danger/50"}
                    ${value === "other" ? "col-span-2" : ""}`}>
                  <Icon size={15} className={active ? "text-danger" : "text-ink-mute"} />
                  <span className={`text-[13px] font-medium ${active ? "text-danger" : "text-ink-soft"}`}>{label}</span>
                </button>
              );
            })}
          </div>

          <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-mute">What happened?</p>
          <textarea
            value={text} onChange={e => setText(e.target.value)} rows={5} disabled={busy}
            placeholder="Be specific — where you were, when, and who was involved. The more detail, the faster the team can act."
            className="w-full resize-none rounded-xl border border-line bg-surface px-3.5 py-3 text-[14px] leading-relaxed text-ink outline-none placeholder:text-ink-mute focus:border-danger"
          />
          <div className="flex items-center justify-between mt-1.5 mb-4">
            <span className={`text-[12.5px] ${short ? "text-ink-mute" : "text-moss"}`}>
              {short ? `${MIN_CHARS - trimmed.length} more characters needed` : "Enough detail to file"}
            </span>
            <span className="text-[12.5px] tabular-nums text-ink-mute">{trimmed.length}/{MIN_CHARS}</span>
          </div>

          <div className="mb-5 rounded-2xl border border-line bg-surface-alt px-4 py-3.5">
            <p className="m-0 text-[12.5px] leading-relaxed text-ink-soft">
              Filing a report puts the organizer's payout on hold until the team reviews it.
              If someone is in immediate danger, use <span className="font-semibold text-danger">SOS</span> instead — it alerts the group straight away.
            </p>
          </div>

          <div className="flex gap-2">
            <button onClick={submit} disabled={!canSubmit}
              className="flex-1 cursor-pointer rounded-full border-none bg-danger py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
              {busy ? "Filing…" : "File report"}
            </button>
            <button onClick={onClose} disabled={busy}
              className="cursor-pointer rounded-full border border-line bg-surface px-5 py-3 text-[14px] font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
