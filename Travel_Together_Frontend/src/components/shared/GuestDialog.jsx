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
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(10px)",
        animation: "guestFadeIn .18s ease",
      }}
      onClick={onClose}
    >
      <div
        className="bg-[#0d1b2a] border border-white/[0.12] rounded-2xl w-full max-w-sm text-center overflow-hidden"
        style={{ animation: "guestSlideUp .22s cubic-bezier(0.34,1.4,0.64,1)", boxShadow: "0 24px 64px rgba(0,0,0,0.65)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* top accent stripe */}
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg,#FF6B35,#ff8c5a)" }} />

        <div className="p-7 pb-6">
          <div className="w-14 h-14 rounded-full bg-[#FF6B35]/15 flex items-center justify-center mx-auto mb-5">
            <Lock size={24} color="#FF6B35" />
          </div>

          <h3 className="text-[19px] font-bold text-white mb-2 font-serif leading-tight">
            Join Travel Together
          </h3>
          <p className="text-[13px] text-white/50 leading-relaxed mb-7">
            {reason
              ? <>{reason}.<br />Create a free account or log in to continue.</>
              : <>Sign up or log in to access this feature and travel with verified groups across Ghana.</>
            }
          </p>

          {/* actions */}
          <button
            onClick={() => { onClose(); navigate('/signup'); }}
            className="w-full flex items-center justify-center gap-2 bg-[#FF6B35] text-white font-bold py-3.5 rounded-xl mb-3 hover:bg-[#e55c28] transition-all border-none cursor-pointer text-[14px] shadow-[0_4px_16px_rgba(255,107,53,0.4)]"
          >
            Create free account <ArrowRight size={15} />
          </button>

          <button
            onClick={() => { onClose(); navigate('/signup'); }}
            className="w-full flex items-center justify-center gap-2 bg-white/[0.06] border border-white/15 text-white/80 font-semibold py-3 rounded-xl hover:bg-white/10 transition-all cursor-pointer text-[13px] mb-4"
          >
            <LogIn size={15} /> Log in to existing account
          </button>

          <button
            onClick={onClose}
            className="w-full text-white/30 text-[12px] hover:text-white/55 transition-colors bg-transparent border-none cursor-pointer py-1"
          >
            Continue browsing
          </button>
        </div>
      </div>

      <style>{`
        @keyframes guestFadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes guestSlideUp  { from{opacity:0;transform:translateY(20px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
      `}</style>
    </div>,
    document.body
  );
}
