import { useState } from "react";
import { X, Check, Copy, Link } from "lucide-react";

export default function ShareToast({ trip, onClose }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/trip/${trip.id}`;

  const copy = () => {
    navigator.clipboard?.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[3000] w-[min(340px,92vw)] shadow-2xl"
      style={{
        background: "#0f1f35",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 18,
        padding: "16px 18px",
        animation: "slideUp 0.2s ease",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: "rgba(255,107,53,0.12)", border: "1px solid rgba(255,107,53,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Link size={13} color="#FF6B35" />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.88)" }}>Share trip</span>
        </div>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", display: "flex" }}
        >
          <X size={15} />
        </button>
      </div>

      <div style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 10,
        padding: "9px 12px",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{
          fontSize: 11, color: "rgba(255,255,255,0.45)",
          flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {link}
        </span>
        <button
          onClick={copy}
          style={{
            background: copied ? "#4a9a72" : "#FF6B35",
            border: "none", borderRadius: 7,
            padding: "5px 12px", cursor: "pointer",
            color: "#fff", fontSize: 11, fontWeight: 700,
            display: "flex", alignItems: "center", gap: 5,
            flexShrink: 0, transition: "background 200ms",
          }}
        >
          {copied ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy</>}
        </button>
      </div>
    </div>
  );
}
