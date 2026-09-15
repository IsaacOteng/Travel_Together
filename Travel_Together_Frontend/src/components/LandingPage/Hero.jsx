import { ArrowRight, ArrowUpRight } from "lucide-react";
import { HERO_IMAGE, HERO_CARDS } from "./constants.js";

/* Full-bleed photographic hero. Everything above the fold sits on the
   photograph, so type here is always light regardless of theme — the
   cream/ink palette resumes at the section below. */
export default function Hero({ onGetStarted, onBrowse }) {
  return (
    <section
      id="top"
      className="relative flex min-h-[92vh] flex-col justify-end overflow-hidden"
    >
      <img
        src={HERO_IMAGE}
        alt="Travellers crossing open savannah at sunset"
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Two scrims: one lifts the whole lower half, one darkens the left
          edge so the headline holds up whatever the photo is doing. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/15 to-transparent" />

      <div className="relative mx-auto w-full max-w-[1180px] px-6 pb-14 pt-32 sm:pb-16">
        <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/75">
          <span className="h-px w-7 bg-white/40" aria-hidden="true" />
          Group travel · Ghana
        </p>

        <h1
          className="mt-6 max-w-[15ch] font-display font-semibold leading-[0.92] text-white"
          style={{ fontSize: "clamp(48px, 8vw, 104px)" }}
        >
          Go far.
          <br />
          Go together.
        </h1>

        <div className="mt-12 flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          {/* left — social proof, then the two live trips */}
          <div>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2.5">
                {["A", "K", "E", "Y"].map(i => (
                  <span
                    key={i}
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/80 bg-black/40 text-[12px] font-semibold text-white backdrop-blur-sm"
                  >
                    {i}
                  </span>
                ))}
              </div>
              <div className="leading-tight">
                <div className="font-display text-[19px] font-semibold text-white">
                  18,000+
                </div>
                <div className="text-[11.5px] uppercase tracking-[0.14em] text-white/60">
                  travellers
                </div>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              {HERO_CARDS.map(c => (
                <button
                  key={c.name}
                  onClick={onBrowse}
                  className="group flex w-[218px] cursor-pointer items-center gap-3 rounded-2xl border border-white/15 bg-black/35 p-2.5 text-left backdrop-blur-md transition-colors hover:border-white/35 hover:bg-black/50"
                >
                  <img
                    src={c.img}
                    alt=""
                    loading="lazy"
                    className="h-12 w-12 flex-shrink-0 rounded-xl object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold text-white">
                      {c.name}
                    </span>
                    <span className="block truncate text-[11.5px] text-white/60">
                      {c.meta}
                    </span>
                  </span>
                  <ArrowUpRight
                    size={15}
                    className="mr-1 flex-shrink-0 text-white/50 transition-colors group-hover:text-white"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* right — the pitch and the way in */}
          <div className="max-w-[380px] lg:pb-1">
            <p className="text-[16px] leading-[1.7] text-white/80">
              Find verified travel groups heading your way. Plan it together,
              keep an eye on each other on the road, and come home with people
              worth travelling with again.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={onGetStarted}
                className="flex cursor-pointer items-center gap-2 rounded-full border-none bg-accent px-7 py-3.5 text-[15px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
              >
                Start free <ArrowRight size={16} />
              </button>
              <button
                onClick={onBrowse}
                className="cursor-pointer rounded-full border border-white/35 bg-white/5 px-7 py-3.5 text-[15px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/15"
              >
                Browse trips
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
