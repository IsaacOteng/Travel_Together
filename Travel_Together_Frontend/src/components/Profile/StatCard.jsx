export default function StatCard({ icon: Icon, label, value, sub, color = "#FF6B35" }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 flex flex-col gap-1">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-1 flex-shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
        <Icon size={15} color={color} />
      </div>
      <div className="text-xl font-black text-white font-serif leading-none">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-white/25">{label}</div>
      {sub && <div className="text-[10px] text-white/20">{sub}</div>}
    </div>
  );
}
