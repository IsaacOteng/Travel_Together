import { useInView } from "./hooks.js";

/* Small caps label with a leading rule — the section marker used
   throughout the page instead of a coloured pill. */
export function Eyebrow({ children, className = "" }) {
  return (
    <p className={`flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-accent ${className}`}>
      <span className="h-px w-7 bg-accent/50" aria-hidden="true" />
      {children}
    </p>
  );
}

export function Reveal({ children, delay = 0, className = "" }) {
  const [ref, inView] = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        transition: `opacity .7s ease ${delay}s, transform .7s ease ${delay}s`,
        opacity:   inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(18px)",
      }}
    >
      {children}
    </div>
  );
}

export function Avatar({ name, size = 36 }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {initials}
    </div>
  );
}

