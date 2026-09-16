import { Ticket, Info } from "lucide-react";

/* ── PRICE PILL ──────────────────────────── */
export default function PricePill({ form }) {
  const isFree  = !form.entryPrice || form.entryPrice === "0";
  const covers  = form.priceCovers || [];
  return (
    <div className="bg-surface-alt border border-line rounded-2xl px-4 py-3.5 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Ticket size={15} className="text-accent" />
          <span className="text-[12px] font-bold text-ink">Entry price</span>
        </div>
        <span className={`text-[18px] font-black font-serif leading-none ${isFree ? "text-green-400" : "text-accent"}`}>
          {isFree ? "Free" : `GH₵${form.entryPrice}`}
        </span>
      </div>
      {covers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="text-[10px] text-ink-mute mr-1">Covers:</span>
          {covers.map(c => (
            <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(255,107,53,0.12)] text-accent font-semibold border border-[rgba(255,107,53,0.2)]">
              {c}
            </span>
          ))}
        </div>
      )}
      {form.priceNote && (
        <p className="text-[11px] text-ink-mute mt-2 flex items-start gap-1.5 leading-snug">
          <Info size={10} className="mt-0.5 flex-shrink-0 text-ink-mute" />
          {form.priceNote}
        </p>
      )}
    </div>
  );
}