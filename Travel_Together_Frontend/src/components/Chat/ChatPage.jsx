import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import AppNav from "../shared/AppNav.jsx";
import MobileBottomNav from "../shared/MobileBottomNav.jsx";
import { chatApi } from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useChatUnread } from "../../context/ChatUnreadContext.jsx";
import { normaliseConv } from "./utils.js";
import ChatList from "./ChatList.jsx";
import ConversationView from "./ConversationView.jsx";
import EmptyState from "./EmptyState.jsx";
import { officialLogo } from "../../assets/logos";

const globalStyles = `
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(-4px); }
  }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-thumb { background: var(--tt-line); border-radius: 99px; }
`;

export default function ChatPage() {
  const location = useLocation();
  const { user } = useAuth();
  const { markConvRead, syncFromList } = useChatUnread();

  const [winW,          setWinW]          = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  const [active,        setActive]        = useState(null);
  const [mobileView,    setMobileView]    = useState("list");
  const [conversations, setConversations] = useState([]);

  const activeRef = useRef(null);
  useEffect(() => { activeRef.current = active; }, [active]);

  useEffect(() => {
    if (conversations.length > 0) syncFromList(conversations);
  }, [conversations, syncFromList]);

  const mobile = winW < 1024;

  useEffect(() => {
    const h = () => setWinW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  useEffect(() => {
    const targetId = location.state?.conversationId;
    chatApi.list()
      .then(({ data }) => {
        const list = (data.results ?? data).map(c => normaliseConv(c, user?.id));
        setConversations(list);
        if (targetId) {
          const found = list.find(c => String(c.id) === String(targetId));
          if (found) {
            const opened = { ...found, unread: 0, read: true };
            setConversations(list.map(c => String(c.id) === String(targetId) ? opened : c));
            setActive(opened);
            setMobileView("chat");
            markConvRead(targetId);
          } else {
            chatApi.get(targetId)
              .then(({ data: conv }) => {
                const norm = normaliseConv(conv, user?.id);
                const opened = { ...norm, unread: 0, read: true };
                setConversations(prev => [opened, ...prev.filter(c => c.id !== norm.id)]);
                setActive(opened);
                setMobileView("chat");
                markConvRead(targetId);
              })
              .catch(() => {});
          }
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const poll = () => {
      chatApi.list()
        .then(({ data }) => {
          const list = (data.results ?? data).map(c => normaliseConv(c, user?.id));
          setConversations(prev => {
            const seen = new Set(prev.map(c => String(c.id)));
            const fresh = list.filter(c => !seen.has(String(c.id)));
            return fresh.length ? [...fresh, ...prev] : prev;
          });
        })
        .catch(() => {});
    };
    const id = setInterval(poll, 30000);
    return () => clearInterval(id);
  }, [user?.id]);

  const lastConvFetch = useRef({});
  useEffect(() => {
    if (!user?.id) return;
    const handler = (e) => {
      const convId = e.detail?.convId;
      if (!convId) return;
      if (String(convId) === String(activeRef.current?.id)) return;

      const stamp = Date.now();
      lastConvFetch.current[convId] = stamp;

      chatApi.get(convId)
        .then(({ data }) => {
          if (lastConvFetch.current[convId] !== stamp) return;
          const norm = normaliseConv(data, user?.id);
          setConversations(prev => {
            const idx = prev.findIndex(c => String(c.id) === String(norm.id));
            if (idx === -1) return [norm, ...prev];
            const next = [...prev];
            next[idx] = norm;
            return [next[idx], ...next.filter((_, i) => i !== idx)];
          });
        })
        .catch(() => {});
    };
    window.addEventListener("tt:chat-message", handler);
    return () => window.removeEventListener("tt:chat-message", handler);
  }, [user?.id]);

  const handleNewMessage = useCallback((convId, message) => {
    const isMyMsg  = String(message.sender_id) === String(user?.id);
    const isActive = String(convId) === String(activeRef.current?.id);

    setConversations(prev => {
      const idx = prev.findIndex(c => String(c.id) === String(convId));

      const preview =
        message.is_deleted              ? "Message deleted" :
        message.message_type === "image"? "📷 Photo"        :
        message.message_type === "voice"? "🎵 Voice message":
        message.text || "";

      const time = message.created_at
        ? new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "";

      if (idx === -1) {
        chatApi.get(convId)
          .then(({ data }) => {
            const norm = normaliseConv(data, user?.id);
            setConversations(p => [norm, ...p.filter(c => c.id !== norm.id)]);
          })
          .catch(() => {});
        return prev;
      }

      const conv    = prev[idx];
      const updated = {
        ...conv,
        preview,
        previewSender: conv.type === "group"
          ? (isMyMsg ? "You" : (message.sender_username || ""))
          : "",
        time,
        isMyLastMsg: isMyMsg,
        unread: isActive || isMyMsg ? 0 : conv.unread + 1,
        read:   isActive || isMyMsg,
      };
      return [updated, ...prev.filter((_, i) => i !== idx)];
    });
  }, [user?.id]);

  const handleMsgDeleted = useCallback((convId) => {
    chatApi.get(convId)
      .then(({ data }) => {
        const norm = normaliseConv(data, user?.id);
        setConversations(prev => prev.map(c => String(c.id) === String(convId) ? norm : c));
      })
      .catch(() => {});
  }, [user?.id]);

  const openConv = useCallback((c) => {
    const opened = { ...c, unread: 0, read: true };
    setActive(opened);
    setConversations(prev => prev.map(conv =>
      conv.id === c.id ? { ...conv, unread: 0, read: true } : conv
    ));
    markConvRead(c.id);
    if (mobile) setMobileView("chat");
  }, [mobile, markConvRead]);

  const goBack = () => setMobileView("list");

  const ConvView = !active
    ? <EmptyState />
    : <ConversationView
        key={active.id}
        conv={active}
        onBack={goBack}
        isMobile={mobile}
        onNewMessage={handleNewMessage}
        onMsgDeleted={handleMsgDeleted}
      />;

  if (mobile) {
    const inChat = mobileView === "chat";
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-ground font-sans">
        <style>{globalStyles}</style>
        {!inChat && (
          <header className="flex h-14 shrink-0 items-center border-b border-line bg-ground px-4">
            <div className="flex items-center gap-2">
              <img src={officialLogo} alt="logo" className="w-7 h-7"
                onError={e => { e.target.style.display = "none"; }} />
              <span className="font-display text-[16px] font-semibold text-ink">Travel Together</span>
            </div>
          </header>
        )}
        <div className="flex-1 overflow-hidden min-h-0">
          {!inChat
            ? <div className="flex h-full flex-col overflow-hidden bg-ground">
                <ChatList onOpen={openConv} activeId={active?.id} conversations={conversations} />
              </div>
            : <div className="h-full flex flex-col overflow-hidden">{ConvView}</div>
          }
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-ground font-sans">
      <style>{globalStyles}</style>
      <AppNav />
      {/* Same measure as Discover — tt-shell caps at 1440px with 32px gutters,
          so chat sits on the page instead of running edge to edge. The two
          panes share one rounded frame so they read as a single surface. */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="tt-shell flex min-h-0 flex-1 overflow-hidden py-5">
          <div className="flex min-h-0 flex-1 overflow-hidden rounded-3xl border border-line bg-ground">
            <div className="flex w-[330px] shrink-0 flex-col overflow-hidden border-r border-line bg-ground">
              <ChatList onOpen={openConv} activeId={active?.id} conversations={conversations} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-ground-alt">
              {ConvView}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
