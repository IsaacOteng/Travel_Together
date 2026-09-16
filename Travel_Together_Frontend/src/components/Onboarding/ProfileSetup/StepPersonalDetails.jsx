import { useState } from "react";
import { SectionHead } from "./SectionHead";
import { Label, Hint, Err } from "./atoms";
import { inputBase, inputError } from "./buttons";
import { NationalitySelect } from "../OnboardingDetails/NationalitySelect";
import { CountrySelect } from "../OnboardingDetails/CountrySelect";
import { PhoneInput } from "../OnboardingDetails/PhoneInput";
import { GpsBtn } from "../OnboardingDetails/GpsBtn";
import { useCountries } from "../OnboardingDetails/useCountries";
import { ageFrom, isPhoneValid } from "./validators";

const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];

/* The latest date of birth that still clears the 13+ floor. Computed once on
   load rather than on every render — it was a new Date(Date.now()) inline in
   the input's max, which makes the render impure for a value that only moves
   once a day. */
const MAX_DOB = new Date(Date.now() - 13 * 365.25 * 24 * 3600e3)
  .toISOString()
  .slice(0, 10);

export const StepPersonalDetails = ({ form, patch }) => {
  const [touched, setTouched] = useState({});
  const { countries, loading: loadingC } = useCountries();

  const touch = (k) => setTouched((p) => ({ ...p, [k]: true }));

  const age = ageFrom(form.dob);

  const errs = {
    dob:         !form.dob          ? "Required" : age < 13 ? "You need to be 13 or older." : age > 120 ? "That date doesn't look right." : "",
    gender:      !form.gender       ? "Required" : "",
    nationality: !form.nationality  ? "Required" : "",
    city:        !form.city?.trim() ? "Required" : "",
    phone:       !form.phoneNumber?.trim() ? "Required" : !isPhoneValid(form.phoneNumber) ? "Enter a valid phone number (7–15 digits)." : "",
  };

  return (
    <div>
      <SectionHead
        title="A few details about you"
        sub="Your age and nationality help organisers run a safe group. Only your city and country are ever shown publicly."
      />

      {/* Date of birth */}
      <div className="mb-5">
        <Label htmlFor="ob-dob">Date of birth</Label>
        <div className="relative">
          <input
            id="ob-dob"
            type="date"
            value={form.dob || ""}
            max={MAX_DOB}
            onChange={(e) => { patch({ dob: e.target.value }); touch("dob"); }}
            onBlur={() => touch("dob")}
            aria-invalid={!!(touched.dob && errs.dob) || undefined}
            className={`${inputBase} ${touched.dob && errs.dob ? inputError : ""}`}
          />
          {age > 0 && !errs.dob && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-accent-soft px-2 py-0.5 text-[11.5px] font-semibold text-accent">
              {age}
            </span>
          )}
        </div>
        {touched.dob && <Err msg={errs.dob} />}
      </div>

      {/* Gender — was a native <select>, which on Windows opens an unstyleable
          OS list. Four options fit as chips, so the choice is visible without
          opening anything. */}
      <div className="mb-5">
        <Label>Gender</Label>
        <div className="flex flex-wrap gap-2">
          {GENDERS.map((g) => {
            const on = form.gender === g;
            return (
              <button
                key={g}
                type="button"
                aria-pressed={on}
                onClick={() => { patch({ gender: g }); touch("gender"); }}
                className={`cursor-pointer rounded-full border px-4 py-2 text-[13.5px] font-medium transition-colors ${
                  on
                    ? "border-accent bg-accent text-accent-ink"
                    : "border-line bg-surface text-ink-soft hover:border-accent hover:text-accent"
                }`}
              >
                {g}
              </button>
            );
          })}
        </div>
        {touched.gender && <Err msg={errs.gender} />}
      </div>

      {/* Nationality */}
      <div className="mb-5">
        <Label>Nationality</Label>
        <NationalitySelect
          value={form.nationality || ""}
          onChange={(v) => { patch({ nationality: v }); touch("nationality"); }}
          countries={countries}
          loading={loadingC}
          hasError={!!(touched.nationality && errs.nationality)}
        />
        {touched.nationality && <Err msg={errs.nationality} />}
      </div>

      {/* Location */}
      <div className="mb-5">
        <Label>Where do you live?</Label>
        <Hint>Only your city and country are visible to other travellers.</Hint>
        <div className="mb-2.5">
          <GpsBtn onDetect={(city, country) => { patch({ city, country }); touch("city"); }} />
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div>
            <input
              type="text"
              placeholder="City or town"
              value={form.city || ""}
              onChange={(e) => { patch({ city: e.target.value }); touch("city"); }}
              onBlur={() => touch("city")}
              aria-label="City or town"
              aria-invalid={!!(touched.city && errs.city) || undefined}
              className={`${inputBase} ${touched.city && errs.city ? inputError : ""}`}
            />
            {touched.city && <Err msg={errs.city} />}
          </div>
          <CountrySelect
            value={form.country || ""}
            onChange={(v) => patch({ country: v })}
            countries={countries}
            loading={loadingC}
            hasError={false}
          />
        </div>
      </div>

      {/* Phone */}
      <div>
        <Label>Phone number</Label>
        <Hint>Used for SOS alerts only. It is never shown on your profile.</Hint>
        <PhoneInput
          phoneNumber={form.phoneNumber || ""}
          dialCode={form.dialCode || "+233"}
          onNumberChange={(v) => { patch({ phoneNumber: v }); touch("phone"); }}
          onDialChange={(v) => patch({ dialCode: v })}
          countries={countries}
          hasError={!!(touched.phone && errs.phone)}
        />
        {touched.phone && <Err msg={errs.phone} />}
      </div>
    </div>
  );
};
