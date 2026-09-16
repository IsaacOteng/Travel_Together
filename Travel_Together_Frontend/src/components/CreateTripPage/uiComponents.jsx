import { AlertCircle, Check } from "lucide-react";

/* ─── STEP RAIL ──────────────────────────────────────────────────
   Replaces the old ProgressBar. A percentage told you how far along
   you were but never what was coming, and each step re-rendered its
   own bar. The rail names all four, marks what's done, and lets you
   jump back to anything you've already completed. */
export function StepRail({ steps, current, furthest, onJump }) {
  return (
    <ol className="m-0 flex list-none gap-2 overflow-x-auto p-0 lg:flex-col lg:gap-1 lg:overflow-visible">
      {steps.map((s, i) => {
        const n = i + 1;
        const done    = n < furthest;
        const active  = n === current;
        const visited = n <= furthest;
        return (
          <li key={s.title} className="shrink-0 lg:shrink">
            <button
              type="button"
              onClick={visited ? () => onJump(n) : undefined}
              aria-current={active ? "step" : undefined}
              className={`flex w-full items-start gap-3 rounded-2xl px-3.5 py-3 text-left transition-colors ${
                active ? "bg-accent-soft" : visited ? "hover:bg-surface-alt" : ""
              } ${visited ? "cursor-pointer" : "cursor-default"}`}
            >
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${
                done   ? "bg-moss text-white"
                : active ? "bg-accent text-accent-ink"
                : "border border-line text-ink-mute"
              }`}>
                {done ? <Check size={13} /> : n}
              </span>
              <span className="min-w-0">
                <span className={`block whitespace-nowrap text-[14px] font-semibold lg:whitespace-normal ${
                  active ? "text-accent" : visited ? "text-ink" : "text-ink-mute"
                }`}>
                  {s.title}
                </span>
                <span className="hidden text-[12.5px] leading-snug text-ink-mute lg:block">
                  {s.sub}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/* ─── SECTION HEADING ────────────────────────────────────────── */
export function SectionHead({ title, sub }) {
  return (
    <header className="mb-7">
      <h2 className="m-0 font-display text-[clamp(22px,2.6vw,28px)] font-semibold leading-tight text-ink">
        {title}
      </h2>
      {sub && <p className="m-0 mt-2 max-w-[60ch] text-[14.5px] leading-relaxed text-ink-soft">{sub}</p>}
    </header>
  );
}

/* ─── LABEL ──────────────────────────────────────────────────── */
export function Label({ children, required }) {
  return (
    <label className="mb-2 block text-[13px] font-medium text-ink">
      {children}
      {required && <span className="ml-0.5 text-accent">*</span>}
    </label>
  );
}

const FIELD =
  "w-full rounded-xl border bg-surface px-3.5 py-3 text-[14.5px] text-ink outline-none transition-colors placeholder:text-ink-mute";

/* ─── INPUT ──────────────────────────────────────────────────── */
export function TTInput({ value, onChange, placeholder, type = "text", className = "", onKeyDown }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={`${FIELD} border-line focus:border-accent focus:ring-2 focus:ring-accent/20 ${className}`}
    />
  );
}

/* ─── TEXTAREA ───────────────────────────────────────────────── */
export function TTTextarea({ value, onChange, placeholder, rows = 4, maxLength = 300 }) {
  const len = (value || "").length;
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className={`${FIELD} resize-none border-line pb-7 leading-[1.6] focus:border-accent focus:ring-2 focus:ring-accent/20`}
      />
      <span className={`pointer-events-none absolute bottom-2.5 right-3 text-[11.5px] ${
        len >= maxLength * 0.9 ? "text-accent" : "text-ink-mute"
      }`}>
        {len}/{maxLength}
      </span>
    </div>
  );
}

/* ─── SELECT ─────────────────────────────────────────────────── */
export function TTSelect({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className={`${FIELD} cursor-pointer appearance-none border-line pr-9 focus:border-accent focus:ring-2 focus:ring-accent/20 ${
        value ? "text-ink" : "text-ink-mute"
      }`}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%238B8275' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 14px center",
      }}
    >
      {children}
    </select>
  );
}

/* ─── ERROR ──────────────────────────────────────────────────── */
export function Err({ msg }) {
  if (!msg) return null;
  return (
    <p role="alert" className="mt-2 flex items-center gap-1.5 text-[12.5px] text-accent">
      <AlertCircle size={13} className="shrink-0" /> {msg}
    </p>
  );
}

/* ─── BUTTONS ────────────────────────────────────────────────── */
export function PrimaryBtn({ onClick, disabled, children, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border-none bg-accent px-6 py-3.5 text-[15px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-line disabled:text-ink-mute sm:w-auto"
    >
      {loading ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
          Publishing…
        </>
      ) : children}
    </button>
  );
}

export function GhostBtn({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="cursor-pointer rounded-full border border-line bg-surface px-6 py-3.5 text-[15px] font-medium text-ink transition-colors hover:border-accent hover:text-accent"
    >
      {children}
    </button>
  );
}

/* Kept so the steps keep compiling while the rail owns progress. */
export function ProgressBar() {
  return null;
}
