import { Check } from "lucide-react";
import { SectionHead } from "./SectionHead";
import { TRIP_TYPES } from "./constants";

/* This was a three-column grid of cards, each a 24px emoji stacked above an
   11px label. The emoji carried no information the label didn't already give,
   and nothing else in the product uses them — they were the loudest thing on
   an otherwise quiet flow. Plain chips hold more per row, wrap properly on a
   phone, and match the relationship chips two steps later. */
export const StepTripTypes = ({ form, patch }) => {
  const selected = form.tripTypes || [];

  const toggle = (id) =>
    patch({
      tripTypes: selected.includes(id)
        ? selected.filter((t) => t !== id)
        : [...selected, id],
    });

  return (
    <div>
      <SectionHead
        title="What kind of trips?"
        sub="Pick anything that appeals. We use these to decide which groups show up first on Discover."
      />

      <div className="flex flex-wrap gap-2.5">
        {TRIP_TYPES.map(({ id, label }) => {
          const on = selected.includes(id);
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(id)}
              className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2.5 text-[14px] font-medium transition-colors ${
                on
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-line bg-surface text-ink-soft hover:border-accent hover:text-accent"
              }`}
            >
              {on && <Check size={13} strokeWidth={3} className="shrink-0" />}
              {label}
            </button>
          );
        })}
      </div>

      <p className="mt-5 text-[13px] text-ink-mute">
        {selected.length === 0
          ? "Nothing picked yet — you can skip this and set it later."
          : `${selected.length} selected.`}
      </p>
    </div>
  );
};
