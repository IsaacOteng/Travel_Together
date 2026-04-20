import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./AuthContext.jsx";
import { tokenStore, notificationsApi } from "../services/api.js";

const WS_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/^http/, "ws");

const NotificationsContext = createContext(null);

function normalise(n) {
  return {
    id:                n.id,
    notification_type: n.notification_type,
    is_read:           n.is_read,
    title:             n.title ?? "",
    body:              n.body ?? n.message ?? "",
    ts:                n.created_at ? new Date(n.created_at).getTime() : Date.now(),
    data:              n.data ?? {},
    sender_id:         n.sender_id ?? null,
    sender_username:   n.sender_username ?? null,
    sender_name:       n.sender_name ?? null,
    sender_avatar:     n.sender_avatar ?? null,
  };
}

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const [items,  setItems]  = useState([]);
  const wsRef               = useRef(null);
  const reconnectRef        = useRef(null);

  // ── initial fetch ──────────────────────────────────────────────────────────
  const fetchAll = useCallback(() => {
    if (!user) return;
    notificationsApi.list()
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data.results ?? []);
        setItems(list.map(normalise));
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── WebSocket connection ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      clearTimeout(reconnectRef.current);
      return;
    }

    let active = true;

    function connect() {
      if (!active) return;
      const ws = new WebSocket(`${WS_BASE}/ws/notifications/`);
      wsRef.current = ws;

      ws.onopen = () => {
        const token = tokenStore.getAccess();
        if (token) ws.send(JSON.stringify({ type: "auth", token }));
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "notification.new" && msg.notification) {
            const incoming = normalise(msg.notification);
            setItems(prev => {
              // replace if already exists (e.g. re-delivered), else prepend
              const exists = prev.some(n => n.id === incoming.id);
              if (exists) return prev.map(n => n.id === incoming.id ? incoming : n);
              return [incoming, ...prev];
            });
            // Let ChatUnreadContext react instantly to new chat messages
            if (incoming.notification_type === "chat_message") {
              window.dispatchEvent(new CustomEvent("tt:chat-message", {
                detail: { convId: incoming.data?.conversation_id },
              }));
            }
          }
        } catch { /* ignore parse errors */ }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (active) {
          reconnectRef.current = setTimeout(connect, 4000);
        }
      };

      ws.onerror = () => { ws.close(); };
    }

    connect();

    return () => {
      active = false;
      clearTimeout(reconnectRef.current);
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    };
  }, [user]);

  // ── helpers exposed to consumers ──────────────────────────────────────────
  // chat_message notifications are handled by ChatUnreadContext — exclude them from the bell badge
  const unreadCount = items.filter(n => !n.is_read && n.notification_type !== "chat_message").length;

  const markRead = useCallback((id) => {
    setItems(p => p.map(n => n.id === id ? { ...n, is_read: true } : n));
    notificationsApi.markRead(id).catch(() => {});
  }, []);

  const markAllRead = useCallback(() => {
    setItems(p => p.map(n => ({ ...n, is_read: true })));
    notificationsApi.markAllRead().catch(() => {});
  }, []);

  const setDecided = useCallback((id, decision) => {
    setItems(p => p.map(n => n.id === id
      ? { ...n, is_read: true, data: { ...n.data, decided: decision } }
      : n
    ));
  }, []);

  const resetUnread = useCallback(() => {
    setItems(p => p.map(n => ({ ...n, is_read: true })));
  }, []);

  return (
    <NotificationsContext.Provider value={{
      items, unreadCount,
      markRead, markAllRead, setDecided, resetUnread, refetch: fetchAll,
    }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used inside <NotificationsProvider>");
  return ctx;
}
