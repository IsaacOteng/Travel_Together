import { useState, useEffect, useRef } from "react";
import { ChevronDown, Search } from "lucide-react";
import { searchCountries } from "../../../data/countries.js";

/* Dial-code picker plus number field. Moved off the legacy .tt-phone-row /
   .tt-dial-* rules onto tokens; behaviour unchanged. */
export function PhoneInput({ phoneNumber, dialCode, onNumberChange, onDialChange, countries, hasError }) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);

  const dialList = (() => {
    const seen = new Map();
    countries.forEach(c => {
      if (!c.dial) return;
      if (!seen.has(c.dial)) seen.set(c.dial, c);
    });
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  })();

  // Shared matcher, so "ghana", "ghanaian" and "233" all find Ghana here too.
  const filtered = searchCountries(query, dialList).slice(0, 50);

  useEffect(() => {
    const h = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const sel = dialList.find(d => d.dial === dialCode);

  return (
    <div className="flex gap-2.5" ref={wrapRef}>
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Country dialling code, currently ${dialCode || "none"}`}
          className={`flex h-full cursor-pointer items-center gap-1.5 rounded-xl border bg-surface px-3 text-[15px] text-ink transition-colors hover:border-accent ${
            open ? "border-accent" : "border-line"
          }`}
        >
          {sel?.flag
            ? <span className="text-[17px] leading-none">{sel.flag}</span>
            : <span className="h-3.5 w-5 shrink-0 rounded-sm bg-line" />}
          <span className="whitespace-nowrap tabular-nums">{dialCode || "+?"}</span>
          <ChevronDown
            size={14}
            className={`shrink-0 text-ink-mute transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && (
          <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-67.5 overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_18px_40px_-14px_rgba(28,25,22,0.28)]">
            <div className="relative border-b border-line-soft p-2">
              <Search size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-mute" />
              <input
                autoFocus
                type="text"
                placeholder="Search country"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full rounded-lg border border-line bg-surface py-2 pl-8 pr-2.5 text-[13.5px] text-ink outline-none transition-colors placeholder:text-ink-mute focus:border-accent"
              />
            </div>
            <div className="max-h-47.5 overflow-y-auto p-1.5">
              {filtered.length === 0 && (
                <p className="m-0 px-3 py-3 text-[13.5px] text-ink-mute">
                  Nothing matches “{query}”.
                </p>
              )}
              {filtered.map(d => {
                const on = d.dial === dialCode;
                return (
                  <button
                    key={d.cca2}
                    type="button"
                    onMouseDown={() => { onDialChange(d.dial); setOpen(false); setQuery(""); }}
                    className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl border-none bg-transparent px-2.5 py-2 text-left text-[13.5px] transition-colors hover:bg-surface-alt ${
                      on ? "font-semibold text-accent" : "text-ink-soft"
                    }`}
                  >
                    <span className="shrink-0 text-[16px] leading-none">{d.flag}</span>
                    <span className="min-w-0 flex-1 truncate">{d.name}</span>
                    <span className="shrink-0 tabular-nums text-ink-mute">{d.dial}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <input
        type="tel"
        placeholder="24 123 4567"
        value={phoneNumber}
        aria-label="Phone number"
        aria-invalid={hasError || undefined}
        onChange={e => onNumberChange(e.target.value.replace(/[^0-9\s\-+]/g, ""))}
        className={`min-w-0 flex-1 rounded-xl border bg-surface px-3.5 py-3 text-[15px] text-ink outline-none transition-colors placeholder:text-ink-mute focus:ring-2 ${
          hasError
            ? "border-danger focus:border-danger focus:ring-danger/25"
            : "border-line hover:border-ink-mute focus:border-accent focus:ring-accent/25"
        }`}
      />
    </div>
  );
}
