import { ArrowRight, Zap, Compass } from "lucide-react";
import { Reveal } from "./uiComponents.jsx";

export default function CTABanner({ onGetStarted, onBrowse }) {
  return (
    <section className="py-24 bg-[#071422] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(255,107,53,0.12) 0%, transparent 70%)", animation: "pulseOrb 5s ease-in-out infinite" }} />
      </div>

      <Reveal className="relative max-w-[720px] mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-[#FF6B35]/15 border border-[#FF6B35]/30 rounded-full px-4 py-2 mb-6">
          <Zap size={13} className="text-[#FF6B35]" fill="#FF6B35" />
          <span className="text-[11px] font-bold text-[#FF6B35] tracking-widest uppercase">Free to join</span>
        </div>
        <h2 className="text-[48px] md:text-[58px] font-light text-white font-serif tracking-tight leading-[1.05] mb-5">
          Your next adventure<br />is waiting for you.
        </h2>
        <p className="text-[16px] text-white/40 leading-relaxed mb-8 max-w-[440px] mx-auto">
          Join thousands of travellers already discovering Ghana together. Create your profile in under 2 minutes.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={onGetStarted}
            className="flex items-center justify-center gap-2 bg-[#FF6B35] text-white text-[15px] font-bold px-8 py-4 rounded-2xl hover:bg-[#e55c28] transition-all shadow-[0_8px_28px_rgba(255,107,53,0.4)] hover:-translate-y-0.5 border-none cursor-pointer">
            Create free account <ArrowRight size={16} />
          </button>
          <button onClick={onBrowse}
            className="flex items-center justify-center gap-2 bg-white/[0.06] border border-white/15 text-white text-[15px] font-semibold px-8 py-4 rounded-2xl hover:bg-white/12 hover:border-white/25 transition-all cursor-pointer hover:-translate-y-0.5">
            <Compass size={16} /> Browse trips first
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 mt-8">
          <div className="flex -space-x-2">
            {["#FF6B35","#4ade80","#a855f7","#0ea5e9","#f43f5e"].map((c, i) => (
              <div key={i} className="w-7 h-7 rounded-full border-2 border-[#071422] flex items-center justify-center text-[9px] font-bold text-white"
                style={{ background: c }}>
                {["A","K","E","Y","J"][i]}
              </div>
            ))}
          </div>
          <span className="text-[12px] text-white/40">
            <span className="text-white/70 font-semibold">2,400+</span> trips organised this year
          </span>
        </div>
      </Reveal>
    </section>
  );
}
