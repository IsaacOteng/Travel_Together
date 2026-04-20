import { useState } from "react";
import { X, ChevronRight, Clock } from "lucide-react";
import { Label, TTInput } from './uiComponents.jsx';

/* ─── STOP CARD ──────────────────────────── */
export default function StopCard({ stop, index, onChange, onRemove, isOnly }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div className="bg-white/[0.03] border-[1.5px] border-white/[0.07] rounded-2xl overflow-hidden mb-2.5">
      <div
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-3 px-3.5 py-3 cursor-pointer"
      >
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0
          ${index === 0
            ? "bg-[rgba(255,107,53,0.2)] border-[1.5px] border-[#FF6B35] text-[#FF6B35]"
            : "bg-white/[0.07] border-[1.5px] border-white/[0.12] text-white/40"
          }`}
        >
          {index + 1}
        </div>
        <span className={`flex-1 text-[13px] font-semibold ${stop.name ? "text-white" : "text-white/30"}`}>
          {stop.name || `Stop ${index + 1}`}
        </span>
        {!isOnly && (
          <button
            onClick={e => { e.stopPropagation(); onRemove(); }}
            className="bg-transparent border-none cursor-pointer text-white/25 hover:text-white/50 flex p-1 transition-colors"
          >
            <X size={14} />
          </button>
        )}
        <ChevronRight size={13} className={`text-white/20 transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
      </div>

      {open && (
        <div className="px-3.5 pb-3.5 pt-3 border-t border-white/[0.05]">
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <div>
              <Label required>Stop name</Label>
              <TTInput value={stop.name} onChange={e => onChange({ ...stop, name: e.target.value })} placeholder="e.g. Liati Wote Village" />
            </div>
            <div>
              <Label>Arrival time</Label>
              <div className="relative">
                <Clock size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                <TTInput type="time" value={stop.arrival_time} onChange={e => onChange({ ...stop, arrival_time: e.target.value })} className="pl-8 [color-scheme:dark]" />
              </div>
            </div>
          </div>

          <div className="mb-3">
            <Label>Geofence radius</Label>
            <div className="flex items-center gap-3">
              <input
                type="range" min={50} max={500} step={50}
                value={stop.radius}
                onChange={e => onChange({ ...stop, radius: +e.target.value })}
                className="flex-1 accent-[#FF6B35] cursor-pointer"
              />
              <div className="bg-[rgba(255,107,53,0.15)] border border-[rgba(255,107,53,0.3)] rounded-lg px-2.5 py-1 text-[12px] font-bold text-[#FF6B35] flex-shrink-0 min-w-[60px] text-center">
                {stop.radius}m
              </div>
            </div>
            <p className="text-[10px] text-white/25 mt-1">
              Members must be within this radius to check in and post streaks
            </p>
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