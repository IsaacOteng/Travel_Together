import { ArrowRight } from "lucide-react";
import { Reveal, Eyebrow } from "./uiComponents.jsx";
import { HOW_IT_WORKS } from "./constants.js";

/* Deliberately vertical, to play against the bento grid above it.
   Oversized numerals carry the rhythm; the heading sticks alongside. */
export default function HowItWorks({ onGetStarted }) {
  return (
    <section id="how-it-works" className="border-y border-line bg-ground-alt py-24">
      <div className="mx-auto grid max-w-[1180px] gap-14 px-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <Eyebrow className="mb-5">How it works</Eyebrow>
          <h2 className="font-display text-[clamp(34px,4.4vw,52px)] font-semibold leading-[1.02] text-ink">
            Four steps from signup to summit.
          </h2>
          <p className="mt-5 max-w-[360px] text-[16px] leading-[1.7] text-ink-soft">
            No paperwork, no deposit, no phone calls. You can be on a trip list
            the same afternoon you sign up.
          </p>
          <button
            onClick={onGetStarted}
            className="mt-8 flex cursor-pointer items-center gap-2 rounded-full border-none bg-accent px-6 py-3 text-[14.5px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
          >
            Start free <ArrowRight size={15} />
          </button>
        </Reveal>

        <ol className="m-0 list-none p-0">
          {HOW_IT_WORKS.map((step, i) => (
            <Reveal
              key={step.num}
              delay={i * 0.07}
              className="border-t border-line last:border-b"
            >
              <li className="group flex items-baseline gap-6 py-8 transition-colors sm:gap-10">
                <span className="font-display text-[clamp(38px,5vw,60px)] font-semibold leading-none text-accent/30 transition-colors group-hover:text-accent">
                  {step.num}
                </span>
                <span className="flex-1">
                  <h3 className="font-display text-[clamp(21px,2.4vw,27px)] font-semibold leading-tight text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-2.5 max-w-[46ch] text-[15px] leading-[1.7] text-ink-soft">
                    {step.body}
                  </p>
                </span>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
