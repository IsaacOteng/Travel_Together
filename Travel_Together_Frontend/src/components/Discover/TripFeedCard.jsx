import { Heart, Star } from "lucide-react";
import { fmtDate } from "../../utils/date.js";
import { formatPrice, titleCase } from "../../utils/money.js";
import { Avatar } from './helpers.jsx';

/* Same card language as the landing page's destination grid: the photograph
   carries the card, the text sits beneath it on the page ground, and there is
   no surrounding box. Sharing lives on the trip detail page, so the grid card
   keeps a single action — save. */
export default function TripFeedCard({ trip, onView, onSave }) {
  const spotsLeft = trip.spotsTotal - trip.spotsFilled;
  const almostFull = spotsLeft > 0 && spotsLeft <= 3;
  const full = spotsLeft <= 0;

  return (
    <article className="group">
      <div className="relative">
        <button
          onClick={() => onView(trip)}
          aria-label={`View ${trip.title}`}
          className="block w-full cursor-pointer overflow-hidden rounded-2xl border border-line bg-surface-alt p-0 aspect-4/5"
        >
          {trip.media?.[0]?.url && (
            <img
              src={trip.media[0].url}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            />
          )}
        </button>

        {trip.tags?.[0] && (
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-ground/90 px-2.5 py-1 text-[11px] font-semibold text-ink backdrop-blur-sm">
            {titleCase(trip.tags[0])}
          </span>
        )}

        <button
          onClick={() => onSave(trip.id)}
          aria-label={trip.saved ? "Remove from saved" : "Save this trip"}
          aria-pressed={trip.saved}
          className={`absolute right-3 top-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none backdrop-blur-sm transition-colors ${
            trip.saved
              ? "bg-accent text-accent-ink"
              : "bg-ground/90 text-ink hover:text-accent"
          }`}
        >
          <Heart size={14} fill={trip.saved ? "currentColor" : "none"} />
        </button>

        {(almostFull || full) && (
          <span
            className={`pointer-events-none absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm ${
              full ? "bg-ground/90 text-ink-mute" : "bg-accent text-accent-ink"
            }`}
          >
            {full ? "Full" : `Only ${spotsLeft} left`}
          </span>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="min-w-0 font-display text-[18px] font-semibold leading-tight text-ink transition-colors group-hover:text-accent">
            {trip.title}
          </h3>
          <span className="shrink-0 text-[14px] font-semibold text-ink">
            {formatPrice(trip.entryPrice)}
          </span>
        </div>

        <p className="mt-1 truncate text-[13px] text-ink-mute">{trip.destination}</p>

        <p className="mt-2.5 text-[12.5px] text-ink-mute">
          {fmtDate(trip.dateStart)}
          <span className="px-1.5" aria-hidden="true">·</span>
          {full ? "No spots left" : `${spotsLeft} of ${trip.spotsTotal} left`}
        </p>

        <div className="mt-3 flex items-center gap-2">
          <Avatar name={trip.chief.name} src={trip.chief.avatarUrl} size={22} />
          <span className="min-w-0 truncate text-[12.5px] text-ink-soft">
            {trip.chief.name}
          </span>
          {trip.chief.rating > 0 && (
            <span className="flex shrink-0 items-center gap-0.5 text-[12px] text-ink-mute">
              <Star size={11} className="text-sun" fill="currentColor" />
              {trip.chief.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
