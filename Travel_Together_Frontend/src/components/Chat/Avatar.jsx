import { useState } from "react";
import { avatarColor } from "./utils.js";

export default function Avatar({ name, size = "w-11 h-11", colorClass, online = false, imgSrc }) {
  const [failed, setFailed] = useState(false);
  const initials = name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const bg = colorClass || avatarColor(name);
  return (
    <div className="relative flex-shrink-0">
      {imgSrc && !failed
        ? <img src={imgSrc} alt={name} className={`${size} rounded-full object-cover`}
            onError={() => setFailed(true)} />
        : <div className={`${size} ${bg} rounded-full flex items-center justify-center font-bold text-white font-serif text-[13px]`}>
            {initials}
          </div>
      }
      {online && (
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-[#0d1b2a]" />
      )}
    </div>
  );
}
