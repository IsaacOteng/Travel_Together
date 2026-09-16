import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { X, CheckCheck } from "lucide-react";
import { tripsApi } from "../../services/api";
import { useNotifications } from "../../context/NotificationsContext.jsx";
import { css } from "./constants.js";
import { dayBucket, useIsMobile } from "./helpers.js";
import SectionHead from "./SectionHead.jsx";
import NotifItem from "./NotifItem.jsx";
import EmptyState from "./EmptyState.jsx";
import useBodyScrollLock from "../../hooks/useBodyScrollLock.js";

const BUCKETS = ["Today", "Yesterday", "Earlier"];

export default function NotificationsPanel({ open, onClose }) {
  const navigate  = useNavigate();
  const isMobile  = useIsMobile();
  const { items, unreadCount, markRead, markAllRead, setDecided } = useNotifications();
  const [onlyUnread, setOnlyUnread] = useState(false);

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const nonChatItems = items.filter(n => n.notification_type !== "chat_message");

  const sorted = [...nonChatItems].sort((a, b) => {
    if (a.notification_type === "sos_alert" && b.notification_type !== "sos_alert") return -1;
    if (b.notification_type === "sos_alert" && a.notification_type !== "sos_alert") return  1;
    return b.ts - a.ts;
  });

  const shown = onlyUnread ? sorted.filter(n => !n.is_read) : sorted;

  /* Group once, render in a fixed order, so a bucket never appears twice. */
  const grouped = BUCKETS.map(label => ({
    label,
    rows: shown.filter(n => dayBucket(n.ts) === label),
  })).filter(g => g.rows.length > 0);

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
      onClose(); navigate(`/trip/${d.trip_id}`);
    } else if (t === "trip_reminder" && d.trip_id) {
      onClose(); navigate(`/trip/${d.trip_id}`);
    } else if (t === "sos_alert" && d.trip_id) {
      onClose(); navigate(`/group-dashboard/${d.trip_id}`);
    } else if (t === "karma_level") {
      onClose(); navigate("/profile");
    } else if ((t === "refund_processed" || t === "trip_cancelled" || t === "payment_due") && d.trip_id) {
      onClose(); navigate(`/trip/${d.trip_id}`);
    } else if ((t === "payout_released" || t === "payment_received") && d.trip_id) {
      onClose(); navigate(`/group-dashboard/${d.trip_id}`);
    } else if (t === "proximity_warning" && d.trip_id) {
      onClose(); navigate(`/group-dashboard/${d.trip_id}`);
    }
  };

  const header = (
    <div className="shrink-0 border-b border-line px-5 pb-3 pt-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <h2 className="m-0 font-display text-[19px] font-semibold text-ink">Notifications</h2>
          {unreadCount > 0 && (
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[12px] font-semibold text-accent">
              {unreadCount} new
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close notifications"
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink-mute transition-colors hover:border-accent hover:text-accent"
        >
          <X size={15} />
        </button>
      </div>

      <div className="mt-3.5 flex items-center justify-between gap-3">
        <div className="flex gap-2" role="tablist">
          {[{ id: false, label: "All" }, { id: true, label: "Unread" }].map(t => (
            <button
              key={t.label}
              role="tab"
              aria-selected={onlyUnread === t.id}
              onClick={() => setOnlyUnread(t.id)}
              className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors ${
                onlyUnread === t.id
                  ? "border-accent bg-accent font-semibold text-accent-ink"
                  : "border-line bg-surface font-medium text-ink-soft hover:border-accent hover:text-accent"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-[12.5px] font-medium text-ink-mute transition-colors hover:text-accent"
          >
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>
    </div>
  );

  const listContent = (
    <div className="np-scroll flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
      {shown.length === 0 && <EmptyState filtered={onlyUnread} />}
      {grouped.map(g => (
        <div key={g.label}>
          <SectionHead label={g.label} />
          {g.rows.map(n => (
            <NotifItem
              key={n.id} n={n}
              onNav={handleNav} onApprove={handleApprove} onDecline={handleDecline}
              onMarkRead={markRead} onProfile={handleProfile}
            />
          ))}
        </div>
      ))}
    </div>
  );

  const panel = isMobile ? (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-1100"
        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", animation: "ttFadeIn .2s ease both" }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        className="fixed inset-x-0 bottom-0 z-1200 flex h-[78vh] flex-col overflow-hidden rounded-t-3xl border border-line bg-ground"
        style={{ animation: "npSlideUp .28s cubic-bezier(0.32,0.72,0,1) both", boxShadow: "0 -16px 48px var(--tt-shadow-lg)" }}
      >
        <div className="flex shrink-0 justify-center pb-1 pt-2.5">
          <span className="h-1 w-9 rounded-full bg-line" />
        </div>
        {header}
        {listContent}
        <div className="h-14.5 shrink-0" />
      </div>
    </>
  ) : (
    <>
      <div onClick={onClose} className="fixed inset-0 z-1100" />
      {/* Sits inside tt-shell so its right edge lines up with the page gutter
          rather than hugging the viewport. pointer-events are re-enabled on
          the panel itself so the rest of the row stays click-through. */}
      <div className="pointer-events-none fixed inset-x-0 top-19 z-1200">
        <div className="tt-shell flex justify-end">
          <div
            role="dialog"
            aria-label="Notifications"
            className="pointer-events-auto flex w-105 max-w-full flex-col overflow-hidden rounded-3xl border border-line bg-ground"
            style={{
              maxHeight: "calc(100vh - 96px)",
              animation: "npDropIn .2s cubic-bezier(0.16,1,0.3,1) both",
              boxShadow: "0 20px 60px var(--tt-shadow-lg)",
            }}
          >
            {header}
            {listContent}
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(
    <>
      <style>{css}</style>
      {panel}
    </>,
    document.body
  );
}
