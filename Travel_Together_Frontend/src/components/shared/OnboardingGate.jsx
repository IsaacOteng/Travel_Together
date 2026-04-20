import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/* ────────────────────────────────────────────────────────────────
   OnboardingGateModal — shown when an incomplete user triggers
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
      style={{ background: "rgba(7,20,34,.55)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm p-7 relative"
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,.18)", animation: "popIn .2s ease both" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-300 hover:text-gray-500 transition text-xl leading-none cursor-pointer"
        >
          ×
        </button>

        <div className="text-3xl mb-3">🗺️</div>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1E3A5F", marginBottom: 6 }}>
          Finish setting up your profile
        </h2>
        <p style={{ fontSize: 13, color: "#5576a0", lineHeight: 1.6, marginBottom: 24 }}>
          Complete your travel profile to join trips, send messages, and connect with other travelers. It only takes 2 minutes.
        </p>

        <button
          type="button"
          onClick={goSetup}
          className="w-full py-3 rounded-xl text-white text-[14px] font-bold cursor-pointer"
          style={{ background: "linear-gradient(135deg,#FF6B35,#ff8c5a)", border: "none" }}
        >
          Complete my profile →
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-3 text-[12px] text-gray-400 hover:text-[#5576a0] transition cursor-pointer bg-transparent border-none"
        >
          Maybe later
        </button>
      </div>

      <style>{`@keyframes popIn { from { opacity:0; transform:scale(.88); } to { opacity:1; transform:scale(1); } }`}</style>
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
