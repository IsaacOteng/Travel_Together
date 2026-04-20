/* ─────────────────────────────────────────────
  SUCCESS
───────────────────────────────────────────── */
export function Success({ form, onContinue }) {
  const rows = [
    ["Full Name",   `${form.firstName} ${form.lastName}`],
    ["Username",    `@${form.username}`],
    ["Nationality", form.nationality],
    ["Home",        `${form.city}, ${form.country}`],
    ["Phone",       `${form.dialCode} ${form.phoneNumber}`],
    ...(form.bio ? [["Bio", form.bio]] : []),
  ];

  return (
    <div className="tt-fadeUp" style={{ textAlign:"center" }}>
      <div className="tt-popIn tt-success-check">
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <path d="M5 13l5.5 5.5L21 8" stroke="white" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <h1 style={{ fontFamily:"Georgia,serif", fontSize:22, fontWeight:300, color:"#1E3A5F", margin:"0 0 6px" }}>
        You're all set, {form.firstName}!
      </h1>
      <p style={{ fontSize:12, color:"#9ca3af", margin:"0 0 24px", lineHeight:1.6 }}>
        Welcome to Travel Together. Your profile is live and ready to explore.
      </p>

      <div className="tt-summary">
        {rows.map(([label, value]) => (
          <div key={label} className="tt-summary-row">
            <span className="tt-summary-key">{label}</span>
            <span className="tt-summary-val">{value}</span>
          </div>
        ))}
      </div>

      <button type="button" onClick={onContinue} className="tt-btn-primary"
        style={{ background:"linear-gradient(135deg,#1E3A5F,#2a5298)", boxShadow:"0 4px 16px rgba(30,58,95,.28)" }}>
        Explore Travel Together →
      </button>
    </div>
  );
}