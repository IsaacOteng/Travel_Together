import { ArrowRight, MapPin, Calendar, Users } from "lucide-react";
import { fmtDate } from "../../utils/date.js";
import { formatPrice } from "../../utils/money.js";
import { Avatar } from "./helpers.jsx";

/* The next trip out the door, given room to breathe. Discover used to open on
   a marketing headline; this puts a real, joinable trip in that space instead. */
export default function FeaturedTrip({ trip, onView, onSave }) {
  const spotsLeft = trip.spotsTotal - trip.spotsFilled;

  return (
    <section className="overflow-hidden rounded-3xl border border-line bg-surface">
      <div className="grid lg:grid-cols-[1.15fr_1fr]">
        <button
          onClick={() => onView(trip)}
          aria-label={`View ${trip.title}`}
          className="group relative block w-full cursor-pointer overflow-hidden border-none bg-surface-alt p-0 [aspect-ratio:16/10] lg:aspect-auto lg:h-full"
        >
          {trip.media?.[0]?.url && (
            <img
              src={trip.media[0].url}
              alt=""
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
          )}
          <span className="absolute left-4 top-4 rounded-full bg-ground/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent backdrop-blur-sm">
            Leaving next
          </span>
        </button>

        <div className="flex flex-col justify-center p-7 lg:p-9">
          <h2 className="font-display text-[clamp(24px,2.8vw,34px)] font-semibold leading-[1.08] text-ink">
            {trip.title}
          </h2>
          <p className="mt-2.5 flex items-center gap-1.5 text-[13.5px] text-ink-mute">
            <MapPin size={13} className="shrink-0" />
            <span className="truncate">{trip.destination}</span>
          </p>

          {trip.description && (
            <p className="mt-4 line-clamp-2 text-[14.5px] leading-[1.7] text-ink-soft">
              {trip.description}
            </p>
          )}

          <dl className="mt-6 flex flex-wrap gap-x-7 gap-y-3 border-y border-line-soft py-4 text-[13px] text-ink-soft">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="shrink-0 text-ink-mute" />
              {fmtDate(trip.dateStart)}
            </div>
            <div className="flex items-center gap-2">
              <Users size={14} className="shrink-0 text-ink-mute" />
              {spotsLeft > 0 ? `${spotsLeft} of ${trip.spotsTotal} spots left` : "Full"}
            </div>
            <div className="font-semibold text-ink">{formatPrice(trip.entryPrice)}</div>
          </dl>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              onClick={() => onView(trip)}
              className="flex cursor-pointer items-center gap-2 rounded-full border-none bg-accent px-6 py-3 text-[14.5px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
            >
              View trip <ArrowRight size={16} />
            </button>
            <button
              onClick={() => onSave(trip.id)}
              className="cursor-pointer rounded-full border border-line bg-transparent px-5 py-3 text-[14px] font-medium text-ink transition-colors hover:border-accent hover:text-accent"
            >
              {trip.saved ? "Saved" : "Save for later"}
            </button>
          </div>

          <div className="mt-6 flex items-center gap-2.5">
            <Avatar name={trip.chief.name} src={trip.chief.avatarUrl} size={28} />
            <span className="text-[13px] text-ink-mute">
              Organised by <span className="font-semibold text-ink">{trip.chief.name}</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
