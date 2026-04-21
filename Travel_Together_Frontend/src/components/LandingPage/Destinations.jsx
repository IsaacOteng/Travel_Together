import { MapPin, ArrowRight } from "lucide-react";
import { Reveal } from "./uiComponents.jsx";
import { DESTINATIONS } from "./constants.js";

export default function Destinations({ onBrowse }) {
  return (
    <section id="destinations" className="py-24 bg-[#071422]">
      <div className="max-w-[1200px] mx-auto px-6">
        <Reveal className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
          <div>
            <p className="text-[11px] font-bold tracking-[.2em] uppercase text-[#FF6B35] mb-3">Popular right now</p>
            <h2 className="text-[42px] font-light text-white font-serif tracking-tight leading-[1.1]">
              Where is everyone<br />going?
            </h2>
          </div>
          <button onClick={onBrowse}
            className="flex items-center gap-1.5 text-[13px] text-[#FF6B35] font-semibold hover:gap-3 transition-all flex-shrink-0 bg-transparent border-none cursor-pointer">
            Browse all trips <ArrowRight size={14} />
          </button>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {DESTINATIONS.map((dest, i) => (
            <Reveal key={dest.name} delay={i * 0.1}>
              <div
                className="group relative rounded-2xl overflow-hidden cursor-pointer hover:-translate-y-2 transition-all duration-400"
                onClick={onBrowse}>
                <div className="h-[280px] overflow-hidden">
                  <img src={dest.img} alt={dest.name}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-600" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#071422] via-[#071422]/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-[16px] font-bold text-white leading-tight">{dest.name}</div>
                      <div className="flex items-center gap-1 text-[11px] text-white/50 mt-0.5">
                        <MapPin size={9} /> {dest.region}
                      </div>
                    </div>
                    <div className="bg-[#FF6B35] rounded-xl px-2.5 py-1.5 text-center flex-shrink-0">
                      <div className="text-[14px] font-black text-white leading-none">{dest.trips}</div>
                      <div className="text-[8px] text-white/70 font-bold uppercase tracking-wide">trips</div>
                    </div>
                  </div>
                </div>
                <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-250">
                  <span className="bg-[#FF6B35] text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                    Explore →
                  </span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
