import { useState } from "react";
import { Calendar, Users, Check, AlertCircle } from "lucide-react";
import { TAGS, COVERS_OPTIONS } from './constants.js';
import { ProgressBar, SectionHead, Label, TTInput, TTSelect, PrimaryBtn, GhostBtn, Err } from './uiComponents.jsx';

/* ══════════════════════════════════════════
   STEP 2 — LOGISTICS + PRICING
══════════════════════════════════════════ */
export default function Step2({ form, patch, onNext, onBack }) {
  const [touched, setTouched]   = useState({});
  const touch = (...keys) => setTouched(t => keys.reduce((a, k) => ({ ...a, [k]: true }), t));

  const errs = {
    dateStart:  !form.dateStart  ? "Start date required" : "",
    dateEnd:    !form.dateEnd    ? "End date required"   :
                form.dateStart && form.dateEnd < form.dateStart ? "Must be after start" : "",
    spots_total:  !form.spots_total  ? "Set a max size"  : +form.spots_total < 2 ? "At least 2" : +form.spots_total > 50 ? "Max 50" : "",
    entryPrice: !form.entryPrice ? "Set an entry price" : +form.entryPrice < 0 ? "Must be positive" : "",
  };
  const allOk = Object.values(errs).every(e => !e) && (form.tags || []).length > 0;

  const toggleTag = tag => {
    const curr = form.tags || [];
    patch({ tags: curr.includes(tag) ? curr.filter(t => t !== tag) : [...curr, tag] });
  };

  const toggleCover = item => {
    const curr = form.priceCovers || [];
    patch({ priceCovers: curr.includes(item) ? curr.filter(c => c !== item) : [...curr, item] });
  };

  return (
    <div className="animate-[fadeUp_.22s_ease_both]">
      <ProgressBar step={2} total={4} />
      <SectionHead icon="📋" title="Logistics & pricing"
        sub="Dates, group size, trip type, and what your entry price covers." />

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <Label required>Start date</Label>
          <div className="relative">
            <Calendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            <TTInput type="date" value={form.dateStart || ""} onChange={e => { patch({ dateStart: e.target.value }); touch("dateStart"); }} className="pl-8 [color-scheme:dark]" />
          </div>
          <Err msg={touched.dateStart ? errs.dateStart : ""} />
        </div>
        <div>
          <Label required>End date</Label>
          <div className="relative">
            <Calendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            <TTInput type="date" value={form.dateEnd || ""} onChange={e => { patch({ dateEnd: e.target.value }); touch("dateEnd"); }} className="pl-8 [color-scheme:dark]" />
          </div>
          <Err msg={touched.dateEnd ? errs.dateEnd : ""} />
        </div>
      </div>

      {/* Group size + Drive time */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <Label required>Max group size</Label>
          <div className="relative">
            <Users size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            <TTInput type="number" value={form.spots_total || ""} onChange={e => { patch({ spots_total: e.target.value }); touch("spots_total"); }} placeholder="10" className="pl-8" />
          </div>
          <Err msg={touched.spots_total ? errs.spots_total : ""} />
        </div>
        <div>
          <Label>Drive time</Label>
          <TTSelect value={form.driveTime || ""} onChange={e => patch({ driveTime: e.target.value })}>
            <option value="">Select…</option>
            <option value="under_1h">Under 1hr</option>
            <option value="1_2h">1–2hrs</option>
            <option value="2_4h">2–4hrs</option>
            <option value="4_6h">4–6hrs</option>
            <option value="6h_plus">6hrs+</option>
          </TTSelect>
        </div>
      </div>

      {/* Distance */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div>
          <Label>Distance from city</Label>
          <div className="flex gap-2">
            <TTInput
              type="number"
              value={form.distanceKm || ""}
              onChange={e => patch({ distanceKm: e.target.value })}
              placeholder="e.g. 120"
              className="flex-1"
            />
            <span className="flex items-center px-3 rounded-xl bg-white/[0.06] border border-white/10 text-[12px] text-white/50 font-semibold flex-shrink-0">km</span>
          </div>
        </div>
      </div>

      {/* ── ENTRY PRICE BLOCK ── */}
      <div className="bg-white/[0.03] border-[1.5px] border-white/[0.08] rounded-2xl p-4 mb-5">
        {/* Price amount */}
        <div className="mb-4">
          <Label required>Entry price per person</Label>
          <p className="text-[11px] text-white/35 mb-2.5 -mt-1 leading-snug">
            This is a booking fee that covers all or most trip expenses. Members pay this to secure their spot.
          </p>
          <div className="flex items-stretch gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-bold text-white/40 pointer-events-none">GH₵</span>
              <TTInput
                type="number"
                value={form.entryPrice || ""}
                onChange={e => { patch({ entryPrice: e.target.value }); touch("entryPrice"); }}
                placeholder="0.00"
                className="pl-12"
              />
            </div>
            {/* Free toggle */}
            <button
              onClick={() => { patch({ entryPrice: "0", priceCovers: [] }); touch("entryPrice"); }}
              className={`px-4 rounded-xl text-[12px] font-bold border cursor-pointer transition-all duration-150 flex-shrink-0
                ${form.entryPrice === "0"
                  ? "bg-green-400/15 border-green-400/30 text-green-400"
                  : "bg-white/[0.04] border-white/10 text-white/40 hover:border-white/20"
                }`}
            >
              Free
            </button>
          </div>
          <Err msg={touched.entryPrice ? errs.entryPrice : ""} />
        </div>

        {/* What it covers */}
        {form.entryPrice && form.entryPrice !== "0" && (
          <div>
            <Label>What does this price cover?</Label>
            <p className="text-[11px] text-white/35 mb-2.5 -mt-1">Tick everything the entry price includes</p>
            <div className="flex flex-wrap gap-2">
              {COVERS_OPTIONS.map(item => {
                const active = (form.priceCovers || []).includes(item);
                return (
                  <button
                    key={item}
                    onClick={() => toggleCover(item)}
                    className={`flex items-center gap-1.5 px-3 py-[6px] rounded-full text-[11px] font-semibold
                      border cursor-pointer transition-all duration-150
                      ${active
                        ? "bg-[rgba(255,107,53,0.15)] border-[#FF6B35] text-[#FF6B35]"
                        : "bg-white/[0.04] border-white/10 text-white/45 hover:border-white/20"
                      }`}
                  >
                    {active && <Check size={10} />}
                    {item}
                  </button>
                );
              })}
            </div>
            {/* Custom note */}
            <div className="mt-3">
              <Label>Additional pricing note</Label>
              <TTInput
                value={form.priceNote || ""}
                onChange={e => patch({ priceNote: e.target.value })}
                placeholder="e.g. Excludes drinks. Flight not included."
              />
            </div>
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="mb-6">
        <Label required>Trip type</Label>
        <p className="text-[11px] text-white/30 mb-2.5 -mt-1">Pick all that apply</p>
        <div className="flex flex-wrap gap-2">
          {TAGS.map(({ label, Icon }) => {
            const active = (form.tags || []).includes(label);
            return (
              <button
                key={label}
                onClick={() => toggleTag(label)}
                className={`flex items-center gap-1.5 px-3.5 py-[7px] rounded-full text-[12px] font-bold
                  border cursor-pointer transition-all duration-150
                  ${active
                    ? "bg-[rgba(255,107,53,0.15)] border-[#FF6B35] text-[#FF6B35]"
                    : "bg-white/[0.04] border-white/10 text-white/50 hover:border-white/20"
                  }`}
              >
                <Icon size={12} /> {label}
              </button>
            );
          })}
        </div>
        {(form.tags || []).length === 0 && (
          <p className="text-[11px] text-red-400 flex items-center gap-1.5 mt-2">
            <AlertCircle size={11} /> Pick at least one tag
          </p>
        )}
      </div>

      <div className="flex gap-2.5">
        <GhostBtn onClick={onBack}>← Back</GhostBtn>
        <PrimaryBtn
          onClick={() => { touch("dateStart","dateEnd","spots_total","entryPrice"); if (allOk) onNext(); }}
          disabled={!allOk}
        >
          Continue →
        </PrimaryBtn>
      </div>
    </div>
  );
}