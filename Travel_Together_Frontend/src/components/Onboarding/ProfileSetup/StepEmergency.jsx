import { useState } from "react";
import { MapPin } from "lucide-react";
import { SectionHead } from "./SectionHead";
import { Label, Hint, Err } from "./atoms";
import { inputBase } from "./buttons";
import { RELATIONSHIPS } from "./constants";

/* ══════════════════════════════════════════════════
   STEP 4 — Emergency Contact
══════════════════════════════════════════════════ */
export const StepEmergency = ({ form, patch }) => {
  const [touched, setTouched] = useState({});
  const ec = form.emergencyContact || {};
  const patchEC = (u) => patch({ emergencyContact: { ...ec, ...u } });
  const touch = (k) => setTouched((p) => ({ ...p, [k]: true }));

  const nameErr  = touched.name  && !ec.name?.trim()  ? "Required" : "";
  const phoneErr = touched.phone && !ec.phone?.trim() ? "Required" : "";

  return (
    <div>
      <SectionHead
        icon="🛡️"
        title="Emergency contact"
        sub="Used only for SOS alerts. Never shown publicly or to other travelers."
      />

      {/* Safety notice — matches the info cards in GlobalDetails style */}
      <div className="flex gap-3 bg-orange-50 border-[1.5px] border-orange-100 rounded-xl px-4 py-3 mb-5">
        <span className="text-base mt-0.5 shrink-0">🛡️</span>
        <div>
          <p className="text-[11px] font-semibold text-[#1E3A5F] mb-0.5">Why we need this</p>
          <p className="text-[11px] text-[#5576a0] leading-relaxed">
            If our system detects you've gone off-route or been stationary too long,
            your emergency contact receives an alert with your last known location.
          </p>
        </div>
      </div>

      {/* Name */}
      <div className="mb-4">
        <Label>Full name <span className="text-[#FF6B35]">*</span></Label>
        <input
          type="text"
          placeholder="e.g. Abena Mensah"
          value={ec.name || ""}
          onChange={(e) => patchEC({ name: e.target.value })}
          onBlur={() => touch("name")}
          className={inputBase}
        />
        <Err msg={nameErr} />
      </div>

      {/* Phone */}
      <div className="mb-4">
        <Label>Phone number <span className="text-[#FF6B35]">*</span></Label>
        <Hint>For SOS emergency alerts only — never shown publicly.</Hint>
        <div className="flex gap-2">
          {/* dial code — matches tt-dial-btn style */}
          <div className="flex items-center gap-1.5 rounded-[10px] border-[1.5px] border-gray-200 bg-white px-3 py-2.5 shrink-0">
            <span className="text-base">🇬🇭</span>
            <span className="text-[13px] text-gray-600 font-medium">+233</span>
          </div>
          <input
            type="tel"
            placeholder="24 123 4567"
            value={ec.phone || ""}
            onChange={(e) => patchEC({ phone: e.target.value.replace(/[^0-9\s\-]/g, "") })}
            onBlur={() => touch("phone")}
            className={inputBase}
          />
        </div>
        <Err msg={phoneErr} />
      </div>

      {/* Relationship */}
      <div className="mb-5">
        <Label>Relationship</Label>
        <div className="flex flex-wrap gap-2">
          {RELATIONSHIPS.map((r) => {
            const on = ec.relationship === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => patchEC({ relationship: r })}
                className={`px-4 py-1.5 rounded-full border-[1.5px] text-[12px] font-semibold transition-all duration-150 cursor-pointer ${
                  on
                    ? "border-[#FF6B35] bg-[#FF6B35] text-white shadow-sm"
                    : "border-[#fed7aa] bg-[#fff7ed] text-[#FF6B35] hover:bg-[#FF6B35] hover:text-white"
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>

      {/* Location sharing note */}
      <div className="flex items-start gap-3 bg-blue-50 border-[1.5px] border-blue-100 rounded-xl px-4 py-3">
        <MapPin size={14} className="text-[#1E3A5F] mt-0.5 shrink-0" />
        <p className="text-[11px] text-[#5576a0] leading-relaxed">
          <span className="font-semibold text-[#1E3A5F]">Location sharing: </span>
          We'll request GPS permission before your first trip. You can switch between
          precise (100m) or approximate (1km) anytime in Settings.
        </p>
      </div>
    </div>
  );
};