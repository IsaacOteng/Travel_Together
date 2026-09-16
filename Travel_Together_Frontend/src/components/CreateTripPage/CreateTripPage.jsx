import { useState, useCallback, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { EMPTY_STOP } from './constants.js';
import Step1 from './Step1.jsx';
import Step2 from './Step2.jsx';
import Step3 from './Step3.jsx';
import Step4 from './Step4.jsx';
import SuccessScreen from './SuccessScreen.jsx';
import { StepRail } from './uiComponents.jsx';
import ThemeToggle from "../shared/ThemeToggle.jsx";
import { officialLogo } from "../../assets/logos";

const STEPS = [
  { title: "The basics",  sub: "Name, destination, photos and what you'll do" },
  { title: "Logistics",   sub: "Dates, group size and what it costs"          },
  { title: "Itinerary",   sub: "Stops along the way — optional"               },
  { title: "Review",      sub: "Check it over, then publish"                  },
];

/* Creating a trip is real work — five photos, a description, dates, pricing
   and a list of stops. It used to happen inside a 560px modal with its own
   scrollbar. /create-trip is already a route, so this is now an actual page:
   a persistent rail on the left showing all four steps and how far you've
   got, and the form given room on the right. */
export default function CreateTripPage({ onClose, onGoToDashboard }) {
  const [step,      setStep]      = useState(1);
  const [furthest,  setFurthest]  = useState(1);
  const [form,      setForm]      = useState({ stops: [{ ...EMPTY_STOP }], tags: [], priceCovers: [], images: [] });
  const [done,      setDone]      = useState(false);
  const [createdId, setCreatedId] = useState(null);
  const topRef = useRef(null);

  const patch = useCallback(u => setForm(p => ({ ...p, ...u })), []);

  const goTo = useCallback((n) => {
    setStep(n);
    setFurthest(f => Math.max(f, n));
  }, []);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  if (done) {
    return (
      <div className="min-h-screen bg-ground font-sans">
        <div className="tt-shell block py-12">
          <div className="mx-auto max-w-140">
            <SuccessScreen
              form={form}
              onGoToDashboard={() => onGoToDashboard(createdId)}
              onDiscover={onClose}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ground font-sans">
      <style>{`
        input[type=date]::-webkit-calendar-picker-indicator,
        input[type=time]::-webkit-calendar-picker-indicator { opacity:.5; cursor:pointer; }
        select option { background: var(--tt-surface); color: var(--tt-ink); }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; }
      `}</style>

      <header className="sticky top-0 z-50 border-b border-line bg-ground/95 backdrop-blur-md">
        <div className="tt-shell flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src={officialLogo} alt="" className="h-8 w-8"
              onError={e => { e.target.style.display = "none"; }} />
            <span className="font-display text-[17px] font-semibold text-ink">Create a trip</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={onClose}
              aria-label="Discard and leave"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink-mute transition-colors hover:border-accent hover:text-accent"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </header>

      <div ref={topRef} className="tt-shell flex flex-col gap-8 py-8 lg:flex-row lg:items-start lg:gap-12">
        <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:w-67.5">
          <StepRail steps={STEPS} current={step} furthest={furthest} onJump={goTo} />
        </aside>

        <main className="min-w-0 flex-1">
          <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
            {step === 1 ? <Step1 form={form} patch={patch} onNext={() => goTo(2)} />
            : step === 2 ? <Step2 form={form} patch={patch} onNext={() => goTo(3)} onBack={() => setStep(1)} />
            : step === 3 ? <Step3 form={form} patch={patch} onNext={() => goTo(4)} onBack={() => setStep(2)} />
            :              <Step4 form={form} onBack={() => setStep(3)} onPublish={id => { setCreatedId(id); setDone(true); }} />
            }
          </div>
        </main>
      </div>
    </div>
  );
}
