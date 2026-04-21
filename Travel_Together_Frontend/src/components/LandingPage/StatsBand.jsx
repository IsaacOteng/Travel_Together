import { useInView } from "./hooks.js";
import { AnimatedCounter } from "./uiComponents.jsx";
import { STATS } from "./constants.js";

export default function StatsBand() {
  const [ref, inView] = useInView(0.3);
  return (
    <section ref={ref} className="bg-[#0d1b2a] border-y border-white/[0.06] py-10">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x divide-white/[0.07]">
          {STATS.map((s, i) => (
            <div key={s.label}
              className="flex flex-col items-center text-center px-6"
              style={{ transition: `opacity .6s ease ${i * 0.12}s, transform .6s ease ${i * 0.12}s`, opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(20px)" }}>
              <span className="text-[38px] font-black text-white font-serif leading-none mb-1.5">
                {inView ? <AnimatedCounter target={s.val} suffix={s.suffix} isDecimal={s.isDecimal} /> : "0"}
              </span>
              <span className="text-[11px] text-white/35 font-medium uppercase tracking-wider">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
