import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Heart } from 'lucide-react';
import NotificationBell from '../Notifications/NotificationBell.jsx';
import NotificationsPanel from '../Notifications/NotificationsPanel.jsx';
import GuestDialog from './GuestDialog.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNotifications } from '../../context/NotificationsContext.jsx';
import { useChatUnread } from '../../context/ChatUnreadContext.jsx';

const TABS = [
  { label: "Discover", path: "/discover",  protected: false },
  { label: "My Trips", path: "/dashboard", protected: true,  reason: "View and manage your trips"  },
  { label: "Chat",     path: "/chat",      protected: true,  reason: "Chat with your travel groups" },
];

export default function AppNav({
  showSearch = false,
  searchQuery = "",
  onSearch,
  savedCount = 0,
  rightExtra = null,
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { unreadCount, resetUnread } = useNotifications();
  const { totalChatUnread } = useChatUnread();
  const [showNotifs,  setShowNotifs]  = useState(false);
  const [guestDialog, setGuestDialog] = useState({ open: false, reason: "" });

  const requireAuth = (reason, fn) => {
    if (!user) { setGuestDialog({ open: true, reason }); return; }
    fn();
  };

  const initials = user
    ? ((user.first_name?.[0] || "") + (user.last_name?.[0] || "")).toUpperCase() || user.username?.[0]?.toUpperCase() || "?"
    : null;
  const avatarUrl = user?.avatar_url || null;

  const isActive = (path) =>
    pathname === path ||
    (path === "/discover" && ["/discover", "/group-dashboard", "/trip-welcome"].includes(pathname));

  return (
    <header className="sticky top-0 z-[100] bg-[rgba(7,20,34,0.95)] backdrop-blur-2xl border-b border-white/[0.06] px-8 h-16 flex items-center gap-5">
      <div className="justify-between items-center flex w-full max-w-[1200px] mx-auto">

        <div className="flex items-center gap-5">
          {/* Logo */}
          <div
            className="flex items-center gap-0 flex-shrink-0 cursor-pointer"
            onClick={() => navigate('/discover')}
          >
            <img
              src="/src/assets/official_logo_nobg.png"
              alt="Travel Together"
              className="w-12 h-12"
              onError={e => { e.target.style.display = "none"; }}
            />
            <span className="text-[15px] font-bold text-white tracking-[-0.3px]">Travel Together</span>
          </div>

          {/* Nav tabs */}
          <nav className="flex gap-1 flex-shrink-0">
            {TABS.map(tab => {
              const active    = isActive(tab.path);
              const isChat    = tab.path === "/chat";
              const chatBadge = isChat && totalChatUnread > 0;
              return (
                <button
                  key={tab.label}
                  onClick={() =>
                    tab.protected
                      ? requireAuth(tab.reason, () => navigate(tab.path))
                      : navigate(tab.path)
                  }
                  className="relative px-4 py-[7px] rounded-lg border-none cursor-pointer text-[13px] transition-colors duration-150"
                  style={{
                    background: active ? "rgba(255,107,53,0.15)" : "transparent",
                    color:      active ? "#FF6B35"               : "rgba(255,255,255,0.5)",
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  {tab.label}
                  {chatBadge && user && (
                    <span
                      key={totalChatUnread}
                      style={{
                        position: "absolute",
                        top: 2, right: 2,
                        minWidth: 16, height: 16,
                        padding: "0 4px",
                        borderRadius: 8,
                        background: "#FF6B35",
                        border: "1.5px solid rgba(7,20,34,0.9)",
                        color: "#fff",
                        fontSize: 9,
                        fontWeight: 900,
                        lineHeight: "16px",
                        textAlign: "center",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        animation: "chatBadgePop .2s cubic-bezier(0.34,1.56,0.64,1) both",
                        pointerEvents: "none",
                      }}
                    >
                      {totalChatUnread > 99 ? "99+" : totalChatUnread}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
          <style>{`
            @keyframes chatBadgePop {
              from { transform: scale(0.4); opacity: 0; }
              to   { transform: scale(1);   opacity: 1; }
            }
          `}</style>
        </div>

        <div className="flex items-center gap-5">
          {/* Search bar */}
          {showSearch && (
            <div className="flex-1 max-w-[340px] relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
              <input
                value={searchQuery}
                onChange={e => onSearch?.(e.target.value)}
                placeholder="Search trips, places…"
                className="w-full bg-white/[0.07] border border-white/10 rounded-3xl py-[9px] pr-3.5 pl-9 text-[13px] text-white outline-none transition-all duration-150 box-border focus:border-[#FF6B35] focus:shadow-[0_0_0_3px_rgba(255,107,53,.1)]"
              />
            </div>
          )}
          {!showSearch && <div className="flex-1" />}

          <div className="flex items-center gap-2.5 flex-shrink-0">
            {savedCount > 0 && user && (
              <button
                onClick={() => navigate('/dashboard?s=saved')}
                className="flex items-center gap-1.5 bg-[rgba(255,107,53,0.15)] border border-[rgba(255,107,53,0.25)] rounded-full px-2.5 py-1 cursor-pointer hover:bg-[rgba(255,107,53,0.25)] transition-colors"
              >
                <Heart size={13} color="#FF6B35" fill="#FF6B35" />
                <span className="text-[11px] font-bold text-[#FF6B35]">{savedCount} saved</span>
              </button>
            )}

            {rightExtra}

            <NotificationBell
              count={user ? unreadCount : 0}
              onClick={() => requireAuth("See trip updates and notifications", () => setShowNotifs(true))}
            />

            {/* Avatar / profile button */}
            {user ? (
              <button
                onClick={() => navigate('/profile')}
                className="w-[34px] h-[34px] rounded-full flex-shrink-0 border-none cursor-pointer hover:ring-2 hover:ring-[#4ade80]/50 transition-all overflow-hidden p-0"
              >
                {avatarUrl
                  ? <img src={avatarUrl} alt={initials} className="w-full h-full object-cover rounded-full"
                      onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
                  : null}
                <span
                  className="w-full h-full bg-gradient-to-br from-[#4ade80] to-[#22c55e] rounded-full flex items-center justify-center text-[12px] font-bold text-white font-serif"
                  style={{ display: avatarUrl ? "none" : "flex" }}
                >
                  {initials}
                </span>
              </button>
            ) : (
              <button
                onClick={() => setGuestDialog({ open: true, reason: "Access your profile and travel history" })}
                className="w-[34px] h-[34px] rounded-full flex-shrink-0 border border-white/20 bg-white/[0.07] cursor-pointer hover:bg-white/15 transition-all flex items-center justify-center text-white/50 text-[11px] font-bold"
              >
                ?
              </button>
            )}
          </div>
        </div>
      </div>

      <NotificationsPanel open={showNotifs} onClose={() => { setShowNotifs(false); resetUnread(); }} />

      <GuestDialog
        open={guestDialog.open}
        reason={guestDialog.reason}
        onClose={() => setGuestDialog({ open: false, reason: "" })}
      />
    </header>
  );
}
