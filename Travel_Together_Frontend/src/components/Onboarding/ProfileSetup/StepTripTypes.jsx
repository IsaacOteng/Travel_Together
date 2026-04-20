import { Check } from "lucide-react";
import { SectionHead } from "./SectionHead";
import { TRIP_TYPES } from "./constants";

/* ══════════════════════════════════════════════════
   STEP 2 — Trip Types
══════════════════════════════════════════════════ */
export const StepTripTypes = ({ form, patch }) => {
  const selected = form.tripTypes || [];

  const toggle = (id) => {
    const next = selected.includes(id)
      ? selected.filter((t) => t !== id)
      : [...selected, id];
    patch({ tripTypes: next });
  };

  return (
    <div>
      <SectionHead
        icon="🗺️"
        title="What kind of trips?"
        sub="Pick everything that excites you — this powers your group recommendations."
      />

      <div className="grid grid-cols-3 gap-3 mb-4">
        {TRIP_TYPES.map(({ id, label, emoji }) => {
          const on = selected.includes(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              className={`relative flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border-[1.5px] transition-all duration-200 select-none cursor-pointer ${
                on
                  ? "border-[#FF6B35] bg-orange-50 shadow-sm scale-[1.02]"
                  : "border-gray-100 bg-white hover:border-orange-200 hover:bg-orange-50/40"
              }`}
            >
              {on && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#FF6B35] flex items-center justify-center">
                  <Check size={9} className="text-white" strokeWidth={3} />
                </div>
              )}
              <span className="text-2xl leading-none">{emoji}</span>
              <span className={`text-[11px] font-semibold ${on ? "text-[#FF6B35]" : "text-gray-500"}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <p className="text-[11px] text-[#5576a0] text-center">
          {selected.length} selected · great mix!
        </p>
      )}
    </div>
  );
};