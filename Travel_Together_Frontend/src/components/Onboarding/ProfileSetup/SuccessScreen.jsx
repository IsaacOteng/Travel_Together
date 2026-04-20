import { TRIP_TYPES, PACE_OPTIONS } from "./constants";

/* ══════════════════════════════════════════════════
   SUCCESS — matches tt-success-check + tt-summary
══════════════════════════════════════════════════ */
export const SuccessScreen = ({ form, onContinue }) => {
  const ec = form.emergencyContact || {};
  const rows = [
    form.displayName && ["Display name", form.displayName],
    (form.tripTypes || []).length > 0 && ["Interests", (form.tripTypes || []).map(id => TRIP_TYPES.find(t => t.id === id)?.label).filter(Boolean).join(", ")],
    form.pace        && ["Pace", PACE_OPTIONS.find(p => p.id === form.pace)?.label || form.pace],
    form.groupSize   && ["Group size", `${form.groupSize} people`],
    ec.name          && ["Emergency contact", ec.name],
  ].filter(Boolean);

  return (
    <div className="text-center" style={{ animation: "fadeUp .22s ease both" }}>
      {/* matches tt-success-check */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
        style={{
          background: "linear-gradient(135deg,#FF6B35,#ff8c5a)",
          boxShadow: "0 8px 24px rgba(255,107,53,.30)",
          animation: "popIn .36s cubic-bezier(.34,1.56,.64,1) both",
        }}
      >
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <path d="M5 13l5.5 5.5L21 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <h1
        className="text-[22px] font-light text-[#1E3A5F] mb-1.5 tracking-tight"
        style={{ fontFamily: "Georgia,serif" }}
      >
        Profile complete{form.displayName ? `, ${form.displayName}` : ""}!
      </h1>
      <p className="text-[12px] text-gray-400 leading-relaxed mb-6 max-w-xs mx-auto">
        Welcome to Travel Together. Your preferences are saved and your profile is live.
      </p>

      {/* Summary — matches tt-summary */}
      {rows.length > 0 && (
        <div className="rounded-[14px] border-[1.5px] border-gray-100 bg-[#fafafa] px-4.5 py-1 mb-6 text-left">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between items-start gap-3 py-2.75 border-b border-gray-100 last:border-b-0"
            >
              <span className="text-[10px] font-bold tracking-[.09em] uppercase text-gray-400 shrink-0 pt-px">
                {label}
              </span>
              <span className="text-[12px] font-medium text-[#1E3A5F] text-right wrap-break-words max-w-[58%]">
                {value}
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onContinue}
        className="w-full py-3 rounded-xl text-[13.5px] font-semibold text-white transition-all duration-150 hover:-translate-y-px cursor-pointer"
        style={{
          background: "linear-gradient(135deg,#1E3A5F,#2a5298)",
          boxShadow: "0 4px 16px rgba(30,58,95,.28)",
        }}
      >
        Explore Travel Together →
      </button>
    </div>
  );
};