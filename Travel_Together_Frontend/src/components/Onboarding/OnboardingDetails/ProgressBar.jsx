/* ─────────────────────────────────────────────
  PROGRESS BAR
───────────────────────────────────────────── */
export const ProgressBar = ({ step, total }) => {
  const pct = Math.round((step / total) * 100);
  return (
    <div>
      <div className="tt-progress-row">
        <span className="tt-progress-label">Step {step} of {total}</span>
        <span className="tt-progress-pct">{pct}%</span>
      </div>
      <div className="tt-progress-track">
        <div className="tt-progress-fill" style={{ width: `${pct}%` }}/>
      </div>
    </div>
  );
};