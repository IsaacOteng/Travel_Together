export default function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-ink-mute">
        {Icon && <Icon size={12} className="text-accent" strokeWidth={2.2} />}
        {label}
      </span>
      <span className="font-display text-[30px] font-semibold leading-none text-ink">{value}</span>
      {sub && <span className="text-[12px] text-ink-mute">{sub}</span>}
    </div>
  );
}
