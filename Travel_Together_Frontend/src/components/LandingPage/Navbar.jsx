import { useState } from "react";
import { Menu, X } from "lucide-react";
import { officialLogo } from "../../assets/logos";
import { NAV_LINKS } from "./constants.js";
import ThemeToggle from "../shared/ThemeToggle.jsx";

export default function Navbar({ scrolled, onGetStarted, onSignIn, onBrowse }) {
  const [open, setOpen] = useState(false);

  /* At the top of the page the bar floats on the hero photograph, so it
     runs white; once past it, it picks the page palette back up. */
  const overlay = !scrolled && !open;

  const wordmark = overlay ? "text-white" : "text-ink";
  const link = overlay
    ? "text-white/80 hover:text-white"
    : "text-ink-soft hover:text-accent";
  const ghost = overlay
    ? "text-white/80 hover:text-white"
    : "text-ink-soft hover:text-accent";

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          overlay
            ? "border-b border-transparent"
            : "border-b border-line bg-ground/90 backdrop-blur-md"
        }`}
      >
        <div className="mx-auto flex h-[72px] max-w-[1180px] items-center justify-between px-6">
          <a href="#top" className="flex flex-shrink-0 items-center gap-2.5 no-underline">
            <img
              src={officialLogo}
              alt=""
              className="h-8 w-8"
              onError={e => { e.target.style.display = "none"; }}
            />
            <span className={`font-display text-[19px] font-semibold transition-colors ${wordmark}`}>
              Travel Together
            </span>
          </a>

          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map(l => (
              <a
                key={l.href}
                href={l.href}
                className={`text-[14px] no-underline transition-colors ${link}`}
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <ThemeToggle overlay={overlay} />
            <button
              onClick={onSignIn}
              className={`cursor-pointer border-none bg-transparent px-2 text-[14px] font-medium transition-colors ${ghost}`}
            >
              Sign in
            </button>
            <button
              onClick={onGetStarted}
              className="cursor-pointer rounded-full border-none bg-accent px-5 py-2.5 text-[14px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
            >
              Start free
            </button>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle overlay={overlay} />
            <button
              onClick={() => setOpen(o => !o)}
              aria-label={open ? "Close menu" : "Open menu"}
              className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border transition-colors ${
                overlay
                  ? "border-white/30 bg-white/10 text-white backdrop-blur-sm"
                  : "border-line bg-surface text-ink"
              }`}
            >
              {open ? <X size={17} /> : <Menu size={17} />}
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 flex flex-col bg-ground pt-[72px] md:hidden">
          <nav className="flex flex-col gap-1 border-t border-line px-6 pt-6">
            {NAV_LINKS.map(l => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="border-b border-line-soft py-4 font-display text-[22px] text-ink no-underline"
              >
                {l.label}
              </a>
            ))}
            <button
              onClick={() => { setOpen(false); onBrowse(); }}
              className="cursor-pointer border-none border-b border-line-soft bg-transparent py-4 text-left font-display text-[22px] text-ink"
            >
              Browse trips
            </button>
          </nav>

          <div className="mt-auto flex flex-col gap-3 p-6">
            <button
              onClick={() => { setOpen(false); onGetStarted(); }}
              className="w-full cursor-pointer rounded-full border-none bg-accent py-3.5 text-[15px] font-semibold text-accent-ink"
            >
              Start free
            </button>
            <button
              onClick={() => { setOpen(false); onSignIn(); }}
              className="w-full cursor-pointer rounded-full border border-line bg-transparent py-3.5 text-[15px] font-medium text-ink"
            >
              Sign in
            </button>
          </div>
        </div>
      )}
    </>
  );
}
