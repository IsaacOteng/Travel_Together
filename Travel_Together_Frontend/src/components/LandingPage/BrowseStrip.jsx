import { ArrowRight } from "lucide-react";
import { Reveal } from "./uiComponents.jsx";

export default function BrowseStrip({ onBrowse }) {
  return (
    <section className="bg-ground">
      <Reveal className="mx-auto flex max-w-[1180px] flex-col gap-4 border-b border-line px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-display text-[22px] leading-snug text-ink">
          Curious? Look around without signing up.
        </p>
        <button
          onClick={onBrowse}
          className="flex flex-shrink-0 cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-[15px] font-semibold text-accent transition-colors hover:text-accent-hover"
        >
          Browse the app <ArrowRight size={16} />
        </button>
      </Reveal>
    </section>
  );
}
