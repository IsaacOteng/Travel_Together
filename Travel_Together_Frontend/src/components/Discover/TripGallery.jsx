import { useRef } from "react";
import { ArrowLeft, Heart, Share2 } from "lucide-react";

/* Magazine-style gallery: one large frame with a thumbnail rail, rather than
   a full-bleed carousel you can only page through blindly. On mobile it stays
   swipeable, since there's no room for the rail. */
export default function TripGallery({
  media = [],
  title,
  activeImg,
  setActiveImg,
  saved,
  onSave,
  onShare,
  onBack,
  mobile,
}) {
  const touchX = useRef(null);

  const onTouchStart = e => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = e => {
    if (touchX.current === null || !media.length) return;
    const diff = touchX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 45) {
      setActiveImg(a => diff > 0
        ? (a + 1) % media.length
        : (a - 1 + media.length) % media.length);
    }
    touchX.current = null;
  };

  const roundBtn =
    "flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-line bg-surface/90 text-ink backdrop-blur-sm transition-colors hover:border-accent hover:text-accent";

  return (
    <div className="flex gap-3">
      <div
        className="relative min-w-0 flex-1 overflow-hidden rounded-3xl border border-line bg-surface-alt"
        style={{ height: mobile ? 260 : 440 }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {media.length > 0 && (
          <img
            src={media[activeImg]?.url}
            alt={title}
            className="h-full w-full object-cover"
            onError={e => { e.target.style.display = "none"; }}
          />
        )}

        <button onClick={onBack} aria-label="Back" className={`absolute left-4 top-4 ${roundBtn}`}>
          <ArrowLeft size={17} />
        </button>

        <div className="absolute right-4 top-4 flex gap-2">
          <button
            onClick={onSave}
            aria-label={saved ? "Remove from saved" : "Save this trip"}
            aria-pressed={saved}
            className={
              saved
                ? "flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-accent bg-accent text-accent-ink"
                : roundBtn
            }
          >
            <Heart size={16} fill={saved ? "currentColor" : "none"} />
          </button>
          <button onClick={onShare} aria-label="Share this trip" className={roundBtn}>
            <Share2 size={16} />
          </button>
        </div>

        {/* dots only where there's no thumbnail rail */}
        {mobile && media.length > 1 && (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
            {media.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                aria-label={`Image ${i + 1}`}
                className="cursor-pointer rounded-full border-none p-0 transition-all"
                style={{
                  width: i === activeImg ? 20 : 6,
                  height: 6,
                  background: i === activeImg ? "var(--tt-accent)" : "rgba(255,255,255,0.65)",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {!mobile && media.length > 1 && (
        <div
          className="scrollbar-none flex w-[112px] shrink-0 flex-col gap-3 overflow-y-auto"
          style={{ height: 440 }}
        >
          {media.map((m, i) => (
            <button
              key={i}
              onClick={() => setActiveImg(i)}
              aria-label={`View image ${i + 1}`}
              aria-current={i === activeImg}
              className={`h-[102px] shrink-0 cursor-pointer overflow-hidden rounded-2xl border-2 bg-surface-alt p-0 transition-colors ${
                i === activeImg ? "border-accent" : "border-line hover:border-accent/50"
              }`}
            >
              <img src={m.url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
