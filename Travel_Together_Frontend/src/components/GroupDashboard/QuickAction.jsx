export default function QuickAction({ icon: Icon, label, color, onClick, badge }) {
  const disabled = !onClick;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl border border-white/[0.07] bg-white/[0.04] relative transition-all duration-150 group
        ${disabled ? "cursor-not-allowed" : "cursor-pointer hover:-translate-y-0.5"}`}
    >
      <Icon size={20} color={disabled ? "rgba(255,255,255,0.2)" : color} />
      <span className={`text-[10px] font-bold tracking-wide transition-colors ${disabled ? "text-white/20" : "text-white/50 group-hover:text-white/80"}`}>
        {label}
      </span>
      {badge > 0 && (
        <div className="absolute top-1.5 right-2 min-w-[16px] h-4 bg-red-500 rounded-full text-[9px] font-black text-white flex items-center justify-center px-1">
          {badge}
        </div>
      )}
    </button>
  );
}
