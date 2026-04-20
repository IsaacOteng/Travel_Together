import { useRef } from "react";
import { ArrowLeft, Heart, Share2, ChevronLeft, ChevronRight, Play } from "lucide-react";

export default function SlideHero({ trip, activeImg, onPrev, onNext, onSetImg, onClose, onSave, onShare, height = 300, showTitle = false, hideArrows = false }) {
  const cur = trip.media?.[activeImg] || trip.media?.[0] || null;
  const touchX = useRef(null);

  const handleTouchStart = e => { touchX.current = e.touches[0].clientX; };
  const handleTouchEnd   = e => {
    if (touchX.current === null) return;
    const diff = touchX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 45) diff > 0 ? onNext() : onPrev();
    touchX.current = null;
  };

  return (
    <div>
      <div
        className="relative overflow-hidden"
        style={{ height }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {!cur ? (
          <div className="w-full h-full bg-[#0a1628]" />
        ) : cur.type === "video" ? (
          <video src={cur.url} controls className="w-full h-full object-cover block" />
        ) : (
          <img src={cur.url} alt={trip.title} className="w-full h-full object-cover block" />
        )}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(180deg,rgba(0,0,0,0.2) 0%,rgba(13,27,42,0.5) 100%)" }}
        />

        {/* back button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 w-[38px] h-[38px] rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center cursor-pointer text-white"
        >
          <ArrowLeft size={18} />
        </button>

        {/* save + share overlay (top-right) */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={() => onSave(trip.id)}
            className="w-[38px] h-[38px] rounded-full backdrop-blur-md border border-white/20 flex items-center justify-center cursor-pointer text-white transition-colors duration-200"
            style={{ background: trip.saved ? "#FF6B35" : "rgba(255,255,255,0.15)" }}
          >
            <Heart size={16} fill={trip.saved ? "#fff" : "none"} />
          </button>
          <button
            onClick={() => onShare(trip)}
            className="w-[38px] h-[38px] rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center cursor-pointer text-white"
          >
            <Share2 size={16} />
          </button>
        </div>

        {/* prev / next — hidden on mobile when hideArrows=true */}
        {!hideArrows && trip.media.length > 1 && (
          <>
            <button
              onClick={onPrev}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/45 backdrop-blur-md border-none flex items-center justify-center cursor-pointer text-white"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={onNext}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/45 backdrop-blur-md border-none flex items-center justify-center cursor-pointer text-white"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}

        {showTitle && (
          <div className="absolute bottom-0 left-0 right-0 px-4 py-2.5">
            <h2 className="m-0 text-xl font-light text-white font-serif tracking-[-0.4px]">
              {trip.title}
            </h2>
          </div>
        )}
      </div>

      {/* thumbnail strip */}
      {trip.media.length > 1 && (
        <div className="bg-[#0a1622] py-2.5 px-4 flex gap-2 justify-center">
          {trip.media.map((m, i) => (
            <div
              key={i}
              onClick={() => onSetImg(i)}
              className="h-[42px] rounded-[9px] overflow-hidden cursor-pointer transition-all duration-200 flex-shrink-0 bg-black"
              style={{
                width: i === activeImg ? 70 : 54,
                border: i === activeImg ? "2px solid #FF6B35" : "2px solid rgba(255,255,255,0.12)",
                opacity: i === activeImg ? 1 : 0.5,
              }}
            >
              {m.type === "video" ? (
                <div className="w-full h-full flex items-center justify-center bg-[#1a1a2e]">
                  <Play size={12} color="#FF6B35" fill="#FF6B35" />
                </div>
              ) : (
                <img src={m.url} alt="" className="w-full h-full object-cover" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}