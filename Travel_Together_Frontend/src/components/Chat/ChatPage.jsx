import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Search, Send, ChevronLeft, Users,
  MessageCircle, ChevronDown, Trash2, ImageIcon, Loader,
} from "lucide-react";
import AppNav from "../shared/AppNav.jsx";
import MobileBottomNav from "../shared/MobileBottomNav.jsx";
import { chatApi, tokenStore } from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useChatUnread } from "../../context/ChatUnreadContext.jsx";

const WS_BASE          = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/^http/, "ws");

const AV_COLORS = [
  "bg-[#FF6B35]", "bg-[#4ade80]", "bg-[#a855f7]", "bg-[#0ea5e9]",
  "bg-[#f43f5e]", "bg-[#fbbf24]", "bg-[#14b8a6]", "bg-[#ec4899]",
];

function fuzzyMatch(text, query) {
  if (!query) return true;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t.includes(q)) return true;
  // subsequence check — "wjnr" matches "Wiseborn Jnr"
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

function avatarColor(name = "") {
  return AV_COLORS[(name.charCodeAt(0) || 0) % AV_COLORS.length];
}

/* ─── NORMALISERS ─────────────────────────── */
function normaliseConv(c, myUserId) {
  const isGroup = c.type === "group";
  const lastMsg = c.last_message;

  let preview = "";
  if (lastMsg) {
    if      (lastMsg.is_deleted)               preview = "Message deleted";
    else if (lastMsg.message_type === "image") preview = "📷 Photo";
    else if (lastMsg.message_type === "voice") preview = "🎵 Voice message";
    else                                       preview = lastMsg.text || "";
  }

  const time = lastMsg?.created_at
    ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";
  const isMyLastMsg = !!lastMsg && String(lastMsg.sender_id) === String(myUserId);

  if (isGroup) {
    return {
      id:            c.id,
      type:          "group",
      name:          c.name || "Group Chat",
      tripId:        c.trip || null,
      preview,
      previewSender: isMyLastMsg ? "You" : (lastMsg?.sender_username || ""),
      time,
      unread:        c.unread_count || 0,
      read:          !c.unread_count,
      isMyLastMsg,
      online:        false,
      avatar:        avatarColor(c.name || "G"),
      members:       `${c.member_count || 0} members`,
      cover:         c.cover_url || "",
    };
  }

  const other = c.other_user;
  const name  = other
    ? `${other.first_name || ""} ${other.last_name || ""}`.trim() || other.username || "User"
    : "Unknown";

  return {
    id:          c.id,
    type:        "dm",
    name,
    otherUserId: other?.id,
    avatarUrl:   other?.avatar_url || null,
    preview,
    time,
    unread:      c.unread_count || 0,
    read:        !c.unread_count,
    isMyLastMsg,
    online:      false,
    avatar:      avatarColor(name),
  };
}

function normaliseMsg(m, myUserId) {
  const isMe      = String(m.sender_id) === String(myUserId);
  const createdAt = m.created_at ? new Date(m.created_at) : new Date();
  return {
    id:          m.id,
    from:        isMe ? "me" : (m.sender_username || "Member"),
    senderName:  isMe ? "me" : (m.sender_username || "Member"),
    color:          avatarColor(m.sender_username || ""),
    senderAvatarUrl: m.sender_avatar_url || null,
    text:        m.is_deleted ? null : (m.text || null),
    mediaUrl:    m.is_deleted ? null : (m.media_url || null),
    messageType: m.message_type || "text",
    isDeleted:   m.is_deleted || false,
    time:        createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    timestamp:   createdAt.getTime(),
    status:      "sent",
  };
}

/* ─── ATOMS ───────────────────────────────── */
function Avatar({ name, size = "w-11 h-11", colorClass, online = false, imgSrc }) {
  const [failed, setFailed] = useState(false);
  const initials = name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const bg = colorClass || avatarColor(name);
  return (
    <div className="relative flex-shrink-0">
      {imgSrc && !failed
        ? <img src={imgSrc} alt={name} className={`${size} rounded-full object-cover`}
            onError={() => setFailed(true)} />
        : <div className={`${size} ${bg} rounded-full flex items-center justify-center font-bold text-white font-serif text-[13px]`}>
            {initials}
          </div>
      }
      {online && (
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-[#0d1b2a]" />
      )}
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[0, 1, 2].map(i => (
        <span key={i} className="w-1 h-1 rounded-full bg-[#FF6B35] inline-block animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  );
}

/* ─── CONVERSATION ROW ────────────────────── */
function ConvRow({ c, isActive, onClick }) {
  const isGroup = c.type === "group";
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 cursor-pointer text-left transition-all duration-100 border-b border-white/[0.07]
        ${isActive ? "lg:bg-[#FF6B35]/10 lg:border-l-[3px] lg:border-l-[#FF6B35]" : "bg-transparent hover:bg-white/[0.04]"}`}
    >
      {isGroup
        ? <div className="relative w-11 h-11 flex-shrink-0">
            {c.cover
              ? <img src={c.cover} alt={c.name} className="w-11 h-11 rounded-full object-cover"
                  onError={e => { e.target.style.background = "#1a2e45"; }} />
              : <div className={`w-11 h-11 rounded-full ${c.avatar} flex items-center justify-center font-bold text-white font-serif text-[14px]`}>
                  {c.name?.slice(0, 1).toUpperCase()}
                </div>
            }
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#0d1b2a] rounded-full flex items-center justify-center border border-white/10">
              <Users size={10} className="text-[#FF6B35]" />
            </div>
          </div>
        : <Avatar name={c.name} colorClass={c.avatar} online={c.online} imgSrc={c.avatarUrl} />
      }

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className={`text-[14px] truncate ${c.unread > 0 ? "text-white font-bold" : "text-white/75 font-semibold"}`}>
            {c.name}
          </span>
          <span className={`text-[10px] flex-shrink-0 ml-2 ${c.unread > 0 ? "text-[#FF6B35] font-semibold" : "text-white/30"}`}>
            {c.time}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] text-white/40 truncate flex items-center gap-1 min-w-0">
            {c.typing
              ? <span className="flex items-center gap-1.5 text-[#FF6B35] text-[11px] font-medium">
                  <TypingDots /> typing...
                </span>
              : <>
                  {isGroup && c.previewSender && (
                    <span className="text-white/30 flex-shrink-0">{c.previewSender}:</span>
                  )}
                  <span className="truncate">{c.preview}</span>
                </>
            }
          </span>
          {c.unread > 0 && (
            <div className="w-5 h-5 rounded-full bg-[#FF6B35] flex items-center justify-center text-[9px] font-black text-white flex-shrink-0">
              {c.unread > 9 ? "9+" : c.unread}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

/* ─── CHAT LIST PANEL ─────────────────────── */
function ChatList({ onOpen, activeId, conversations = [] }) {
  const [tab,    setTab]    = useState("message");
  const [search, setSearch] = useState("");

  const shown =
    tab === "groups" ? conversations.filter(c => c.type === "group") :
    tab === "unread" ? conversations.filter(c => c.unread > 0) :
    conversations;

  const filtered = shown.filter(c => fuzzyMatch(c.name, search));

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-5 pb-3 flex-shrink-0">
        <h1 className="text-xl font-light text-white font-serif tracking-tight mb-4">Messages</h1>

        <div className="relative mb-4">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search messages"
            className="w-full bg-white/[0.06] border border-white/[0.08] rounded-2xl py-2.5 pl-9 pr-4 text-[13px] text-white placeholder-white/30 outline-none focus:border-[#FF6B35]/40 transition-colors"
          />
        </div>

        <div className="flex gap-2 pb-3 border-b border-white/[0.06]">
          {[
            { id: "message", label: "Message" },
            { id: "unread",  label: "Unread"  },
            { id: "groups",  label: "Groups"  },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-full text-[12px] font-bold border cursor-pointer transition-all duration-150
                ${tab === t.id
                  ? "bg-[#FF6B35] border-[#FF6B35] text-white shadow-[0_4px_14px_rgba(255,107,53,0.35)]"
                  : "bg-transparent border-white/20 text-white/50 hover:border-white/40"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0
          ? <p className="text-center py-12 text-[12px] text-white/25">No conversations found</p>
          : filtered.map(c => (
              <ConvRow key={c.id} c={c} isActive={activeId === c.id} onClick={() => onOpen(c)} />
            ))
        }
      </div>
    </div>
  );
}

/* ─── INPUT BAR ───────────────────────────── */
function InputBar({ onSend, onSendImage, uploading }) {
  const [val,    setVal]    = useState("");
  const inputRef  = useRef(null);
  const fileRef   = useRef(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [val]);

  const send = () => {
    if (!val.trim()) return;
    onSend(val.trim());
    setVal("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    inputRef.current?.focus();
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onSendImage(file);
    e.target.value = "";
  };

  return (
    <div className="flex items-end gap-2 px-3 py-3 bg-[#0d1b2a] border-t border-white/[0.06] flex-shrink-0">
      {/* Image picker */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center cursor-pointer flex-shrink-0 hover:bg-white/[0.1] transition-colors disabled:opacity-40 border border-white/[0.08]"
        title="Send image"
      >
        {uploading
          ? <Loader size={14} className="text-white/40 animate-spin" />
          : <ImageIcon size={15} className="text-white/45" />
        }
      </button>

      <textarea
        ref={inputRef}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        placeholder="Type a message..."
        rows={1}
        className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-2xl py-2.5 px-4 text-[13px] text-white placeholder-white/25 outline-none focus:border-[#FF6B35]/30 transition-colors resize-none leading-relaxed"
        style={{ minHeight: 42, overflowY: "hidden" }}
      />
      <button
        onClick={send}
        disabled={!val.trim()}
        className="w-9 h-9 rounded-full bg-[#FF6B35] flex items-center justify-center cursor-pointer flex-shrink-0 hover:bg-[#e55c28] transition-colors shadow-[0_4px_12px_rgba(255,107,53,0.4)] disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ marginBottom: 1 }}
      >
        <Send size={15} className="text-white" />
      </button>
    </div>
  );
}

/* ─── URL HELPERS ─────────────────────────── */
const URL_RE     = /(https?:\/\/[^\s]+)/g;
const URL_TEST   = /^https?:\/\//;

function renderTextWithLinks(text) {
  if (!text) return null;
  const parts = text.split(URL_RE);
  return parts.map((part, i) =>
    URL_TEST.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer"
          className="underline break-all opacity-90 hover:opacity-100"
          onClick={e => e.stopPropagation()}>{part}</a>
      : part
  );
}

function extractMapsUrl(text) {
  if (!text) return null;
  const m = text.match(/https:\/\/www\.google\.com\/maps\?q=([-\d.]+),([-\d.]+)/);
  if (!m) return null;
  return { url: m[0], lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
}

/* ─── SYSTEM MESSAGE (SOS + system notices) ── */
function SystemMessage({ msg }) {
  const isSOS  = msg.text?.startsWith("SOS ALERT:");
  const mapRef = isSOS ? extractMapsUrl(msg.text) : null;

  const textBeforeUrl = msg.text?.split(URL_RE)[0].trim();

  return (
    <div className="flex justify-center w-full my-2">
      <div className={`max-w-[80%] rounded-2xl overflow-hidden text-[12px]
        ${isSOS
          ? "bg-red-900/30 border border-red-500/40 shadow-[0_0_20px_rgba(244,63,94,0.15)]"
          : "bg-white/[0.06] border border-white/[0.08]"}`}>
        <div className="px-4 py-3 leading-relaxed text-center text-white/80 whitespace-pre-line">
          {textBeforeUrl}
        </div>
        {mapRef && (
          <a
            href={mapRef.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 bg-black/30 hover:bg-black/50 transition-colors border-t border-red-500/20 no-underline"
            onClick={e => e.stopPropagation()}
          >
            
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-bold text-white truncate">View location on Google Maps</div>
              <div className="text-[10px] text-white/40 mt-0.5 truncate">{mapRef.lat.toFixed(5)}, {mapRef.lng.toFixed(5)}</div>
            </div>
            <div className="text-[10px] font-bold text-red-400 flex-shrink-0">Open →</div>
          </a>
        )}
      </div>
    </div>
  );
}

/* ─── MESSAGE BUBBLE ──────────────────────── */
function MessageBubble({ msg, onDelete }) {
  const isMe      = msg.from === "me";
  const canDelete = isMe && !msg.isDeleted;   // always available for own messages

  const [hovered,     setHovered]     = useState(false);
  const [longPressed, setLongPressed] = useState(false);
  const lpTimer = useRef(null);

  /* long-press for mobile */
  const onTouchStart = useCallback(() => {
    if (!canDelete) return;
    lpTimer.current = setTimeout(() => setLongPressed(true), 600);
  }, [canDelete]);

  const cancelLp = useCallback(() => {
    clearTimeout(lpTimer.current);
  }, []);

  useEffect(() => () => clearTimeout(lpTimer.current), []);

  /* dismiss long-press menu when tapping outside this bubble */
  useEffect(() => {
    if (!longPressed) return;
    const dismiss = () => setLongPressed(false);
    document.addEventListener("touchstart", dismiss, { once: true, capture: true });
    return () => document.removeEventListener("touchstart", dismiss, { capture: true });
  }, [longPressed]);

  const showDelete = canDelete && (hovered || longPressed);

  const doDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(msg);
    setHovered(false);
    setLongPressed(false);
  };

  /* ── deleted state ── */
  if (msg.isDeleted) {
    return (
      <div className={`px-4 py-2.5 rounded-2xl text-[12px] italic select-none border
        ${isMe
          ? "bg-[#FF6B35]/10 border-[#FF6B35]/20 text-white/40 rounded-br-sm"
          : "bg-white/[0.04] border-white/[0.07] text-white/35 rounded-bl-sm"}`}>
        [this message was deleted]
      </div>
    );
  }

  const isImage = msg.messageType === "image" && msg.mediaUrl;
  if (!isImage && !msg.text) return null;

  const deleteBtn = canDelete && (
    <button
      onPointerDown={doDelete}
      title="Delete message"
      className={`flex-shrink-0 w-7 h-7 rounded-full bg-[#0d1b2a] border border-red-500/40
        flex items-center justify-center cursor-pointer
        hover:bg-red-500/25 active:bg-red-500/40 shadow-lg
        transition-all duration-150
        ${showDelete ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"}`}
    >
      <Trash2 size={11} className="text-red-400" />
    </button>
  );

  return (
    <div
      className={`flex items-center gap-2 max-w-[68%]
        ${isMe ? "flex-row-reverse" : "flex-row"}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={cancelLp}
      onTouchMove={cancelLp}
      onTouchCancel={cancelLp}
    >
      {/* Bubble */}
      <div className={`relative w-fit min-w-0`}>
        {isImage
          ? <div className={`overflow-hidden rounded-2xl ${isMe ? "rounded-br-sm" : "rounded-bl-sm"}`}>
              <img
                src={msg.mediaUrl}
                alt=""
                className="block max-w-[220px] max-h-[280px] w-auto h-auto object-cover"
              />
            </div>
          : <div className={`px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed break-words
              ${isMe
                ? "bg-[#FF6B35] text-white rounded-br-sm"
                : "bg-[#132032] text-white/85 rounded-bl-sm border border-white/[0.06]"}`}>
              {renderTextWithLinks(msg.text)}
            </div>
        }
      </div>

      {/* Delete button — always in DOM so hover zone is contiguous with bubble */}
      {deleteBtn}
    </div>
  );
}

/* ─── CONVERSATION VIEW ───────────────────── */
function ConversationView({ conv, onBack, isMobile, onNewMessage, onMsgDeleted }) {
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

  /* ── scroll helper ── */
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

  /* ── load history + mark read ── */
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
        // Tell other participants via WS that we've read everything
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "read.mark" }));
        }
      })
      .catch(() => {});

    chatApi.markRead(conv.id).catch(() => {});
  }, [conv?.id, myUserId]);

  /* ── scroll after every messages update (useLayoutEffect = after DOM, before paint) ── */
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || !messages.length) return;

    if (isInitialLoad.current) {
      // Snap instantly so the user never sees the top
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

  /* ── websocket with reconnection ── */
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
          // Authenticated — immediately tell others we've read this conversation
          ws.send(JSON.stringify({ type: "read.mark" }));
          return;
        }

        if (data.type === "message.new") {
          const msg = normaliseMsg(data.message, myUserId);
          setMessages(prev => {
            if (msg.from === "me") {
              // Replace last pending placeholder
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
          // Someone else read the conversation — mark all our sent messages as read
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

  /* ── send message ── */
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

  /* ── send image ── */
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
      // Send the message (prefer WS, fallback to REST)
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type:         "message.send",
          message_type: "image",
          media_url:    upload.media_url,
        }));
        // Replace optimistic with confirmed via WS echo (handled in onmessage)
        // But swap the local blob URL now so the image still shows
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

  /* ── delete message ── */
  const handleDelete = useCallback(async (originalMsg) => {
    // Optimistic: mark as deleted (clears both text and mediaUrl)
    setMessages(prev => prev.map(m =>
      String(m.id) === String(originalMsg.id)
        ? { ...m, text: null, mediaUrl: null, isDeleted: true }
        : m
    ));
    try {
      await chatApi.deleteMessage(conv.id, originalMsg.id);
      onMsgDeleted?.(conv.id);
    } catch {
      // Restore on failure
      setMessages(prev => prev.map(m =>
        String(m.id) === String(originalMsg.id) ? originalMsg : m
      ));
    }
  }, [conv.id]);

  const typingNames = Object.keys(typingUsers);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#0d1b2a] border-b border-white/[0.06] flex-shrink-0">
        {isMobile && (
          <button onClick={onBack} className="bg-transparent border-none cursor-pointer text-white/50 flex-shrink-0 flex">
            <ChevronLeft size={22} />
          </button>
        )}

        {isGroup
          ? <div className="relative flex-shrink-0">
              {conv.cover
                ? <img src={conv.cover} alt={conv.name} className="w-10 h-10 rounded-full object-cover border border-[#FF6B35]/30"
                    onError={e => { e.target.style.display = "none"; }} />
                : <div className={`w-10 h-10 rounded-full ${conv.avatar} flex items-center justify-center font-bold text-white font-serif text-[13px]`}>
                    {conv.name?.slice(0, 1).toUpperCase()}
                  </div>
              }
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#0d1b2a] rounded-full flex items-center justify-center border border-white/10">
                <Users size={9} className="text-[#FF6B35]" />
              </div>
            </div>
          : <Avatar name={conv.name} colorClass={conv.avatar} imgSrc={conv.avatarUrl} online={conv.online} size="w-10 h-10" />
        }

        <div className="flex-1 min-w-0">
          <div
            className="text-[14px] font-bold text-white truncate cursor-pointer hover:text-[#FF6B35] transition-colors"
            onClick={() => {
              if (isGroup && conv.tripId) navigate(`/group-dashboard/${conv.tripId}`);
              else if (!isGroup && conv.otherUserId) navigate(`/profile/${conv.otherUserId}`);
            }}
          >{conv.name}</div>
          {isGroup && conv.members && (
            <div className="text-[11px] font-medium text-white/35">{conv.members}</div>
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
          {/* min-h-full + justify-end anchors messages to bottom when few messages exist */}
          <div className="min-h-full flex flex-col justify-end px-4 py-5 gap-0.5">
            {messages.length === 0 && typingNames.length === 0 && (
              <div className="flex items-center justify-center py-10">
                <p className="text-[12px] text-white/20">No messages yet. Say hello!</p>
              </div>
            )}

            {messages.map((msg, i) => {
              const isMe     = msg.from === "me";
              const prevFrom = i > 0 ? messages[i - 1].from : null;
              const showName = isGroup && !isMe && prevFrom !== msg.from;
              const grouped  = i > 0 && prevFrom === msg.from;

              if (msg.messageType === "system") {
                return (
                  <div key={msg.id} className="mt-2">
                    <SystemMessage msg={msg} />
                    <div className="flex justify-center mt-0.5">
                      <span className="text-[10px] text-white/20">{msg.time}</span>
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"} ${grouped ? "mt-0.5" : "mt-3"}`}>
                  {showName && (
                    <div className="flex items-center gap-1.5 mb-1 ml-1">
                      <Avatar name={msg.senderName} size="w-4 h-4" colorClass={msg.color} imgSrc={msg.senderAvatarUrl} />
                      <span className="text-[11px] font-bold text-white/50">{msg.senderName}</span>
                    </div>
                  )}

                  <MessageBubble msg={msg} onDelete={handleDelete} />

                  <div className={`flex items-center gap-1 mt-0.5 px-1 ${isMe ? "flex-row" : "flex-row-reverse"}`}>
                    <span className="text-[10px] text-white/20">{msg.time}</span>
                  </div>
                </div>
              );
            })}

            {typingNames.length > 0 && (
              <div className="flex items-start mt-3">
                <div className="bg-[#132032] border border-white/[0.06] rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-2">
                  <TypingDots />
                  <span className="text-[12px] text-white/40 ml-1.5">
                    {typingNames.join(", ")} typing…
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Jump to bottom */}
        {newMsgBelow && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center z-10 pointer-events-none">
            <button
              onClick={() => { scrollToBottom("smooth"); setNewMsgBelow(false); }}
              className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FF6B35] text-white text-[11px] font-bold shadow-lg cursor-pointer hover:bg-[#e55c28] transition-all"
            >
              New message <ChevronDown size={12} />
            </button>
          </div>
        )}
      </div>

      <InputBar onSend={handleSend} onSendImage={handleSendImage} uploading={imgUploading} />
      {/* Spacer so the input bar isn't hidden behind the fixed bottom nav on mobile */}
      {isMobile && <div className="h-[58px] flex-shrink-0 bg-[#0d1b2a]" />}
    </div>
  );
}

/* ─── EMPTY STATE ─────────────────────────── */
function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-[#071422]">
      <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
        <MessageCircle size={26} className="text-white/20" />
      </div>
      <p className="text-[14px] font-semibold text-white/30">
        Select a conversation to start chatting
      </p>
    </div>
  );
}

/* ─── ROOT ────────────────────────────────── */
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

  // Keep the nav badge in sync with this component's conversations state.
  // This is the single source of truth — no separate API fetch needed.
  useEffect(() => {
    if (conversations.length > 0) syncFromList(conversations);
  }, [conversations, syncFromList]);

  const mobile = winW < 1024;

  useEffect(() => {
    const h = () => setWinW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  /* initial conversation fetch */
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

  /* poll every 30s for brand-new conversations (created by others) */
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

  /* real-time conversation update — fires when a chat_message notification
     arrives over the notifications WS (covers conversations with no open WS) */
  const lastConvFetch = useRef({});   // { [convId]: requestTimestamp }
  useEffect(() => {
    if (!user?.id) return;
    const handler = (e) => {
      const convId = e.detail?.convId;
      if (!convId) return;
      // Active conversation is already handled by the open WS in ConversationView
      if (String(convId) === String(activeRef.current?.id)) return;

      // Stamp this request so we can discard out-of-order responses
      const stamp = Date.now();
      lastConvFetch.current[convId] = stamp;

      chatApi.get(convId)
        .then(({ data }) => {
          // Discard if a newer request for this conv already resolved
          if (lastConvFetch.current[convId] !== stamp) return;
          const norm = normaliseConv(data, user?.id);
          setConversations(prev => {
            const idx = prev.findIndex(c => String(c.id) === String(norm.id));
            if (idx === -1) return [norm, ...prev];          // brand-new conv
            const next = [...prev];
            next[idx] = norm;
            // Bubble to top since it has a new message
            return [next[idx], ...next.filter((_, i) => i !== idx)];
          });
        })
        .catch(() => {});
    };
    window.addEventListener("tt:chat-message", handler);
    return () => window.removeEventListener("tt:chat-message", handler);
  }, [user?.id]);

  /* called by ConversationView when a WS message.new arrives */
  const handleNewMessage = useCallback((convId, message) => {
    const isMyMsg  = String(message.sender_id) === String(user?.id);
    const isActive = String(convId) === String(activeRef.current?.id);

    setConversations(prev => {
      const idx      = prev.findIndex(c => String(c.id) === String(convId));

      const preview =
        message.is_deleted              ? "Message deleted" :
        message.message_type === "image"? "📷 Photo"        :
        message.message_type === "voice"? "🎵 Voice message":
        message.text || "";

      const time = message.created_at
        ? new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "";

      if (idx === -1) {
        // Entirely new conversation — fetch it and prepend
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

  /* called when a message is deleted — re-fetch conv to update preview */
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

  const globalStyles = `
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50%       { transform: translateY(-4px); }
    }
    ::-webkit-scrollbar { width: 3px; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.08); border-radius: 99px; }
  `;

  /* ── MOBILE ── */
  if (mobile) {
    const inChat = mobileView === "chat";
    return (
      <div className="h-screen bg-[#071422] font-sans flex flex-col overflow-hidden">
        <style>{globalStyles}</style>

        {/* Top header — only shown on the list screen */}
        {!inChat && (
          <header className="h-14 bg-[#0d1b2a] border-b border-white/[0.06] flex items-center px-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <img src="/src/assets/official_logo_nobg.png" alt="logo" className="w-7 h-7"
                onError={e => { e.target.style.display = "none"; }} />
              <span className="text-[14px] font-bold text-white tracking-tight">Travel Together</span>
            </div>
          </header>
        )}

        <div className="flex-1 overflow-hidden min-h-0">
          {!inChat
            ? <div className="h-full overflow-hidden flex flex-col bg-[#0d1b2a]">
                <ChatList onOpen={openConv} activeId={active?.id} conversations={conversations} />
              </div>
            : <div className="h-full flex flex-col overflow-hidden">{ConvView}</div>
          }
        </div>

        {/* Fixed bottom nav — always visible on mobile */}
        <MobileBottomNav />
      </div>
    );
  }

  /* ── DESKTOP — two-pane ── */
  return (
    <div className="h-screen bg-[#071422] font-sans flex flex-col overflow-hidden">
      <style>{globalStyles}</style>
      <AppNav />
      <div className="flex flex-1 overflow-hidden min-h-0">
        <div className="w-[300px] flex-shrink-0 border-r border-white/[0.06] flex flex-col overflow-hidden bg-[#0d1b2a]">
          <ChatList onOpen={openConv} activeId={active?.id} conversations={conversations} />
        </div>
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#071422]">
          {ConvView}
        </div>
      </div>
    </div>
  );
}
