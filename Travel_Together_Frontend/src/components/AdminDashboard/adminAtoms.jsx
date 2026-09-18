import { useEffect } from "react";
import { Search, ChevronLeft, ChevronRight, AlertTriangle, X, Inbox, RefreshCw } from "lucide-react";
import useBodyScrollLock from "../../hooks/useBodyScrollLock.js";
import { fieldBase } from "./adminUtils.js";

/* Shared furniture for the admin.

   Every page here had grown its own copy of the same four things — a
   Skeleton, a Paginator, a Badge/StatusPill and a table shell — five or six
   near-identical definitions that had already drifted apart (different row
   padding, different empty-state wording, three different greys for a muted
   label). They live here once now, on the same --tt-* tokens the public site
   uses, so the admin follows its light/dark switch like everything else. */

/* ── surfaces ─────────────────────────────────────────────────────────── */

export function Card({ children, className = "", padded = false }) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-line bg-surface ${
        padded ? "p-5" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHead({ title, sub, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="m-0 font-display text-[clamp(22px,2.6vw,28px)] font-semibold leading-tight text-ink">
          {title}
        </h1>
        {sub && <p className="m-0 mt-1 text-[13.5px] text-ink-soft">{sub}</p>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={`rounded-lg bg-surface-alt ${className}`} style={{ animation: "ttPulse 1.4s ease-in-out infinite" }} />;
}

/* ── badges ───────────────────────────────────────────────────────────── */

/* Tones map to the product's own vocabulary rather than raw colour names, so
   a caller asks for "danger" and can't invent a seventh shade of red. */
const TONES = {
  good:    "bg-moss/15 text-moss",
  warn:    "bg-sun/15 text-sun",
  danger:  "bg-danger-soft text-danger",
  info:    "bg-accent-soft text-accent",
  neutral: "bg-surface-alt text-ink-mute",
};

export function Badge({ children, tone = "neutral", dot = false }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
        TONES[tone] ?? TONES.neutral
      }`}
    >
      {dot && (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-current"
          style={{ animation: "ttPulse 1.6s ease-in-out infinite" }}
        />
      )}
      {children}
    </span>
  );
}

/* ── inputs ───────────────────────────────────────────────────────────── */

export function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="relative min-w-52 flex-1">
      <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute" />
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`${fieldBase} w-full pl-10 placeholder:text-ink-mute`}
      />
    </div>
  );
}

export function FilterBtn({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`cursor-pointer whitespace-nowrap rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors ${
        active
          ? "border-accent bg-accent text-accent-ink"
          : "border-line bg-surface text-ink-soft hover:border-accent hover:text-accent"
      }`}
    >
      {children}
    </button>
  );
}

export function IconBtn({ onClick, label, children, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink-soft transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function RefreshBtn({ onClick, loading }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-[13px] font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
    >
      <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
      Refresh
    </button>
  );
}

/* ── table ────────────────────────────────────────────────────────────── */

export function TableWrap({ children }) {
  return <div className="overflow-x-auto">{children}</div>;
}

export function Table({ children }) {
  return <table className="w-full border-collapse text-[13px]">{children}</table>;
}

export function Th({ children, className = "" }) {
  return (
    <th
      className={`whitespace-nowrap border-b border-line px-5 py-3.5 text-left text-[11.5px] font-semibold uppercase tracking-widest text-ink-mute ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = "" }) {
  return <td className={`border-b border-line-soft px-5 py-3.5 align-middle ${className}`}>{children}</td>;
}

export function Row({ children, onClick }) {
  return (
    <tr
      onClick={onClick}
      className={`group transition-colors ${onClick ? "cursor-pointer hover:bg-surface-alt" : ""}`}
    >
      {children}
    </tr>
  );
}

/* ── states ───────────────────────────────────────────────────────────── */

export function EmptyState({ colSpan, title, sub }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-16 text-center">
        <Inbox size={22} className="mx-auto text-ink-mute" />
        <p className="m-0 mt-3 text-[14px] font-semibold text-ink">{title}</p>
        {sub && <p className="m-0 mt-1 text-[13px] text-ink-mute">{sub}</p>}
      </td>
    </tr>
  );
}

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3.5 text-[13.5px] text-danger"
    >
      <AlertTriangle size={16} className="shrink-0" />
      <span className="min-w-0 flex-1">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 cursor-pointer rounded-full border border-danger/40 bg-transparent px-3 py-1.5 text-[12.5px] font-semibold text-danger transition-colors hover:bg-danger hover:text-accent-ink"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function Paginator({ page, total, perPage, onChange }) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
      <span className="text-[12.5px] text-ink-mute">
        Page {page} of {totalPages} · {total} total
      </span>
      <div className="flex gap-1.5">
        <IconBtn label="Previous page" disabled={page <= 1} onClick={() => onChange(p => p - 1)}>
          <ChevronLeft size={15} />
        </IconBtn>
        <IconBtn label="Next page" disabled={page >= totalPages} onClick={() => onChange(p => p + 1)}>
          <ChevronRight size={15} />
        </IconBtn>
      </div>
    </div>
  );
}

/* ── drawer ───────────────────────────────────────────────────────────── */

/* Four separate slide-overs existed with four copies of this scaffolding, and
   none of them locked the page behind — opening one and scrolling moved the
   table underneath. Escape didn't close any of them either. */
export function Drawer({ title, onClose, children }) {
  useBodyScrollLock(true);

  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        style={{ animation: "ttFadeIn .2s ease both" }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-50 flex h-full w-full max-w-md flex-col border-l border-line bg-ground"
        style={{ animation: "ttDialogIn .25s ease both" }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-ground px-5 py-4">
          <p className="m-0 font-display text-[16px] font-semibold text-ink">{title}</p>
          <IconBtn label="Close" onClick={onClose}>
            <X size={16} />
          </IconBtn>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

/* ── misc ─────────────────────────────────────────────────────────────── */

export function StatTile({ label, value }) {
  return (
    <div className="rounded-xl border border-line bg-surface-alt px-3.5 py-3">
      <p className="m-0 text-[11px] font-semibold uppercase tracking-widest text-ink-mute">{label}</p>
      <p className="m-0 mt-1 font-display text-[19px] font-semibold text-ink">{value ?? "—"}</p>
    </div>
  );
}

