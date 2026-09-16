import RarityDot from "./RarityDot.jsx";

export default function BadgeCard({ badge }) {
  return (
    <div
      title={badge.desc || undefined}
      className={`flex flex-col items-center gap-2.5 rounded-2xl border px-2 py-4 text-center transition-colors ${
        badge.earned
          ? "border-line bg-surface hover:border-accent/40"
          : "border-dashed border-line bg-transparent"
      }`}
    >
      <span className={`text-[26px] leading-none ${badge.earned ? "" : "opacity-30 grayscale"}`}>
        {badge.icon}
      </span>

      <div>
        <div className={`text-[12px] font-semibold leading-tight ${badge.earned ? "text-ink" : "text-ink-mute"}`}>
          {badge.label}
        </div>
        {!badge.earned && badge.progress && (
          <div className="mt-1 text-[11px] text-ink-mute">{badge.progress}</div>
        )}
        {badge.earned && (
          <div className="mt-1.5 flex items-center justify-center gap-1.5">
            <RarityDot rarity={badge.rarity} />
            <span className="text-[10px] uppercase tracking-[0.12em] text-ink-mute">{badge.rarity}</span>
          </div>
        )}
      </div>
    </div>
  );
}
