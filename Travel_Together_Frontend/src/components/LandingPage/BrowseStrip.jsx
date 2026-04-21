import { Compass } from "lucide-react";
import { useInView } from "./hooks.js";

export default function BrowseStrip({ onBrowse }) {
  const [ref, inView] = useInView(0.3);
  return (
    <section ref={ref} className="py-14 bg-[#071422] border-y border-white/[0.05]">
      <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div style={{ transition: "opacity .6s ease, transform .6s ease", opacity: inView ? 1 : 0, transform: inView ? "translateX(0)" : "translateX(-24px)" }}>
          <p className="text-[11px] font-bold tracking-[.2em] uppercase text-[#FF6B35] mb-1">No account needed</p>
          <h3 className="text-[26px] font-light text-white font-serif tracking-tight leading-[1.2]">
            Curious? Browse trips without signing up.
          </h3>
        </div>
        <div style={{ transition: "opacity .6s ease .15s, transform .6s ease .15s", opacity: inView ? 1 : 0, transform: inView ? "translateX(0)" : "translateX(24px)" }}>
          <button onClick={onBrowse}
            className="flex items-center gap-2.5 bg-white text-[#071422] font-bold text-[15px] px-7 py-4 rounded-2xl hover:bg-white/90 transition-all hover:-translate-y-0.5 shadow-[0_8px_28px_rgba(255,255,255,0.12)] border-none cursor-pointer whitespace-nowrap">
            <Compass size={18} /> Browse the app
          </button>
        </div>
      </div>
    </section>
  );
}
