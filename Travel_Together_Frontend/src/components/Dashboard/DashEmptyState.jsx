/* Real empty states — each one says what the tab is for and offers the
   action that fills it, instead of a grey line of 12px text. */
export default function DashEmptyState({ title, body, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-line px-6 py-16 text-center">
      <p className="m-0 font-display text-[19px] font-semibold text-ink">{title}</p>
      {body && (
        <p className="m-0 mt-2 max-w-[38ch] text-[14px] leading-relaxed text-ink-soft">{body}</p>
      )}
      {actionLabel && (
        <button
          onClick={onAction}
          className="mt-6 cursor-pointer rounded-full border-none bg-accent px-5 py-2.5 text-[14px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
