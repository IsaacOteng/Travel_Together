import { useState } from "react";
import { fmtDate } from "../../utils/date.js";
import {
  MapPin, Calendar, Car, Users,
  Star, TrendingUp, Heart, ChevronRight, Share2,
} from "lucide-react";
import { Avatar, MemberStack } from './helpers.jsx';
import ShareToast from './ShareToast.jsx';

export default function MobileTripCard({ trip, onView, onSave }) {
  const [sharing,  setSharing]  = useState(false);
  const spotsLeft = trip.spotsTotal - trip.spotsFilled;
  const pct       = trip.spotsTotal > 0 ? (trip.spotsFilled / trip.spotsTotal) * 100 : 0;

  return (
    <article
      className="mx-3 my-2.5 bg-[#0d1b2a] rounded-[20px] overflow-hidden"
      style={{
        border: "1.5px solid rgba(255,255,255,0.07)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
      }}
    >
      {/* ── Cover image ───────────────────────────────────────── */}
      <div
        className="relative h-[260px] overflow-hidden cursor-pointer"
        onClick={() => onView(trip)}
      >
        <div className="absolute inset-0 bg-[#0a1628]" />
        {trip.media?.[0]?.url && (
          <img
            src={trip.media[0].url}
            alt={trip.title}
            className="absolute inset-0 w-full h-full object-cover block"
          />
        )}

        {/* Gradient */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(13,27,42,0.94) 0%, rgba(13,27,42,0.3) 55%, transparent 100%)" }}
        />

        {/* Tags — top left */}
        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
          {trip.tags.slice(0, 2).map(tag => (
            <span
              key={tag}
              className="text-[10px] px-[9px] py-[3px] rounded-full bg-white/[0.18] backdrop-blur-md text-white font-bold"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Price + spots — top right */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
          <div className={`backdrop-blur-md rounded-lg px-[9px] py-1 text-[12px] font-extrabold text-white
            ${trip.entryPrice === 0 ? "bg-green-500/80" : "bg-[rgba(255,107,53,0.85)]"}`}>
            {trip.entryPrice === 0 ? "Free" : `GH₵${trip.entryPrice}`}
          </div>
          <div className="bg-black/40 backdrop-blur-md rounded-lg px-[9px] py-1 text-[10px] font-bold text-white/80">
            {spotsLeft > 0 ? `${spotsLeft} left` : "Full"}
          </div>
        </div>

        {/* Title + destination — bottom overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-4 py-4">
          <h3
            className="m-0 mb-1 text-[22px] font-light text-white font-serif tracking-[-0.4px] leading-tight"
            style={{ textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}
          >
            {trip.title}
          </h3>
          <div className="flex items-center gap-1.5">
            <MapPin size={11} color="rgba(255,255,255,0.6)" />
            <span className="text-[12px] text-white/65">{trip.destination}</span>
          </div>
        </div>
      </div>

      {/* ── Card body ─────────────────────────────────────────── */}
      <div className="p-4">

        {/* Chief row */}
        <div className="flex items-center gap-2.5 mb-3.5">
          <Avatar name={trip.chief.name} src={trip.chief.avatarUrl} size={34} />
          <div className="flex-1 min-w-0">
            <span className="text-[13px] text-white/80 font-semibold">{trip.chief.name}</span>
            <div className="flex items-center gap-[3px] mt-[1px]">
              <Star size={10} color="#fbbf24" fill="#fbbf24" />
              <span className="text-[10px] text-[#fbbf24]">{trip.chief.rating ? trip.chief.rating.toFixed(1) : "—"}</span>
              <span className="text-[10px] text-white/30">· {trip.chief.trips} trips</span>
            </div>
          </div>
          <div className="flex items-center gap-1" title="Chief's travel karma">
            <TrendingUp size={13} color="#FF6B35" />
            <span className="text-[13px] font-bold text-[#FF6B35]">{trip.chief.karma}</span>
          </div>
        </div>

        {/* Description */}
        <p className="m-0 mb-3.5 text-[13px] text-white/50 leading-[1.6] line-clamp-2">
          {trip.description}
        </p>

        {/* Meta pills */}
        <div className="flex gap-1.5 flex-wrap mb-4">
          {[
            { icon: Calendar, text: fmtDate(trip.dateStart) },
            trip.drive && { icon: Car, text: trip.drive },
            { icon: Users,    text: `${trip.spotsFilled}/${trip.spotsTotal}` },
          ].filter(Boolean).map((m, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 bg-white/[0.06] rounded-lg px-[9px] py-[5px] border border-white/[0.07]"
            >
              <m.icon size={12} color="rgba(255,255,255,0.4)" />
              <span className="text-[12px] text-white/55 font-medium">{m.text}</span>
            </div>
          ))}
        </div>

        {/* Member stack + progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-[7px]">
            <div className="flex items-center gap-2">
              <MemberStack members={trip.membersPreview || []} max={4} total={trip.spotsFilled} />
              {trip.spotsFilled > 0 && (
                <span className="text-[12px] text-white/40 font-medium">{trip.spotsFilled} going</span>
              )}
            </div>
            <span
              className="text-[12px] font-bold"
              style={{ color: spotsLeft <= 2 ? "#fb923c" : "#4ade80" }}
            >
              {spotsLeft > 0 ? `${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} left` : "Full"}
            </span>
          </div>
          <div className="h-[3px] bg-white/[0.08] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${pct}%`, background: pct >= 80 ? "#fb923c" : "#FF6B35" }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onView(trip)}
            className="flex-1 py-3 rounded-[10px] border-none bg-gradient-to-br from-[#FF6B35] to-[#ff8c5a] text-white text-[13px] font-bold cursor-pointer flex items-center justify-center gap-1.5"
            style={{ boxShadow: "0 4px 14px rgba(255,107,53,.25)" }}
          >
            View trip <ChevronRight size={15} />
          </button>
          <button
            onClick={() => onSave(trip.id)}
            className="w-11 h-11 rounded-[10px] flex-shrink-0 flex items-center justify-center cursor-pointer transition-all duration-200"
            style={{
              background: trip.saved ? "rgba(255,107,53,0.2)" : "rgba(255,255,255,0.07)",
              color: trip.saved ? "#FF6B35" : "rgba(255,255,255,0.5)",
              border: `1.5px solid ${trip.saved ? "rgba(255,107,53,0.4)" : "rgba(255,255,255,0.1)"}`,
            }}
          >
            <Heart size={17} fill={trip.saved ? "#FF6B35" : "none"} />
          </button>
          <button
            onClick={() => setSharing(true)}
            className="w-11 h-11 rounded-[10px] flex-shrink-0 flex items-center justify-center cursor-pointer transition-all duration-200 bg-white/[0.07] text-white/50"
            style={{ border: "1.5px solid rgba(255,255,255,0.1)" }}
          >
            <Share2 size={17} />
          </button>
        </div>

        {sharing && <ShareToast trip={trip} onClose={() => setSharing(false)} />}
      </div>
    </article>
  );
}
