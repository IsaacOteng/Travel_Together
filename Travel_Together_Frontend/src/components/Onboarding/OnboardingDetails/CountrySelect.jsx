import { useState, useEffect, useRef } from "react";
import { searchCountries } from "../../../data/countries.js";

/* ─────────────────────────────────────────────
  COUNTRY SELECT  (with flags, for "country of residence")
───────────────────────────────────────────── */
export function CountrySelect({ value, onChange, countries, loading, hasError }) {
  const [query,   setQuery]   = useState(value || "");
  const [open,    setOpen]    = useState(false);
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => { if (!value) setQuery(""); }, [value]);
  useEffect(() => { if (value && !query) setQuery(value); }, [value]);

  // Shared matcher: tolerant of accents and punctuation, so "cote divoire"
  // still finds Côte d'Ivoire.
  const filtered = (query.trim()
    ? searchCountries(query, countries)
    : countries
  ).slice(0, 8);

  useEffect(() => {
    const h = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const select = c => { onChange(c.name); setQuery(c.name); setOpen(false); };
  const flag = value ? countries.find(c => c.name === value)?.flag : null;

  const borderStyle = hasError
    ? { border:"1.5px solid #f87171", boxShadow:"0 0 0 3px rgba(248,113,113,.10)" }
    : focused
    ? { border:"1.5px solid #FF6B35", boxShadow:"0 0 0 3px rgba(255,107,53,.10)" }
    : {};

  return (
    <div ref={wrapRef} style={{ position:"relative" }}>
      <div className="tt-input-icon-wrap">
        {flag && (
          <span className="tt-icon-left tt-flag"
            style={{ transform:"translateY(-50%)", top:"50%", left:11, fontSize:16, lineHeight:1 }}>
            {flag}
          </span>
        )}
        <input
          type="text"
          placeholder={loading ? "Loading…" : "Type to search…"}
          value={query} autoComplete="off"
          onChange={e => { setQuery(e.target.value); onChange(""); setOpen(true); }}
          onFocus={() => { setFocused(true); setOpen(true); }}
          onBlur={() => setFocused(false)}
          className="tt-input"
          style={{ paddingLeft: flag ? 36 : 12, paddingRight:28, ...borderStyle }}
        />
        <div className="tt-icon-right" style={{ pointerEvents:"none" }}>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none"
            style={{ transform: open ? "rotate(180deg)" : "none", transition:"transform .2s" }}>
            <path d="M2 3.5l3.5 3.5 3.5-3.5" stroke="#9ca3af" strokeWidth="1.4"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {open && (
        <div className="tt-dropdown">
          {loading ? (
            <div style={{ padding:"12px 14px", fontSize:13, color:"#9ca3af" }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="tt-dropdown-empty">No match for "{query}"</div>
          ) : (
            filtered.map(c => (
              <button key={c.cca2} type="button"
                className={`tt-dropdown-item ${c.name === value ? "selected" : ""}`}
                onMouseDown={() => select(c)}>
                <div className="tt-country-row">
                  {c.flag && <span className="tt-flag" style={{ fontSize:16, lineHeight:1 }}>{c.flag}</span>}
                  <span className="tt-country-name">{c.name}</span>
                </div>
                {c.name === value && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{flexShrink:0}}>
                    <path d="M2 6l3 3 5-5" stroke="#FF6B35" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}