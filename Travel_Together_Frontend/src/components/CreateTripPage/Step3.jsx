import { Plus } from "lucide-react";
import { EMPTY_STOP } from './constants.js';
import { ProgressBar, SectionHead, PrimaryBtn, GhostBtn } from './uiComponents.jsx';
import StopCard from './StopCard.jsx';

/* ══════════════════════════════════════════
   STEP 3 ITINERARY
══════════════════════════════════════════ */
export default function Step3({ form, patch, onNext, onBack }) {
  const stops = form.stops || [{ ...EMPTY_STOP }];
  const updateStop = (i, val) => { const n = [...stops]; n[i] = val; patch({ stops: n }); };
  const addStop    = () => patch({ stops: [...stops, { ...EMPTY_STOP }] });
  const removeStop = i  => patch({ stops: stops.filter((_, idx) => idx !== i) });

  // The whole step is optional: the meeting point from Step 2 is already saved
  // as the trip's first (locked) stop, so a trip with no extra stops is
  // perfectly valid. Only a row someone actually started filling in needs a
  // name — an untouched row is just skipped, and Step 4 drops it before saving.
  const isBlank    = s => !s.name?.trim() && !s.arrival_time && !s.note?.trim();
  const isStarted  = s => !isBlank(s);
  const allOk      = stops.filter(isStarted).every(s => s.name.trim());
  const skipping   = stops.every(isBlank);

  return (
    <div className="animate-[fadeUp_.22s_ease_both]">
      <ProgressBar step={3} total={4} />
      <SectionHead icon="🗺️" title="Plan your itinerary"
        sub="Optional — your meeting point is already the first check-in. Add any stops along the route so travellers know where you're headed." />

      {stops.map((stop, i) => (
        <StopCard
          key={i} stop={stop} index={i}
          onChange={val => updateStop(i, val)}
          onRemove={() => removeStop(i)}
          isOnly={stops.length === 1}
        />
      ))}

      {stops.length < 8 && (
        <button
          onClick={addStop}
          className="w-full py-[11px] rounded-xl border-[1.5px] border-dashed border-[rgba(255,107,53,0.3)]
            bg-[rgba(255,107,53,0.05)] text-[rgba(255,107,53,0.7)] text-[13px] font-semibold
            cursor-pointer flex items-center justify-center gap-2 mb-6
            hover:bg-[rgba(255,107,53,0.1)] hover:text-[#FF6B35] transition-all duration-150"
        >
          <Plus size={15} /> Add another stop
        </button>
      )}

      <div className="flex gap-2.5">
        <GhostBtn onClick={onBack}>← Back</GhostBtn>
        <PrimaryBtn onClick={() => allOk && onNext()} disabled={!allOk}>
          {skipping ? "Skip for now →" : "Preview trip →"}
        </PrimaryBtn>
      </div>
    </div>
  );
}