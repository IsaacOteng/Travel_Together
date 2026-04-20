import { useState } from "react";
import { fmtDate } from "../../utils/date.js";
import {
  MapPin, Calendar, Car, Users,
  Star, TrendingUp, Heart, ChevronRight, Share2,
} from "lucide-react";
import { Avatar, MemberStack } from './helpers.jsx';
import ShareToast from './ShareToast.jsx';

export default function TripFeedCard({ trip, onView, onSave }) {
  const [hov,       setHov]       = useState(false);
  const [sharing,   setSharing]   = useState(false);
  const spotsLeft = trip.spotsTotal - trip.spotsFilled;
  const pct       = trip.spotsTotal > 0 ? (trip.spotsFilled / trip.spotsTotal) * 100 : 0;

  return (
    <article
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="bg-[#0d1b2a] rounded-[20px] overflow-hidden transition-all duration-[220ms] ease-out"
      style={{
        border: `1.5px solid ${hov ? "rgba(255,107,53,0.3)" : "rgba(255,255,255,0.07)"}`,
        transform: hov ? "translateY(-3px)" : "translateY(0)",
        boxShadow: hov
          ? "0 20px 50px rgba(0,0,0,0.4),0 0 0 1px rgba(255,107,53,0.1)"
          : "0 4px 20px rgba(0,0,0,0.25)",
      }}
    >
      {/* ── Cover image ─────────────────────────────────────────── */}
      <div
        className="relative h-[250px] overflow-hidden cursor-pointer"
        onClick={() => onView(trip)}
      >
        <div className="w-full h-full bg-[#0a1628] absolute inset-0" />
        {trip.media?.[0]?.url && (
          <img
            src={trip.media[0].url}
            alt={trip.title}
            className="w-full h-full object-cover block absolute inset-0 transition-transform duration-500 ease-out"
            style={{ transform: hov ? "scale(1.04)" : "scale(1)" }}
          />
        )}

        {/* Dark gradient overlay — always visible */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(13,27,42,0.92) 0%, rgba(13,27,42,0.35) 55%, transparent 100%)" }}
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
          <div className={`backdrop-blur-md rounded-lg px-[9px] py-1 text-[11px] font-extrabold text-white
            ${trip.entryPrice === 0 ? "bg-green-500/80" : "bg-[rgba(255,107,53,0.85)]"}`}>
            {trip.entryPrice === 0 ? "Free" : `GH₵${trip.entryPrice}`}
          </div>
          <div className="bg-black/40 backdrop-blur-md rounded-lg px-[9px] py-1 text-[10px] font-bold text-white/80">
            {spotsLeft > 0 ? `${spotsLeft} left` : "Full"}
          </div>
        </div>

        {/* Title + destination — bottom overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-4 py-3.5">
          <h3 className="m-0 mb-1 text-[20px] font-light text-white font-serif tracking-[-0.3px] leading-tight"
            style={{ textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}>
            {trip.title}
          </h3>
          <div className="flex items-center gap-1.5">
            <MapPin size={11} color="rgba(255,255,255,0.6)" />
            <span className="text-[11px] text-white/65">{trip.destination}</span>
          </div>
        </div>
      </div>

      {/* ── Card body ───────────────────────────────────────────── */}
      <div className="p-4">

        {/* Chief row */}
        <div className="flex items-center gap-2.5 mb-3.5">
          <Avatar name={trip.chief.name} src={trip.chief.avatarUrl} size={32} />
          <div className="flex-1 min-w-0">
            <span className="text-[12px] text-white/80 font-semibold">{trip.chief.name}</span>
            <div className="flex items-center gap-[3px] mt-[1px]">
              <Star size={10} color="#fbbf24" fill="#fbbf24" />
              <span className="text-[10px] text-[#fbbf24]">{trip.chief.rating ? trip.chief.rating.toFixed(1) : "—"}</span>
              <span className="text-[10px] text-white/30">· {trip.chief.trips} trips</span>
            </div>
          </div>
          <div className="flex items-center gap-1" title="Chief's travel karma">
            <TrendingUp size={12} color="#FF6B35" />
            <span className="text-[12px] font-bold text-[#FF6B35]">{trip.chief.karma ?? 0}</span>
          </div>
        </div>

        {/* Description */}
        <p className="m-0 mb-3.5 text-[12px] text-white/50 leading-[1.6] line-clamp-2">
          {trip.description}
        </p>

        {/* Meta pills */}
        <div className="flex gap-1.5 flex-wrap mb-4">
          {[
            { icon: Calendar, text: fmtDate(trip.dateStart) },
            trip.drive && { icon: Car, text: trip.drive },
            { icon: Users, text: `${trip.spotsFilled}/${trip.spotsTotal}` },
          ].filter(Boolean).map((m, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-white/[0.06] rounded-lg px-[9px] py-[5px] border border-white/[0.07]">
              <m.icon size={11} color="rgba(255,255,255,0.4)" />
              <span className="text-[11px] text-white/55 font-medium">{m.text}</span>
            </div>
          ))}
        </div>

        {/* Member stack + progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-[7px]">
            <div className="flex items-center gap-2">
              <MemberStack members={trip.membersPreview || []} max={4} total={trip.spotsFilled} />
              {trip.spotsFilled > 0 && (
                <span className="text-[11px] text-white/40 font-medium">{trip.spotsFilled} going</span>
              )}
            </div>
            <span
              className="text-[11px] font-bold"
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
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(255,107,53,.35)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(255,107,53,.25)"; }}
            className="flex-1 py-2.5 rounded-[10px] border-none bg-gradient-to-br from-[#FF6B35] to-[#ff8c5a] text-white text-[12px] font-bold cursor-pointer flex items-center justify-center gap-1.5 transition-all duration-150"
            style={{ boxShadow: "0 4px 14px rgba(255,107,53,.25)" }}
          >
            View trip <ChevronRight size={14} />
          </button>
          <button
            onClick={() => onSave(trip.id)}
            className="w-10 h-10 rounded-[10px] flex-shrink-0 flex items-center justify-center cursor-pointer transition-all duration-200"
            style={{
              background: trip.saved ? "rgba(255,107,53,0.2)" : "rgba(255,255,255,0.07)",
              color: trip.saved ? "#FF6B35" : "rgba(255,255,255,0.5)",
              border: `1.5px solid ${trip.saved ? "rgba(255,107,53,0.4)" : "rgba(255,255,255,0.1)"}`,
            }}
          >
            <Heart size={16} fill={trip.saved ? "#FF6B35" : "none"} />
          </button>
          <button
            onClick={() => setSharing(true)}
            className="w-10 h-10 rounded-[10px] flex-shrink-0 flex items-center justify-center cursor-pointer transition-all duration-200 bg-white/[0.07] text-white/50 hover:bg-white/[0.12] hover:text-white/80"
            style={{ border: "1.5px solid rgba(255,255,255,0.1)" }}
          >
            <Share2 size={16} />
          </button>
        </div>

        {sharing && <ShareToast trip={trip} onClose={() => setSharing(false)} />}
      </div>
    </article>
  );
}
