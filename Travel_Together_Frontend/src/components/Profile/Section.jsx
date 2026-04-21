export default function Section({ title, icon: Icon, iconColor, children, action }) {
  return (
    <div className="bg-[#0d1b2a] rounded-2xl border border-white/[0.07]">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/[0.05]">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${iconColor}18`, border: `1px solid ${iconColor}30` }}>
          <Icon size={14} color={iconColor} />
        </div>
        <span className="flex-1 text-[13px] font-bold text-white/85 tracking-tight">{title}</span>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
