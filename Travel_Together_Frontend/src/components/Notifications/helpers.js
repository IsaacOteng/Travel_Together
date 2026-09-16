import { useState, useEffect } from "react";

export function ago(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const sameDay = (a, b) =>
  a.getDate() === b.getDate() &&
  a.getMonth() === b.getMonth() &&
  a.getFullYear() === b.getFullYear();

export function isToday(ts) {
  return sameDay(new Date(ts), new Date());
}

/* Today / Yesterday / Earlier — "Earlier" alone lumped last night in with
   last month. */
export function dayBucket(ts) {
  const d = new Date(ts);
  const now = new Date();
  if (sameDay(d, now)) return "Today";
  const y = new Date();
  y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return "Yesterday";
  return "Earlier";
}

/* Was a plain function reading window.innerWidth once — nothing re-rendered
   on resize, so rotating a phone left the panel in the wrong layout. */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window === "undefined" ? false : window.innerWidth < breakpoint
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return isMobile;
}
