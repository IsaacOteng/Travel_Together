import { ArrowRight } from "lucide-react";
import { Reveal, Eyebrow } from "./uiComponents.jsx";
import { FEATURES } from "./constants.js";
import {
  FleetViz,
  CrewViz,
  SafetyViz,
  PollViz,
  KarmaViz,
  EncryptionViz,
} from "./FeatureVisuals.jsx";

/* Each tile shows the feature working rather than captioning it with an
   icon. The wide tiles put the preview beside the copy; the narrow ones
   run it underneath, so the grid never repeats the same shape twice. */
const TILES = {
  crew:       { viz: CrewViz,       span: "",              layout: "stack", tone: "plain"  },
  fleet:      { viz: FleetViz,      span: "sm:col-span-2", layout: "bleed", tone: "plain"  },
  safety:     { viz: SafetyViz,     span: "",              layout: "stack", tone: "accent" },
  chat:       { viz: PollViz,       span: "",              layout: "stack", tone: "plain"  },
  karma:      { viz: KarmaViz,      span: "",              layout: "stack", tone: "plain"  },
  encryption: { viz: EncryptionViz, span: "sm:col-span-2", layout: "side",  tone: "plain"  },
};

const TONE = {
  plain:  "bg-surface border border-line",
  accent: "bg-accent border border-accent",
};

export default function Features({ onGetStarted }) {
  return (
    <section id="features" className="bg-ground py-24">
      <div className="mx-auto max-w-[1180px] px-6">
        <Reveal className="mb-14 max-w-[560px]">
          <Eyebrow className="mb-5">What you get</Eyebrow>
          <h2 className="font-display text-[clamp(34px,4.4vw,52px)] font-semibold leading-[1.02] text-ink">
            Group travel, done properly.
          </h2>
          <p className="mt-5 text-[16px] leading-[1.7] text-ink-soft">
            Every part of this is built around one idea — travelling with other
            people should be easier and safer than going alone, not harder.
          </p>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => {
            const t = TILES[f.id];
            const Viz = t.viz;
            const accent = t.tone === "accent";

            const heading = (
              <>
                <h3
                  className={`font-display text-[19px] font-semibold ${
                    accent ? "text-accent-ink" : "text-ink"
                  }`}
                >
                  {f.title}
                </h3>
                <p
                  className={`mt-2.5 text-[14.5px] leading-[1.7] ${
                    accent ? "text-accent-ink/80" : "text-ink-soft"
                  }`}
                >
                  {f.body}
                </p>
              </>
            );

            return (
              <Reveal
                key={f.id}
                delay={(i % 3) * 0.07}
                className={`${t.span} overflow-hidden rounded-3xl ${TONE[t.tone]}`}
              >
                {t.layout === "bleed" ? (
                  /* preview runs to the tile edge */
                  <div className="flex h-full flex-col">
                    <div className="p-7 pb-5">{heading}</div>
                    <div className="mt-auto h-[190px] w-full border-t border-line">
                      <Viz />
                    </div>
                  </div>
                ) : t.layout === "side" ? (
                  <div className="flex h-full flex-col justify-between gap-6 p-7 lg:flex-row lg:items-center">
                    <div className="lg:max-w-[46%]">{heading}</div>
                    <Viz />
                  </div>
                ) : (
                  <div className="flex h-full flex-col p-7">
                    {heading}
                    <div className="mt-6">
                      <Viz />
                    </div>
                  </div>
                )}
              </Reveal>
            );
          })}

          {/* the grid's last cell is the way in */}
          <Reveal delay={0.21} className="rounded-3xl bg-ink">
            <button
              onClick={onGetStarted}
              className="flex h-full w-full cursor-pointer flex-col justify-between gap-8 border-none bg-transparent p-7 text-left"
            >
              <span className="font-display text-[22px] font-semibold leading-[1.15] text-ground">
                Ready when
                <br />
                you are.
              </span>
              <span className="flex items-center gap-2 text-[14px] font-semibold text-ground">
                Start free
                <ArrowRight size={16} />
              </span>
            </button>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
