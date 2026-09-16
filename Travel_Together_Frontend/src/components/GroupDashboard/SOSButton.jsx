import { useState } from "react";
import { AlertTriangle, Check } from "lucide-react";

/* Deliberately the one place that uses --tt-danger rather than the brand
   accent. An emergency control must not look like every other button. */
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

  const skin =
    phase === "success" ? "bg-moss"
    : phase === "loading" ? "bg-danger opacity-70"
    : "bg-danger";

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleClick}
        disabled={phase === "loading" || phase === "success"}
        aria-label="Send an SOS alert to your group"
        className={`flex h-16 w-16 cursor-pointer select-none flex-col items-center justify-center gap-0.5 rounded-full border-none text-white transition-colors disabled:cursor-not-allowed ${skin} ${
          phase === "idle" ? "[animation:sosPulse_2s_ease-in-out_infinite]" : ""
        }`}
      >
        {phase === "success" ? <Check size={24} />
        : phase === "loading" ? <span className="animate-pulse text-[11px] font-bold">…</span>
        : phase === "error"   ? <AlertTriangle size={20} />
        : <>
            <AlertTriangle size={16} />
            <span className="text-[9.5px] font-bold tracking-[0.14em]">SOS</span>
          </>
        }
      </button>

      <span className={`text-[12px] font-medium ${
        phase === "success" ? "text-moss"
        : phase === "error" ? "text-danger"
        : "text-ink-mute"
      }`}>
        {phase === "success" ? "Alert sent"
        : phase === "error"  ? "Failed — tap to retry"
        : phase === "loading" ? "Sending alert…"
        : "Tap to activate"}
      </span>

      {phase === "error" && (
        <button onClick={() => setPhase("idle")}
          className="cursor-pointer border-none bg-transparent text-[12px] text-ink-mute underline underline-offset-2 hover:text-ink">
          Try again
        </button>
      )}
    </div>
  );
}
