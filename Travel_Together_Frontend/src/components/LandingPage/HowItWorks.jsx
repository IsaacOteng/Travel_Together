import { Reveal } from "./uiComponents.jsx";
import { HOW_IT_WORKS } from "./constants.js";

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-[#0d1b2a]">
      <div className="max-w-[1200px] mx-auto px-6">
        <Reveal className="text-center max-w-[480px] mx-auto mb-16">
          <p className="text-[11px] font-bold tracking-[.2em] uppercase text-[#FF6B35] mb-3">Simple process</p>
          <h2 className="text-[42px] font-light text-white font-serif tracking-tight leading-[1.1]">
            From signup to<br />summit in 4 steps.
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-[#FF6B35]/0 via-[#FF6B35]/30 to-[#FF6B35]/0" />
          {HOW_IT_WORKS.map((step, i) => (
            <Reveal key={step.num} delay={i * 0.1}>
              <div className="flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF6B35] to-[#ff8c5a] flex items-center justify-center flex-shrink-0 shadow-[0_6px_20px_rgba(255,107,53,0.35)]">
                    <span className="text-[13px] font-black text-white font-serif">{step.num}</span>
                  </div>
                </div>
                <h3 className="text-[16px] font-bold text-white mb-2">{step.title}</h3>
                <p className="text-[13px] text-white/40 leading-relaxed">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
