import { useState } from "react";
import { Plus } from "lucide-react";

/* ══════════════════════════════════════════
   FLOATING ACTION BUTTON — drop into Discover
══════════════════════════════════════════ */
export function CreateTripFAB({ onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="fixed bottom-6 right-6 z-[200] h-[52px] rounded-full
        bg-gradient-to-br from-[#FF6B35] to-[#ff8c5a] border-none cursor-pointer
        flex items-center shadow-[0_6px_24px_rgba(255,107,53,0.45)]
        overflow-hidden transition-all duration-[250ms]"
      style={{ width: hov ? 160 : 52, padding: hov ? "0 18px" : "0", gap: hov ? 10 : 0 }}
    >
      <Plus size={22} color="#fff" className="flex-shrink-0" />
      <span className={`text-[13px] font-bold text-white whitespace-nowrap transition-opacity duration-150 ${hov ? "opacity-100" : "opacity-0"}`}>
        Create trip
      </span>
    </button>
  );
}