import { ChevronRight } from "lucide-react";

export function SettingRow({ icon: Icon, iconColor = "#FF6B35", label, sub, children, onClick, danger = false }) {
  const base = `flex items-center gap-3 px-4 py-3.5 transition-colors duration-100
    ${onClick ? "cursor-pointer hover:bg-white/[0.04]" : ""}
    ${danger ? "hover:bg-red-500/[0.06]" : ""}`;
  return (
    <div className={base} onClick={onClick}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${iconColor}15`, border: `1px solid ${iconColor}25` }}>
        <Icon size={15} color={danger ? "#f43f5e" : iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-[13px] font-semibold ${danger ? "text-red-400" : "text-white/85"}`}>{label}</div>
        {sub && <div className="text-[11px] text-white/35 mt-0.5 leading-snug">{sub}</div>}
      </div>
      {children}
      {onClick && !children && <ChevronRight size={15} className="text-white/25 flex-shrink-0" />}
    </div>
  );
}

export function SectionCard({ title, children }) {
  return (
    <div className="bg-[#0d1b2a] rounded-2xl border border-white/[0.07] overflow-hidden">
      {title && (
        <div className="px-4 pt-4 pb-2">
          <p className="text-[10px] font-bold tracking-[.12em] uppercase text-white/30">{title}</p>
        </div>
      )}
      <div className="divide-y divide-white/[0.05]">{children}</div>
    </div>
  );
}
