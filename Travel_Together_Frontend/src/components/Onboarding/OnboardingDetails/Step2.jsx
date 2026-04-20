import { useState } from "react";
import { ProgressBar } from "./ProgressBar";
import { SectionHead } from "./SectionHead";
import { Err } from "./Err";
import { GpsBtn } from "./GpsBtn";
import { CountrySelect } from "./CountrySelect";
import { PhoneInput } from "./PhoneInput";

/* ─────────────────────────────────────────────
  STEP 2 — Location & Contact
───────────────────────────────────────────── */
export function Step2({ form, patch, countries, loadingCountries, onNext, onBack, submitting }) {
  const [t, setT] = useState({});
  const [f, setF] = useState({});

  const foc   = k => setF(s => ({ ...s, [k]:true  }));
  const unfoc = k => { setF(s => ({ ...s, [k]:false })); setT(s => ({ ...s, [k]:true })); };
  const touch = k => setT(s => ({ ...s, [k]:true }));

  const rawPhone = (form.phoneNumber || "").replace(/\D/g,"");
  const errs = {
    city:    !form.city?.trim()        ? "City is required"         : "",
    country: !form.country             ? "Country is required"      : "",
    phone:   !form.phoneNumber?.trim() ? "Phone number is required" : rawPhone.length < 5 ? "Enter a valid number" : "",
  };
  const allOk = Object.values(errs).every(e => !e);

  const next = () => {
    setT({ city:true, country:true, phone:true });
    if (allOk) onNext();
  };

  const inputBorder = (key) => f[key]
    ? { border:"1.5px solid #FF6B35", boxShadow:"0 0 0 3px rgba(255,107,53,.10)" }
    : t[key] && errs[key]
    ? { border:"1.5px solid #f87171", boxShadow:"0 0 0 3px rgba(248,113,113,.10)" }
    : {};

  const bioLen = (form.bio || "").length;

  return (
    <div className="tt-fadeUp">
      <ProgressBar step={2} total={3}/>
      <SectionHead icon="📍" title="Where do you live?"
        sub="Used for nearby trip suggestions. Only city and country are visible to other travelers."/>

      <div style={{ marginBottom:14 }}>
        <GpsBtn onDetect={(city, country) => {
          patch({ city, country });
          setT(s => ({ ...s, city:true, country:true }));
        }}/>
      </div>

      <div className="tt-divider">
        <div className="tt-divider-line"/>
        <span className="tt-divider-txt">or enter manually</span>
        <div className="tt-divider-line"/>
      </div>

      {/* City + Country — two columns */}
      <div className="tt-row2">
        <div>
          <label className="tt-label">City / Town <span className="tt-label-required">*</span></label>
          <input type="text" placeholder="Accra" value={form.city || ""}
            onChange={e => patch({ city: e.target.value })}
            onFocus={() => foc("city")} onBlur={() => unfoc("city")}
            className="tt-input" style={inputBorder("city")}/>
          {t.city && <Err msg={errs.city}/>}
        </div>
        <div>
          <label className="tt-label">Country <span className="tt-label-required">*</span></label>
          <CountrySelect
            value={form.country || ""}
            onChange={v => { patch({ country: v }); touch("country"); }}
            countries={countries} loading={loadingCountries}
            hasError={!!(t.country && errs.country)}/>
          {t.country && <Err msg={errs.country}/>}
        </div>
      </div>

      {/* Location pill */}
      {form.city && form.country && (
        <div className="tt-location-pill">
          <svg width="9" height="11" viewBox="0 0 9 11" fill="#FF6B35">
            <path d="M4.5 0C2.57 0 1 1.57 1 3.5c0 2.66 3.5 7 3.5 7s3.5-4.34 3.5-7C8 1.57 6.43 0 4.5 0zm0 5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
          </svg>
          {form.city}, {form.country}
        </div>
      )}

      {/* Phone */}
      <div style={{ marginBottom:14 }}>
        <label className="tt-label">Phone Number <span className="tt-label-required">*</span></label>
        <p className="tt-hint">For SOS emergency alerts only — never shown publicly.</p>
        <PhoneInput
          phoneNumber={form.phoneNumber || ""}
          dialCode={form.dialCode || "+233"}
          onNumberChange={v => { patch({ phoneNumber: v }); touch("phone"); }}
          onDialChange={v => patch({ dialCode: v })}
          countries={countries}
          hasError={!!(t.phone && errs.phone)}/>
        {t.phone && <Err msg={errs.phone}/>}
      </div>

      {/* Bio */}
      <div style={{ marginBottom:24 }}>
        <label className="tt-label">Short Bio</label>
        <p className="tt-hint">Shown on your profile and join-request previews. Optional.</p>
        <div className="tt-textarea-wrap">
          <textarea rows={3} maxLength={200}
            placeholder="Your travel style, interests, dream destinations…"
            value={form.bio || ""}
            onChange={e => patch({ bio: e.target.value })}
            onFocus={() => foc("bio")} onBlur={() => unfoc("bio")}
            className="tt-textarea"
            style={f.bio ? { border:"1.5px solid #FF6B35", boxShadow:"0 0 0 3px rgba(255,107,53,.10)" } : {}}/>
          <span className={`tt-char-count ${bioLen >= 180 ? "warn" : ""}`}>{bioLen}/200</span>
        </div>
      </div>

      <div className="tt-btn-row">
        <button type="button" className="tt-btn-ghost" onClick={onBack}>← Back</button>
        <button type="button" className="tt-btn-primary" onClick={next} disabled={!allOk || submitting}>
          {submitting ? "Saving…" : "Continue →"}
        </button>
      </div>
    </div>
  );
}