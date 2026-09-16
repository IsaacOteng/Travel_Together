/* Field and button skins for the onboarding flow.

   The old versions were hardcoded: a 1.5px gray-200 border with a #FF6B35
   focus ring, and a primary button painted with an orange gradient and a
   coloured drop shadow. None of it followed the theme, so the whole flow
   stayed light even in dark mode. These read from tokens instead. */

export const inputBase =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-[15px] text-ink " +
  "outline-none transition-colors placeholder:text-ink-mute " +
  "hover:border-ink-mute focus:border-accent focus:ring-2 focus:ring-accent/25 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

/* Applied alongside inputBase when a field has been touched and is invalid. */
export const inputError = "border-danger focus:border-danger focus:ring-danger/25";

export const BtnPrimary = ({ children, onClick, disabled, type = "button" }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border-none bg-accent px-6 py-3.5 text-[15px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-line disabled:text-ink-mute"
  >
    {children}
  </button>
);

/* `disabled` used not to be destructured here, so the prop the call site was
   already passing went nowhere and Back stayed clickable while a step was
   still saving. */
export const BtnGhost = ({ children, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border border-line bg-surface px-5 py-3.5 text-[15px] font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
  >
    {children}
  </button>
);
