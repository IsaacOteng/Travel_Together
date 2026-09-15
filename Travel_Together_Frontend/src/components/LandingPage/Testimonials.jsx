import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Reveal, Eyebrow } from "./uiComponents.jsx";
import { TESTIMONIALS } from "./constants.js";

export default function Testimonials() {
  const [i, setI] = useState(0);
  const t = TESTIMONIALS[i];
  const move = step =>
    setI(v => (v + step + TESTIMONIALS.length) % TESTIMONIALS.length);

  return (
    <section className="border-y border-line bg-ground-alt py-24">
      <Reveal className="mx-auto max-w-[1180px] px-6">
        <Eyebrow className="mb-12">Real travellers</Eyebrow>

        <figure
          key={t.name}
          className="m-0 grid items-center gap-10 lg:grid-cols-[minmax(0,0.4fr)_minmax(0,1fr)] lg:gap-16"
          style={{ animation: "ttQuoteIn .45s ease both" }}
        >
          <img
            src={t.img}
            alt={t.name}
            loading="lazy"
            className="w-full max-w-[300px] rounded-3xl object-cover shadow-[0_18px_44px_var(--tt-shadow)] [aspect-ratio:4/5] lg:max-w-none"
          />

          <div>
            <blockquote className="m-0">
              <p className="font-display text-[clamp(22px,2.9vw,36px)] font-medium leading-[1.25] text-ink">
                “{t.quote}”
              </p>
            </blockquote>

            <figcaption className="mt-8 flex items-center gap-3">
              <span className="h-px w-8 bg-accent/50" aria-hidden="true" />
              <span>
                <span className="block text-[14.5px] font-semibold text-ink">
                  {t.name}
                </span>
                <span className="block text-[12.5px] text-ink-mute">
                  {t.role}
                </span>
              </span>
            </figcaption>

            <div className="mt-10 flex items-center gap-3">
              <button
                onClick={() => move(-1)}
                aria-label="Previous quote"
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink-soft transition-colors hover:border-accent hover:text-accent"
              >
                <ArrowLeft size={16} />
              </button>
              <button
                onClick={() => move(1)}
                aria-label="Next quote"
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink-soft transition-colors hover:border-accent hover:text-accent"
              >
                <ArrowRight size={16} />
              </button>
              <span className="ml-2 text-[12.5px] tabular-nums text-ink-mute">
                {i + 1} / {TESTIMONIALS.length}
              </span>
            </div>
          </div>
        </figure>
      </Reveal>
    </section>
  );
}
