import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { tripsApi } from "../../services/api.js";
import toast from "react-hot-toast";

/**
 * Shown to the organizer (chief) when a concern has been raised about their trip.
 * They see the claim (reporter identity withheld) and can submit their side 
 * the two-sided dispute. Payouts stay frozen until the admin resolves it.
 */
export default function OrganizerReportCard({ tripId }) {
  const [reports, setReports] = useState([]);
  const [text,    setText]    = useState({});
  const [busy,    setBusy]    = useState(null);

  const load = useCallback(() => {
    tripsApi.getTripReports(tripId)
      .then(({ data }) => setReports(data.filter(r => r.status === "pending" || r.status === "under_review")))
      .catch(() => {});
  }, [tripId]);

  useEffect(() => { load(); }, [load]);

  const respond = async (id) => {
    const response = (text[id] || "").trim();
    if (!response) { toast.error("Please add your response."); return; }
    setBusy(id);
    try {
      await tripsApi.respondReport(tripId, id, { response });
      toast.success("Your response was submitted for review.");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Couldn't submit.");
    } finally { setBusy(null); }
  };

  if (!reports.length) return null;

  return (
    <div className="rounded-3xl border border-danger/35 bg-danger-soft p-5">
      <div className="mb-2 flex items-center gap-2.5">
        <AlertTriangle size={17} className="shrink-0 text-danger" />
        <p className="m-0 font-display text-[16px] font-semibold text-danger">A concern was raised about this trip</p>
      </div>
      <p className="m-0 mb-4 text-[13px] leading-relaxed text-ink-soft">
        Add your side and any evidence. Your payout is on hold until the team reviews it.
      </p>

      {reports.map(r => (
        <div key={r.id} className="mb-3 rounded-2xl border border-line bg-surface p-4 last:mb-0">
          <p className="m-0 mb-2 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-mute">The concern</p>
          <p className="m-0 mb-4 whitespace-pre-wrap text-[14px] leading-relaxed text-ink">{r.description}</p>

          {r.response ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-moss/25 bg-moss/10 px-3.5 py-3 text-[13px] text-moss">
              <Check size={14} className="mt-0.5 shrink-0" />
              <span>You responded: “{r.response}”</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <textarea value={text[r.id] || ""} onChange={e => setText(t => ({ ...t, [r.id]: e.target.value }))} rows={3}
                placeholder="Explain what happened include receipts, photos, or the real itinerary if you can."
                className="w-full resize-none rounded-xl border border-line bg-surface-alt px-3.5 py-3 text-[14px] leading-relaxed text-ink outline-none placeholder:text-ink-mute focus:border-danger" />
              <button onClick={() => respond(r.id)} disabled={busy === r.id}
                className="self-end cursor-pointer rounded-full border-none bg-danger px-5 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
                {busy === r.id ? "Submitting…" : "Submit my response"}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
