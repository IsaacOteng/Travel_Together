import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { BRAND_IMAGE } from "../../config/media.js";
import { officialLogo } from "../../assets/logos";
import ThemeToggle from "../shared/ThemeToggle.jsx";

/* Split shell shared by sign-in and verification.
   The left panel carries the same photograph and the same headline as the
   landing hero, so arriving here reads as the page recomposing around you
   rather than as a jump to a different product. */
export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-ground font-sans">
      {/* ── brand panel ─────────────────────────────────────────── */}
      <aside className="relative hidden w-[54%] shrink-0 overflow-hidden lg:block">
        <img
          src={BRAND_IMAGE}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/25" />

        <div className="relative flex h-full flex-col justify-between p-10">
          <Link
            to="/"
            className="flex w-fit items-center gap-2.5 no-underline"
          >
            <img
              src={officialLogo}
              alt=""
              className="h-8 w-8"
              onError={e => { e.target.style.display = "none"; }}
            />
            <span className="font-display text-[19px] font-semibold text-white">
              Travel Together
            </span>
          </Link>

          <div>
            <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
              <span className="h-px w-7 bg-white/40" aria-hidden="true" />
              Group travel · Ghana
            </p>
            <p className="mt-5 max-w-[11ch] font-display text-[clamp(38px,4.4vw,58px)] font-semibold leading-[0.95] text-white">
              Go far. Go together.
            </p>
            <p className="mt-5 max-w-[34ch] text-[15px] leading-[1.7] text-white/70">
              18,000 travellers already plan, track and get home together.
            </p>
          </div>
        </div>
      </aside>

      {/* ── form column ─────────────────────────────────────────── */}
      <main className="flex w-full flex-1 flex-col px-6 py-7 sm:px-10">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 text-[13.5px] text-ink-mute no-underline transition-colors hover:text-accent"
          >
            <ArrowLeft size={15} />
            Back
          </Link>

          {/* Only shown where the brand panel is hidden — it carries the
              wordmark on large screens. */}
          <Link to="/" className="flex items-center gap-2 no-underline lg:hidden">
            <img
              src={officialLogo}
              alt=""
              className="h-7 w-7"
              onError={e => { e.target.style.display = "none"; }}
            />
            <span className="hidden font-display text-[16px] font-semibold text-ink sm:inline">
              Travel Together
            </span>
          </Link>

          <ThemeToggle />
        </div>

        <div
          className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10"
          style={{ animation: "ttFadeUp .45s ease both" }}
        >
          {children}
        </div>

        <p className="text-center text-[12px] text-ink-mute">
          © {new Date().getFullYear()} Travel Together
        </p>
      </main>
    </div>
  );
}

/* ── shared form primitives ─────────────────────────────────── */

export function AuthHeading({ title, children }) {
  return (
    <header className="mb-8">
      <h1 className="font-display text-[clamp(28px,3.4vw,36px)] font-semibold leading-[1.1] text-ink">
        {title}
      </h1>
      {children && (
        <p className="mt-3 text-[14.5px] leading-[1.65] text-ink-soft">
          {children}
        </p>
      )}
    </header>
  );
}

export function AuthButton({ children, variant = "primary", ...props }) {
  const skin =
    variant === "primary"
      ? "bg-accent text-accent-ink hover:bg-accent-hover disabled:bg-line disabled:text-ink-mute"
      : "border border-line bg-surface text-ink hover:border-accent hover:text-accent";
  return (
    <button
      {...props}
      className={`flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-full px-6 py-3.5 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed ${
        variant === "primary" ? "border-none" : ""
      } ${skin}`}
    >
      {children}
    </button>
  );
}

export function AuthError({ children }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-xl border border-accent/30 bg-accent-soft px-3.5 py-2.5 text-[13px] text-accent"
    >
      {children}
    </p>
  );
}
