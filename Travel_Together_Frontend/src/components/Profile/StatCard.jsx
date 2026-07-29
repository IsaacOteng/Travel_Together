export default function StatCard({ icon: Icon, label, value, sub, color = "#FF6B35" }) {
  return (
    <div className="flex flex-col gap-1.5 px-5 first:pl-0 last:pr-0">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon size={12} color={color} strokeWidth={2.4} />}
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">{label}</span>
      </div>
      <div className="text-[30px] font-black text-white font-serif leading-none tracking-tight">{value}</div>
      {sub && <div className="text-[11px] text-white/25">{sub}</div>}
    </div>
  );
}
