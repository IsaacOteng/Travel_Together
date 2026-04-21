import { Reveal } from "./uiComponents.jsx";
import { FEATURES } from "./constants.js";

export default function Features() {
  return (
    <section id="features" className="py-24 bg-[#071422]">
      <div className="max-w-[1200px] mx-auto px-6">
        <Reveal className="max-w-[520px] mb-16">
          <p className="text-[11px] font-bold tracking-[.2em] uppercase text-[#FF6B35] mb-3">Everything you need</p>
          <h2 className="text-[42px] font-light text-white font-serif tracking-tight leading-[1.1] mb-4">
            Group travel,<br />done properly.
          </h2>
          <p className="text-[15px] text-white/40 leading-relaxed">
            Every feature is built around one idea — that travelling with others should be easier, safer, and more memorable than going alone.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.07}>
              <div
                className="group bg-[#0d1b2a] border border-white/[0.07] rounded-2xl p-6 hover:border-[var(--c)]/30 transition-all duration-300 hover:-translate-y-1.5 h-full"
                style={{ "--c": f.color }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
                  style={{ background: `${f.color}15`, border: `1px solid ${f.color}25` }}>
                  <f.icon size={19} color={f.color} />
                </div>
                <h3 className="text-[16px] font-bold text-white mb-2 group-hover:text-[var(--c)] transition-colors" style={{ "--c": f.color }}>
                  {f.title}
                </h3>
                <p className="text-[13px] text-white/45 leading-relaxed">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
