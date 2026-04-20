/* ══════════════════════════════════════════════════
   INPUT / TEXTAREA — matches tt-input / tt-textarea
   1.5px border, radius-[10px], focus orange ring
══════════════════════════════════════════════════ */
export const inputBase =
  "w-full rounded-[10px] border-[1.5px] border-gray-200 px-3 py-2.5 text-[13.5px] text-gray-800 " +
  "bg-white outline-none transition-all duration-150 font-[inherit] " +
  "hover:border-gray-300 focus:border-[#FF6B35] focus:shadow-[0_0_0_3px_rgba(255,107,53,.10)] placeholder:text-gray-300";

/* ══════════════════════════════════════════════════
   BUTTONS — matches tt-btn-primary / tt-btn-ghost / tt-btn-row
══════════════════════════════════════════════════ */
export const BtnPrimary = ({ children, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[13.5px] font-semibold tracking-[.02em] transition-all duration-150 cursor-pointer
      ${disabled
        ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
        : "text-white hover:-translate-y-px"
      }`}
    style={!disabled ? {
      background: "linear-gradient(135deg,#FF6B35,#ff7c42)",
      boxShadow: "0 4px 14px rgba(255,107,53,.30)",
    } : {}}
  >
    {children}
  </button>
);

export const BtnGhost = ({ children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="shrink-0 px-5 py-3 rounded-xl border-[1.5px] border-gray-200 bg-white text-[13.5px] font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-all duration-150 cursor-pointer"
  >
    {children}
  </button>
);