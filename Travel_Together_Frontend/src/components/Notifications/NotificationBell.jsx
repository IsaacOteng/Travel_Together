import { Bell } from "lucide-react";

/*
  NotificationBell — drop-in bell icon with unread count badge.

  Props:
    count   – number of unread notifications (default 0)
    onClick – called when the button is clicked
    light   – use dark icon on light background (default false = white icon)
*/
export default function NotificationBell({ count = 0, onClick, light = false }) {
  return (
    <button
      onClick={onClick}
      aria-label="Notifications"
      className="relative w-9 h-9 rounded-full flex items-center justify-center cursor-pointer border transition-all
        bg-white/[0.07] border-white/10 hover:bg-white/15"
    >
      <Bell
        size={16}
        className={light ? "text-[#071422]" : "text-white/60"}
      />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-[#FF6B35] rounded-full
          text-[9px] font-black text-white flex items-center justify-center px-1 leading-none">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
