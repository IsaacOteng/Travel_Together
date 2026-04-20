import { useState } from "react";

/* ─────────────────────────────────────────────
  GPS BUTTON
───────────────────────────────────────────── */
export function GpsBtn({ onDetect }) {
  const [st, setSt]   = useState("idle");
  const [err, setErr] = useState("");

  const go = () => {
    if (!navigator.geolocation) { setErr("Geolocation not supported."); setSt("error"); return; }
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
        } catch { setErr("Could not resolve — enter manually."); setSt("error"); }
      },
      () => { setErr("Access denied — enter manually."); setSt("error"); }
    );
  };

  return (
    <div>
      <button type="button"
        className={`tt-gps-btn ${st === "done" ? "done" : ""}`}
        onClick={go} disabled={st === "detecting"}>
        {st === "detecting" ? (
          <svg className="tt-spin" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="#FF6B35" strokeWidth="1.5" strokeDasharray="16 9"/>
          </svg>
        ) : st === "done" ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="#16a34a" strokeWidth="1.5"/>
            <path d="M3.5 6l2 2 3-3" stroke="#16a34a" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="#FF6B35" strokeWidth="1.5"/>
            <circle cx="6" cy="6" r="1.5" fill="#FF6B35"/>
            <path d="M6 1v1.5M6 9.5V11M1 6h1.5M9.5 6H11" stroke="#FF6B35" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        )}
        {st === "done" ? "Location detected — edit if needed"
          : st === "detecting" ? "Detecting…"
          : "Use my current location"}
      </button>
      {st === "error" && <div className="tt-err" style={{ marginTop:6 }}>{err}</div>}
    </div>
  );
}