/* Non-component helpers for the admin, kept out of the .jsx files so Fast
   Refresh can hot-swap those instead of doing a full reload. */

export const fieldBase =
  "rounded-xl border border-line bg-surface px-3 py-2.5 text-[13.5px] text-ink outline-none transition-colors hover:border-ink-mute focus:border-accent focus:ring-2 focus:ring-accent/25";

export function fmtNum(n) {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
