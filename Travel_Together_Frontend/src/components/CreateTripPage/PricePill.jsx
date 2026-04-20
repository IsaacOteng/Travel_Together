import { Ticket, Info } from "lucide-react";

/* ── PRICE PILL ──────────────────────────── */
export default function PricePill({ form }) {
  const isFree  = !form.entryPrice || form.entryPrice === "0";
  const covers  = form.priceCovers || [];
  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl px-4 py-3.5 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Ticket size={15} className="text-[#FF6B35]" />
          <span className="text-[12px] font-bold text-white/70">Entry price</span>
        </div>
        <span className={`text-[18px] font-black font-serif leading-none ${isFree ? "text-green-400" : "text-[#FF6B35]"}`}>
          {isFree ? "Free" : `GH₵${form.entryPrice}`}
        </span>
      </div>
      {covers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="text-[10px] text-white/30 mr-1">Covers:</span>
          {covers.map(c => (
            <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(255,107,53,0.12)] text-[#FF6B35] font-semibold border border-[rgba(255,107,53,0.2)]">
              {c}
            </span>
          ))}
        </div>
      )}
      {form.priceNote && (
        <p className="text-[11px] text-white/35 mt-2 flex items-start gap-1.5 leading-snug">
          <Info size={10} className="mt-0.5 flex-shrink-0 text-white/25" />
          {form.priceNote}
        </p>
      )}
    </div>
  );
}