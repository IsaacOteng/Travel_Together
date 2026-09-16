import { ArrowLeft, MapPin, Users, Radio, CheckCircle2 } from "lucide-react";
import Countdown from "./GDCountdown.jsx";

/* The dashboard used to look identical whether a trip was three weeks away,
   under way, or finished — same countdown, same check-in button, same live
   map. The header now leads with which of those three it actually is, and
   everything downstream keys off the same phase. */

const PHASE_CFG = {
  upcoming: {
    label: "Upcoming",
    cls:   "bg-accent-soft text-accent",
    Icon:  Radio,
  },
  live: {
    label: "Under way",
    cls:   "bg-moss/15 text-moss",
    Icon:  Radio,
  },
  ended: {
    label: "Completed",
    cls:   "bg-surface-alt text-ink-mute",
    Icon:  CheckCircle2,
  },
};

export default function TripPhaseHeader({
  trip, phase, memberCount, onBack, primaryAction,
}) {
  const cfg = PHASE_CFG[phase] ?? PHASE_CFG.upcoming;

  return (
    <header className="rounded-3xl border border-line bg-surface p-6 sm:p-7">
      <button
        onClick={onBack}
        className="mb-4 flex cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-[13px] text-ink-mute transition-colors hover:text-accent"
      >
        <ArrowLeft size={15} /> My trips
      </button>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 font-display text-[clamp(24px,3vw,34px)] font-semibold leading-tight text-ink">
              {trip?.title ?? "—"}
            </h1>
            <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold ${cfg.cls}`}>
              <cfg.Icon size={12} className={phase === "live" ? "animate-pulse" : ""} />
              {cfg.label}
            </span>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13.5px] text-ink-mute">
            {trip?.destination && (
              <span className="flex items-center gap-1.5">
                <MapPin size={13} className="shrink-0" />{trip.destination}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Users size={13} className="shrink-0" />
              {memberCount} of {trip?.spotsTotal ?? "—"} travelling
            </span>
          </div>
        </div>

        <div className="flex flex-col items-start gap-4 lg:items-end">
          {phase !== "ended" && trip?.countdownTo && (
            <Countdown targetMs={trip.countdownTo} phase={trip?.phase ?? "starting"} />
          )}
          {primaryAction}
        </div>
      </div>
    </header>
  );
}
