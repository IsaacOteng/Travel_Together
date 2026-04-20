import { SectionHead } from "./SectionHead";
import { Label } from "./atoms";
import { BUDGET_TIERS, GROUP_SIZES, PACE_OPTIONS } from "./constants";

/* ══════════════════════════════════════════════════
    STEP 3 — Budget & Pace
══════════════════════════════════════════════════ */
export const StepBudgetPace = ({ form, patch }) => {
  const budget = form.budget ?? 1;
  const pace   = form.pace || "";
  const pct    = (budget / (BUDGET_TIERS.length - 1)) * 100;

  return (
    <div>
      <SectionHead icon="💰" title="Budget & travel pace" sub="Matching these makes for much happier trips." />

      {/* Budget slider — sits inside a #fafafa card like tt-rules */}
      <div className="rounded-xl border-[1.5px] border-gray-100 bg-[#fafafa] px-4 py-4 mb-5">
        <div className="flex justify-between items-center mb-3">
          <Label>Budget range</Label>
          <span className="text-[12px] font-bold text-[#FF6B35]">{BUDGET_TIERS[budget]}</span>
        </div>
        <input
          type="range"
          min={0}
          max={BUDGET_TIERS.length - 1}
          value={budget}
          onChange={(e) => patch({ budget: Number(e.target.value) })}
          className="w-full h-0.75 appearance-none rounded-full cursor-pointer
            [&::-webkit-slider-runnable-track]:rounded-full
            [&::-webkit-slider-runnable-track]:h-0.75
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4.5
            [&::-webkit-slider-thumb]:h-4.5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-[#FF6B35]
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-white
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:mt-[-7.5px]
            [&::-moz-range-thumb]:w-4.5
            [&::-moz-range-thumb]:h-4.5
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-[#FF6B35]
            [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-white"
          style={{ background: `linear-gradient(to right, #FF6B35 ${pct}%, #e5e7eb ${pct}%)` }}
        />
        <div className="flex justify-between mt-2">
          {BUDGET_TIERS.map((t, i) => (
            <span key={t} className={`text-[10px] transition ${i === budget ? "text-[#FF6B35] font-bold" : "text-gray-300"}`}>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Travel pace */}
      <div className="mb-5">
        <Label>Travel pace <span className="text-[#FF6B35]">*</span></Label>
        <div className="grid grid-cols-3 gap-3">
          {PACE_OPTIONS.map(({ id, label, desc, icon }) => {
            const on = pace === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => patch({ pace: id })}
                className={`flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border-[1.5px] text-center transition-all duration-200 cursor-pointer ${
                  on
                    ? "border-[#FF6B35] bg-orange-50 shadow-sm scale-[1.02]"
                    : "border-gray-100 bg-white hover:border-orange-200"
                }`}
              >
                <span className="text-xl leading-none">{icon}</span>
                <span className={`text-[11px] font-bold ${on ? "text-[#FF6B35]" : "text-gray-600"}`}>{label}</span>
                <span className={`text-[10px] leading-tight ${on ? "text-orange-400" : "text-gray-400"}`}>{desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Group size */}
      <div>
        <Label>Preferred group size</Label>
        <div className="flex gap-2 flex-wrap">
          {GROUP_SIZES.map((s) => {
            const on = form.groupSize === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => patch({ groupSize: s })}
                className={`px-4 py-1.5 rounded-full border-[1.5px] text-[12px] font-semibold transition-all duration-150 cursor-pointer ${
                  on
                    ? "border-[#FF6B35] bg-[#FF6B35] text-white shadow-sm"
                    : "border-gray-200 text-gray-500 hover:border-orange-200 hover:text-[#FF6B35]"
                }`}
              >
                {s} people
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};