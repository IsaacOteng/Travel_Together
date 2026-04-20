import { useState } from "react";
import { ProgressBar } from "./ProgressBar";
import { SectionHead } from "./SectionHead";
import { Err } from "./Err";
import { Ok } from "./Ok";
import { NationalitySelect } from "./NationalitySelect";

/* ─────────────────────────────────────────────
  STEP 1 — Personal details
───────────────────────────────────────────── */
export function Step1({ form, patch, countries, loadingCountries, onNext, submitting }) {
  const [t, setT] = useState({});  // touched
  const [f, setF] = useState({});  // focused

  const foc   = k => setF(s => ({ ...s, [k]:true  }));
  const unfoc = k => { setF(s => ({ ...s, [k]:false })); setT(s => ({ ...s, [k]:true })); };
  const touch = k => setT(s => ({ ...s, [k]:true }));

  const age = form.dob ? Math.floor((Date.now() - new Date(form.dob)) / (365.25*24*3600e3)) : null;

  const errs = {
    firstName:   !form.firstName?.trim()  ? "Required"    : form.firstName.trim().length < 2 ? "Too short" : "",
    lastName:    !form.lastName?.trim()   ? "Required"    : form.lastName.trim().length  < 2 ? "Too short" : "",
    dob:         !form.dob               ? "Required"    : age < 13 ? "Must be 13 or older" : age > 120 ? "Invalid date" : "",
    gender:      !form.gender            ? "Required"    : "",
    nationality: !form.nationality       ? "Please select your nationality" : "",
  };
  const allOk = Object.values(errs).every(e => !e);

  const next = () => {
    setT({ firstName:true, lastName:true, dob:true, gender:true, nationality:true });
    if (allOk) onNext();
  };

  const inputBorder = (key) => f[key]
    ? { border:"1.5px solid #FF6B35", boxShadow:"0 0 0 3px rgba(255,107,53,.10)" }
    : t[key] && errs[key]
    ? { border:"1.5px solid #f87171", boxShadow:"0 0 0 3px rgba(248,113,113,.10)" }
    : {};

  return (
    <div className="tt-fadeUp">
      <ProgressBar step={1} total={3}/>
      <SectionHead icon="👤" title="Nice to meet you"/>

      {/* First + Last name — two columns via inline CSS grid */}
      <div className="tt-row2">
        <div>
          <label className="tt-label">First Name <span className="tt-label-required">*</span></label>
          <input type="text" placeholder="Lois" value={form.firstName || ""}
            onChange={e => patch({ firstName: e.target.value })}
            onFocus={() => foc("firstName")} onBlur={() => unfoc("firstName")}
            className="tt-input" style={inputBorder("firstName")}/>
          {t.firstName && <Err msg={errs.firstName}/>}
        </div>
        <div>
          <label className="tt-label">Last Name <span className="tt-label-required">*</span></label>
          <input type="text" placeholder="Owusu" value={form.lastName || ""}
            onChange={e => patch({ lastName: e.target.value })}
            onFocus={() => foc("lastName")} onBlur={() => unfoc("lastName")}
            className="tt-input" style={inputBorder("lastName")}/>
          {t.lastName && <Err msg={errs.lastName}/>}
        </div>
      </div>

      {/* DOB + Gender — two columns */}
      <div className="tt-row2">
        <div>
          <label className="tt-label">Date of Birth <span className="tt-label-required">*</span></label>
          <div className="tt-input-icon-wrap">
            <input type="date" value={form.dob || ""}
              max={new Date(Date.now() - 13*365.25*24*3600e3).toISOString().slice(0,10)}
              onChange={e => patch({ dob: e.target.value })}
              onFocus={() => foc("dob")} onBlur={() => unfoc("dob")}
              className="tt-input"
              style={{ paddingRight: age && !errs.dob ? 52 : 12, ...inputBorder("dob") }}/>
            {age && !errs.dob && <span className="tt-age-badge">{age} yrs</span>}
          </div>
          {t.dob && <Err msg={errs.dob}/>}
        </div>
        <div>
          <label className="tt-label">Gender <span className="tt-label-required">*</span></label>
          <select value={form.gender || ""}
            onChange={e => { patch({ gender: e.target.value }); touch("gender"); }}
            onFocus={() => foc("gender")} onBlur={() => unfoc("gender")}
            className="tt-select"
            style={t.gender && errs.gender
              ? { border:"1.5px solid #f87171", boxShadow:"0 0 0 3px rgba(248,113,113,.10)" }
              : f.gender ? { border:"1.5px solid #FF6B35", boxShadow:"0 0 0 3px rgba(255,107,53,.10)" } : {}}>
            <option value="">Select…</option>
            <option>Male</option>
            <option>Female</option>
            <option>Non-binary</option>
            <option>Prefer not to say</option>
          </select>
          {t.gender && <Err msg={errs.gender}/>}
        </div>
      </div>

      {/* Nationality */}
      <div className="tt-row2-wide" style={{ marginBottom:24 }}>
        <label className="tt-label">Nationality <span className="tt-label-required">*</span></label>
        <NationalitySelect
          value={form.nationality || ""}
          onChange={v => { patch({ nationality: v }); touch("nationality"); }}
          countries={countries}
          loading={loadingCountries}
          hasError={!!(t.nationality && errs.nationality)}/>
        {t.nationality && <Err msg={errs.nationality}/>}
        {form.nationality && <Ok msg={`${form.nationality} selected`}/>}
      </div>

      <button type="button" className="tt-btn-primary" onClick={next} disabled={submitting}>
        {submitting ? "Saving…" : "Continue →"}
      </button>
    </div>
  );
}