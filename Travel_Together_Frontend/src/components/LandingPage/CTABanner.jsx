import { ArrowRight } from "lucide-react";
import { Reveal } from "./uiComponents.jsx";

export default function CTABanner({ onGetStarted, onBrowse }) {
  return (
    <section className="bg-ground px-6 py-24">
      <Reveal className="mx-auto max-w-[1180px]">
        <div className="rounded-3xl bg-ink px-8 py-16 text-center sm:px-14 sm:py-20">
          <h2
            className="mx-auto max-w-[620px] font-display font-semibold leading-[1.05] text-ground"
            style={{ fontSize: "clamp(32px, 4.6vw, 54px)" }}
          >
            Your next trip is already being planned by someone.
          </h2>
          <p className="mx-auto mt-6 max-w-[430px] text-[16px] leading-[1.7] text-ground/65">
            Join it. Setting up a profile takes about two minutes, and browsing
            costs you nothing at all.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={onGetStarted}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-full border-none bg-accent px-8 py-3.5 text-[15px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
            >
              Create a free account <ArrowRight size={16} />
            </button>
            <button
              onClick={onBrowse}
              className="cursor-pointer rounded-full border border-ground/25 bg-transparent px-8 py-3.5 text-[15px] font-medium text-ground transition-colors hover:border-ground/60"
            >
              Browse trips first
            </button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
