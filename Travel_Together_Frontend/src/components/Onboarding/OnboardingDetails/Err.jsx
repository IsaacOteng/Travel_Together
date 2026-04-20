/* ─────────────────────────────────────────────
  SMALL ATOMS
───────────────────────────────────────────── */
export const Err = ({ msg }) => !msg ? null : (
  <div className="tt-err">
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{flexShrink:0}}>
      <circle cx="5.5" cy="5.5" r="5" stroke="#ef4444"/>
      <path d="M5.5 3.2v2.2M5.5 7.4v.4" stroke="#ef4444" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
    {msg}
  </div>
);