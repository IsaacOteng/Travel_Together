import { useState } from "react";
import { fmtDate } from "../../utils/date.js";
import {
  MapPin, Navigation, Calendar, Car, Globe, Users,
  Star, TrendingUp, Send, Ticket, Info, Map, Heart, Share2,
} from "lucide-react";
import ShareToast from './ShareToast.jsx';
import SlideHero from './SlideHero.jsx';
import MapEmbed from './MapEmbed.jsx';
import { Avatar, WhoIsGoing } from './helpers.jsx';
import { tripsApi } from '../../services/api.js';

export default function TripDetailModal({ trip, onClose, onSave, onShare, onAskOrganizer }) {
  const [activeImg,  setActiveImg]  = useState(0);
  const [joinState,  setJoinState]  = useState(
    // initialise from my_status if available
    trip.my_status === "approved" ? "approved"
    : trip.my_status === "pending" ? "pending"
    : "none"
  );
  const [joining,  setJoining]  = useState(false);
  const [sharing,  setSharing]  = useState(false);

  const spotsLeft = trip.spotsTotal - trip.spotsFilled;
  const prev = () => setActiveImg(a => (a - 1 + (trip.media?.length || 1)) % (trip.media?.length || 1));
  const next = () => setActiveImg(a => (a + 1) % (trip.media?.length || 1));

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
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(10,15,30,0.65)] backdrop-blur-lg p-5 animate-[fadeIn_0.2s_ease]"
    >
      <div className="bg-[#0d1b2a] rounded-3xl w-full max-w-[900px] max-h-[90vh] overflow-y-auto animate-[slideUp_0.28s_ease] shadow-2xl scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <SlideHero
          trip={trip} activeImg={activeImg}
          onPrev={prev} onNext={next} onSetImg={setActiveImg}
          onClose={onClose} onSave={onSave} onShare={() => setSharing(true)}
          height={300} showTitle={false}
        />

        <div className="px-7 pt-6 pb-8">
          <div className="flex gap-7">
            {/* LEFT COL */}
            <div className="flex-1 min-w-0">
              {/* Title + tags */}
              <div className="mb-3.5">
                <h2 className="m-0 text-2xl font-light text-white font-serif tracking-[-0.5px] leading-tight">
                  {trip.title}
                </h2>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {(trip.tags || []).map(tag => (
                    <span key={tag} className="text-[11px] px-2.5 py-[3px] rounded-full bg-white/10 text-white/80 font-semibold">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* 3-col meta grid */}
              <div className="grid grid-cols-3 gap-2.5 mb-[18px]">
                {[
                  { icon: MapPin,     label: "Location",      value: trip.destination },
                  { icon: Navigation, label: "Meeting point", value: trip.meetingPlace || "—" },
                  { icon: Calendar,   label: "Dates",         value: `${fmtDate(trip.dateStart)} – ${fmtDate(trip.dateEnd)}` },
                  { icon: Car,        label: "Travel time",   value: trip.drive || "—" },
                  { icon: Globe,      label: "Distance",      value: trip.distance || "—" },
                  { icon: Users,      label: "Group size",    value: `${trip.spotsFilled}/${trip.spotsTotal} joined` },
                ].map(m => (
                  <div key={m.label} className="bg-white/5 rounded-xl px-3 py-2.5 border border-white/[0.07]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <m.icon size={11} color="#FF6B35" />
                      <span className="text-[9px] text-white/40 tracking-[0.08em] uppercase">{m.label}</span>
                    </div>
                    <div className="text-[12px] text-white font-medium leading-tight">{m.value}</div>
                  </div>
                ))}
              </div>

              <p className="mb-[18px] text-[13px] text-white/65 leading-[1.7]">{trip.description || trip.longDescription}</p>

              <WhoIsGoing
                members={trip.members || []}
                spotsFilled={trip.spotsFilled}
                spotsTotal={trip.spotsTotal}
                viewerIsMember={trip.viewer_is_member ?? false}
                tripId={trip.id}
              />

              <div className="flex items-center gap-1.5 mb-3">
                <Map size={13} color="#FF6B35" />
                <span className="text-[11px] font-bold text-[#FF6B35] tracking-[0.08em] uppercase">Map View</span>
              </div>
              <MapEmbed trip={trip} height={200} />
            </div>

            {/* RIGHT COL */}
            <div className="w-[220px] flex-shrink-0 flex flex-col gap-3.5">

              {/* entry price — FIRST */}
              <div className="bg-white/5 rounded-2xl border border-white/[0.08] p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Ticket size={13} color="#FF6B35" />
                    <span className="text-[9px] text-white/35 tracking-[0.08em] uppercase">Entry price</span>
                  </div>
                  <span className={`text-[20px] font-black font-serif leading-none ${trip.entryPrice === 0 ? "text-green-400" : "text-[#FF6B35]"}`}>
                    {trip.entryPrice === 0 ? "Free" : `GH₵${trip.entryPrice}`}
                  </span>
                </div>
                {(trip.priceCovers || trip.price_covers || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(trip.priceCovers || trip.price_covers || []).map(c => (
                      <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(255,107,53,0.12)] text-[#FF6B35] border border-[rgba(255,107,53,0.2)] font-semibold">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
                {(trip.priceNote || trip.price_note) && (
                  <p className="text-[10px] text-white/35 flex items-start gap-1 leading-snug m-0">
                    <Info size={9} className="mt-0.5 flex-shrink-0" /> {trip.priceNote || trip.price_note}
                  </p>
                )}
              </div>

              {/* organiser — SECOND */}
              <div className="bg-white/5 rounded-2xl border border-white/[0.08] p-4">
                <div className="text-[9px] text-white/35 tracking-[0.08em] uppercase mb-2.5">Trip organiser</div>
                <div className="flex items-center gap-2.5 mb-2.5">
                  <Avatar name={trip.chief?.name} size={40} />
                  <div>
                    <div className="text-[13px] font-bold text-white">{trip.chief?.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex items-center gap-1">
                        <Star size={10} color="#fbbf24" fill="#fbbf24" />
                        <span className="text-[11px] text-white/35">
                          {trip.chief?.trips ?? 0} trip{(trip.chief?.trips ?? 0) !== 1 ? "s" : ""} hosted
                        </span>
                      </div>
                      <div className="flex items-center gap-[3px]">
                        <TrendingUp size={10} color="#FF6B35" />
                        <span className="text-[11px] font-bold text-[#FF6B35]">{trip.chief?.karma ?? 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onAskOrganizer?.(trip.chief?.id)}
                  className="w-full py-[9px] rounded-[10px] border border-white/15 bg-transparent text-white/70 text-[12px] font-semibold cursor-pointer flex items-center justify-center gap-1.5 hover:border-[#FF6B35]/40 hover:text-white transition-colors">
                  <Send size={13} /> Ask organiser
                </button>
              </div>

              {/* spots grid */}
              <div className="bg-white/5 rounded-2xl border border-white/[0.08] p-4">
                <div className="text-[9px] text-white/35 tracking-[0.08em] uppercase mb-2">Spots</div>
                <div className="flex gap-1 flex-wrap mb-2">
                  {Array.from({ length: trip.spotsTotal }).map((_, i) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded-[4px]"
                      style={{
                        background: i < trip.spotsFilled ? "#FF6B35" : "rgba(255,255,255,0.1)",
                        border: `1px solid ${i < trip.spotsFilled ? "rgba(255,107,53,0.5)" : "rgba(255,255,255,0.08)"}`,
                      }}
                    />
                  ))}
                </div>
                <div className="text-[11px] text-white/45">{trip.spotsFilled} of {trip.spotsTotal} spots filled</div>
              </div>

              {/* CTA + save + share */}
              <div className="flex gap-2">
                {joinState === "none" && (
                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="flex-1 py-[13px] rounded-xl text-[13px] font-bold cursor-pointer transition-all duration-200 text-white border-none"
                    style={{
                      background: "linear-gradient(135deg,#FF6B35,#ff8c5a)",
                      boxShadow: "0 4px 16px rgba(255,107,53,0.3)",
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
                  className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center cursor-pointer transition-all duration-200"
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
                  className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center cursor-pointer transition-all duration-200 bg-white/[0.07] text-white/50 hover:bg-white/[0.12]"
                  style={{ border: "1.5px solid rgba(255,255,255,0.1)" }}
                >
                  <Share2 size={16} />
                </button>
              </div>
              {sharing && <ShareToast trip={trip} onClose={() => setSharing(false)} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
