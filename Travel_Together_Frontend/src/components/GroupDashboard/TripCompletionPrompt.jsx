import { useState } from "react";
import { CheckCircle, Flag } from "lucide-react";
import { tripsApi } from "../../services/api.js";
import toast from "react-hot-toast";

/**
 * Shown to a member on a completed trip: confirm it happened, or report a problem.
 * Silence (not responding within the grace window) counts as approval this is
 * the member's chance to object. Reporting freezes the organizer's payout.
 */
export default function TripCompletionPrompt({ tripId }) {
  const [done,      setDone]      = useState(null);   // "confirmed" | "reported"
  const [reporting, setReporting] = useState(false);
  const [text,      setText]      = useState("");
  const [busy,      setBusy]      = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await tripsApi.confirmTrip(tripId);
      setDone("confirmed");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Couldn't confirm.");
    } finally { setBusy(false); }
  };

  const submitReport = async () => {
    if (text.trim().length < 50) { toast.error("Please add at least 50 characters."); return; }
    setBusy(true);
    try {
      await tripsApi.fileReport(tripId, { incident_type: "fraud", description: text.trim() });
      setDone("reported");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Couldn't submit the report.");
    } finally { setBusy(false); }
  };

  if (done === "confirmed") {
    return (
      <div className="rounded-2xl border border-green-400/25 bg-green-400/[0.06] px-4 py-3 mb-4 flex items-center gap-2.5">
        <CheckCircle size={16} className="text-green-400 shrink-0" />
        <p className="text-[12.5px] text-green-300/90">Thanks you confirmed this trip happened.</p>
      </div>
    );
  }
  if (done === "reported") {
    return (
      <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3 mb-4">
        <p className="text-[12.5px] text-amber-300/90">Your report is under review. The organizer's payout is frozen until the team resolves it.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface-alt px-4 py-3.5 mb-4">
      <p className="text-[13px] font-bold text-ink mb-1">How was your trip?</p>
      <p className="text-[11px] text-ink-mute mb-3 leading-snug">
        Confirm it happened, or report a problem. If you don't respond, it's taken as confirmed.
      </p>

      {!reporting ? (
        <div className="flex gap-2">
          <button onClick={confirm} disabled={busy}
            className="flex-1 py-2.5 rounded-xl text-[12.5px] font-bold text-ink border-none cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#4ade80,#22c55e)" }}>
            <CheckCircle size={14} /> Confirm it happened
          </button>
          <button onClick={() => setReporting(true)} disabled={busy}
            className="px-3.5 py-2.5 rounded-xl text-[12px] font-semibold text-red-400 border border-red-400/25 bg-red-400/[0.07] cursor-pointer flex items-center gap-1.5 hover:bg-red-400/15 transition-colors">
            <Flag size={13} /> Report
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <textarea value={text} onChange={e => setText(e.target.value)} rows={3}
            placeholder="What went wrong? Be specific (min 50 characters) this freezes the payout for review."
            className="w-full rounded-xl px-3 py-2.5 text-[12.5px] text-ink bg-surface-alt border border-line outline-none placeholder:text-ink-mute focus:border-accent resize-none" />
          <div className="flex gap-2">
            <button onClick={submitReport} disabled={busy}
              className="flex-1 py-2.5 rounded-xl text-[12.5px] font-bold text-ink bg-red-500 cursor-pointer disabled:opacity-50">
              {busy ? "Submitting…" : "Submit report"}
            </button>
            <button onClick={() => setReporting(false)} disabled={busy}
              className="px-4 py-2.5 rounded-xl text-[12px] font-semibold text-ink-soft border border-line cursor-pointer hover:text-ink">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
