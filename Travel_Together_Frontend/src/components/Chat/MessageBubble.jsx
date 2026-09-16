import { useState, useRef, useCallback, useEffect } from "react";
import { Trash2, MapPin } from "lucide-react";

const URL_RE   = /(https?:\/\/[^\s]+)/g;
const URL_TEST = /^https?:\/\//;

export function renderTextWithLinks(text) {
  if (!text) return null;
  const parts = text.split(URL_RE);
  return parts.map((part, i) =>
    URL_TEST.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer"
          className="underline break-all opacity-90 hover:opacity-100"
          onClick={e => e.stopPropagation()}>{part}</a>
      : part
  );
}

export function extractMapsUrl(text) {
  if (!text) return null;
  const m = text.match(/https:\/\/www\.google\.com\/maps\?q=([-\d.]+),([-\d.]+)/);
  if (!m) return null;
  return { url: m[0], lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
}

export function SystemMessage({ msg }) {
  const isSOS  = msg.text?.startsWith("SOS ALERT:");
  const mapRef = isSOS ? extractMapsUrl(msg.text) : null;
  const textBeforeUrl = msg.text?.split(URL_RE)[0].trim();

  return (
    <div className="my-2 flex w-full justify-center">
      <div className={`max-w-[85%] overflow-hidden rounded-2xl text-[12.5px] ${
        isSOS
          ? "border-2 border-accent bg-accent-soft"
          : "border border-line bg-surface-alt"
      }`}>
        <div className={`whitespace-pre-line px-4 py-3 text-center leading-relaxed ${
          isSOS ? "font-semibold text-accent" : "text-ink-soft"
        }`}>
          {textBeforeUrl}
        </div>
        {mapRef && (
          <a
            href={mapRef.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 border-t border-accent/30 bg-surface px-4 py-3 no-underline transition-colors hover:bg-surface-alt"
            onClick={e => e.stopPropagation()}
          >
            <MapPin size={15} className="shrink-0 text-accent" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-semibold text-ink">
                View location on Google Maps
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-ink-mute">
                {mapRef.lat.toFixed(5)}, {mapRef.lng.toFixed(5)}
              </span>
            </span>
            <span className="shrink-0 text-[12px] font-semibold text-accent">Open →</span>
          </a>
        )}
      </div>
    </div>
  );
}

export default function MessageBubble({ msg, onDelete }) {
  const isMe      = msg.from === "me";
  const canDelete = isMe && !msg.isDeleted;

  const [hovered,     setHovered]     = useState(false);
  const [longPressed, setLongPressed] = useState(false);
  const lpTimer = useRef(null);

  const onTouchStart = useCallback(() => {
    if (!canDelete) return;
    lpTimer.current = setTimeout(() => setLongPressed(true), 600);
  }, [canDelete]);

  const cancelLp = useCallback(() => {
    clearTimeout(lpTimer.current);
  }, []);

  useEffect(() => () => clearTimeout(lpTimer.current), []);

  useEffect(() => {
    if (!longPressed) return;
    const dismiss = () => setLongPressed(false);
    document.addEventListener("touchstart", dismiss, { once: true, capture: true });
    return () => document.removeEventListener("touchstart", dismiss, { capture: true });
  }, [longPressed]);

  const showDelete = canDelete && (hovered || longPressed);

  const doDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(msg);
    setHovered(false);
    setLongPressed(false);
  };

  if (msg.isDeleted) {
    return (
      <div className={`select-none rounded-2xl border border-dashed border-line px-4 py-2.5 text-[12.5px] italic text-ink-mute ${
        isMe ? "rounded-br-sm" : "rounded-bl-sm"
      }`}>
        This message was deleted
      </div>
    );
  }

  const isImage = msg.messageType === "image" && msg.mediaUrl;
  if (!isImage && !msg.text) return null;

  const deleteBtn = canDelete && (
    <button
      onPointerDown={doDelete}
      title="Delete message"
      aria-label="Delete message"
      className={`flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-surface transition-all duration-150 hover:border-accent hover:text-accent ${
        showDelete ? "scale-100 opacity-100" : "pointer-events-none scale-75 opacity-0"
      }`}
    >
      <Trash2 size={12} className="text-ink-mute" />
    </button>
  );

  return (
    <div
      className={`flex max-w-[68%] items-center gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={cancelLp}
      onTouchMove={cancelLp}
      onTouchCancel={cancelLp}
    >
      <div className="relative w-fit min-w-0">
        {isImage
          ? <div className={`overflow-hidden rounded-2xl border border-line ${isMe ? "rounded-br-sm" : "rounded-bl-sm"}`}>
              <img
                src={msg.mediaUrl}
                alt=""
                className="block h-auto max-h-70 w-auto max-w-60 object-cover"
              />
            </div>
          : <div className={`wrap-break-word rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${
              isMe
                ? "rounded-br-sm bg-accent text-accent-ink"
                : "rounded-bl-sm border border-line bg-surface text-ink"
            }`}>
              {renderTextWithLinks(msg.text)}
            </div>
        }
      </div>
      {deleteBtn}
    </div>
  );
}
