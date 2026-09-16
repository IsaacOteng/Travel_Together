import { useState } from "react";
import { X, ChevronRight, Clock } from "lucide-react";
import { Label, TTInput } from './uiComponents.jsx';

/* ─── STOP CARD ──────────────────────────── */
export default function StopCard({ stop, index, onChange, onRemove, isOnly }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div className="bg-surface-alt border-[1.5px] border-line rounded-2xl overflow-hidden mb-2.5">
      <div
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-3 px-3.5 py-3 cursor-pointer"
      >
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0
          ${index === 0
            ? "bg-[rgba(255,107,53,0.2)] border-[1.5px] border-accent text-accent"
            : "bg-surface-alt border border-line text-ink-mute"
          }`}
        >
          {index + 1}
        </div>
        <span className={`flex-1 text-[13px] font-semibold ${stop.name ? "text-ink" : "text-ink-mute"}`}>
          {stop.name || `Stop ${index + 1}`}
        </span>
        {!isOnly && (
          <button
            onClick={e => { e.stopPropagation(); onRemove(); }}
            className="bg-transparent border-none cursor-pointer text-ink-mute hover:text-ink-soft flex p-1 transition-colors"
          >
            <X size={14} />
          </button>
        )}
        <ChevronRight size={13} className={`text-ink-mute transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
      </div>

      {open && (
        <div className="px-3.5 pb-3.5 pt-3 border-t border-line">
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <div>
              {/* Only required once this row has been started — an untouched
                  stop is skipped entirely (the itinerary step is optional). */}
              <Label required={!!(stop.name?.trim() || stop.arrival_time || stop.note?.trim())}>
                Stop name
              </Label>
              <TTInput value={stop.name} onChange={e => onChange({ ...stop, name: e.target.value })} placeholder="e.g. Liati Wote Village" />
            </div>
            <div>
              <Label>Arrival time</Label>
              <div className="relative">
                <Clock size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute pointer-events-none" />
                <TTInput type="time" value={stop.arrival_time} onChange={e => onChange({ ...stop, arrival_time: e.target.value })} className="pl-8 [color-scheme:dark]" />
              </div>
            </div>
          </div>

          <div>
            <Label>Note for this stop</Label>
            <TTInput value={stop.note} onChange={e => onChange({ ...stop, note: e.target.value })} placeholder="Parking info, dress code, meeting point…" />
          </div>
        </div>
      )}
    </div>
  );
}