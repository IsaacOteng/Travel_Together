import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, MessageCircle, Users, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useChatUnread } from '../../context/ChatUnreadContext.jsx';
import GuestDialog from './GuestDialog.jsx';

const TABS = [
  { id: "home",      icon: Home,          label: "Home",     path: "/discover",  protected: false },
  { id: "chat",      icon: MessageCircle, label: "Chat",     path: "/chat",      protected: true, reason: "Chat with your travel groups"  },
  { id: "dashboard", icon: Users,         label: "My Trips", path: "/dashboard", protected: true, reason: "View and manage your trips"    },
  { id: "profile",   icon: User,          label: "Profile",  path: "/profile",   protected: true, reason: "View and edit your profile"   },
];

export default function MobileBottomNav() {
  const navigate  = useNavigate();
  const { pathname } = useLocation();
  const { user }  = useAuth();
  const { totalChatUnread } = useChatUnread();
  const [guestDialog, setGuestDialog] = useState({ open: false, reason: "" });

  const requireAuth = (reason, fn) => {
    if (!user) { setGuestDialog({ open: true, reason }); return; }
    fn();
  };

  const isActive = (path) => pathname === path;

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-200 grid h-[58px] grid-cols-4 border-t border-line bg-ground/95 backdrop-blur-md">
        {TABS.map(tab => {
          const active    = isActive(tab.path);
          const isChat    = tab.id === "chat";
          const chatBadge = isChat && user && totalChatUnread > 0;
          return (
            <button
              key={tab.id}
              onClick={() =>
                tab.protected
                  ? requireAuth(tab.reason, () => navigate(tab.path))
                  : navigate(tab.path)
              }
              className={`relative flex cursor-pointer flex-col items-center justify-center gap-[3px] border-none bg-transparent transition-colors ${
                active ? "text-accent" : "text-ink-mute"
              }`}
            >
              <div className="relative">
                <tab.icon size={21} />
                {chatBadge && (
                  <span
                    key={totalChatUnread}
                    className="absolute -right-[7px] -top-[5px] inline-flex h-[15px] min-w-[15px] items-center justify-center rounded-full border-2 border-ground bg-accent px-[3px] text-[8px] font-bold leading-none text-accent-ink"
                    style={{ animation: "ttBadgePop .2s cubic-bezier(0.34,1.56,0.64,1) both" }}
                  >
                    {totalChatUnread > 99 ? "99+" : totalChatUnread}
                  </span>
                )}
              </div>
              <span className={`text-[9px] ${active ? "font-bold" : "font-medium"}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      <GuestDialog
        open={guestDialog.open}
        reason={guestDialog.reason}
        onClose={() => setGuestDialog({ open: false, reason: "" })}
      />
    </>
  );
}
