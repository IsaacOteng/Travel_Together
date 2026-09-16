export default function KarmaRing({ score, level, size = 104 }) {
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(score / 600, 1);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--tt-line)" strokeWidth="7" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="var(--tt-accent)" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[24px] font-semibold leading-none text-ink">{score}</span>
        <span className="mt-1 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-accent">{level}</span>
      </div>
    </div>
  );
}
