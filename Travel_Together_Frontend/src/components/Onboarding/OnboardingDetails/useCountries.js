import { useState, useEffect } from "react";

/* ─────────────────────────────────────────────
  HOOK — countries  (restcountries, CORS-safe)
    Uses country names for nationality (100% reliable)
───────────────────────────────────────────── */
export function useCountries() {
  const [list,    setList]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    let dead = false;
    fetch("https://restcountries.com/v3.1/all?fields=name,flags,idd,demonyms,cca2")
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(raw => {
        if (dead) return;
        const mapped = raw
          .map(c => {
            const root = c.idd?.root || "";
            const suf  = c.idd?.suffixes?.[0] || "";
            const dial = root && suf && suf.length <= 3 ? `${root}${suf}` : root;
            return {
              name:    c.name?.common   || "",
              flagSvg: c.flags?.svg     || c.flags?.png || "",
              demonym: c.demonyms?.eng?.m || c.demonyms?.common || c.name?.common || "",
              dial,
              cca2:    c.cca2 || "",
            };
          })
          .filter(c => c.name)
          .sort((a, b) => a.name.localeCompare(b.name));
        setList(mapped);
        setLoading(false);
      })
      .catch(() => {
        if (!dead) { setError("Could not load countries, please check your connection."); setLoading(false); }
      });
    return () => { dead = true; };
  }, []);

  return { countries: list, loading, error };
}