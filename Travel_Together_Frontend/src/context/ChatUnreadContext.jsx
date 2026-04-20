import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext.jsx";
import { chatApi } from "../services/api.js";

const ChatUnreadContext = createContext(null);

/**
 * Maintains a live total of unread chat messages across all conversations.
 * This is separate from the notification bell — chat badge lives on the Chat nav item.
 *
 * Exposed API:
 *   totalChatUnread  — sum of unread counts across all conversations
 *   markConvRead(id) — set a conversation's unread count to 0 (call when user opens it)
 *   bumpUnread(id)   — increment a conversation's count by 1 (call on incoming WS message)
 *   refetch()        — force re-sync from the API
 */
export function ChatUnreadProvider({ children }) {
  const { user } = useAuth();
  // { [convId: string]: number }
  const [unreadMap, setUnreadMap] = useState({});

  const fetchUnread = useCallback(() => {
    if (!user) return;
    chatApi.list()
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data.results ?? []);
        const map = {};
        list.forEach(c => { map[String(c.id)] = c.unread_count || 0; });
        setUnreadMap(map);
      })
      .catch(() => {});
  }, [user]);

  // Initial fetch when user is available
  useEffect(() => { fetchUnread(); }, [fetchUnread]);

  // Background re-sync every 30 s (catches edge cases missed by real-time path)
  useEffect(() => {
    if (!user) return;
    const id = setInterval(fetchUnread, 30_000);
    return () => clearInterval(id);
  }, [user, fetchUnread]);

  // Refetch whenever the tab regains focus — catches missed messages while the
  // tab was in the background (only matters when ChatPage isn't mounted).
  useEffect(() => {
    if (!user) return;
    const onVisible = () => { if (!document.hidden) fetchUnread(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [user, fetchUnread]);

  // Reset when user logs out
  useEffect(() => {
    if (!user) setUnreadMap({});
  }, [user]);

  const totalChatUnread = Object.values(unreadMap).reduce((a, b) => a + b, 0);

  /** Call when the user opens a conversation — clears its badge contribution */
  const markConvRead = useCallback((convId) => {
    setUnreadMap(prev => ({ ...prev, [String(convId)]: 0 }));
  }, []);

  /** Call when a new message arrives in a conversation the user isn't viewing */
  const bumpUnread = useCallback((convId, delta = 1) => {
    setUnreadMap(prev => ({
      ...prev,
      [String(convId)]: (prev[String(convId)] || 0) + delta,
    }));
  }, []);

  /**
   * Primary sync path — call this whenever ChatPage's conversations state changes.
   * Accepts the normalised conversation array (objects with `id` and `unread` fields).
   * This ensures the badge and the conversation list always show the same numbers.
   */
  const syncFromList = useCallback((list) => {
    const map = {};
    list.forEach(c => { map[String(c.id)] = c.unread || 0; });
    setUnreadMap(map);
  }, []);

  return (
    <ChatUnreadContext.Provider value={{ totalChatUnread, markConvRead, bumpUnread, syncFromList, refetch: fetchUnread }}>
      {children}
    </ChatUnreadContext.Provider>
  );
}

export function useChatUnread() {
  const ctx = useContext(ChatUnreadContext);
  if (!ctx) throw new Error("useChatUnread must be used inside <ChatUnreadProvider>");
  return ctx;
}
