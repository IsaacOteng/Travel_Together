import { useState } from "react";
import { Loader2, Check, LocateFixed } from "lucide-react";

/* "Use my current location" — off the legacy .tt-gps-btn rule onto tokens.
   Behaviour unchanged. */
export function GpsBtn({ onDetect }) {
  const [st, setSt]   = useState("idle");
  const [err, setErr] = useState("");

  const go = () => {
    if (!navigator.geolocation) {
      setErr("Your browser doesn't support location lookup.");
      setSt("error");
      return;
    }
    setSt("detecting");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`
          );
          const d = await r.json();
          onDetect(
            d.address?.city || d.address?.town || d.address?.village || "",
            d.address?.country || ""
          );
          setSt("done");
        } catch {
          setErr("Couldn't work out where that is — type it in below.");
          setSt("error");
        }
      },
      () => { setErr("Location access was declined — type it in below."); setSt("error"); }
    );
  };

  const done = st === "done";

  return (
    <div>
      <button
        type="button"
        onClick={go}
        disabled={st === "detecting"}
        className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-[13.5px] font-medium transition-colors disabled:cursor-not-allowed ${
          done
            ? "border-moss/40 bg-moss/10 text-moss"
            : "border-line bg-surface text-ink-soft hover:border-accent hover:text-accent"
        }`}
      >
        {st === "detecting" ? (
          <Loader2 size={14} className="animate-spin" />
        ) : done ? (
          <Check size={14} />
        ) : (
          <LocateFixed size={14} />
        )}
        {done
          ? "Location filled in — edit if needed"
          : st === "detecting"
          ? "Finding you…"
          : "Use my current location"}
      </button>
      {st === "error" && (
        <p role="alert" className="mt-2 text-[12.5px] text-danger">{err}</p>
      )}
    </div>
  );
}
