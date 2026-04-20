import { SectionHead } from "./SectionHead";
import { Label, Hint, Err, Ok } from "./atoms";
import { inputBase } from "./buttons";
import { useUsername } from "../OnboardingDetails/useUsername";

const UN_RE = /^[a-z0-9._]{3,20}$/;

export const StepUsernameOnly = ({ form, patch }) => {
  const val = form.username || "";
  const status = useUsername(val);

  const hint = !val
    ? ""
    : !UN_RE.test(val)
    ? "3–20 chars · letters, numbers, dots and underscores only"
    : null;

  return (
    <div>
      <SectionHead
        icon="🔖"
        title="Choose a username"
        sub="Your unique handle on Travel Together. You can change it later."
      />

      <div className="mb-4">
        <Label>Username <span className="text-[#FF6B35]">*</span></Label>
        <Hint>3–20 characters · letters, numbers, . and _ only · no spaces</Hint>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none pointer-events-none">
            @
          </span>
          <input
            type="text"
            autoComplete="username"
            placeholder="your_handle"
            value={val}
            onChange={(e) => patch({ username: e.target.value.toLowerCase().replace(/\s/g, "") })}
            maxLength={20}
            className={`${inputBase} pl-7`}
          />
          {val && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] pointer-events-none select-none">
              {status === "checking"   && <span className="text-gray-400">checking…</span>}
              {status === "available" && <span className="text-green-500">✓</span>}
              {status === "taken"     && <span className="text-red-400">✗</span>}
            </span>
          )}
        </div>

        {hint
          ? <Err msg={hint} />
          : status === "available" && val
          ? <Ok msg={`@${val} is available`} />
          : status === "taken"
          ? <Err msg="That username is already taken — try another" />
          : null
        }
      </div>

      <p className="text-[11px] text-gray-400 leading-relaxed">
        Other travelers will see <strong>@{val || "your_handle"}</strong> on your profile and group requests.
      </p>
    </div>
  );
};

export const stepUsernameRequired = (f) => {
  const v = f.username || "";
  return UN_RE.test(v);
};
