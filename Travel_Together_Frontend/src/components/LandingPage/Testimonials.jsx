import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { Reveal, Avatar } from "./uiComponents.jsx";
import { TESTIMONIALS } from "./constants.js";

export default function Testimonials() {
  const [active, setActive] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setActive(a => (a + 1) % TESTIMONIALS.length);
        setAnimating(false);
      }, 300);
    }, 4500);
    return () => clearInterval(t);
  }, []);

  const goTo = (i) => {
    if (i === active) return;
    setAnimating(true);
    setTimeout(() => { setActive(i); setAnimating(false); }, 250);
  };

  return (
    <section className="py-24 bg-[#0d1b2a]">
      <div className="max-w-[1200px] mx-auto px-6">
        <Reveal className="text-center max-w-[480px] mx-auto mb-14">
          <p className="text-[11px] font-bold tracking-[.2em] uppercase text-[#FF6B35] mb-3">Real travellers</p>
          <h2 className="text-[42px] font-light text-white font-serif tracking-tight leading-[1.1]">
            Don't take our<br />word for it.
          </h2>
        </Reveal>

        <div className="hidden md:grid grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.1}>
              <div className="bg-[#071422] border border-white/[0.07] rounded-2xl p-6 hover:border-[#FF6B35]/25 transition-all duration-300 hover:-translate-y-1 h-full">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, j) => <Star key={j} size={13} className="text-[#FF6B35]" fill="#FF6B35" />)}
                </div>
                <p className="text-[14px] text-white/65 leading-[1.8] mb-5 font-light italic">"{t.quote}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
                  <Avatar name={t.name} color={t.color} size="w-9 h-9" />
                  <div>
                    <div className="text-[13px] font-bold text-white">{t.name}</div>
                    <div className="text-[10px] text-white/35">{t.role}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="md:hidden">
          <div
            className="bg-[#071422] border border-white/[0.07] rounded-2xl p-6 transition-opacity duration-300"
            style={{ opacity: animating ? 0 : 1 }}>
            <div className="flex gap-0.5 mb-4">
              {[...Array(5)].map((_, j) => <Star key={j} size={13} fill="#FF6B35" className="text-[#FF6B35]" />)}
            </div>
            <p className="text-[14px] text-white/65 leading-[1.8] mb-5 font-light italic">
              "{TESTIMONIALS[active].quote}"
            </p>
            <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
              <Avatar name={TESTIMONIALS[active].name} color={TESTIMONIALS[active].color} size="w-9 h-9" />
              <div>
                <div className="text-[13px] font-bold text-white">{TESTIMONIALS[active].name}</div>
                <div className="text-[10px] text-white/35">{TESTIMONIALS[active].role}</div>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-2 mt-5">
            {TESTIMONIALS.map((_, i) => (
              <button key={i} onClick={() => goTo(i)}
                className="rounded-full transition-all duration-300 border-none cursor-pointer"
                style={{ width: i === active ? 20 : 8, height: 8, background: i === active ? "#FF6B35" : "rgba(255,255,255,0.2)" }} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
