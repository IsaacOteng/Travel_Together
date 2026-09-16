import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { X, UserCog } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

/* ────────────────────────────────────────────────────────────────
   OnboardingGateModal shown when an incomplete user triggers
   a gated action (join trip, open chat, create trip)
──────────────────────────────────────────────────────────────── */
function OnboardingGateModal({ onClose }) {
  const navigate = useNavigate();

  const goSetup = () => {
    onClose();
    navigate("/onboarding");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", animation: "ttFadeIn .18s ease" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-sm rounded-3xl border border-line bg-surface p-7"
        style={{ boxShadow: "0 24px 64px var(--tt-shadow-lg)", animation: "ttDialogIn .22s cubic-bezier(0.34,1.4,0.64,1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink-mute transition-colors hover:border-accent hover:text-accent"
        >
          <X size={15} />
        </button>

        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <UserCog size={22} strokeWidth={1.8} />
        </span>

        <h2 className="m-0 mt-5 font-display text-[20px] font-semibold leading-tight text-ink">
          Finish setting up your profile
        </h2>
        <p className="m-0 mb-6 mt-2.5 text-[14px] leading-relaxed text-ink-soft">
          Complete your travel profile to join trips, send messages and connect
          with other travellers. It takes about two minutes.
        </p>

        <button
          type="button"
          onClick={goSetup}
          className="w-full cursor-pointer rounded-full border-none bg-accent py-3.5 text-[14.5px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
        >
          Complete my profile
        </button>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full cursor-pointer border-none bg-transparent py-1 text-[13px] text-ink-mute transition-colors hover:text-ink"
        >
          Maybe later
        </button>
      </div>

    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   useOnboardingGate — returns:
     requireOnboarding(fn) — runs fn() if complete, else shows gate
     GateModal             — render this somewhere in the tree
──────────────────────────────────────────────────────────────── */
export function useOnboardingGate() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const requireOnboarding = useCallback((fn) => {
    if (!user) { setOpen(true); return; }
    if (!user.onboarding_complete) { setOpen(true); return; }
    fn();
  }, [user]);

  const GateModal = open ? <OnboardingGateModal onClose={() => setOpen(false)} /> : null;

  return { requireOnboarding, GateModal };
}
