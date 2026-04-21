import { useNavigate } from "react-router-dom";
import { X, Bell } from "lucide-react";
import { tripsApi } from "../../services/api";
import { useNotifications } from "../../context/NotificationsContext.jsx";
import { PANEL_BG, css } from "./constants.js";
import { isToday, useIsMobile } from "./helpers.js";
import SectionHead from "./SectionHead.jsx";
import NotifItem from "./NotifItem.jsx";
import EmptyState from "./EmptyState.jsx";

export default function NotificationsPanel({ open, onClose }) {
  const navigate  = useNavigate();
  const isMobile  = useIsMobile();
  const { items, unreadCount, markRead, markAllRead, setDecided } = useNotifications();

  if (!open) return null;

  const nonChatItems = items.filter(n => n.notification_type !== "chat_message");

  const sorted = [...nonChatItems].sort((a, b) => {
    if (a.notification_type === "sos_alert" && b.notification_type !== "sos_alert") return -1;
    if (b.notification_type === "sos_alert" && a.notification_type !== "sos_alert") return  1;
    return b.ts - a.ts;
  });

  const todayItems   = sorted.filter(n => isToday(n.ts));
  const earlierItems = sorted.filter(n => !isToday(n.ts));

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
    if (n.action_url) {
      onClose();
      navigate(n.action_url);
      return;
    }
    const t = n.notification_type;
    const d = n.data ?? {};

    if (t === "chat_message" && d.conversation_id) {
      onClose(); navigate("/chat", { state: { conversationId: d.conversation_id } });
    } else if ((t === "approved" || t === "join_approved") && d.trip_id) {
      onClose(); navigate(`/group-dashboard/${d.trip_id}`);
    } else if (t === "join_request" && d.trip_id) {
      onClose(); navigate(`/group-dashboard/${d.trip_id}`);
    } else if (t === "trip_ended" && d.trip_id) {
      onClose(); navigate(`/trips/${d.trip_id}`);
    } else if (t === "trip_reminder" && d.trip_id) {
      onClose(); navigate(`/trips/${d.trip_id}`);
    } else if (t === "sos_alert" && d.trip_id) {
      onClose(); navigate(`/group-dashboard/${d.trip_id}`);
    } else if (t === "karma_level") {
      onClose(); navigate("/profile");
    } else if (t === "proximity_warning" && d.trip_id) {
      onClose(); navigate(`/group-dashboard/${d.trip_id}`);
    }
  };

  const listContent = (
    <div className="np-scroll" style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
      {sorted.length === 0 && <EmptyState />}
      {todayItems.length > 0 && (
        <>
          <SectionHead label="Today" />
          {todayItems.map(n => (
            <NotifItem key={n.id} n={n} onNav={handleNav} onApprove={handleApprove}
              onDecline={handleDecline} onMarkRead={markRead} onProfile={handleProfile} />
          ))}
        </>
      )}
      {earlierItems.length > 0 && (
        <>
          <SectionHead label="Earlier" />
          {earlierItems.map(n => (
            <NotifItem key={n.id} n={n} onNav={handleNav} onApprove={handleApprove}
              onDecline={handleDecline} onMarkRead={markRead} onProfile={handleProfile} />
          ))}
        </>
      )}
    </div>
  );

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
          <button onClick={markAllRead} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 11, color: "rgba(255,255,255,0.35)", padding: "4px 6px", borderRadius: 6,
          }}>
            Mark all read
          </button>
        )}
        <button onClick={onClose} style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)",
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}>
          <X size={13} color="rgba(255,255,255,0.45)" />
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <style>{css}</style>
        <div onClick={onClose} style={{
          position: "fixed", inset: 0, zIndex: 1100,
          background: "rgba(0,0,0,0.6)",
          animation: "npFadeIn .2s ease both",
        }} />
        <div style={{
          position: "fixed", left: 0, right: 0, bottom: 0, height: "78vh",
          zIndex: 1200, background: PANEL_BG,
          borderRadius: "20px 20px 0 0",
          border: "1px solid rgba(255,255,255,0.08)", borderBottom: "none",
          boxShadow: "0 -16px 48px rgba(0,0,0,0.5)",
          display: "flex", flexDirection: "column",
          animation: "npSlideUp .28s cubic-bezier(0.32,0.72,0,1) both",
          overflow: "hidden",
        }}>
          <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px", flexShrink: 0 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
          </div>
          {header}
          {listContent}
          <div style={{ height: 58, flexShrink: 0 }} />
        </div>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1100 }} />
      <div style={{
        position: "fixed", top: 72, right: 16, width: 400,
        maxHeight: "calc(100vh - 88px)", zIndex: 1200,
        background: PANEL_BG,
        border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20,
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
