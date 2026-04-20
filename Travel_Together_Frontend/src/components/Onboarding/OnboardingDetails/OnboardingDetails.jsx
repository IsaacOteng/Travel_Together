import { useState, useCallback } from "react";
import { useCountries } from "./useCountries";
import { Step1 } from "./Step1";
import { Step2 } from "./Step2";
import { Step3 } from "./Step3";
import { Success } from "./Success";
import { usersApi } from "../../../services/api";

/* ─── payload builders per step ──────────────────── */
const buildPayload = (step, form) => {
  if (step === 1) return {
    first_name:    form.firstName?.trim(),
    last_name:     form.lastName?.trim(),
    date_of_birth: form.dob,
    gender:        form.gender,
    nationality:   form.nationality,
  };
  if (step === 2) return {
    city:         form.city?.trim(),
    country:      form.country,
    dial_code:    form.dialCode || "+233",
    phone_number: form.phoneNumber?.trim(),
    ...(form.bio?.trim() ? { bio: form.bio.trim() } : {}),
  };
  if (step === 3) return { username: form.username };
  return {};
};

/* ─────────────────────────────────────────────
  ROOT
───────────────────────────────────────────── */
export default function OnboardingDetails({ onComplete }) {
  const [step,       setStep]       = useState(1);
  const [form,       setForm]       = useState({ dialCode:"+233" });
  const [submitting, setSubmitting] = useState(false);
  const [apiError,   setApiError]   = useState("");
  const { countries, loading: loadingC, error: errC } = useCountries();
  const patch = useCallback(u => setForm(p => ({ ...p, ...u })), []);

  const goNext = async (targetStep) => {
    setSubmitting(true);
    setApiError("");
    try {
      await usersApi.onboardingStep(buildPayload(step, form));
      setStep(targetStep);
    } catch (err) {
      setApiError(err.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="tt-page">

        {/* topbar */}
        <header className="tt-topbar">
          <div className="tt-logo">
            <img src="/src/assets/official_logo_nobg.png" alt="Logo" style={{ width:40, height:40 }}/>
            <span className="tt-logo-name">Travel Together</span>
          </div>
          {step <= 3 && (
            <div className="tt-stepdots">
              {[1,2,3].map(s => (
                <div key={s} className={`tt-dot ${s === step ? "tt-dot-active" : s < step ? "tt-dot-done" : "tt-dot-upcoming"}`}/>
              ))}
            </div>
          )}
        </header>

        {(errC || apiError) && (
          <div style={{ maxWidth:520, margin:"8px auto 0", padding:"0 16px" }}>
            <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:10, padding:"10px 14px", fontSize:12, color:"#dc2626" }}>
              ⚠️ {apiError || errC}
            </div>
          </div>
        )}

        {/* main content */}
        <main className="tt-main">
          <div className="tt-wrap">
            <div className="tt-card">
              {step === 1 && <Step1 form={form} patch={patch} countries={countries} loadingCountries={loadingC} onNext={() => goNext(2)} submitting={submitting}/>}
              {step === 2 && <Step2 form={form} patch={patch} countries={countries} loadingCountries={loadingC} onNext={() => goNext(3)} onBack={() => setStep(1)} submitting={submitting}/>}
              {step === 3 && <Step3 form={form} patch={patch} onNext={() => goNext(4)} onBack={() => setStep(2)} submitting={submitting}/>}
              {step === 4 && <Success form={form} onContinue={() => onComplete?.(form.firstName)}/>}
            </div>

            {step < 4 && (
              <p className="tt-signin-hint">
                Already have an account? <a href="/signup">Sign in</a>
              </p>
            )}
          </div>
        </main>

        <footer className="tt-footer">
          © {new Date().getFullYear()} Travel Together, Inc.
        </footer>
      </div>
    </>
  );
}