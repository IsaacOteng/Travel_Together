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

const css = `
  @keyframes mbBadgePop {
    from { transform: scale(0.4); opacity: 0; }
    to   { transform: scale(1);   opacity: 1; }
  }
`;

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
      <nav className="fixed bottom-0 left-0 right-0 z-[200] bg-[rgba(7,20,34,0.97)] backdrop-blur-xl border-t border-white/[0.08] grid grid-cols-4 h-[58px]">
        <style>{css}</style>
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
              className="relative flex flex-col items-center justify-center gap-[3px] border-none bg-transparent cursor-pointer transition-colors duration-150"
              style={{ color: active ? "#FF6B35" : "rgba(255,255,255,0.35)" }}
            >
              <div className="relative">
                <tab.icon size={21} />
                {chatBadge && (
                  <span
                    key={totalChatUnread}
                    style={{
                      position:   "absolute",
                      top: -5, right: -7,
                      minWidth:   15, height: 15,
                      padding:    "0 3px",
                      borderRadius: 8,
                      background: "#FF6B35",
                      border:     "1.5px solid rgba(7,20,34,0.97)",
                      color:      "#fff",
                      fontSize:   8,
                      fontWeight: 900,
                      lineHeight: "15px",
                      textAlign:  "center",
                      display:    "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      animation:  "mbBadgePop .2s cubic-bezier(0.34,1.56,0.64,1) both",
                      pointerEvents: "none",
                    }}
                  >
                    {totalChatUnread > 99 ? "99+" : totalChatUnread}
                  </span>
                )}
              </div>
              <span className="text-[9px]" style={{ fontWeight: active ? 700 : 500 }}>
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
