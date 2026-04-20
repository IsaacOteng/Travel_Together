/* ─────────────────────────────────────────────
  SECTION HEADING
───────────────────────────────────────────── */
export const SectionHead = ({ icon, title, sub }) => (
  <div style={{ marginBottom: 20 }}>
    <div className="tt-heading">
      <div className="tt-heading-icon">{icon}</div>
      <h1 style={{fontFamily:"Georgia,serif", fontSize:20, fontWeight:300, color:"#1E3A5F", margin:0, letterSpacing:"-.3px"}}>{title}</h1>
    </div>
    <p className="tt-subtext">{sub}</p>
  </div>
);