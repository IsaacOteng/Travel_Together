import { useState, useRef, useCallback, useEffect } from "react";
import { Trash2 } from "lucide-react";

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
    <div className="flex justify-center w-full my-2">
      <div className={`max-w-[80%] rounded-2xl overflow-hidden text-[12px]
        ${isSOS
          ? "bg-red-900/30 border border-red-500/40 shadow-[0_0_20px_rgba(244,63,94,0.15)]"
          : "bg-white/[0.06] border border-white/[0.08]"}`}>
        <div className="px-4 py-3 leading-relaxed text-center text-white/80 whitespace-pre-line">
          {textBeforeUrl}
        </div>
        {mapRef && (
          <a
            href={mapRef.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 bg-black/30 hover:bg-black/50 transition-colors border-t border-red-500/20 no-underline"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-bold text-white truncate">View location on Google Maps</div>
              <div className="text-[10px] text-white/40 mt-0.5 truncate">{mapRef.lat.toFixed(5)}, {mapRef.lng.toFixed(5)}</div>
            </div>
            <div className="text-[10px] font-bold text-red-400 flex-shrink-0">Open →</div>
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
      <div className={`px-4 py-2.5 rounded-2xl text-[12px] italic select-none border
        ${isMe
          ? "bg-[#FF6B35]/10 border-[#FF6B35]/20 text-white/40 rounded-br-sm"
          : "bg-white/[0.04] border-white/[0.07] text-white/35 rounded-bl-sm"}`}>
        [this message was deleted]
      </div>
    );
  }

  const isImage = msg.messageType === "image" && msg.mediaUrl;
  if (!isImage && !msg.text) return null;

  const deleteBtn = canDelete && (
    <button
      onPointerDown={doDelete}
      title="Delete message"
      className={`flex-shrink-0 w-7 h-7 rounded-full bg-[#0d1b2a] border border-red-500/40
        flex items-center justify-center cursor-pointer
        hover:bg-red-500/25 active:bg-red-500/40 shadow-lg
        transition-all duration-150
        ${showDelete ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"}`}
    >
      <Trash2 size={11} className="text-red-400" />
    </button>
  );

  return (
    <div
      className={`flex items-center gap-2 max-w-[68%]
        ${isMe ? "flex-row-reverse" : "flex-row"}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={cancelLp}
      onTouchMove={cancelLp}
      onTouchCancel={cancelLp}
    >
      <div className={`relative w-fit min-w-0`}>
        {isImage
          ? <div className={`overflow-hidden rounded-2xl ${isMe ? "rounded-br-sm" : "rounded-bl-sm"}`}>
              <img
                src={msg.mediaUrl}
                alt=""
                className="block max-w-[220px] max-h-[280px] w-auto h-auto object-cover"
              />
            </div>
          : <div className={`px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed break-words
              ${isMe
                ? "bg-[#FF6B35] text-white rounded-br-sm"
                : "bg-[#132032] text-white/85 rounded-bl-sm border border-white/[0.06]"}`}>
              {renderTextWithLinks(msg.text)}
            </div>
        }
      </div>
      {deleteBtn}
    </div>
  );
}
