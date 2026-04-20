export const Ok = ({ msg }) => !msg ? null : (
  <div className="tt-ok">
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{flexShrink:0}}>
      <circle cx="5.5" cy="5.5" r="5" stroke="#22c55e"/>
      <path d="M3 5.5l2 2 3-3" stroke="#22c55e" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    {msg}
  </div>
);