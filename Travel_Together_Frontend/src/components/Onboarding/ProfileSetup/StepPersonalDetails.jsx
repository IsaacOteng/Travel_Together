import { useState } from "react";
import { SectionHead } from "./SectionHead";
import { Label, Hint, Err } from "./atoms";
import { inputBase } from "./buttons";
import { NationalitySelect } from "../OnboardingDetails/NationalitySelect";
import { CountrySelect } from "../OnboardingDetails/CountrySelect";
import { PhoneInput } from "../OnboardingDetails/PhoneInput";
import { GpsBtn } from "../OnboardingDetails/GpsBtn";
import { useCountries } from "../OnboardingDetails/useCountries";

export const StepPersonalDetails = ({ form, patch }) => {
  const [touched, setTouched] = useState({});
  const { countries, loading: loadingC } = useCountries();

  const touch = (k) => setTouched((p) => ({ ...p, [k]: true }));
  const touchAll = () => setTouched({ dob: true, gender: true, nationality: true, city: true, phone: true });

  const age = form.dob ? Math.floor((Date.now() - new Date(form.dob)) / (365.25 * 24 * 3600e3)) : null;
  const rawPhone = (form.phoneNumber || "").replace(/\D/g, "");

  const errs = {
    dob:         !form.dob          ? "Required" : age < 13 ? "Must be 13 or older" : age > 120 ? "Invalid date" : "",
    gender:      !form.gender       ? "Required" : "",
    nationality: !form.nationality  ? "Required" : "",
    city:        !form.city?.trim() ? "Required" : "",
    phone:       !form.phoneNumber?.trim() ? "Required" : rawPhone.length < 7 ? "Enter a valid phone number (min 7 digits)" : rawPhone.length > 15 ? "Phone number too long" : "",
  };

  return (
    <div>
      <SectionHead icon="👤" title="Personal details" sub="Used to verify identity and personalise your experience. Never shared publicly." />

      {/* DOB + Gender */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <Label>Date of birth <span className="text-[#FF6B35]">*</span></Label>
          <div className="relative">
            <input
              type="date"
              value={form.dob || ""}
              max={new Date(Date.now() - 13 * 365.25 * 24 * 3600e3).toISOString().slice(0, 10)}
              onChange={(e) => { patch({ dob: e.target.value }); touch("dob"); }}
              onBlur={() => touch("dob")}
              className={`${inputBase} [color-scheme:light]`}
            />
            {age && !errs.dob && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-orange-50 text-[#FF6B35] font-bold px-1.5 py-0.5 rounded-full pointer-events-none">
                {age} yrs
              </span>
            )}
          </div>
          {touched.dob && <Err msg={errs.dob} />}
        </div>
        <div>
          <Label>Gender <span className="text-[#FF6B35]">*</span></Label>
          <select
            value={form.gender || ""}
            onChange={(e) => { patch({ gender: e.target.value }); touch("gender"); }}
            onBlur={() => touch("gender")}
            className={inputBase}
          >
            <option value="">Select…</option>
            <option>Male</option>
            <option>Female</option>
            <option>Non-binary</option>
            <option>Prefer not to say</option>
          </select>
          {touched.gender && <Err msg={errs.gender} />}
        </div>
      </div>

      {/* Nationality */}
      <div className="mb-4">
        <Label>Nationality <span className="text-[#FF6B35]">*</span></Label>
        <NationalitySelect
          value={form.nationality || ""}
          onChange={(v) => { patch({ nationality: v }); touch("nationality"); }}
          countries={countries}
          loading={loadingC}
          hasError={!!(touched.nationality && errs.nationality)}
        />
        {touched.nationality && <Err msg={errs.nationality} />}
      </div>

      {/* City + Country */}
      <div className="mb-1">
        <Label>Where do you live? <span className="text-[#FF6B35]">*</span></Label>
        <Hint>Only city and country are visible to other travelers.</Hint>
        <div className="mb-2">
          <GpsBtn onDetect={(city, country) => { patch({ city, country }); setTouched((p) => ({ ...p, city: true })); }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <input
            type="text"
            placeholder="City / Town"
            value={form.city || ""}
            onChange={(e) => { patch({ city: e.target.value }); touch("city"); }}
            onBlur={() => touch("city")}
            className={inputBase}
          />
          {touched.city && <Err msg={errs.city} />}
        </div>
        <div>
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
      <div className="mb-2">
        <Label>Phone number <span className="text-[#FF6B35]">*</span></Label>
        <Hint>For SOS emergency alerts only — never shown publicly.</Hint>
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

export const stepPersonalRequired = (f) => {
  const raw = (f.phoneNumber || "").replace(/\D/g, "");
  const age = f.dob ? Math.floor((Date.now() - new Date(f.dob)) / (365.25 * 24 * 3600e3)) : null;
  return !!(f.dob && age >= 13 && f.gender && f.nationality && f.city?.trim() && raw.length >= 7 && raw.length <= 15);
};
