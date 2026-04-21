import { useState } from "react";

export default function Avatar({ name, size = "w-9 h-9", colorClass = "bg-[#FF6B35]", ring = false, imgSrc = null }) {
  const initials = name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const [failed, setFailed] = useState(false);
  return (
    <div className={`${size} ${colorClass} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 text-xs font-serif overflow-hidden ${ring ? "ring-2 ring-[#0d1b2a]" : ""}`}>
      {imgSrc && !failed
        ? <img src={imgSrc} alt={name} className="w-full h-full object-cover" onError={() => setFailed(true)} />
        : initials
      }
    </div>
  );
}
