import { useState } from "react";
import { AlertTriangle, Check } from "lucide-react";

export default function SOSButton({ onFire }) {
  const [phase, setPhase] = useState("idle"); // "idle" | "loading" | "success" | "error"

  const handleClick = async () => {
    if (phase !== "idle") return;
    setPhase("loading");
    try {
      await onFire?.();
      setPhase("success");
    } catch {
      setPhase("error");
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleClick}
        disabled={phase === "loading" || phase === "success"}
        className={`
          w-16 h-16 rounded-full border-none cursor-pointer flex flex-col items-center justify-center gap-0.5 transition-all duration-200 select-none disabled:cursor-not-allowed
          ${phase === "success" ? "bg-gradient-to-br from-green-400 to-green-600 shadow-[0_0_20px_rgba(74,222,128,0.5)]"
          : phase === "error"   ? "bg-gradient-to-br from-orange-400 to-red-600 shadow-[0_0_20px_rgba(244,63,94,0.5)]"
          : phase === "loading" ? "bg-gradient-to-br from-red-400 to-red-600 opacity-70"
          : "bg-gradient-to-br from-red-400 to-red-600 [animation:sosPulse_2s_ease-in-out_infinite]"}
        `}
      >
        {phase === "success" ? <Check size={24} className="text-white" />
        : phase === "loading" ? <span className="text-[11px] font-black text-white animate-pulse">...</span>
        : phase === "error"   ? <AlertTriangle size={20} className="text-white" />
        : <>
            <AlertTriangle size={16} className="text-white" />
            <span className="text-[9px] font-black text-white tracking-widest">SOS</span>
          </>
        }
      </button>
      <span className={`text-[11px] font-semibold
        ${phase === "success" ? "text-green-400"
        : phase === "error"   ? "text-red-400"
        : phase === "loading" ? "text-white/50"
        : "text-white/30"}`}>
        {phase === "success" ? "Alert sent ✓"
        : phase === "error"  ? "Failed — tap to retry"
        : phase === "loading"? "Sending alert…"
        : "Tap to activate"}
      </span>
      {phase === "error" && (
        <button onClick={() => setPhase("idle")}
          className="text-[11px] text-white/40 underline bg-transparent border-none cursor-pointer">
          Try again
        </button>
      )}
    </div>
  );
}
