import { AlertCircle, Check } from "lucide-react";

/* These were 10px bold uppercase letterspaced labels in gray-500 with 10px
   gray-400 hints under them — legible on a designer's monitor, not on a phone
   in daylight. Everything here is sized to be read and coloured from tokens so
   the flow follows the theme. */

export const Label = ({ children, htmlFor, optional }) => (
  <label
    htmlFor={htmlFor}
    className="mb-2 flex items-baseline gap-2 text-[13.5px] font-semibold text-ink"
  >
    <span>{children}</span>
    {optional && (
      <span className="text-[12px] font-normal text-ink-mute">Optional</span>
    )}
  </label>
);

export const Hint = ({ children }) => (
  <p className="-mt-1 mb-2.5 text-[12.5px] leading-relaxed text-ink-mute">{children}</p>
);

export const Err = ({ msg }) =>
  !msg ? null : (
    <p role="alert" className="mt-2 flex items-start gap-1.5 text-[12.5px] text-danger">
      <AlertCircle size={13} className="mt-px shrink-0" />
      <span>{msg}</span>
    </p>
  );

export const Ok = ({ msg }) =>
  !msg ? null : (
    <p className="mt-2 flex items-start gap-1.5 text-[12.5px] text-moss">
      <Check size={13} className="mt-px shrink-0" />
      <span>{msg}</span>
    </p>
  );
