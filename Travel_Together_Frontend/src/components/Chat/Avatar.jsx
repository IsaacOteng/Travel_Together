import { useState } from "react";
import { avatarColor } from "./utils.js";

export default function Avatar({ name, size = "w-11 h-11", colorClass, online = false, imgSrc }) {
  const [failed, setFailed] = useState(false);
  const initials = name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const bg = colorClass || avatarColor(name);
  return (
    <div className="relative shrink-0">
      {imgSrc && !failed
        ? <img src={imgSrc} alt={name} className={`${size} rounded-full object-cover`}
            onError={() => setFailed(true)} />
        : <div className={`${size} ${bg} flex items-center justify-center rounded-full text-[13px] font-semibold text-accent`}>
            {initials}
          </div>
      }
      {online && (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface bg-moss" />
      )}
    </div>
  );
}
