import { useState, useEffect, useRef } from "react";
import { authApi } from "../../services/api.js";
import { fmtDate } from "../../utils/date.js";

export const UN_RE = /^[a-z0-9._]{3,20}$/;

export function useUsernameCheck(val, currentUsername) {
  const [status, setStatus] = useState("idle");
  const t = useRef(null);
  useEffect(() => {
    clearTimeout(t.current);
    if (!val || val === currentUsername) { setStatus("idle"); return; }
    if (!UN_RE.test(val)) { setStatus("invalid"); return; }
    setStatus("checking");
    t.current = setTimeout(async () => {
      try {
        const { data } = await authApi.checkUsername(val);
        setStatus(data.available ? "available" : "taken");
      } catch { setStatus("available"); }
    }, 650);
    return () => clearTimeout(t.current);
  }, [val, currentUsername]);
  return status;
}

export function monthsAgo(dateStr) {
  if (!dateStr) return Infinity;
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24 * 30);
}

export function nextAllowedDate(dateStr, months) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function parseCoverPosition(str) {
  if (!str) return { x: 50, y: 50 };
  const [x, y] = str.split(" ").map(v => parseFloat(v));
  return { x: isNaN(x) ? 50 : x, y: isNaN(y) ? 50 : y };
}

export function normaliseTrip(t) {
  return {
    id:     t.id,
    name:   t.title || t.name,
    dest:   (t.destination || "").split(",")[0].trim(),
    date:   fmtDate(t.date_start),
    status: t.status,
    cover:  t.cover_image || "",
    role:   t.my_role
      ? t.my_role.charAt(0).toUpperCase() + t.my_role.slice(1)
      : "Member",
    karma:  t.karma_earned ?? 0,
  };
}
