import { Check } from "lucide-react";
import { BRAND_IMAGE } from "../../../config/media.js";
import { officialLogo } from "../../../assets/logos";
import ThemeToggle from "../../shared/ThemeToggle.jsx";

/* Onboarding used to be a white card floating on a radial-gradient page, with
   a thin progress bar reading "Step 2 of 5 — 40%". A percentage tells you how
   much is left but never what is coming, so every step arrived as a surprise
   and the end felt further away than it was.

   This is the same split shell as sign-in and verification — the photograph
   carries straight through from the landing hero — with the steps named on
   the brand panel. You can see the whole shape of the flow from the first
   screen, which is the honest version of "nearly there".

   Below lg the panel is hidden and the rail collapses to a compact row, since
   five labelled steps stacked on a phone would push the form off-screen. */
export default function OnboardingShell({ steps, current, done, children }) {
  return (
    <div className="flex min-h-screen bg-ground font-sans">
      {/* ── brand panel ─────────────────────────────────────────── */}
      <aside className="relative hidden w-[46%] shrink-0 overflow-hidden lg:block">
        <img src={BRAND_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/30" />

        <div className="relative flex h-full flex-col justify-between p-10">
          <div className="flex items-center gap-2.5">
            <img
              src={officialLogo}
              alt=""
              className="h-8 w-8"
              onError={e => { e.target.style.display = "none"; }}
            />
            <span className="font-display text-[19px] font-semibold text-white">
              Travel Together
            </span>
          </div>

          <div>
            <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
              <span className="h-px w-7 bg-white/40" aria-hidden="true" />
              Setting up
            </p>
            <p className="mt-5 max-w-[14ch] font-display text-[clamp(30px,3.2vw,42px)] font-semibold leading-[1] text-white">
              Let&apos;s build your profile.
            </p>

            <ol className="mt-9 flex list-none flex-col gap-0 p-0">
              {steps.map((s, i) => {
                const isDone   = done || i < current;
                const isActive = !done && i === current;
                return (
                  <li key={s.id} className="flex items-center gap-3.5 py-2">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold transition-colors ${
                        isDone
                          ? "bg-white text-black"
                          : isActive
                          ? "bg-accent text-accent-ink"
                          : "border border-white/30 text-white/50"
                      }`}
                    >
                      {isDone ? <Check size={13} strokeWidth={3} /> : i + 1}
                    </span>
                    <span
                      className={`text-[14.5px] transition-colors ${
                        isActive
                          ? "font-semibold text-white"
                          : isDone
                          ? "text-white/70"
                          : "text-white/45"
                      }`}
                    >
                      {s.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          <p className="text-[12.5px] leading-relaxed text-white/50">
            Everything here can be changed later in Settings.
          </p>
        </div>
      </aside>

      {/* ── form column ─────────────────────────────────────────── */}
      <main className="flex w-full flex-1 flex-col px-6 py-7 sm:px-10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 lg:hidden">
            <img
              src={officialLogo}
              alt=""
              className="h-7 w-7"
              onError={e => { e.target.style.display = "none"; }}
            />
            <span className="hidden font-display text-[16px] font-semibold text-ink sm:inline">
              Travel Together
            </span>
          </div>
          {/* Keeps the toggle right-aligned on lg where the wordmark is hidden. */}
          <span className="hidden lg:block" />
          <ThemeToggle />
        </div>

        {/* compact rail for narrow screens */}
        {!done && (
          <div className="mt-6 flex items-center gap-2 lg:hidden" aria-hidden="true">
            {steps.map((s, i) => (
              <span
                key={s.id}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                  i < current ? "bg-accent/40" : i === current ? "bg-accent" : "bg-line"
                }`}
              />
            ))}
          </div>
        )}
        {!done && (
          <p className="mt-2.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-accent lg:hidden">
            Step {current + 1} of {steps.length} · {steps[current]?.label}
          </p>
        )}

        <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col justify-center py-9">
          {children}
        </div>

        <p className="text-center text-[12px] text-ink-mute">
          © {new Date().getFullYear()} Travel Together
        </p>
      </main>
    </div>
  );
}
