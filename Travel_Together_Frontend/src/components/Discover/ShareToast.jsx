import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Check, Copy, MessageCircle, Mail, Share2, Link as LinkIcon } from "lucide-react";

/* Share sheet for a trip. Centred dialog on desktop, bottom sheet on phones.
   Copy-to-clipboard is the fallback, not the headline — most sharing here
   happens through WhatsApp, and on mobile the OS share sheet reaches
   everything the person actually has installed. */
export default function ShareToast({ trip, onClose }) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const link = `${window.location.origin}/trip/${trip.id}`;
  const message = `${trip.title} — ${trip.destination || "a trip on Travel Together"}`;

  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const copy = async () => {
    setCopyFailed(false);
    try {
      if (!navigator.clipboard) throw new Error("no clipboard api");
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // http:// on a LAN address has no clipboard API — tell the truth
      // rather than showing a success state that didn't happen.
      setCopyFailed(true);
    }
  };

  const targets = [
    {
      id: "whatsapp",
      label: "WhatsApp",
      icon: MessageCircle,
      href: `https://wa.me/?text=${encodeURIComponent(`${message}\n${link}`)}`,
    },
    {
      id: "x",
      label: "X",
      icon: Share2,
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(link)}`,
    },
    {
      id: "email",
      label: "Email",
      icon: Mail,
      href: `mailto:?subject=${encodeURIComponent(message)}&body=${encodeURIComponent(`I thought you'd like this trip:\n\n${link}`)}`,
    },
  ];

  const nativeShare = async () => {
    try {
      await navigator.share({ title: trip.title, text: message, url: link });
      onClose();
    } catch { /* the person dismissed the OS sheet */ }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[3000] flex items-end justify-center sm:items-center sm:p-4"
      style={{
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(6px)",
        animation: "ttFadeIn .18s ease",
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Share this trip"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-[420px] rounded-t-3xl border border-line bg-surface p-6 sm:rounded-3xl"
        style={{
          animation: "ttDialogIn .22s cubic-bezier(0.34,1.4,0.64,1)",
          boxShadow: "0 24px 64px var(--tt-shadow-lg)",
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="m-0 font-display text-[20px] font-semibold text-ink">
            Share this trip
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink-mute transition-colors hover:border-accent hover:text-accent"
          >
            <X size={15} />
          </button>
        </div>

        {/* what you're actually sending */}
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-line bg-surface-alt p-3">
          {trip.media?.[0]?.url ? (
            <img
              src={trip.media[0].url}
              alt=""
              className="h-12 w-12 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <LinkIcon size={16} />
            </span>
          )}
          <div className="min-w-0">
            <p className="m-0 truncate text-[14px] font-semibold text-ink">{trip.title}</p>
            {trip.destination && (
              <p className="m-0 mt-0.5 truncate text-[12.5px] text-ink-mute">{trip.destination}</p>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2.5">
          {targets.map(t => (
            <a
              key={t.id}
              href={t.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface px-2 py-3.5 text-ink no-underline transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent"
            >
              <t.icon size={19} />
              <span className="text-[12px] font-medium">{t.label}</span>
            </a>
          ))}
        </div>

        {typeof navigator !== "undefined" && navigator.share && (
          <button
            onClick={nativeShare}
            className="mt-2.5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-line bg-surface py-3 text-[13.5px] font-medium text-ink transition-colors hover:border-accent hover:text-accent"
          >
            <Share2 size={15} /> More apps…
          </button>
        )}

        <div className="mt-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-mute">
            Or copy the link
          </p>
          <div className="flex items-center gap-2 rounded-full border border-line bg-surface-alt py-1.5 pl-4 pr-1.5">
            <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-mute">{link}</span>
            <button
              onClick={copy}
              className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border-none px-3.5 py-2 text-[12.5px] font-semibold transition-colors ${
                copied ? "bg-moss text-white" : "bg-accent text-accent-ink hover:bg-accent-hover"
              }`}
            >
              {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
            </button>
          </div>
          {copyFailed && (
            <p role="alert" className="mt-2 text-[12px] text-accent">
              Couldn&apos;t copy automatically — select the link above and copy it.
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
