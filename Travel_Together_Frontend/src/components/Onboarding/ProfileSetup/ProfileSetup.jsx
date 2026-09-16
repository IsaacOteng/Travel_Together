import { useState, useCallback } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import OnboardingShell from "./OnboardingShell";
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
      // Final step mark onboarding complete
      await usersApi.onboardingStep({ onboarding_complete: true });
      break;
    }
    default:
      break;
  }
}

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
  const isLast        = step === STEPS.length - 1;

  const handleAdvance = async () => {
    setSubmitting(true);
    setApiError("");
    try {
      await saveStep(STEPS[step].id, form);
      if (!isLast) setStep((s) => s + 1);
      else setDone(true);
    } catch (err) {
      setApiError(err.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* Skipping the last step used to run setStep past the end of STEPS, which
     leaves StepComponent undefined and crashes on render. It never fired only
     because the one skippable step happens not to be last — the branch below
     was already written as though it could be. It now finishes the flow. */
  const handleSkip = async () => {
    setSubmitting(true);
    setApiError("");
    try {
      if (isLast) await usersApi.onboardingStep({ onboarding_complete: true });
    } catch {
      /* Skipping is best-effort; a failure here shouldn't trap someone in
         onboarding. The next screen reconciles with the server anyway. */
    } finally {
      if (isLast) setDone(true);
      else setStep((s) => s + 1);
      setSubmitting(false);
    }
  };

  return (
    <OnboardingShell steps={STEPS} current={step} done={done}>
      {done ? (
        <SuccessScreen form={form} onContinue={onComplete} />
      ) : (
        <div key={step} style={{ animation: "ttFadeUp .3s ease both" }}>
          <StepComponent form={form} patch={patch} />

          {apiError && (
            <p
              role="alert"
              className="mt-5 rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[13px] text-danger"
            >
              {apiError}
            </p>
          )}

          <div className="mt-7 flex gap-2.5">
            {step > 0 && (
              <BtnGhost onClick={() => setStep((s) => s - 1)} disabled={submitting}>
                <ArrowLeft size={15} />
                <span className="hidden sm:inline">Back</span>
              </BtnGhost>
            )}
            <BtnPrimary onClick={handleAdvance} disabled={!canAdvance || submitting}>
              {submitting ? "Saving…" : isLast ? "Finish setup" : "Continue"}
              {!submitting && <ArrowRight size={16} />}
            </BtnPrimary>
          </div>

          {isSkippable && (
            <button
              type="button"
              onClick={handleSkip}
              disabled={submitting}
              className="mt-4 w-full cursor-pointer border-none bg-transparent text-center text-[13px] text-ink-mute transition-colors hover:text-accent disabled:opacity-40"
            >
              Skip — you can set this later
            </button>
          )}
        </div>
      )}
    </OnboardingShell>
  );
}
