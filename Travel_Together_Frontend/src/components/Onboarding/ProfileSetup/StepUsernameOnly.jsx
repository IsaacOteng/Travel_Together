import { useEffect } from "react";
import { Loader2, Check, X } from "lucide-react";
import { SectionHead } from "./SectionHead";
import { Label, Hint, Err, Ok } from "./atoms";
import { inputBase, inputError } from "./buttons";
import { useUsername } from "../OnboardingDetails/useUsername";
import { UN_RE } from "./validators";

export const StepUsernameOnly = ({ form, patch }) => {
  const val = form.username || "";
  const status = useUsername(val);

  /* The gate below used to test the regex only, so a handle the server had
     already rejected as taken still lit up Continue — you'd get a generic
     "Something went wrong" from the save instead of being told the real
     problem while you were still looking at the field. Mirroring the lookup
     into form state lets the gate see it. */
  useEffect(() => {
    patch({ usernameStatus: status });
  }, [status, patch]);

  const formatErr = val && !UN_RE.test(val)
    ? "3–20 characters. Letters, numbers, dots and underscores only."
    : "";

  return (
    <div>
      <SectionHead
        title="Pick your handle"
        sub="This is how you're tagged in group chats and join requests. You can change it later."
      />

      <div className="mb-5">
        <Label htmlFor="ob-username">Username</Label>
        <Hint>Letters, numbers, dots and underscores. No spaces.</Hint>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 select-none text-[15px] text-ink-mute">
            @
          </span>
          <input
            id="ob-username"
            type="text"
            autoComplete="username"
            placeholder="your_handle"
            value={val}
            onChange={(e) => patch({ username: e.target.value.toLowerCase().replace(/\s/g, "") })}
            maxLength={20}
            aria-invalid={!!formatErr || status === "taken" || undefined}
            className={`${inputBase} pl-8 pr-10 ${formatErr || status === "taken" ? inputError : ""}`}
          />
          {val && (
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2">
              {status === "checking"  && <Loader2 size={15} className="animate-spin text-ink-mute" />}
              {status === "available" && <Check   size={15} className="text-moss" />}
              {status === "taken"     && <X       size={15} className="text-danger" />}
            </span>
          )}
        </div>

        {formatErr
          ? <Err msg={formatErr} />
          : status === "taken"
          ? <Err msg="That handle is already taken. Try another." />
          : status === "available" && val
          ? <Ok msg={`@${val} is yours.`} />
          : null}
      </div>

      <p className="m-0 rounded-xl border border-line bg-surface-alt px-4 py-3 text-[13px] leading-relaxed text-ink-soft">
        You&apos;ll show up as{" "}
        <strong className="font-semibold text-ink">@{val || "your_handle"}</strong>{" "}
        on your profile and anywhere you post in a group.
      </p>
    </div>
  );
};
