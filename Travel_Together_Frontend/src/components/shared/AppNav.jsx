import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Heart } from 'lucide-react';
import NotificationBell from '../Notifications/NotificationBell.jsx';
import NotificationsPanel from '../Notifications/NotificationsPanel.jsx';
import GuestDialog from './GuestDialog.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNotifications } from '../../context/NotificationsContext.jsx';
import { useChatUnread } from '../../context/ChatUnreadContext.jsx';
import { officialLogo } from "../../assets/logos";
import { initials } from "../../utils/name.js";

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

  const avatarInitials = user ? initials(user) : null;
  const avatarUrl = user?.avatar_url || null;

  const isActive = (path) =>
    pathname === path ||
    (path === "/discover" && ["/discover", "/group-dashboard"].includes(pathname));

  return (
    <header className="sticky top-0 z-100 flex h-18 items-center border-b border-line bg-ground">
      {/* tt-shell, not a width of its own: the nav has to line up with the page
          bands under it, and it used to cap 80px narrower than the content. */}
      <div className="tt-shell flex items-center justify-between gap-5">

        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate('/discover')}
            className="flex shrink-0 cursor-pointer items-center gap-2.5 border-none bg-transparent p-0"
          >
            <img
              src={officialLogo}
              alt="Travel Together"
              className="h-9 w-9"
              onError={e => { e.target.style.display = "none"; }}
            />
            <span className="hidden font-display text-[18px] font-semibold text-ink sm:inline">
              Travel Together
            </span>
          </button>

          <nav className="flex shrink-0 gap-1">
            {TABS.map(tab => {
              const active    = isActive(tab.path);
              const chatBadge = tab.path === "/chat" && totalChatUnread > 0;
              return (
                <button
                  key={tab.label}
                  onClick={() =>
                    tab.protected
                      ? requireAuth(tab.reason, () => navigate(tab.path))
                      : navigate(tab.path)
                  }
                  className={`relative cursor-pointer rounded-full border-none px-4 py-2 text-[14px] transition-colors ${
                    active
                      ? "bg-accent-soft font-semibold text-accent"
                      : "bg-transparent font-medium text-ink-soft hover:text-accent"
                  }`}
                >
                  {tab.label}
                  {chatBadge && user && (
                    <span
                      key={totalChatUnread}
                      className="absolute right-1 top-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full border-2 border-ground bg-accent px-1 text-[9px] font-bold leading-none text-accent-ink"
                      style={{ animation: "ttBadgePop .2s cubic-bezier(0.34,1.56,0.64,1) both" }}
                    >
                      {totalChatUnread > 99 ? "99+" : totalChatUnread}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3">
          {showSearch && (
            <div className="relative hidden w-full max-w-[340px] md:block">
              <Search
                size={15}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-mute"
              />
              <input
                value={searchQuery}
                onChange={e => onSearch?.(e.target.value)}
                placeholder="Search trips, places…"
                aria-label="Search trips"
                className="w-full rounded-full border border-line bg-surface py-2.5 pl-11 pr-4 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-mute focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
          )}

          <div className="flex shrink-0 items-center gap-2.5">
            {savedCount > 0 && user && (
              <button
                onClick={() => navigate('/dashboard?s=saved')}
                className="hidden cursor-pointer items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-3 py-1.5 transition-colors hover:border-accent lg:flex"
              >
                <Heart size={13} className="text-accent" fill="currentColor" />
                <span className="text-[12.5px] font-semibold text-accent">{savedCount} saved</span>
              </button>
            )}

            {rightExtra}

            <ThemeToggle />

            <NotificationBell
              count={user ? unreadCount : 0}
              onClick={() => requireAuth("See trip updates and notifications", () => setShowNotifs(true))}
            />

            {user ? (
              <button
                onClick={() => navigate('/profile')}
                aria-label="Your profile"
                className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-line p-0 transition-colors hover:border-accent cursor-pointer"
              >
                {avatarUrl && (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-full w-full rounded-full object-cover"
                    onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                  />
                )}
                <span
                  className="h-full w-full items-center justify-center rounded-full bg-accent-soft text-[12px] font-bold text-accent"
                  style={{ display: avatarUrl ? "none" : "flex" }}
                >
                  {avatarInitials}
                </span>
              </button>
            ) : (
              <button
                onClick={() => navigate('/signup')}
                className="cursor-pointer rounded-full border-none bg-accent px-4 py-2 text-[13.5px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
              >
                Sign in
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
