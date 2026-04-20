import { useState, useCallback } from "react";
import { ProgressBar } from "./ProgressBar";
import { SuccessScreen } from "./SuccessScreen";
import { BtnPrimary, BtnGhost } from "./buttons";
import { STEPS } from "./steps";
import { usersApi } from "../../../services/api";
import api from "../../../services/api";

/* ── per-step API call ────────────────────────────────────────── */
async function saveStep(stepId, form) {
  switch (stepId) {
    case "photo": {
      if (form.photo || form.cover) {
        const fd = new FormData();
        if (form.photo)               fd.append("avatar", form.photo);
        if (form.cover)               fd.append("cover",  form.cover);
        if (form.coverPosition)       fd.append("cover_position", `${Math.round(form.coverPosition.x)}% ${Math.round(form.coverPosition.y)}%`);
        if (form.displayName?.trim()) fd.append("first_name", form.displayName.trim());
        if (form.bio?.trim())         fd.append("bio", form.bio.trim());
        await api.patch("/api/users/me/", fd, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        const payload = {};
        if (form.displayName?.trim()) payload.first_name = form.displayName.trim();
        if (form.bio?.trim())         payload.bio        = form.bio.trim();
        if (Object.keys(payload).length) await usersApi.updateMe(payload);
      }
      break;
    }
    case "personal": {
      await usersApi.onboardingStep({
        date_of_birth: form.dob,
        gender:        form.gender,
        nationality:   form.nationality,
        city:          form.city?.trim(),
        country:       form.country || "",
        phone_number:  form.phoneNumber?.trim(),
        dial_code:     form.dialCode || "+233",
      });
      break;
    }
    case "username": {
      await usersApi.onboardingStep({ username: form.username?.trim() });
      break;
    }
    case "interests": {
      if ((form.tripTypes || []).length > 0)
        await usersApi.updatePreferences({ trip_types: form.tripTypes });
      break;
    }
    case "emergency": {
      const ec = form.emergencyContact || {};
      await usersApi.addContact({
        name:         ec.name?.trim(),
        phone:        ec.phone?.trim(),
        dial_code:    ec.dial_code    || "+233",
        relationship: ec.relationship || "Other",
        priority:     1,
      });
      // Final step — mark onboarding complete
      await usersApi.onboardingStep({ onboarding_complete: true });
      break;
    }
    default:
      break;
  }
}

/* ══════════════════════════════════════════════════
   ROOT — matches tt-page layout exactly
══════════════════════════════════════════════════ */
export default function ProfileSetup({ onComplete }) {
  const [step,       setStep]       = useState(0);
  const [done,       setDone]       = useState(false);
  const [form,       setForm]       = useState({ budget: 1 });
  const [submitting, setSubmitting] = useState(false);
  const [apiError,   setApiError]   = useState("");
  const patch = useCallback((u) => setForm((p) => ({ ...p, ...u })), []);

  const StepComponent = STEPS[step]?.component;
  const canAdvance    = STEPS[step]?.required(form) ?? true;
  const isSkippable   = STEPS[step]?.skippable ?? false;

  const handleAdvance = async () => {
    setSubmitting(true);
    setApiError("");
    try {
      await saveStep(STEPS[step].id, form);
      if (step < STEPS.length - 1) setStep((s) => s + 1);
      else setDone(true);
    } catch (err) {
      setApiError(err.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setSubmitting(true);
    setApiError("");
    try {
      // On final step skip, still mark onboarding complete
      if (step === STEPS.length - 1) await usersApi.onboardingStep({ onboarding_complete: true });
      setStep((s) => s + 1);
    } catch {
      setStep((s) => s + 1); // skip silently on error
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* keyframe styles — mirrors Globalstyles.jsx animations */}
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes popIn  { from { opacity:0; transform:scale(.72); }     to { opacity:1; transform:scale(1);    } }
      `}</style>

      {/* tt-page — exact background from Globalstyles */}
      <div
        className="min-h-screen flex flex-col"
        style={{
          backgroundColor: "#f7f6f4",
          backgroundImage:
            "radial-gradient(circle at 18% 18%, rgba(255,107,53,.08) 0%, transparent 50%), " +
            "radial-gradient(circle at 82% 82%, rgba(30,58,95,.06) 0%, transparent 50%)",
          fontFamily: '-apple-system, "Helvetica Neue", sans-serif',
        }}
      >
        {/* ── tt-topbar ── */}
        <header className="flex items-center justify-between px-6 py-2.5">
          <div className="flex items-center gap-px">
            <img
              src="/src/assets/official_logo_nobg.png"
              alt="Travel Together logo"
              className="w-10 h-10"
              onError={(e) => { e.target.style.display = "none"; }}
            />
            <span className="text-[14px] font-semibold text-[#1E3A5F] tracking-[-0.3px]">Travel Together</span>
          </div>

          {/* tt-stepdots */}
          {!done && (
            <div className="flex items-center gap-1.25">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all duration-300"
                  style={{
                    height: 6,
                    width: i === step ? 20 : i < step ? 6 : 6,
                    background: i <= step ? "#FF6B35" : "#d1d5db",
                    opacity: i < step ? 0.4 : 1,
                  }}
                />
              ))}
            </div>
          )}
        </header>

        {/* ── tt-main ── */}
        <main className="flex-1 flex items-start justify-center px-4 pt-7.5 pb-2.5 lg:pt-0">
          <div className="w-full max-w-150">

            {done ? (
              /* tt-card */
              <div
                className="bg-white rounded-[20px] px-9 py-9"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,.04), 0 10px 36px rgba(0,0,0,.08)" }}
              >
                <SuccessScreen form={form} onContinue={onComplete} />
              </div>
            ) : (
              <>
                {/* tt-card */}
                <div
                  className="bg-white rounded-[20px] px-9 py-9"
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,.04), 0 10px 36px rgba(0,0,0,.08)" }}
                >
                  <ProgressBar step={step + 1} total={STEPS.length} />

                  <div style={{ animation: "fadeUp .22s ease both" }}>
                    <StepComponent form={form} patch={patch} />
                  </div>

                  {/* API error */}
                  {apiError && (
                    <p className="text-red-500 text-[11px] mt-4 text-center">{apiError}</p>
                  )}

                  {/* tt-btn-row */}
                  <div className="flex gap-2.5 mt-4">
                    {step > 0 && (
                      <BtnGhost onClick={() => setStep((s) => s - 1)} disabled={submitting}>← Back</BtnGhost>
                    )}
                    <BtnPrimary onClick={handleAdvance} disabled={!canAdvance || submitting}>
                      {submitting ? "Saving…" : step < STEPS.length - 1 ? "Continue →" : "Finish Setup →"}
                    </BtnPrimary>
                  </div>

                  {/* skip link */}
                  {isSkippable && (
                    <button
                      type="button"
                      onClick={handleSkip}
                      disabled={submitting}
                      className="w-full mt-3 text-[11px] text-gray-400 hover:text-[#5576a0] transition text-center cursor-pointer disabled:opacity-40"
                    >
                      Skip for now — you can update this later
                    </button>
                  )}
                </div>

                {/* tt-signin-hint */}
                <p className="text-center text-[12px] text-gray-400 mt-4">
                  Already have an account?{" "}
                  <a href="/signup" className="text-[#FF6B35] font-semibold no-underline hover:underline">
                    Sign in
                  </a>
                </p>
              </>
            )}
          </div>
        </main>

        <footer className="text-center py-4 text-[11px] text-[#5576a0]">
          © {new Date().getFullYear()} Travel Together, Inc.
        </footer>
      </div>
    </>
  );
}