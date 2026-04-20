import { useState } from "react";
import { fmtDate } from "../../utils/date.js";
import {
  MapPin, Navigation, Calendar, Car, Users,
  Star, TrendingUp, Send, Ticket, Info, Map, Heart, Share2,
} from "lucide-react";
import ShareToast from './ShareToast.jsx';
import SlideHero from './SlideHero.jsx';
import MapEmbed from './MapEmbed.jsx';
import { Avatar, WhoIsGoing } from './helpers.jsx';
import { tripsApi } from '../../services/api.js';

export default function MobileTripDetail({ trip, onClose, onSave, onShare, onAskOrganizer }) {
  const [activeImg, setActiveImg] = useState(0);
  const [joinState, setJoinState] = useState(
    trip.my_status === "approved" ? "approved"
    : trip.my_status === "pending" ? "pending"
    : "none"
  );
  const [joining,  setJoining]  = useState(false);
  const [sharing,  setSharing]  = useState(false);

  const spotsLeft = trip.spotsTotal - trip.spotsFilled;
  const mediaLen = trip.media?.length || 1;
  const prev = () => setActiveImg(a => (a - 1 + mediaLen) % mediaLen);
  const next = () => setActiveImg(a => (a + 1) % mediaLen);

  const handleJoin = async () => {
    if (joinState !== "none" || joining) return;
    setJoining(true);
    try {
      await tripsApi.join(trip.id);
      setJoinState("pending");
    } catch (err) {
      const detail = err?.response?.data?.detail || "";
      if (detail.includes("already a member")) setJoinState("approved");
      else if (detail.includes("already pending")) setJoinState("pending");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-[#0d1b2a] overflow-y-auto animate-[slideInUp_0.28s_ease]">
      <SlideHero
        trip={trip} activeImg={activeImg}
        onPrev={prev} onNext={next} onSetImg={setActiveImg}
        onClose={onClose} onSave={onSave} onShare={() => setSharing(true)}
        height={260} showTitle={false} hideArrows
      />

      <div className="px-4 pt-4 pb-28">
        <h2 className="m-0 mb-3 text-[22px] font-light text-white font-serif tracking-[-0.4px]">
          {trip.title}
        </h2>

        {/* meta chips */}
        <div className="flex gap-1.5 flex-wrap mb-2.5">
          {[
            { icon: MapPin,     text: (trip.destination  || "").split(",")[0] || "—" },
            { icon: Navigation, text: `Meet: ${(trip.meetingPlace || "").split(",")[0] || "—"}` },
            { icon: Calendar,   text: `${fmtDate(trip.dateStart)} – ${fmtDate(trip.dateEnd)}` },
          ].map(m => (
            <div key={m.text} className="flex items-center gap-1.5 bg-white/[0.07] rounded-lg px-2.5 py-[5px] border border-white/[0.07]">
              <m.icon size={11} color="#FF6B35" />
              <span className="text-[11px] text-white/70">{m.text}</span>
            </div>
          ))}
        </div>

        {/* spots + drive + distance */}
        <div className="flex gap-1.5 flex-wrap mb-2.5">
          <div className="flex items-center gap-1.5 bg-white/[0.07] rounded-lg px-2.5 py-1.5">
            <Users size={11} color="rgba(255,255,255,0.4)" />
            <span className="text-[11px] text-white/70 font-semibold">{trip.spotsFilled}/{trip.spotsTotal} spots</span>
          </div>
          {trip.drive && (
            <div className="flex items-center gap-1.5 bg-white/[0.07] rounded-lg px-2.5 py-1.5">
              <Car size={11} color="rgba(255,255,255,0.4)" />
              <span className="text-[11px] text-white/70">{trip.drive}</span>
            </div>
          )}
          {trip.distance && (
            <div className="flex items-center gap-1.5 bg-white/[0.07] rounded-lg px-2.5 py-1.5">
              <MapPin size={11} color="rgba(255,255,255,0.4)" />
              <span className="text-[11px] text-white/70">{trip.distance}</span>
            </div>
          )}
        </div>

        {/* tags */}
        <div className="flex gap-1.5 flex-wrap mb-3">
          {(trip.tags || []).map(tag => (
            <span key={tag} className="text-[11px] px-2.5 py-[3px] rounded-full bg-[rgba(255,107,53,0.15)] text-[#FF6B35] font-semibold border border-[rgba(255,107,53,0.25)]">
              {tag}
            </span>
          ))}
        </div>

        {/* members */}
        <div className="mb-3.5">
          <WhoIsGoing
            members={trip.members || []}
            spotsFilled={trip.spotsFilled}
            spotsTotal={trip.spotsTotal}
            viewerIsMember={trip.viewer_is_member ?? false}
            tripId={trip.id}
          />
        </div>

        <p className="mb-[18px] text-[13px] text-white/60 leading-[1.7]">{trip.description || trip.longDescription}</p>

        <div className="flex items-center gap-1.5 mb-2.5">
          <Map size={13} color="#FF6B35" />
          <span className="text-[11px] font-bold text-[#FF6B35] tracking-[0.08em] uppercase">Map View</span>
        </div>
        <MapEmbed trip={trip} height={200} />

        {/* entry price */}
        <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl px-4 py-3.5 mb-4 mt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Ticket size={14} color="#FF6B35" />
              <span className="text-[12px] font-bold text-white/70">Entry price</span>
            </div>
            <span className={`text-[22px] font-black font-serif leading-none ${trip.entryPrice === 0 ? "text-green-400" : "text-[#FF6B35]"}`}>
              {trip.entryPrice === 0 ? "Free" : `GH₵${trip.entryPrice}`}
            </span>
          </div>
          {(trip.priceCovers || trip.price_covers || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {(trip.priceCovers || trip.price_covers || []).map(c => (
                <span key={c} className="text-[11px] px-2.5 py-[3px] rounded-full bg-[rgba(255,107,53,0.12)] text-[#FF6B35] border border-[rgba(255,107,53,0.2)] font-semibold">
                  {c}
                </span>
              ))}
            </div>
          )}
          {(trip.priceNote || trip.price_note) && (
            <p className="text-[11px] text-white/35 flex items-start gap-1.5 leading-snug m-0 mt-1">
              <Info size={10} className="mt-0.5 flex-shrink-0" /> {trip.priceNote || trip.price_note}
            </p>
          )}
        </div>

        {/* organiser */}
        <div className="pt-4 border-t border-white/[0.07]">
          <div className="flex items-center gap-2.5 mb-3.5">
            <Avatar name={trip.chief?.name} size={42} />
            <div className="flex-1">
              <div className="text-[13px] font-bold text-white">Created by {trip.chief?.name}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex items-center gap-1">
                  <Star size={11} color="#fbbf24" fill="#fbbf24" />
                  <span className="text-[11px] text-white/35">
                    {trip.chief?.trips ?? 0} trip{(trip.chief?.trips ?? 0) !== 1 ? "s" : ""} hosted
                  </span>
                </div>
                <div className="flex items-center gap-[3px]">
                  <TrendingUp size={11} color="#FF6B35" />
                  <span className="text-[11px] font-bold text-[#FF6B35]">{trip.chief?.karma ?? 0}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => onAskOrganizer?.(trip.chief?.id)}
              className="px-3 py-2 rounded-xl border border-white/12 bg-transparent text-white/60 text-[12px] font-semibold cursor-pointer flex items-center gap-1.5 flex-shrink-0 hover:border-[#FF6B35]/40 hover:text-white transition-colors">
              <Send size={13} /> Ask
            </button>
          </div>
        </div>
      </div>

      {/* ── Fixed bottom action bar ────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-[2100] px-4 py-3 flex gap-2"
        style={{ background: "rgba(13,27,42,0.96)", backdropFilter: "blur(16px)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>

        {joinState === "none" && (
          <button
            onClick={handleJoin}
            disabled={joining}
            className="flex-1 py-[13px] rounded-xl text-[13px] font-bold cursor-pointer text-white border-none transition-all duration-200"
            style={{
              background: "linear-gradient(135deg,#FF6B35,#ff8c5a)",
              boxShadow: "0 4px 14px rgba(255,107,53,0.3)",
              opacity: joining ? 0.7 : 1,
            }}
          >
            {joining ? "Sending…" : "Send join request"}
          </button>
        )}
        {joinState === "pending" && (
          <div className="flex-1 py-[13px] rounded-xl text-[13px] font-semibold text-center"
            style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1.5px solid rgba(251,191,36,0.25)" }}>
            ⏳ Waiting for approval
          </div>
        )}
        {joinState === "approved" && (
          <div className="flex-1 py-[13px] rounded-xl text-[13px] font-semibold text-center"
            style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1.5px solid rgba(74,222,128,0.25)" }}>
            ✓ You're in the group
          </div>
        )}

        <button
          onClick={() => onSave(trip.id)}
          className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center cursor-pointer transition-all duration-200"
          style={{
            background: trip.saved ? "rgba(255,107,53,0.2)" : "rgba(255,255,255,0.07)",
            color: trip.saved ? "#FF6B35" : "rgba(255,255,255,0.5)",
            border: `1.5px solid ${trip.saved ? "rgba(255,107,53,0.4)" : "rgba(255,255,255,0.1)"}`,
          }}
        >
          <Heart size={18} fill={trip.saved ? "#FF6B35" : "none"} />
        </button>

        <button
          onClick={() => setSharing(true)}
          className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center cursor-pointer transition-all duration-200 bg-white/[0.07] text-white/50 hover:bg-white/[0.12]"
          style={{ border: "1.5px solid rgba(255,255,255,0.1)" }}
        >
          <Share2 size={18} />
        </button>
      </div>

      {sharing && <ShareToast trip={trip} onClose={() => setSharing(false)} />}
    </div>
  );
}
