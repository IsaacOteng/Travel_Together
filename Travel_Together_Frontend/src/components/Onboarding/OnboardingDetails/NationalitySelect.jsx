import { useState, useEffect, useRef } from "react";
import { Search, X, Loader2, Check } from "lucide-react";
import { searchCountries } from "../../../data/countries.js";

/* Type-to-search nationality picker.

   Previously styled through the legacy .tt-input / .tt-dropdown rules in
   Globalstyles.css — hardcoded #FF6B35 focus rings and #f9fafb hover rows,
   which stayed light no matter the theme. Now on tokens like the rest of the
   flow. Behaviour is unchanged. */
export function NationalitySelect({ value, onChange, countries, loading, hasError }) {
  const [query, setQuery] = useState(value || "");
  const [open,  setOpen]  = useState(false);
  const wrapRef  = useRef(null);
  const inputRef = useRef(null);

  // Matches the country name as well as the demonym, because people type
  // whichever comes to mind — "ghana" and "ghanaian" both have to land on
  // Ghanaian. Searching demonyms alone missed the far more common first case.
  const filtered = (query.trim() ? searchCountries(query, countries) : countries).slice(0, 5);

  useEffect(() => { if (!value) setQuery(""); }, [value]);

  useEffect(() => {
    const h = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const select = name => { onChange(name); setQuery(name); setOpen(false); };

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute" />
        <input
          ref={inputRef}
          type="text"
          placeholder={loading ? "Loading countries…" : "Type a country or nationality"}
          value={query}
          autoComplete="off"
          disabled={loading}
          onChange={e => { setQuery(e.target.value); onChange(""); setOpen(true); }}
          onFocus={() => setOpen(true)}
          aria-invalid={hasError || undefined}
          className={`w-full rounded-xl border bg-surface py-3 pl-10 pr-10 text-[15px] text-ink outline-none transition-colors placeholder:text-ink-mute focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
            hasError
              ? "border-danger focus:border-danger focus:ring-danger/25"
              : "border-line hover:border-ink-mute focus:border-accent focus:ring-accent/25"
          }`}
        />
        {loading && (
          <Loader2 size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-ink-mute" />
        )}
        {value && !loading && (
          <button
            type="button"
            aria-label="Clear nationality"
            className="absolute right-3 top-1/2 flex -translate-y-1/2 cursor-pointer items-center border-none bg-transparent p-1 text-ink-mute transition-colors hover:text-accent"
            onMouseDown={e => { e.preventDefault(); onChange(""); setQuery(""); setOpen(true); inputRef.current?.focus(); }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-[0_18px_40px_-14px_rgba(28,25,22,0.28)]">
          {loading ? (
            <p className="m-0 flex items-center gap-2 px-3 py-3 text-[13.5px] text-ink-mute">
              <Loader2 size={14} className="animate-spin" /> Loading countries…
            </p>
          ) : filtered.length === 0 ? (
            <p className="m-0 px-3 py-3 text-[13.5px] text-ink-mute">
              Nothing matches “{query}”.
            </p>
          ) : (
            <>
              {filtered.map(c => {
                const on = c.demonym === value;
                return (
                  <button
                    key={c.cca2}
                    type="button"
                    onMouseDown={() => select(c.demonym)}
                    className={`flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl border-none bg-transparent px-3 py-2.5 text-left text-[14px] transition-colors hover:bg-surface-alt ${
                      on ? "font-semibold text-accent" : "text-ink-soft"
                    }`}
                  >
                    <span>{c.demonym}</span>
                    {on && <Check size={14} className="shrink-0" />}
                  </button>
                );
              })}
              <p className="m-0 border-t border-line-soft px-3 pb-1 pt-2 text-[12px] text-ink-mute">
                {!query.trim() ? "Type to search all nationalities" : "Keep typing to narrow this down"}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
