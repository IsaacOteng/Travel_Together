import { useState } from "react";
import RarityDot from "./RarityDot.jsx";

export default function BadgeCard({ badge }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="relative flex flex-col items-center gap-2.5 py-4 px-2 cursor-default group"
    >
      <div className="relative flex items-center justify-center w-12 h-12">
        {badge.earned && (
          <span className="absolute inset-0 rounded-full bg-[#FF6B35]/20 blur-xl group-hover:bg-[#FF6B35]/35 transition-colors duration-300" />
        )}
        <span className={`relative text-[26px] leading-none transition-transform duration-200
          ${badge.earned ? "group-hover:scale-110" : "grayscale opacity-30"}`}>
          {badge.icon}
        </span>
      </div>

      <div className="text-center">
        <div className={`text-[11.5px] font-bold leading-tight ${badge.earned ? "text-white/85" : "text-white/25"}`}>
          {badge.label}
        </div>
        {!badge.earned && badge.progress && (
          <div className="text-[10px] text-white/20 mt-1">{badge.progress}</div>
        )}
        {badge.earned && (
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <RarityDot rarity={badge.rarity} />
            <span className="text-[9px] uppercase tracking-[0.12em] text-white/25">{badge.rarity}</span>
          </div>
        )}
      </div>

      {hov && badge.desc && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full bg-[#132437] rounded-lg px-3 py-1.5 text-[10px] text-white/70 whitespace-nowrap z-10 shadow-2xl">
          {badge.desc}
        </div>
      )}
    </div>
  );
}
