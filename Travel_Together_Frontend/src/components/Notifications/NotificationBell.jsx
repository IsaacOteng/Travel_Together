import { Bell } from "lucide-react";

/*
  NotificationBell drop-in bell icon with unread count badge.

  Props:
    count   – number of unread notifications (default 0)
    onClick – called when the button is clicked
    light   – kept for call-site compatibility; the bell now follows the theme
*/
export default function NotificationBell({ count = 0, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Notifications"
      className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink-mute transition-colors hover:border-accent/40 hover:text-accent"
    >
      <Bell size={16} />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold leading-none text-accent-ink">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
