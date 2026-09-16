import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ChevronDown } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { chatApi, tokenStore } from "../../services/api.js";
import { WS_BASE } from "./constants.js";
import { normaliseMsg, avatarColor } from "./utils.js";
import Avatar from "./Avatar.jsx";
import TypingDots from "./TypingDots.jsx";
import MessageBubble, { SystemMessage } from "./MessageBubble.jsx";
import InputBar from "./InputBar.jsx";

export default function ConversationView({ conv, onBack, isMobile, onNewMessage, onMsgDeleted }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const myUserId = user?.id;
  const isGroup  = conv.type === "group";

  const [messages,     setMessages]     = useState([]);
  const [typingUsers,  setTypingUsers]  = useState({});
  const [wsStatus,     setWsStatus]     = useState("connecting");
  const [newMsgBelow,  setNewMsgBelow]  = useState(false);
  const [imgUploading, setImgUploading] = useState(false);

  const containerRef    = useRef(null);
  const wsRef           = useRef(null);
  const typingTimers    = useRef({});
  const reconnectDelay  = useRef(1000);
  const reconnectTimer  = useRef(null);
  const isAtBottomRef   = useRef(true);
  const isInitialLoad   = useRef(true);
  const convIdRef       = useRef(conv.id);
  useEffect(() => { convIdRef.current = conv.id; }, [conv.id]);

  const scrollToBottom = useCallback((behavior = "smooth") => {
    const el = containerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    isAtBottomRef.current = dist < 80;
    if (isAtBottomRef.current) setNewMsgBelow(false);
  }, []);

  useEffect(() => {
    if (!conv?.id) return;
    isInitialLoad.current = true;
    isAtBottomRef.current = true;
    setMessages([]);
    setTypingUsers({});
    setNewMsgBelow(false);

    chatApi.messages(conv.id)
      .then(({ data }) => {
        const msgs = (data.results ?? []).map(m => normaliseMsg(m, myUserId));
        setMessages(msgs);
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "read.mark" }));
        }
      })
      .catch(() => {});

    chatApi.markRead(conv.id).catch(() => {});
  }, [conv?.id, myUserId]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || !messages.length) return;

    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      el.scrollTop = el.scrollHeight;
      return;
    }

    if (isAtBottomRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else {
      const last = messages[messages.length - 1];
      if (last?.from !== "me" && last?.status !== "pending") setNewMsgBelow(true);
    }
  }, [messages]);

  useEffect(() => {
    if (!conv?.id) return;
    let cancelled = false;

    function connect() {
      if (cancelled) return;
      const ws = new WebSocket(`${WS_BASE}/ws/chat/${conv.id}/`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) { ws.close(1000); return; }
        ws.send(JSON.stringify({ type: "auth", token: tokenStore.getAccess() }));
        reconnectDelay.current = 1000;
        setWsStatus("connected");
      };

      ws.onmessage = (e) => {
        let data;
        try { data = JSON.parse(e.data); } catch { return; }

        if (data.type === "auth.ok") {
          ws.send(JSON.stringify({ type: "read.mark" }));
          return;
        }

        if (data.type === "message.new") {
          const msg = normaliseMsg(data.message, myUserId);
          setMessages(prev => {
            if (msg.from === "me") {
              for (let i = prev.length - 1; i >= 0; i--) {
                if (prev[i].status === "pending" && prev[i].from === "me") {
                  const next = [...prev];
                  next[i] = msg;
                  return next;
                }
              }
            }
            return [...prev, msg];
          });
          onNewMessage?.(conv.id, data.message);
          return;
        }

        if (data.type === "message.deleted") {
          const msgId = data.message_id;
          setMessages(prev => prev.map(m =>
            String(m.id) === String(msgId) ? { ...m, text: null, isDeleted: true } : m
          ));
          onMsgDeleted?.(conv.id);
          return;
        }

        if (data.type === "message.read") {
          setMessages(prev => prev.map(m =>
            m.from === "me" && m.status !== "pending" ? { ...m, status: "read" } : m
          ));
          return;
        }

        if (data.type === "typing") {
          const { username, is_typing } = data;
          if (username === user?.username) return;
          if (is_typing) {
            setTypingUsers(p => ({ ...p, [username]: true }));
            clearTimeout(typingTimers.current[username]);
            typingTimers.current[username] = setTimeout(() => {
              setTypingUsers(p => { const n = { ...p }; delete n[username]; return n; });
            }, 3000);
          } else {
            clearTimeout(typingTimers.current[username]);
            setTypingUsers(p => { const n = { ...p }; delete n[username]; return n; });
          }
        }
      };

      ws.onclose = (e) => {
        if (cancelled || e.code === 1000) return;
        setWsStatus("reconnecting");
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = setTimeout(() => {
          reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
          connect();
        }, reconnectDelay.current);
      };
    }

    connect();

    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close(1000);
        wsRef.current = null;
      }
      setWsStatus("connecting");
      Object.values(typingTimers.current).forEach(clearTimeout);
    };
  }, [conv?.id, myUserId]);

  const handleSend = useCallback((text) => {
    const optimistic = {
      id:        `pending-${Date.now()}`,
      from:           "me",
      senderName:     "me",
      color:          avatarColor(user?.username || ""),
      senderAvatarUrl: user?.avatar_url || null,
      text,
      isDeleted: false,
      time:      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: Date.now(),
      status:    "pending",
    };
    setMessages(prev => [...prev, optimistic]);
    isAtBottomRef.current = true;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "message.send", text, message_type: "text" }));
    } else {
      chatApi.sendMessage(conv.id, { text, message_type: "text" })
        .then(({ data }) => {
          setMessages(prev => prev.map(m =>
            m.id === optimistic.id ? normaliseMsg(data, myUserId) : m
          ));
          onNewMessage?.(conv.id, data);
        })
        .catch(() => setMessages(prev => prev.filter(m => m.id !== optimistic.id)));
    }
  }, [conv?.id, myUserId, user?.username]);

  const handleSendImage = useCallback(async (file) => {
    const tempId = `pending-img-${Date.now()}`;
    const localUrl = URL.createObjectURL(file);
    const optimistic = {
      id:          tempId,
      from:           "me",
      senderName:     "me",
      color:          avatarColor(user?.username || ""),
      senderAvatarUrl: user?.avatar_url || null,
      text:        null,
      mediaUrl:    localUrl,
      messageType: "image",
      isDeleted:   false,
      time:        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp:   Date.now(),
      status:      "pending",
    };
    setMessages(prev => [...prev, optimistic]);
    isAtBottomRef.current = true;
    setImgUploading(true);

    try {
      const { data: upload } = await chatApi.uploadMedia(conv.id, file);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type:         "message.send",
          message_type: "image",
          media_url:    upload.media_url,
        }));
        setMessages(prev => prev.map(m =>
          m.id === tempId ? { ...m, mediaUrl: upload.media_url } : m
        ));
      } else {
        const { data: msg } = await chatApi.sendMessage(conv.id, {
          message_type: "image",
          media_url:    upload.media_url,
        });
        setMessages(prev => prev.map(m =>
          m.id === tempId ? normaliseMsg(msg, myUserId) : m
        ));
        onNewMessage?.(conv.id, msg);
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      URL.revokeObjectURL(localUrl);
    } finally {
      setImgUploading(false);
    }
  }, [conv?.id, myUserId, user?.username]);

  const handleDelete = useCallback(async (originalMsg) => {
    setMessages(prev => prev.map(m =>
      String(m.id) === String(originalMsg.id)
        ? { ...m, text: null, mediaUrl: null, isDeleted: true }
        : m
    ));
    try {
      await chatApi.deleteMessage(conv.id, originalMsg.id);
      onMsgDeleted?.(conv.id);
    } catch {
      setMessages(prev => prev.map(m =>
        String(m.id) === String(originalMsg.id) ? originalMsg : m
      ));
    }
  }, [conv.id]);

  /* Long histories were an undifferentiated wall — every message looked like
     it happened just now. normaliseMsg already carries a `timestamp`. */
  const dayLabel = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    const today = new Date();
    const y = new Date(); y.setDate(today.getDate() - 1);
    const same = (a, b) => a.toDateString() === b.toDateString();
    if (same(d, today)) return "Today";
    if (same(d, y))     return "Yesterday";
    return d.toLocaleDateString([], { day: "numeric", month: "short", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
  };

  const typingNames = Object.keys(typingUsers);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-line bg-ground px-4 py-3">
        {isMobile && (
          <button onClick={onBack} aria-label="Back to conversations" className="flex shrink-0 cursor-pointer border-none bg-transparent text-ink-soft">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        )}

        {isGroup
          ? <div className="relative shrink-0">
              {conv.cover
                ? <img src={conv.cover} alt={conv.name} className="h-10 w-10 rounded-full border border-line object-cover"
                    onError={e => { e.target.style.display = "none"; }} />
                : <div className={`h-10 w-10 rounded-full ${conv.avatar} flex items-center justify-center text-[14px] font-semibold text-accent`}>
                    {conv.name?.slice(0, 1).toUpperCase()}
                  </div>
              }
              <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-surface">
                <Users size={10} className="text-accent" />
              </div>
            </div>
          : <Avatar name={conv.name} colorClass={conv.avatar} imgSrc={conv.avatarUrl} online={conv.online} size="w-10 h-10" />
        }

        <div className="flex-1 min-w-0">
          <div
            className="cursor-pointer truncate font-display text-[16px] font-semibold text-ink transition-colors hover:text-accent"
            onClick={() => {
              if (isGroup && conv.tripId) navigate(`/group-dashboard/${conv.tripId}`);
              else if (!isGroup && conv.otherUserId) navigate(`/profile/${conv.otherUserId}`);
            }}
          >{conv.name}</div>
          {wsStatus === "connected"
            ? (isGroup && conv.members && (
                <div className="mt-0.5 text-[12.5px] text-ink-mute">{conv.members}</div>
              ))
            : (
              <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-ink-mute">
                <span className="h-1.5 w-1.5 rounded-full bg-sun" />
                {wsStatus === "reconnecting" ? "Reconnecting…" : "Connecting…"}
              </div>
            )}
        </div>
      </div>

      {/* Messages + jump button */}
      <div className="flex-1 overflow-hidden relative min-h-0">
        <div
          ref={containerRef}
          className="h-full overflow-y-auto"
          onScroll={handleScroll}
        >
          <div className="flex min-h-full flex-col justify-end gap-0.5 px-4 py-5">
            {messages.length === 0 && typingNames.length === 0 && (
              <div className="flex items-center justify-center py-10">
                <p className="text-[13.5px] text-ink-mute">No messages yet — say hello.</p>
              </div>
            )}

            {messages.map((msg, i) => {
              const isMe     = msg.from === "me";
              const prev     = i > 0 ? messages[i - 1] : null;
              const prevFrom = prev ? prev.from : null;
              const showName = isGroup && !isMe && prevFrom !== msg.from;
              const grouped  = i > 0 && prevFrom === msg.from;

              const today = dayLabel(msg.timestamp);
              const showDay = today && (!prev || dayLabel(prev.timestamp) !== today);
              const daySeparator = showDay ? (
                <div className="my-4 flex items-center gap-3">
                  <span className="h-px flex-1 bg-line" aria-hidden="true" />
                  <span className="text-[11.5px] font-medium text-ink-mute">{today}</span>
                  <span className="h-px flex-1 bg-line" aria-hidden="true" />
                </div>
              ) : null;

              if (msg.messageType === "system") {
                return (
                  <div key={msg.id} className="mt-2">
                    {daySeparator}
                    <SystemMessage msg={msg} />
                    <div className="flex justify-center mt-0.5">
                      <span className="text-[11px] text-ink-mute">{msg.time}</span>
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id}>
                  {daySeparator}
                  <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} ${grouped ? "mt-0.5" : "mt-3"}`}>
                  {showName && (
                    <div className="flex items-center gap-1.5 mb-1 ml-1">
                      <Avatar name={msg.senderName} size="w-4 h-4" colorClass={msg.color} imgSrc={msg.senderAvatarUrl} />
                      <span className="text-[12px] font-semibold text-ink-soft">{msg.senderName}</span>
                    </div>
                  )}

                  <MessageBubble msg={msg} onDelete={handleDelete} />

                  <div className={`flex items-center gap-1 mt-0.5 px-1 ${isMe ? "flex-row" : "flex-row-reverse"}`}>
                      <span className="text-[11px] text-ink-mute">{msg.time}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {typingNames.length > 0 && (
              <div className="flex items-start mt-3">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-line bg-surface px-4 py-2.5">
                  <TypingDots />
                  <span className="ml-1.5 text-[13px] text-ink-mute">
                    {typingNames.join(", ")} typing…
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {newMsgBelow && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center z-10 pointer-events-none">
            <button
              onClick={() => { scrollToBottom("smooth"); setNewMsgBelow(false); }}
              className="pointer-events-auto flex cursor-pointer items-center gap-1.5 rounded-full border-none bg-accent px-4 py-2 text-[12.5px] font-semibold text-accent-ink shadow-[0_6px_18px_var(--tt-shadow)] transition-colors hover:bg-accent-hover"
            >
              New message <ChevronDown size={12} />
            </button>
          </div>
        )}
      </div>

      <InputBar onSend={handleSend} onSendImage={handleSendImage} uploading={imgUploading} />
      {isMobile && <div className="h-[58px] shrink-0 bg-ground" />}
    </div>
  );
}
