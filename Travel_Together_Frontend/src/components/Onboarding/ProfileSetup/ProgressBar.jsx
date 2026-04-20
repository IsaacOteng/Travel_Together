/* ══════════════════════════════════════════════════
   PROGRESS BAR  — matches tt-progress-* exactly
   thin 3px track, orange fill, step label + pct
══════════════════════════════════════════════════ */
export const ProgressBar = ({ step, total }) => {
  const pct = Math.round((step / total) * 100);
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] font-bold tracking-widest uppercase text-[#FF6B35]">
          Step {step} of {total}
        </span>
        <span className="text-[10px] text-gray-400">{pct}%</span>
      </div>
      <div className="h-0.75 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg,#FF6B35,#ff9a5c)" }}
        />
      </div>
    </div>
  );
};