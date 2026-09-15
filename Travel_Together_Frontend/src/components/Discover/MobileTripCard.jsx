import { useState } from "react";
import { fmtDate, fmtTime } from "../../utils/date.js";
import { MapPin, Calendar, Car, Users, Star, Heart, Share2, ChevronRight } from "lucide-react";
import { Avatar, MemberStack } from './helpers.jsx';
import { formatPrice, titleCase } from "../../utils/money.js";
import ShareToast from './ShareToast.jsx';

export default function MobileTripCard({ trip, onView, onSave }) {
  const [sharing, setSharing] = useState(false);
  const spotsLeft = trip.spotsTotal - trip.spotsFilled;
  const pct = trip.spotsTotal > 0 ? (trip.spotsFilled / trip.spotsTotal) * 100 : 0;
  const almostFull = spotsLeft > 0 && spotsLeft <= 2;

  return (
    <article className="mx-3.5 my-3 overflow-hidden rounded-3xl border border-line bg-surface">
      {/* ── cover ───────────────────────────────────────────────── */}
      <div
        className="relative cursor-pointer overflow-hidden bg-surface-alt aspect-16/10"
        onClick={() => onView(trip)}
      >
        {trip.media?.[0]?.url && (
          <img
            src={trip.media[0].url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/45 to-transparent" />

        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {trip.tags.slice(0, 2).map(tag => (
              <span
                key={tag}
                className="rounded-full bg-black/35 px-2.5 py-1 text-[10.5px] font-semibold text-white backdrop-blur-sm"
              >
                {titleCase(tag)}
              </span>
            ))}
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-bold backdrop-blur-sm ${
              trip.entryPrice === 0 ? "bg-moss text-white" : "bg-accent text-accent-ink"
            }`}
          >
            {formatPrice(trip.entryPrice)}
          </span>
        </div>

        {almostFull && (
          <span className="absolute bottom-3 left-3 rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-accent">
            Only {spotsLeft} left
          </span>
        )}
      </div>

      {/* ── body ────────────────────────────────────────────────── */}
      <div className="p-4">
        <h3
          onClick={() => onView(trip)}
          className="cursor-pointer font-display text-[21px] font-semibold leading-tight text-ink"
        >
          {trip.title}
        </h3>
        <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-ink-mute">
          <MapPin size={12} className="shrink-0" />
          <span className="truncate">{trip.destination}</span>
        </p>

        {trip.description && (
          <p className="mt-3 line-clamp-2 text-[13.5px] leading-[1.6] text-ink-soft">
            {trip.description}
          </p>
        )}

        <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-ink-soft">
          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="shrink-0 text-ink-mute" />
            {fmtDate(trip.dateStart)}
            {trip.start_time ? ` · ${fmtTime(trip.start_time)}` : ""}
          </div>
          {trip.drive && (
            <div className="flex items-center gap-1.5">
              <Car size={13} className="shrink-0 text-ink-mute" />
              {trip.drive}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Users size={13} className="shrink-0 text-ink-mute" />
            {trip.spotsFilled}/{trip.spotsTotal}
          </div>
        </dl>

        <div className="mt-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                pct >= 80 ? "bg-accent" : "bg-moss"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MemberStack members={trip.membersPreview || []} max={4} total={trip.spotsFilled} />
              {trip.spotsFilled > 0 && (
                <span className="text-[11.5px] text-ink-mute">{trip.spotsFilled} going</span>
              )}
            </div>
            <span className="text-[11.5px] font-medium text-ink-mute">
              {spotsLeft > 0 ? `${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} left` : "Full"}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2.5 border-t border-line-soft pt-4">
          <Avatar name={trip.chief.name} src={trip.chief.avatarUrl} size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold text-ink">{trip.chief.name}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-mute">
              <Star size={10} className="text-sun" fill="currentColor" />
              {trip.chief.rating ? trip.chief.rating.toFixed(1) : "—"}
              <span aria-hidden="true">·</span>
              {trip.chief.trips} trips
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onView(trip)}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full border-none bg-accent py-3 text-[14px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
          >
            View trip <ChevronRight size={15} />
          </button>
          <button
            onClick={() => onSave(trip.id)}
            aria-label={trip.saved ? "Remove from saved" : "Save this trip"}
            aria-pressed={trip.saved}
            className={`flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors ${
              trip.saved
                ? "border-accent bg-accent-soft text-accent"
                : "border-line bg-surface text-ink-mute"
            }`}
          >
            <Heart size={17} fill={trip.saved ? "currentColor" : "none"} />
          </button>
          <button
            onClick={() => setSharing(true)}
            aria-label="Share this trip"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink-mute"
          >
            <Share2 size={17} />
          </button>
        </div>

        {sharing && <ShareToast trip={trip} onClose={() => setSharing(false)} />}
      </div>
    </article>
  );
}
