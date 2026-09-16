import { useState, useEffect, useRef } from "react";
import { ChevronDown, Check } from "lucide-react";
import { searchCountries } from "../../../data/countries.js";

/* Country of residence, with flags. Same move off the legacy .tt-* rules as
   NationalitySelect; behaviour unchanged. */
export function CountrySelect({ value, onChange, countries, loading, hasError }) {
  const [query, setQuery] = useState(value || "");
  const [open,  setOpen]  = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => { if (!value) setQuery(""); }, [value]);
  useEffect(() => { if (value && !query) setQuery(value); }, [value, query]);

  // Shared matcher: tolerant of accents and punctuation, so "cote divoire"
  // still finds Côte d'Ivoire.
  const filtered = (query.trim() ? searchCountries(query, countries) : countries).slice(0, 8);

  useEffect(() => {
    const h = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const select = c => { onChange(c.name); setQuery(c.name); setOpen(false); };
  const flag = value ? countries.find(c => c.name === value)?.flag : null;

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        {flag && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[17px] leading-none">
            {flag}
          </span>
        )}
        <input
          type="text"
          placeholder={loading ? "Loading…" : "Country"}
          value={query}
          autoComplete="off"
          aria-label="Country"
          onChange={e => { setQuery(e.target.value); onChange(""); setOpen(true); }}
          onFocus={() => setOpen(true)}
          aria-invalid={hasError || undefined}
          className={`w-full rounded-xl border bg-surface py-3 pr-9 text-[15px] text-ink outline-none transition-colors placeholder:text-ink-mute focus:ring-2 ${
            flag ? "pl-10" : "pl-3.5"
          } ${
            hasError
              ? "border-danger focus:border-danger focus:ring-danger/25"
              : "border-line hover:border-ink-mute focus:border-accent focus:ring-accent/25"
          }`}
        />
        <ChevronDown
          size={15}
          className={`pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-mute transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </div>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-[0_18px_40px_-14px_rgba(28,25,22,0.28)]">
          {loading ? (
            <p className="m-0 px-3 py-3 text-[13.5px] text-ink-mute">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="m-0 px-3 py-3 text-[13.5px] text-ink-mute">Nothing matches “{query}”.</p>
          ) : (
            filtered.map(c => {
              const on = c.name === value;
              return (
                <button
                  key={c.cca2}
                  type="button"
                  onMouseDown={() => select(c)}
                  className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl border-none bg-transparent px-3 py-2.5 text-left text-[14px] transition-colors hover:bg-surface-alt ${
                    on ? "font-semibold text-accent" : "text-ink-soft"
                  }`}
                >
                  {c.flag && <span className="shrink-0 text-[17px] leading-none">{c.flag}</span>}
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  {on && <Check size={14} className="shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
