export default function QuickAction({ icon: Icon, label, tone = "plain", onClick, badge }) {
  const disabled = !onClick;
  const tones = {
    plain:  "text-ink-soft",
    accent: "text-accent",
    danger: "text-danger",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group relative flex w-full flex-col items-center gap-2 rounded-2xl border border-line bg-surface px-1 py-3.5 transition-colors ${
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:border-accent hover:bg-accent-soft"
      }`}
    >
      <Icon size={20} className={disabled ? "text-ink-mute" : tones[tone]} />
      <span className={`text-[11.5px] font-medium ${disabled ? "text-ink-mute" : "text-ink-soft"}`}>
        {label}
      </span>
      {badge > 0 && (
        <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-ink">
          {badge}
        </span>
      )}
    </button>
  );
}
