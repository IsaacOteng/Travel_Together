export function ago(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function isToday(ts) {
  const d = new Date(ts);
  const n = new Date();
  return d.getDate() === n.getDate() &&
         d.getMonth() === n.getMonth() &&
         d.getFullYear() === n.getFullYear();
}

export function useIsMobile() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768;
}
