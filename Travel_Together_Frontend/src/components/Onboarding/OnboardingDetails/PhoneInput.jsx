import { useState, useEffect, useRef } from "react";

/* ─────────────────────────────────────────────
  PHONE INPUT
───────────────────────────────────────────── */
export function PhoneInput({ phoneNumber, dialCode, onNumberChange, onDialChange, countries, hasError }) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);

  const dialList = (() => {
    const seen = new Map();
    countries.forEach(c => {
      if (!c.dial) return;
      if (!seen.has(c.dial)) seen.set(c.dial, { code:c.dial, flag:c.flagSvg, name:c.name, cca2:c.cca2 });
    });
    return [...seen.values()].sort((a,b) => a.name.localeCompare(b.name));
  })();

  const filtered = query
    ? dialList.filter(d => d.name.toLowerCase().includes(query.toLowerCase()) || d.code.includes(query)).slice(0,50)
    : dialList.slice(0,50);

  useEffect(() => {
    const h = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const sel = dialList.find(d => d.code === dialCode);
  const numBorder = hasError
    ? { border:"1.5px solid #f87171", boxShadow:"0 0 0 3px rgba(248,113,113,.10)" }
    : {};

  return (
    <div className="tt-phone-row" ref={wrapRef}>
      {/* dial picker */}
      <div style={{ position:"relative", flexShrink:0 }}>
        <button type="button" className="tt-dial-btn" onClick={() => setOpen(o => !o)}>
          {sel?.flag
            ? <img src={sel.flag} alt="" className="tt-flag"/>
            : <div style={{ width:20, height:14, background:"#e5e7eb", borderRadius:2, flexShrink:0 }}/>
          }
          <span>{dialCode || "+?"}</span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
            style={{ marginLeft:2, transform:open?"rotate(180deg)":"none", transition:"transform .15s" }}>
            <path d="M2 3.5l3 3 3-3" stroke="#9ca3af" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </button>

        {open && (
          <div className="tt-dial-dd">
            <div className="tt-dial-dd-inner">
              <div className="tt-dial-search">
                <input autoFocus type="text" placeholder="Search country…"
                  value={query} onChange={e => setQuery(e.target.value)}/>
              </div>
              <div className="tt-dial-list tt-scroll">
                {filtered.map(d => (
                  <button key={d.cca2} type="button"
                    className={`tt-dial-item ${d.code === dialCode ? "selected" : ""}`}
                    onMouseDown={() => { onDialChange(d.code); setOpen(false); setQuery(""); }}>
                    {d.flag && <img src={d.flag} alt="" className="tt-flag"/>}
                    <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.name}</span>
                    <span className="tt-dial-code">{d.code}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* number */}
      <input type="tel" placeholder="24 123 4567" value={phoneNumber}
        onChange={e => onNumberChange(e.target.value.replace(/[^0-9\s\-+]/g,""))}
        className="tt-input"
        style={{ flex:1, ...numBorder }}
      />
    </div>
  );
}