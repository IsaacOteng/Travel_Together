import { useState } from "react";
import { CheckCircle } from "lucide-react";
import RarityDot from "./RarityDot.jsx";

export default function BadgeCard({ badge }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className={`relative flex flex-col items-center gap-2 p-3 rounded-2xl border cursor-default transition-all duration-200
        ${badge.earned
          ? "bg-white/[0.05] border-white/10 hover:border-[#FF6B35]/30 hover:bg-[#FF6B35]/[0.06]"
          : "bg-white/[0.02] border-white/[0.04] opacity-50"}`}
    >
      <RarityDot rarity={badge.rarity} />
      <div className={`text-xl leading-none ${!badge.earned ? "grayscale" : ""}`}>{badge.icon}</div>
      <div className="text-center">
        <div className={`text-[11px] font-bold leading-tight ${badge.earned ? "text-white/80" : "text-white/35"}`}>
          {badge.label}
        </div>
        {!badge.earned && badge.progress && (
          <div className="text-[10px] text-white/25 mt-0.5">{badge.progress}</div>
        )}
      </div>
      {hov && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#1a2e45] border border-white/10 rounded-xl px-3 py-1.5 text-[10px] text-white/70 whitespace-nowrap z-10 shadow-xl">
          {badge.desc}
        </div>
      )}
      {badge.earned && (
        <div className="absolute top-2 right-2">
          <CheckCircle size={11} className="text-green-400" />
        </div>
      )}
    </div>
  );
}
