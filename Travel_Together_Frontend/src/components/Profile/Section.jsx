export default function Section({ title, icon: Icon, iconColor, children, action }) {
  return (
    <section>
      <div className="flex items-center gap-2.5 mb-5">
        {Icon && <Icon size={14} color={iconColor} className="shrink-0" />}
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45 whitespace-nowrap">{title}</h2>
        <div className="flex-1 h-px bg-linear-to-r from-white/9 to-transparent" />
        {action}
      </div>
      {children}
    </section>
  );
}
