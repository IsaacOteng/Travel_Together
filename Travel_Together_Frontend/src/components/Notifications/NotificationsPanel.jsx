import { useNavigate } from "react-router-dom";
import {
  X, AlertTriangle, UserCheck, CheckCircle,
  MessageCircle, Clock, MapPin, Bell, XCircle, Star,
} from "lucide-react";
import { tripsApi } from "../../services/api";
import { useNotifications } from "../../context/NotificationsContext.jsx";

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPE_CFG = {
  sos_alert:         { Icon: AlertTriangle, color: "#ef4444", bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.25)"   },
  join_request:      { Icon: UserCheck,     color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.25)"  },
  join_approved:     { Icon: CheckCircle,   color: "#4ade80", bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.25)"  },
  approved:          { Icon: CheckCircle,   color: "#4ade80", bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.25)"  },
  join_declined:     { Icon: XCircle,       color: "#f87171", bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.25)" },
  chat_message:      { Icon: MessageCircle, color: "#FF6B35", bg: "rgba(255,107,53,0.12)",  border: "rgba(255,107,53,0.25)"  },
  karma_level:       { Icon: Star,          color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.25)"  },
  trip_reminder:     { Icon: Clock,         color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.25)"  },
  trip_ended:        { Icon: CheckCircle,   color: "#a78bfa", bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.25)" },
  proximity_warning: { Icon: MapPin,        color: "#fb923c", bg: "rgba(251,146,60,0.12)",  border: "rgba(251,146,60,0.25)"  },
  review_reminder:   { Icon: Star,          color: "#FF6B35", bg: "rgba(255,107,53,0.12)",  border: "rgba(255,107,53,0.25)"  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ago(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function isToday(ts) {
  const d = new Date(ts);
  const n = new Date();
  return d.getDate() === n.getDate() &&
         d.getMonth() === n.getMonth() &&
         d.getFullYear() === n.getFullYear();
}

function useIsMobile() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768;
}

const PANEL_BG = "#09162a";

// ─── Animations ───────────────────────────────────────────────────────────────

const css = `
  @keyframes npDropIn {
    from { opacity: 0; transform: translateY(-10px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0)     scale(1);    }
  }
  @keyframes npSlideUp {
    from { transform: translateY(100%); }
    to   { transform: translateY(0);    }
  }
  @keyframes npFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .np-item { transition: background 150ms; }
  .np-item:hover { background: rgba(255,255,255,0.04) !important; }
  .np-scroll::-webkit-scrollbar { width: 4px; }
  .np-scroll::-webkit-scrollbar-track { background: transparent; }
  .np-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
`;

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHead({ label }) {
  return (
    <div style={{
      padding: "10px 20px 6px",
      fontSize: 10, fontWeight: 800,
      letterSpacing: "0.08em", textTransform: "uppercase",
      color: "rgba(255,255,255,0.25)",
    }}>
      {label}
    </div>
  );
}

// ─── Single notification row ──────────────────────────────────────────────────

function NotifItem({ n, onNav, onApprove, onDecline, onMarkRead, onProfile }) {
  const cfg       = TYPE_CFG[n.notification_type] ?? TYPE_CFG.trip_reminder;
  const decided   = n.data?.decided;
  const isJoinReq = n.notification_type === "join_request";
  const isApproved = n.notification_type === "approved" || n.notification_type === "join_approved";
  const isDeclined = n.notification_type === "join_declined";

  // Make the sender's name a clickable link in the body text
  function renderBody() {
    const body = n.body;
    if (!body || !n.sender_id) return body;
    // Try first_name match first (SOS, karma, etc.), then fall back to username (join requests)
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
      {/* unread left accent */}
      {!n.is_read && (
        <div style={{
          position: "absolute", left: 0, top: "50%",
          transform: "translateY(-50%)",
          width: 3, height: "60%", minHeight: 28,
          borderRadius: "0 3px 3px 0",
          background: "linear-gradient(180deg, #FF6B35, #ff8c5a)",
        }} />
      )}

      {/* icon bubble */}
      <div style={{
        width: 38, height: 38, flexShrink: 0, marginTop: 1, borderRadius: 12,
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <cfg.Icon size={15} color={cfg.color} strokeWidth={2} />
      </div>

      {/* content */}
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

        {/* join_request action buttons */}
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

        {/* join_request — already decided */}
        {isJoinReq && decided && (
          <p style={{
            margin: "6px 0 0", fontSize: 11, fontWeight: 700,
            color: decided === "approved" ? "#4ade80" : "#f87171",
          }}>
            {decided === "approved" ? "✓ Approved" : "✗ Declined"}
          </p>
        )}

        {/* approved — view trip button */}
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

        {/* declined notice */}
        {isDeclined && (
          <p style={{ margin: "6px 0 0", fontSize: 11, color: "#f87171", fontWeight: 600 }}>
            ✗ Request not accepted
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function NotificationsPanel({ open, onClose }) {
  const navigate  = useNavigate();
  const isMobile  = useIsMobile();
  const { items, unreadCount, markRead, markAllRead, setDecided } = useNotifications();

  if (!open) return null;

  // chat_message notifications are surfaced via the Chat nav badge, not here
  const nonChatItems = items.filter(n => n.notification_type !== "chat_message");

  // Sort: SOS first, then by time descending
  const sorted = [...nonChatItems].sort((a, b) => {
    if (a.notification_type === "sos_alert" && b.notification_type !== "sos_alert") return -1;
    if (b.notification_type === "sos_alert" && a.notification_type !== "sos_alert") return  1;
    return b.ts - a.ts;
  });

  const todayItems   = sorted.filter(n => isToday(n.ts));
  const earlierItems = sorted.filter(n => !isToday(n.ts));

  // ── actions ──

  const handleApprove = (n) => {
    setDecided(n.id, "approved");
    if (n.data?.trip_id && n.data?.user_id) {
      tripsApi.approveMember(n.data.trip_id, n.data.user_id).catch(() => {});
    }
  };

  const handleDecline = (n) => {
    setDecided(n.id, "declined");
    if (n.data?.trip_id && n.data?.user_id) {
      tripsApi.declineMember(n.data.trip_id, n.data.user_id).catch(() => {});
    }
  };

  const handleProfile = (userId) => {
    if (!userId) return;
    onClose();
    navigate(`/profile/${userId}`);
  };

  const handleNav = (n) => {
    // action_url takes priority if provided
    if (n.action_url) {
      onClose();
      navigate(n.action_url);
      return;
    }
    const t = n.notification_type;
    const d = n.data ?? {};

    if (t === "chat_message" && d.conversation_id) {
      onClose();
      navigate("/chat", { state: { conversationId: d.conversation_id } });
    } else if ((t === "approved" || t === "join_approved") && d.trip_id) {
      onClose();
      navigate(`/group-dashboard/${d.trip_id}`);
    } else if (t === "join_request" && d.trip_id) {
      onClose();
      navigate(`/group-dashboard/${d.trip_id}`);
    } else if (t === "trip_ended" && d.trip_id) {
      onClose();
      navigate(`/trips/${d.trip_id}`);
    } else if (t === "trip_reminder" && d.trip_id) {
      onClose();
      navigate(`/trips/${d.trip_id}`);
    } else if (t === "sos_alert" && d.trip_id) {
      onClose();
      navigate(`/group-dashboard/${d.trip_id}`);
    } else if (t === "karma_level") {
      onClose();
      navigate("/profile");
    } else if (t === "proximity_warning" && d.trip_id) {
      onClose();
      navigate(`/group-dashboard/${d.trip_id}`);
    }
    // no nav for unrecognised types — just mark as read
  };

  // ── shared list content ──

  const listContent = (
    <div className="np-scroll" style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
      {sorted.length === 0 && <EmptyState />}

      {todayItems.length > 0 && (
        <>
          <SectionHead label="Today" />
          {todayItems.map(n => (
            <NotifItem
              key={n.id}
              n={n}
              onNav={handleNav}
              onApprove={handleApprove}
              onDecline={handleDecline}
              onMarkRead={markRead}
              onProfile={handleProfile}
            />
          ))}
        </>
      )}

      {earlierItems.length > 0 && (
        <>
          <SectionHead label="Earlier" />
          {earlierItems.map(n => (
            <NotifItem
              key={n.id}
              n={n}
              onNav={handleNav}
              onApprove={handleApprove}
              onDecline={handleDecline}
              onMarkRead={markRead}
              onProfile={handleProfile}
            />
          ))}
        </>
      )}
    </div>
  );

  // ── shared header ──

  const header = (
    <div style={{
      flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "16px 20px 14px",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
          background: "rgba(255,107,53,0.12)", border: "1px solid rgba(255,107,53,0.22)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Bell size={14} color="#FF6B35" />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "rgba(255,255,255,0.9)" }}>
            Notifications
          </p>
          {unreadCount > 0 && (
            <p style={{ margin: 0, fontSize: 10, color: "#FF6B35", fontWeight: 700, marginTop: 1 }}>
              {unreadCount} unread
            </p>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 11, color: "rgba(255,255,255,0.35)", padding: "4px 6px",
              borderRadius: 6,
            }}
          >
            Mark all read
          </button>
        )}
        <button
          onClick={onClose}
          style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <X size={13} color="rgba(255,255,255,0.45)" />
        </button>
      </div>
    </div>
  );

  // ── mobile: slide-up sheet ──

  if (isMobile) {
    return (
      <>
        <style>{css}</style>

        {/* backdrop */}
        <div
          onClick={onClose}
          style={{
            position: "fixed", inset: 0, zIndex: 1100,
            background: "rgba(0,0,0,0.6)",
            animation: "npFadeIn .2s ease both",
          }}
        />

        {/* sheet */}
        <div style={{
          position: "fixed", left: 0, right: 0, bottom: 0,
          height: "78vh",
          zIndex: 1200,
          background: PANEL_BG,
          borderRadius: "20px 20px 0 0",
          border: "1px solid rgba(255,255,255,0.08)",
          borderBottom: "none",
          boxShadow: "0 -16px 48px rgba(0,0,0,0.5)",
          display: "flex", flexDirection: "column",
          animation: "npSlideUp .28s cubic-bezier(0.32,0.72,0,1) both",
          overflow: "hidden",
        }}>
          {/* drag handle */}
          <div style={{
            display: "flex", justifyContent: "center", padding: "10px 0 4px",
            flexShrink: 0,
          }}>
            <div style={{
              width: 36, height: 4, borderRadius: 2,
              background: "rgba(255,255,255,0.15)",
            }} />
          </div>

          {header}
          {listContent}

          {/* bottom safe area */}
          <div style={{ height: 58, flexShrink: 0 }} />
        </div>
      </>
    );
  }

  // ── desktop: dropdown ──

  return (
    <>
      <style>{css}</style>

      {/* click-away backdrop (invisible) */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 1100,
        }}
      />

      {/* dropdown panel */}
      <div style={{
        position: "fixed",
        top: 72, right: 16,
        width: 400,
        maxHeight: "calc(100vh - 88px)",
        zIndex: 1200,
        background: PANEL_BG,
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 20,
        boxShadow: "0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)",
        display: "flex", flexDirection: "column",
        animation: "npDropIn .2s cubic-bezier(0.16,1,0.3,1) both",
        overflow: "hidden",
      }}>
        {header}
        {listContent}
      </div>
    </>
  );
}
