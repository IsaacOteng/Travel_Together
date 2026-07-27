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
    <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-4 mb-1">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={15} className="text-amber-400 shrink-0" />
        <p className="text-[13px] font-bold text-amber-200">A concern was raised about this trip</p>
      </div>
      <p className="text-[11px] text-white/45 mb-3 leading-snug">
        Add your side and any evidence. Your payout is on hold until the team reviews it.
      </p>

      {reports.map(r => (
        <div key={r.id} className="bg-black/20 border border-white/[0.07] rounded-xl p-3 mb-2 last:mb-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-1">The concern</p>
          <p className="text-[12px] text-white/70 leading-relaxed mb-3 whitespace-pre-wrap">{r.description}</p>

          {r.response ? (
            <div className="flex items-start gap-2 text-[11.5px] text-green-300/80">
              <Check size={13} className="mt-0.5 shrink-0" />
              <span>You responded: “{r.response}”</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <textarea value={text[r.id] || ""} onChange={e => setText(t => ({ ...t, [r.id]: e.target.value }))} rows={3}
                placeholder="Explain what happened include receipts, photos, or the real itinerary if you can."
                className="w-full rounded-lg px-3 py-2 text-[12px] text-white bg-white/[0.06] border border-white/10 outline-none placeholder:text-white/25 focus:border-amber-400/60 resize-none" />
              <button onClick={() => respond(r.id)} disabled={busy === r.id}
                className="self-end px-4 py-2 rounded-lg text-[12px] font-bold text-[#071422] bg-amber-400 cursor-pointer disabled:opacity-50">
                {busy === r.id ? "Submitting…" : "Submit my response"}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
