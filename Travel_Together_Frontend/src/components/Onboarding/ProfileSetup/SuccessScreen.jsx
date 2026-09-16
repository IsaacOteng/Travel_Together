import { Check, ArrowRight } from "lucide-react";
import { TRIP_TYPES } from "./constants";

export const SuccessScreen = ({ form, onContinue }) => {
  const ec = form.emergencyContact || {};
  const rows = [
    form.displayName && ["Name", form.displayName],
    form.username    && ["Handle", `@${form.username}`],
    (form.tripTypes || []).length > 0 && [
      "Interests",
      (form.tripTypes || [])
        .map((id) => TRIP_TYPES.find((t) => t.id === id)?.label)
        .filter(Boolean)
        .join(", "),
    ],
    ec.name && ["Emergency contact", ec.name],
  ].filter(Boolean);

  return (
    <div style={{ animation: "ttFadeUp .35s ease both" }}>
      <span
        className="flex h-14 w-14 items-center justify-center rounded-full bg-moss/15 text-moss"
        style={{ animation: "ttBadgePop .4s cubic-bezier(.34,1.56,.64,1) both" }}
      >
        <Check size={26} strokeWidth={2.4} />
      </span>

      <h1 className="m-0 mt-6 font-display text-[clamp(26px,3.2vw,34px)] font-semibold leading-[1.1] text-ink">
        You&apos;re set{form.displayName ? `, ${form.displayName}` : ""}.
      </h1>
      <p className="m-0 mt-3 max-w-[44ch] text-[15px] leading-[1.65] text-ink-soft">
        Your profile is live. Organisers can see it when you ask to join a trip —
        and you can start browsing now.
      </p>

      {rows.length > 0 && (
        <dl className="mt-7 grid grid-cols-1 gap-0 rounded-2xl border border-line bg-surface px-4 py-1">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex items-start justify-between gap-5 border-b border-line-soft py-3 last:border-b-0"
            >
              <dt className="shrink-0 text-[13px] text-ink-mute">{label}</dt>
              <dd className="m-0 max-w-[62%] wrap-break-word text-right text-[13.5px] font-medium text-ink">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <button
        type="button"
        onClick={onContinue}
        className="mt-7 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border-none bg-accent px-6 py-3.5 text-[15px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
      >
        Start exploring
        <ArrowRight size={16} />
      </button>

      <p className="m-0 mt-4 text-center text-[12.5px] text-ink-mute">
        Anything here can be changed in Settings.
      </p>
    </div>
  );
};
