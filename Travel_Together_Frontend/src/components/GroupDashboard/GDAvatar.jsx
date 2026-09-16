import { useState } from "react";

export default function Avatar({ name, size = "w-9 h-9", colorClass = "bg-accent-soft", ring = false, imgSrc = null }) {
  const initials = name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const [failed, setFailed] = useState(false);
  return (
    <div className={`${size} ${colorClass} flex shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-accent ${ring ? "ring-2 ring-surface" : ""}`}>
      {imgSrc && !failed
        ? <img src={imgSrc} alt={name} className="h-full w-full object-cover" onError={() => setFailed(true)} />
        : initials
      }
    </div>
  );
}
