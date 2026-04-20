import { useState, useEffect, useRef } from "react";

/* ─────────────────────────────────────────────
  NATIONALITY SELECT
  Uses country NAMES — always populated, no empty lists
  Type-to-search dropdown, names only, no flags
───────────────────────────────────────────── */
export function NationalitySelect({ value, onChange, countries, loading, hasError }) {
  const [query,   setQuery]   = useState(value || "");
  const [open,    setOpen]    = useState(false);
  const [focused, setFocused] = useState(false);
  const wrapRef  = useRef(null);
  const inputRef = useRef(null);

  // Use "nationality" options — 250 countries, always populated
  const filtered = (() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries.slice(0, 4);
    const starts = countries.filter(c => c.demonym.toLowerCase().startsWith(q));
    const contains = countries.filter(c => !c.demonym.toLowerCase().startsWith(q) && c.demonym.toLowerCase().includes(q));
    return [...starts, ...contains].slice(0, 4);
  })();

  useEffect(() => { if (!value) setQuery(""); }, [value]);

  useEffect(() => {
    const h = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const select = name => { onChange(name); setQuery(name); setOpen(false); };

  const borderStyle = hasError
    ? { border:"1.5px solid #f87171", boxShadow:"0 0 0 3px rgba(248,113,113,.10)" }
    : focused
    ? { border:"1.5px solid #FF6B35", boxShadow:"0 0 0 3px rgba(255,107,53,.10)" }
    : {};

  return (
    <div ref={wrapRef} style={{ position:"relative" }}>
      <div className="tt-input-icon-wrap">
        {/* search icon */}
        <svg className="tt-icon-left" width="13" height="13" viewBox="0 0 13 13" fill="none">
          <circle cx="5.5" cy="5.5" r="4.5" stroke="#9ca3af" strokeWidth="1.3"/>
          <path d="M9 9l2.5 2.5" stroke="#9ca3af" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>

        <input
          ref={inputRef}
          type="text"
          placeholder={loading ? "Loading countries…" : "Type a country name…"}
          value={query}
          autoComplete="off"
          disabled={loading}
          onChange={e => { setQuery(e.target.value); onChange(""); setOpen(true); }}
          onFocus={() => { setFocused(true); setOpen(true); }}
          onBlur={() => setFocused(false)}
          className="tt-input tt-input-pl tt-input-pr"
          style={borderStyle}
        />

        {/* loading spinner */}
        {loading && (
          <div className="tt-icon-right">
            <svg className="tt-spin" width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="#FF6B35" strokeWidth="1.5" strokeDasharray="18 11"/>
            </svg>
          </div>
        )}

        {/* clear button */}
        {value && !loading && (
          <button
            type="button"
            className="tt-icon-right"
            style={{ background:"none", border:"none", cursor:"pointer", color:"#9ca3af", display:"flex", alignItems:"center" }}
            onMouseDown={e => { e.preventDefault(); onChange(""); setQuery(""); setOpen(true); inputRef.current?.focus(); }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* dropdown — show when open, whether loading or not */}
      {open && (
        <div className="tt-dropdown">
          {loading ? (
            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 14px", fontSize:13, color:"#9ca3af" }}>
              <svg className="tt-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="#FF6B35" strokeWidth="1.8" strokeDasharray="20 10"/>
              </svg>
              Loading countries…
            </div>
          ) : filtered.length === 0 ? (
            <div className="tt-dropdown-empty">No country matching "{query}"</div>
          ) : (
            <>
              {filtered.map(c => (
                <button
                  key={c.cca2}
                  type="button"
                  className={`tt-dropdown-item ${c.demonym === value ? "selected" : ""}`}
                  onMouseDown={() => select(c.demonym)}
                >
                  <span>{c.demonym}</span>
                  {c.demonym === value && (
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{flexShrink:0}}>
                      <path d="M2.5 6.5l3 3 5-5" stroke="#FF6B35" strokeWidth="1.6"
                        strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              ))}
              <div className="tt-dropdown-hint">
                {!query.trim() ? "Type to search all nationalities" : "Keep typing to narrow results…"}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}