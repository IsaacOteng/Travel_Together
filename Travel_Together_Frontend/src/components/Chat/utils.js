import { AV_COLORS } from "./constants.js";

export function fuzzyMatch(text, query) {
  if (!query) return true;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t.includes(q)) return true;
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

export function avatarColor(name = "") {
  return AV_COLORS[(name.charCodeAt(0) || 0) % AV_COLORS.length];
}

export function normaliseConv(c, myUserId) {
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

export function normaliseMsg(m, myUserId) {
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
