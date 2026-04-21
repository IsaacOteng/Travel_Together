export default function KarmaRing({ score, level }) {
  const r = 38; const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(score / 600, 1);
  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg width="96" height="96" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7"/>
        <circle cx="48" cy="48" r={r} fill="none" stroke="#FF6B35" strokeWidth="7"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }}/>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-black text-white leading-none">{score}</span>
        <span className="text-[9px] text-[#FF6B35] font-bold tracking-widest uppercase mt-0.5">{level}</span>
      </div>
    </div>
  );
}
