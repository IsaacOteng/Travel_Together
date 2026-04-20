import { useState, useEffect } from "react";
import {
  MapPin, Calendar, Users, CheckCircle, ArrowRight,
  Crown, Compass, ChevronRight, Shield, Bell,
} from "lucide-react";

/* ─── MOCK DATA ─────────────────────────── */
const TRIP = {
  name:       "Mount Afadja Expedition",
  destination:"Mount Afadja, Volta Region",
  dateStart:  "May 6, 2026",
  dateEnd:    "May 8, 2026",
  cover:      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
  chief: {
    name:   "Lanaee Monez",
    karma:  612,
    trips:  12,
    avatar: "bg-[#FF6B35]",
  },
  members:    8,
  spotsTotal: 10,
  meetingPoint: "Dansoman, Accra",
};

const STEPS = [
  { icon: Bell,    text: "Turn on notifications so you don't miss trip updates" },
  { icon: Shield,  text: "Add an emergency contact in Settings for your safety"  },
  { icon: MapPin,  text: "Allow location access when prompted — it powers safety features" },
];

/* ─── CONFETTI BURST ──────────────────────── */
function Confetti() {
  const pieces = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    color: ["#FF6B35","#4ade80","#60a5fa","#fbbf24","#a855f7","#f43f5e"][i % 6],
    left:  `${10 + (i * 3.2) % 80}%`,
    delay: `${(i * 0.07).toFixed(2)}s`,
    size:  i % 3 === 0 ? 10 : i % 3 === 1 ? 7 : 5,
    rotate: `${(i * 47) % 360}deg`,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {pieces.map(p => (
        <div key={p.id}
          className="absolute top-0 rounded-sm opacity-0"
          style={{
            left: p.left,
            width: p.size,
            height: p.size * 1.6,
            background: p.color,
            transform: `rotate(${p.rotate})`,
            animation: `confettiFall 1.4s ease-out ${p.delay} forwards`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── ROOT ────────────────────────────────── */
export default function TripWelcome({ onEnterDashboard }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const initials = TRIP.chief.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#071422] font-sans flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      <style>{`
        @keyframes confettiFall {
          0%   { opacity: 1; transform: translateY(-10px) rotate(var(--r, 0deg)); }
          100% { opacity: 0; transform: translateY(100vh) rotate(calc(var(--r, 0deg) + 360deg)); }
        }
        @keyframes popIn     { from { opacity:0; transform:scale(.8);         } to { opacity:1; transform:scale(1);           } }
        @keyframes fadeUp    { from { opacity:0; transform:translateY(16px);  } to { opacity:1; transform:translateY(0);      } }
        @keyframes ringPulse { 0%,100% { box-shadow:0 0 0 0 rgba(74,222,128,.5); } 60% { box-shadow:0 0 0 14px rgba(74,222,128,0); } }
      `}</style>

      {/* confetti fires once on mount */}
      {visible && <Confetti />}

      {/* ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #FF6B35 0%, transparent 70%)" }} />

      <div className="relative w-full max-w-[440px] flex flex-col gap-4">

        {/* ── CHECK BADGE ── */}
        <div className="flex justify-center mb-2"
          style={{ animation: "popIn .5s cubic-bezier(.34,1.56,.64,1) both" }}>
          <div className="w-20 h-20 rounded-full bg-green-400/15 border-2 border-green-400/40 flex items-center justify-center"
            style={{ animation: "ringPulse 1.8s ease-in-out 3" }}>
            <CheckCircle size={38} className="text-green-400" strokeWidth={1.8} />
          </div>
        </div>

        {/* ── HEADLINE ── */}
        <div className="text-center" style={{ animation: "fadeUp .5s ease .15s both" }}>
          <p className="text-[11px] font-bold tracking-[.18em] uppercase text-green-400 mb-2">Request approved</p>
          <h1 className="text-[28px] font-light text-white font-serif tracking-tight leading-tight mb-2">
            You're in! Welcome<br />to the group.
          </h1>
          <p className="text-[14px] text-white/40 leading-relaxed">
            Your spot has been confirmed. Get ready for an amazing trip.
          </p>
        </div>

        {/* ── TRIP CARD ── */}
        <div className="bg-[#0d1b2a] border border-white/[0.08] rounded-2xl overflow-hidden"
          style={{ animation: "fadeUp .5s ease .25s both" }}>
          {/* cover */}
          <div className="h-[140px] relative overflow-hidden">
            <img src={TRIP.cover} alt={TRIP.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d1b2a] via-[#0d1b2a]/30 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4">
              <h2 className="text-[17px] font-bold text-white font-serif leading-tight">{TRIP.name}</h2>
            </div>
          </div>

          {/* meta */}
          <div className="p-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: MapPin,    text: TRIP.destination.split(",")[0] },
                { icon: Calendar,  text: `${TRIP.dateStart} – ${TRIP.dateEnd}` },
                { icon: Users,     text: `${TRIP.members}/${TRIP.spotsTotal} members` },
                { icon: MapPin,    text: `Meet at ${TRIP.meetingPoint}` },
              ].map((m, i) => (
                <div key={i} className="flex items-start gap-2 bg-white/[0.04] rounded-xl px-3 py-2">
                  <m.icon size={12} className="text-[#FF6B35]/70 flex-shrink-0 mt-0.5" />
                  <span className="text-[11px] text-white/55 leading-snug">{m.text}</span>
                </div>
              ))}
            </div>

            {/* organiser */}
            <div className="flex items-center gap-3 pt-1 border-t border-white/[0.06]">
              <div className={`w-9 h-9 ${TRIP.chief.avatar} rounded-full flex items-center justify-center text-[12px] font-bold text-white font-serif flex-shrink-0`}>
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-bold text-white/80">{TRIP.chief.name}</span>
                  <span className="text-[9px] font-bold bg-[#FF6B35]/20 text-[#FF6B35] px-1.5 py-px rounded-full inline-flex items-center gap-1">
                    <Crown size={8} /> Chief
                  </span>
                </div>
                <div className="text-[10px] text-white/35">{TRIP.chief.trips} trips · {TRIP.chief.karma} karma</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── NEXT STEPS ── */}
        <div className="bg-[#0d1b2a] border border-white/[0.07] rounded-2xl p-4"
          style={{ animation: "fadeUp .5s ease .35s both" }}>
          <p className="text-[10px] font-bold tracking-[.12em] uppercase text-white/30 mb-3">Before you go</p>
          <div className="flex flex-col gap-2.5">
            {STEPS.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#FF6B35]/10 border border-[#FF6B35]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <step.icon size={13} className="text-[#FF6B35]" />
                </div>
                <span className="text-[12px] text-white/50 leading-snug pt-1">{step.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA ── */}
        <div className="flex flex-col gap-2.5" style={{ animation: "fadeUp .5s ease .45s both" }}>
          <button
            onClick={onEnterDashboard}
            className="w-full flex items-center justify-center gap-2 bg-[#FF6B35] text-white text-[14px] font-bold py-3.5 rounded-2xl hover:bg-[#e55c28] transition-all shadow-[0_6px_20px_rgba(255,107,53,0.35)] hover:shadow-[0_8px_28px_rgba(255,107,53,0.45)] hover:-translate-y-0.5 cursor-pointer border-none">
            Go to group dashboard <ArrowRight size={16} />
          </button>
          <button
            onClick={onEnterDashboard}
            className="w-full py-3 text-[13px] text-white/40 font-medium hover:text-white/70 transition-colors cursor-pointer bg-transparent border-none">
            I'll check it out later
          </button>
        </div>

      </div>
    </div>
  );
}