import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Lock, ArrowRight, LogIn } from "lucide-react";

/**
 * Shown whenever a guest (unauthenticated user) tries to access a feature
 * that requires an account. Offers Sign up and Log in links.
 *
 * Props:
 *   open     – boolean
 *   reason   – short string describing what the feature does, e.g. "Save trips you're interested in"
 *   onClose  – () => void
 */
export default function GuestDialog({ open, reason, onClose }) {
  const navigate = useNavigate();

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(8px)",
        animation: "ttFadeIn .18s ease",
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sign in required"
        className="w-full max-w-sm overflow-hidden rounded-3xl border border-line bg-surface text-center"
        style={{
          animation: "ttDialogIn .22s cubic-bezier(0.34,1.4,0.64,1)",
          boxShadow: "0 24px 64px var(--tt-shadow-lg)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="h-1 w-full bg-accent" />

        <div className="p-7 pb-6">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft">
            <Lock size={22} className="text-accent" />
          </div>

          <h3 className="m-0 mb-2 font-display text-[21px] font-semibold leading-tight text-ink">
            Join Travel Together
          </h3>
          <p className="mb-7 text-[14px] leading-relaxed text-ink-soft">
            {reason
              ? <>{reason}.<br />Create a free account or log in to continue.</>
              : <>Sign up or log in to access this feature and travel with verified groups across Ghana.</>
            }
          </p>

          <button
            onClick={() => { onClose(); navigate('/signup'); }}
            className="mb-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border-none bg-accent py-3.5 text-[14.5px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
          >
            Create free account <ArrowRight size={15} />
          </button>

          <button
            onClick={() => { onClose(); navigate('/signup'); }}
            className="mb-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-line bg-transparent py-3 text-[14px] font-medium text-ink transition-colors hover:border-accent hover:text-accent"
          >
            <LogIn size={15} /> Log in to existing account
          </button>

          <button
            onClick={onClose}
            className="w-full cursor-pointer border-none bg-transparent py-1 text-[12.5px] text-ink-mute transition-colors hover:text-ink"
          >
            Continue browsing
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
