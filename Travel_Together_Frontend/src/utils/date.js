export function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d)) return value;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// Format a "HH:MM[:SS]" time string as e.g. "7:10 AM". Returns "" if absent.
export function fmtTime(value) {
  if (!value) return "";
  const [h, m] = String(value).split(":");
  const hour = parseInt(h, 10);
  if (isNaN(hour)) return "";
  const am = hour < 12;
  const h12 = hour % 12 || 12;
  return `${h12}:${(m || "00").padStart(2, "0")} ${am ? "AM" : "PM"}`;
}
