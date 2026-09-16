import { useState } from "react";
import { MapPin, ShieldAlert } from "lucide-react";
import { SectionHead } from "./SectionHead";
import { Label, Hint, Err } from "./atoms";
import { inputBase, inputError } from "./buttons";
import { RELATIONSHIPS } from "./constants";
import { PhoneInput } from "../OnboardingDetails/PhoneInput";
import { useCountries } from "../OnboardingDetails/useCountries";
import { isPhoneValid } from "./validators";

export const StepEmergency = ({ form, patch }) => {
  const [touched, setTouched] = useState({});
  const { countries } = useCountries();

  const ec = form.emergencyContact || {};
  const patchEC = (u) => patch({ emergencyContact: { ...ec, ...u } });
  const touch = (k) => setTouched((p) => ({ ...p, [k]: true }));

  const nameErr  = touched.name  && !ec.name?.trim() ? "Required" : "";
  const phoneErr = touched.phone
    ? !ec.phone?.trim()          ? "Required"
      : !isPhoneValid(ec.phone)  ? "Enter a valid phone number (7–15 digits)."
      : ""
    : "";

  return (
    <div>
      <SectionHead
        title="Who should we call?"
        sub="One person we can reach if something goes wrong on a trip. They're never shown to other travellers."
      />

      <div className="mb-6 flex gap-3.5 rounded-2xl border border-line bg-surface-alt px-4 py-3.5">
        <ShieldAlert size={17} className="mt-0.5 shrink-0 text-accent" />
        <div>
          <p className="m-0 text-[13.5px] font-semibold text-ink">Why we ask</p>
          <p className="m-0 mt-1 text-[13px] leading-relaxed text-ink-soft">
            If you trigger an SOS — or the app notices you&apos;ve been off-route or
            stationary far too long — this person gets an alert with your last
            known location.
          </p>
        </div>
      </div>

      <div className="mb-5">
        <Label htmlFor="ob-ec-name">Full name</Label>
        <input
          id="ob-ec-name"
          type="text"
          placeholder="e.g. Abena Mensah"
          value={ec.name || ""}
          onChange={(e) => patchEC({ name: e.target.value })}
          onBlur={() => touch("name")}
          aria-invalid={!!nameErr || undefined}
          className={`${inputBase} ${nameErr ? inputError : ""}`}
        />
        <Err msg={nameErr} />
      </div>

      {/* This step used to show a fixed 🇬🇭 +233 block with no way to change
          it, while the step three screens earlier had a full country picker.
          A contact on a foreign number simply couldn't be entered, and the
          dial code sent to the server was "+233" no matter who you added. */}
      <div className="mb-5">
        <Label>Phone number</Label>
        <Hint>Include the country code if they&apos;re outside Ghana.</Hint>
        <PhoneInput
          phoneNumber={ec.phone || ""}
          dialCode={ec.dial_code || "+233"}
          onNumberChange={(v) => { patchEC({ phone: v }); touch("phone"); }}
          onDialChange={(v) => patchEC({ dial_code: v })}
          countries={countries}
          hasError={!!phoneErr}
        />
        <Err msg={phoneErr} />
      </div>

      <div className="mb-6">
        <Label optional>Relationship</Label>
        <div className="flex flex-wrap gap-2">
          {RELATIONSHIPS.map((r) => {
            const on = ec.relationship === r;
            return (
              <button
                key={r}
                type="button"
                aria-pressed={on}
                onClick={() => patchEC({ relationship: r })}
                className={`cursor-pointer rounded-full border px-4 py-2 text-[13.5px] font-medium transition-colors ${
                  on
                    ? "border-accent bg-accent text-accent-ink"
                    : "border-line bg-surface text-ink-soft hover:border-accent hover:text-accent"
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5">
        <MapPin size={15} className="mt-0.5 shrink-0 text-moss" />
        <p className="m-0 text-[13px] leading-relaxed text-ink-soft">
          <span className="font-semibold text-ink">Location sharing. </span>
          We ask for GPS permission before your first trip, not now. You can
          choose precise or approximate sharing any time in Settings.
        </p>
      </div>
    </div>
  );
};
