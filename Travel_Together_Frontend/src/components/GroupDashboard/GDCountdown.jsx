import { useEffect, useState } from "react";
import { Plane, Flag, CheckCircle2 } from "lucide-react";

/**
 * The trip clock, which counts toward a different moment at each stage:
 *
 *   before departure   → time until the trip sets off
 *   under way          → time until it's due to end
 *   finished           → nothing to count
 *
 * The stage comes from the trip's actual state (has it departed, is it over),
 * not from whether the start time has passed — a trip whose start time came and
 * went without departing is still waiting to leave.
 *
 * It ticks here rather than being handed pre-computed numbers: minutes are only
 * honest if they move, and a value worked out once when the page loaded is
 * already wrong by the time anyone reads it.
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR   = 60 * MINUTE;
const DAY    = 24 * HOUR;

const split = (ms) => ({
  days:    Math.floor(ms / DAY),
  hours:   Math.floor((ms % DAY) / HOUR),
  minutes: Math.floor((ms % HOUR) / MINUTE),
});

export default function Countdown({ targetMs, phase = "starting" }) {
  // Re-render on a cadence, and derive the remaining time from the clock each
  // time rather than decrementing a counter — a decremented one drifts, and
  // stops entirely while a background tab is throttled.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (phase === "ended" || !targetMs) return;
    const id = setInterval(() => setNow(Date.now()), 15 * SECOND);
    return () => clearInterval(id);
  }, [phase, targetMs]);

  if (phase === "ended") {
    return (
      <div className="inline-flex items-center gap-2 rounded-2xl border border-line bg-surface-alt px-4 py-2.5">
        <CheckCircle2 size={14} className="text-ink-mute" />
        <span className="text-[12.5px] font-bold text-ink-soft tracking-wide">Trip ended</span>
      </div>
    );
  }

  const ending  = phase === "ending";
  const caption = ending ? "until the trip ends" : "until departure";
  const Icon    = ending ? Flag : Plane;
  // Orange while the group is still waiting to leave, green once under way —
  // the accent carries the stage, so the caption isn't the only thing to read.
  const accent  = ending ? "#4ade80" : "var(--tt-accent)";

  const remaining = targetMs ? Math.max(0, targetMs - now) : null;
  const { days, hours, minutes } = remaining == null
    ? { days: "—", hours: "—", minutes: "—" }
    : split(remaining);

  // Under an hour the day and hour columns are just two zeroes taking up the
  // width; drop them and let the minutes carry it.
  const imminent = remaining != null && remaining < HOUR;
  const units = imminent
    ? [{ val: minutes, label: "min" }]
    : [{ val: days, label: "days" }, { val: hours, label: "hrs" }, { val: minutes, label: "min" }];

  return (
    <div
      className="relative inline-flex flex-col gap-2 rounded-2xl border border-line px-4 py-3 overflow-hidden"
      style={{ background: "var(--tt-surface)" }}
    >
      {/* Accent rail — ties the panel to the stage without another border. */}
      <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: accent }} />

      <div className="flex items-center gap-1.5">
        <Icon size={11} style={{ color: accent }} />
        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-mute">{caption}</span>
      </div>

      <div className="flex items-end gap-2.5">
        {units.map(({ val, label }, i) => (
          <div key={label} className="flex items-end gap-2.5">
            {i > 0 && (
              <span className="text-[22px] font-light leading-none text-ink-mute pb-1.5 select-none">:</span>
            )}
            <div className="flex flex-col items-center min-w-[34px]">
              <span className="text-[26px] font-black leading-none text-ink font-serif tabular-nums">
                {typeof val === "number" ? String(val).padStart(2, "0") : val}
              </span>
              <span className="mt-1 text-[8.5px] font-bold uppercase tracking-[0.12em] text-ink-mute">
                {label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
