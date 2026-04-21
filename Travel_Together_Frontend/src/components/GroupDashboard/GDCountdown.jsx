export default function Countdown({ days, hours }) {
  return (
    <div className="flex gap-2">
      {[{ val: days, label: "days" }, { val: hours, label: "hrs" }].map(({ val, label }) => (
        <div key={label} className="bg-white/[0.05] border border-white/[0.09] rounded-xl px-3 py-1.5 text-center">
          <div className="text-xl font-black text-white/80 leading-none font-serif">{val}</div>
          <div className="text-[9px] text-white/30 font-semibold tracking-widest uppercase">{label}</div>
        </div>
      ))}
    </div>
  );
}
