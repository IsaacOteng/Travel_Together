import { Users } from "lucide-react";

/* ══════════════════════════════════════════
   SUCCESS SCREEN
══════════════════════════════════════════ */
export default function SuccessScreen({ form, onGoToDashboard, onDiscover }) {
  const isFree = !form.entryPrice || form.entryPrice === "0";
  return (
    <div className="text-center animate-[fadeUp_.4s_ease_both]">
      <div className="w-[72px] h-[72px] rounded-full mx-auto mb-4 bg-[rgba(255,107,53,0.15)] border-2 border-[rgba(255,107,53,0.4)] flex items-center justify-center text-[32px] animate-[popIn_.5s_cubic-bezier(.34,1.56,.64,1)_both]">
        🎉
      </div>
      <h1 className="font-serif text-[26px] font-light text-white tracking-[-0.4px] mb-2">
        Trip published!
      </h1>
      <p className="text-[14px] text-white/40 leading-relaxed mb-6">
        <strong className="text-white/75">{form.title}</strong> is now live on Discover.<br />
        Travellers can find it and send join requests.
      </p>

      <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 mb-6 text-left">
        {[
          ["Destination", form.destination],
          ["Dates",       `${form.dateStart} – ${form.dateEnd}`],
          ["Group size",  `0 / ${form.spots_total} members`],
          ["Entry price", isFree ? "Free" : `GH₵${form.entryPrice}`],
          ["Covers",      (form.priceCovers || []).join(", ") || "—"],
          ["Stops",       `${(form.stops || []).filter(s => s.name).length} planned`],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between items-center py-2 border-b border-white/[0.05] last:border-0">
            <span className="text-[10px] font-bold tracking-[.08em] uppercase text-white/35">{k}</span>
            <span className="text-[12px] font-semibold text-white/70">{v}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onGoToDashboard}
        className="w-full py-3.5 rounded-xl border-none bg-gradient-to-br from-[#FF6B35] to-[#ff7c42] text-white text-[14px] font-bold cursor-pointer mb-2.5 flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(255,107,53,0.35)] hover:-translate-y-px transition-transform"
      >
        <Users size={15} /> Go to group dashboard
      </button>
      <button
        onClick={onDiscover}
        className="w-full py-3 bg-transparent border-none text-white/35 text-[13px] cursor-pointer hover:text-white/60 transition-colors"
      >
        Back to Discover
      </button>
    </div>
  );
}