/* ══════════════════════════════════════════════════
   SHARED ATOMS — mirrors tt-label / tt-hint / tt-err / tt-ok
══════════════════════════════════════════════════ */
export const Label = ({ children }) => (
  <label className="block text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-1.5">
    {children}
  </label>
);

export const Hint = ({ children }) => (
  <p className="text-[10px] text-gray-400 leading-snug -mt-0.5 mb-1.5">{children}</p>
);

export const Err = ({ msg }) => !msg ? null : (
  <div className="flex items-center gap-1 text-[11px] text-red-400 mt-1">
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="shrink-0">
      <circle cx="5.5" cy="5.5" r="5" stroke="#f87171" />
      <path d="M5.5 3.2v2.2M5.5 7.4v.4" stroke="#f87171" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
    {msg}
  </div>
);

export const Ok = ({ msg }) => !msg ? null : (
  <div className="flex items-center gap-1 text-[11px] text-green-500 mt-1">
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="shrink-0">
      <circle cx="5.5" cy="5.5" r="5" stroke="#22c55e" />
      <path d="M3 5.5l2 2 3-3" stroke="#22c55e" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    {msg}
  </div>
);