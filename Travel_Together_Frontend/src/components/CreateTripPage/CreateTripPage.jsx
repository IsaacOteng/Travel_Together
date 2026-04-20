import { useState, useCallback, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { EMPTY_STOP } from './constants.js';
import Step1 from './Step1.jsx';
import Step2 from './Step2.jsx';
import Step3 from './Step3.jsx';
import Step4 from './Step4.jsx';
import SuccessScreen from './SuccessScreen.jsx';

/* ══════════════════════════════════════════
   ROOT — MODAL
══════════════════════════════════════════ */
export default function CreateTripPage({ onClose, onGoToDashboard }) {
  const [step,      setStep]      = useState(1);
  const [form,      setForm]      = useState({ stops: [{ ...EMPTY_STOP }], tags: [], priceCovers: [], images: [] });
  const [done,      setDone]      = useState(false);
  const [createdId, setCreatedId] = useState(null);
  const scrollRef = useRef(null);

  const patch = useCallback(u => setForm(p => ({ ...p, ...u })), []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  return (
    <div
      className="fixed inset-0 z-[3000] bg-[#071422] flex items-center justify-center p-5"
      style={{ animation: "fadeUp .2s ease", backgroundImage: "linear-gradient(180deg,rgba(255,107,53,0.06) 0%,transparent 40%)" }}
    >
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes popIn  { from{opacity:0;transform:scale(.72)} to{opacity:1;transform:scale(1)} }
        input[type=date]::-webkit-calendar-picker-indicator,
        input[type=time]::-webkit-calendar-picker-indicator { filter:invert(1) opacity(0.4); cursor:pointer; }
        select option { background:#0d1b2a; color:#fff; }
        ::placeholder { color:rgba(255,255,255,0.25) !important; }
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:99px}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
      `}</style>

      <div
        ref={scrollRef}
        className="w-full max-w-[560px] max-h-[92vh] bg-[#071422] rounded-[24px] border-[1.5px] border-white/[0.08] overflow-y-auto shadow-[0_24px_80px_rgba(0,0,0,0.6)] flex flex-col"
      >
        {/* Top bar */}
        {!done && (
          <div className="sticky top-0 z-10 bg-[rgba(7,20,34,0.97)] backdrop-blur-[12px] border-b border-white/[0.06] flex items-center justify-between px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <img
                src="/src/assets/official_logo_nobg.png" alt="logo"
                className="w-[30px] h-[30px]"
                onError={e => { e.target.style.display = "none"; }}
              />
              <span className="text-[13px] font-bold text-white tracking-[-0.2px]">New Trip</span>
            </div>
            <div className="flex items-center gap-[5px]">
              {[1,2,3,4].map(s => (
                <div key={s} className="rounded-full transition-all duration-300" style={{
                  width:      s === step ? 20 : 6,
                  height:     6,
                  background: s === step ? "#FF6B35" : s < step ? "rgba(255,107,53,0.4)" : "rgba(255,255,255,0.15)",
                }} />
              ))}
            </div>
            <button
              onClick={onClose}
              className="w-[30px] h-[30px] rounded-full bg-white/[0.07] border border-white/10 flex items-center justify-center cursor-pointer text-white/50 hover:bg-white/15 hover:text-white/80 transition-all"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className={`${done ? "px-6 py-8" : "px-6 pt-7 pb-8"} flex-1`}>
          {done        ? <SuccessScreen form={form} onGoToDashboard={() => onGoToDashboard(createdId)} onDiscover={onClose} />
          : step === 1 ? <Step1 form={form} patch={patch} onNext={() => setStep(2)} />
          : step === 2 ? <Step2 form={form} patch={patch} onNext={() => setStep(3)} onBack={() => setStep(1)} />
          : step === 3 ? <Step3 form={form} patch={patch} onNext={() => setStep(4)} onBack={() => setStep(2)} />
          :              <Step4 form={form} onBack={() => setStep(3)} onPublish={id => { setCreatedId(id); setDone(true); }} onDraft={onClose} />
          }
        </div>
      </div>
    </div>
  );
}