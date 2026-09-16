import { useState, useRef, useEffect } from "react";
import { SlidersHorizontal, Check, ChevronDown } from "lucide-react";

/* A native <select> paints its list with the operating system — Windows gives
   it a blue highlight and the system UI font, and none of it can be styled.
   On a page that is otherwise entirely warm paper and Satoshi it was the one
   element that looked borrowed. This is a real listbox so the panel follows
   the theme tokens like everything else.

   Keyboard behaviour matches the select it replaces: ↑/↓ move, Enter/Space
   choose, Escape closes and returns focus to the trigger, Tab or an outside
   click dismisses. */
export default function SortMenu({ options, value, onChange, compact = false }) {
  const [open,   setOpen]   = useState(false);
  const [cursor, setCursor] = useState(0);
  const wrapRef = useRef(null);
  const btnRef  = useRef(null);
  const listRef = useRef(null);

  const selected = options.find(o => o.id === value) ?? options[0];

  /* Opening starts the highlight on whatever is currently chosen. Kept apart
     from the listener below so a parent re-render can't yank the highlight
     back mid-navigation. */
  useEffect(() => {
    if (open) setCursor(Math.max(0, options.findIndex(o => o.id === value)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocDown = e => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open]);

  /* Keep the highlighted row in view when arrowing past the visible edge. */
  useEffect(() => {
    if (open) listRef.current?.children[cursor]?.scrollIntoView({ block: "nearest" });
  }, [open, cursor]);

  const choose = (id) => {
    onChange(id);
    setOpen(false);
    btnRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "Escape":    e.preventDefault(); setOpen(false); btnRef.current?.focus(); break;
      case "ArrowDown": e.preventDefault(); setCursor(c => (c + 1) % options.length); break;
      case "ArrowUp":   e.preventDefault(); setCursor(c => (c - 1 + options.length) % options.length); break;
      case "Home":      e.preventDefault(); setCursor(0); break;
      case "End":       e.preventDefault(); setCursor(options.length - 1); break;
      case "Enter":
      case " ":         e.preventDefault(); choose(options[cursor].id); break;
      case "Tab":       setOpen(false); break;
      default: break;
    }
  };

  return (
    <div ref={wrapRef} className="relative" onKeyDown={onKeyDown}>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Sort trips by ${selected.label}`}
        onClick={() => setOpen(o => !o)}
        className={`flex cursor-pointer items-center gap-2 border bg-surface font-medium text-ink transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
          open ? "border-accent text-accent" : "border-line"
        } ${compact
          ? "rounded-full py-1.5 pl-3 pr-2.5 text-[12.5px]"
          : "rounded-full py-2 pl-3.5 pr-3 text-[13px]"}`}
      >
        <SlidersHorizontal size={compact ? 13 : 14} className="shrink-0 opacity-70" />
        <span className="whitespace-nowrap">{selected.label}</span>
        <ChevronDown
          size={compact ? 13 : 14}
          className={`shrink-0 opacity-60 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={`sort-opt-${options[cursor]?.id}`}
          className="absolute right-0 z-50 mt-2 min-w-47.5 list-none overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-[0_18px_40px_-14px_rgba(28,25,22,0.28)]"
          style={{ animation: "ttFadeUp .16s ease both" }}
        >
          {options.map((o, i) => {
            const isSelected = o.id === value;
            return (
              <li
                key={o.id}
                id={`sort-opt-${o.id}`}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setCursor(i)}
                onClick={() => choose(o.id)}
                className={`flex cursor-pointer items-center justify-between gap-6 rounded-xl px-3 py-2.5 text-[13.5px] transition-colors ${
                  i === cursor ? "bg-surface-alt" : ""
                } ${isSelected ? "font-semibold text-accent" : "text-ink-soft"}`}
              >
                <span className="whitespace-nowrap">{o.label}</span>
                {isSelected && <Check size={14} className="shrink-0" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
