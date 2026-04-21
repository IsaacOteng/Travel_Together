import { Bell } from "lucide-react";

export default function EmptyState() {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      height: 220, gap: 12,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 16,
        background: "rgba(255,107,53,0.08)", border: "1px solid rgba(255,107,53,0.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Bell size={20} color="rgba(255,107,53,0.5)" />
      </div>
      <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>
        All caught up
      </p>
      <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.15)" }}>
        No notifications yet
      </p>
    </div>
  );
}
