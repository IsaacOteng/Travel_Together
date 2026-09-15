import { ArrowUpRight } from "lucide-react";
import { Reveal, Eyebrow } from "./uiComponents.jsx";
import { DESTINATIONS } from "./constants.js";

export default function Destinations({ onBrowse }) {
  return (
    <section id="destinations" className="bg-ground py-24">
      <div className="mx-auto max-w-[1180px] px-6">
        <Reveal className="mb-14 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-[460px]">
            <Eyebrow className="mb-5">Popular right now</Eyebrow>
            <h2 className="font-display text-[clamp(34px,4.2vw,50px)] font-semibold leading-[1.05] text-ink">
              Where everyone is going.
            </h2>
          </div>
          <button
            onClick={onBrowse}
            className="flex flex-shrink-0 cursor-pointer items-center gap-1.5 self-start border-none bg-transparent p-0 text-[14px] font-semibold text-accent transition-colors hover:text-accent-hover sm:self-auto"
          >
            All destinations <ArrowUpRight size={15} />
          </button>
        </Reveal>

        <div className="grid grid-cols-2 gap-x-5 gap-y-9 lg:grid-cols-4">
          {DESTINATIONS.map((d, i) => (
            <Reveal key={d.name} delay={i * 0.08}>
              <button
                onClick={onBrowse}
                className="group block w-full cursor-pointer border-none bg-transparent p-0 text-left"
              >
                <div className="overflow-hidden rounded-2xl border border-line bg-surface-alt [aspect-ratio:4/5]">
                  <img
                    src={d.img}
                    alt={d.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="mt-4 flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-[18px] font-semibold text-ink transition-colors group-hover:text-accent">
                    {d.name}
                  </h3>
                  <span className="flex-shrink-0 text-[12px] text-ink-mute">
                    {d.trips} trips
                  </span>
                </div>
                <p className="mt-0.5 text-[13px] text-ink-mute">{d.region}</p>
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
