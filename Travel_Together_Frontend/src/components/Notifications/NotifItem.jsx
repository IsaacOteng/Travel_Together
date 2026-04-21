import { TYPE_CFG } from "./constants.js";
import { ago } from "./helpers.js";

export default function NotifItem({ n, onNav, onApprove, onDecline, onMarkRead, onProfile }) {
  const cfg       = TYPE_CFG[n.notification_type] ?? TYPE_CFG.trip_reminder;
  const decided   = n.data?.decided;
  const isJoinReq = n.notification_type === "join_request";
  const isApproved = n.notification_type === "approved" || n.notification_type === "join_approved";
  const isDeclined = n.notification_type === "join_declined";

  function renderBody() {
    const body = n.body;
    if (!body || !n.sender_id) return body;
    const candidates = [n.sender_name, n.sender_username].filter(Boolean);
    for (const name of candidates) {
      const idx = body.indexOf(name);
      if (idx !== -1) {
        return (
          <>
            {body.slice(0, idx)}
            <span
              onClick={e => { e.stopPropagation(); onProfile(n.sender_id); }}
              style={{ color: "#FF6B35", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
            >
              {name}
            </span>
            {body.slice(idx + name.length)}
          </>
        );
      }
    }
    return body;
  }

  return (
    <div
      className="np-item"
      onClick={() => { onMarkRead(n.id); onNav(n); }}
      style={{
        display: "flex", gap: 12,
        padding: "13px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        cursor: "pointer",
        background: n.is_read ? "transparent" : "rgba(255,107,53,0.04)",
        position: "relative",
      }}
    >
      {!n.is_read && (
        <div style={{
          position: "absolute", left: 0, top: "50%",
          transform: "translateY(-50%)",
          width: 3, height: "60%", minHeight: 28,
          borderRadius: "0 3px 3px 0",
          background: "linear-gradient(180deg, #FF6B35, #ff8c5a)",
        }} />
      )}

      <div style={{
        width: 38, height: 38, flexShrink: 0, marginTop: 1, borderRadius: 12,
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <cfg.Icon size={15} color={cfg.color} strokeWidth={2} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <span style={{
            fontSize: 12.5, fontWeight: n.is_read ? 600 : 700, lineHeight: 1.35,
            color: n.is_read ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.9)",
          }}>
            {n.title}
          </span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", flexShrink: 0, marginTop: 2 }}>
            {ago(n.ts)}
          </span>
        </div>

        <p style={{ margin: "3px 0 0", fontSize: 11.5, lineHeight: 1.5, color: "rgba(255,255,255,0.38)" }}>
          {renderBody()}
        </p>

        {isJoinReq && !decided && (
          <div style={{ display: "flex", gap: 8, marginTop: 10 }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => onApprove(n)}
              style={{
                flex: 1, padding: "6px 0", borderRadius: 8, cursor: "pointer",
                background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)",
                color: "#4ade80", fontSize: 11, fontWeight: 700,
              }}
            >
              ✓ Approve
            </button>
            <button
              onClick={() => onDecline(n)}
              style={{
                flex: 1, padding: "6px 0", borderRadius: 8, cursor: "pointer",
                background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)",
                color: "#f87171", fontSize: 11, fontWeight: 700,
              }}
            >
              ✗ Decline
            </button>
          </div>
        )}

        {isJoinReq && decided && (
          <p style={{
            margin: "6px 0 0", fontSize: 11, fontWeight: 700,
            color: decided === "approved" ? "#4ade80" : "#f87171",
          }}>
            {decided === "approved" ? "✓ Approved" : "✗ Declined"}
          </p>
        )}

        {isApproved && n.data?.trip_id && (
          <button
            onClick={e => { e.stopPropagation(); onNav(n); }}
            style={{
              marginTop: 10, padding: "6px 14px", borderRadius: 8, cursor: "pointer",
              background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)",
              color: "#4ade80", fontSize: 11, fontWeight: 700,
            }}
          >
            View Trip →
          </button>
        )}

        {isDeclined && (
          <p style={{ margin: "6px 0 0", fontSize: 11, color: "#f87171", fontWeight: 600 }}>
            ✗ Request not accepted
          </p>
        )}
      </div>
    </div>
  );
}
