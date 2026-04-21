import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function Section({ title, icon: Icon, iconColor, children, action, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-[#0d1b2a] rounded-2xl border border-white/[0.07] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2.5 px-4 py-3.5 bg-transparent border-none cursor-pointer text-left
          ${open ? "border-b border-white/[0.05]" : ""}`}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${iconColor}18`, border: `1px solid ${iconColor}30` }}
        >
          <Icon size={14} color={iconColor} />
        </div>
        <span className="flex-1 text-[13px] font-bold text-white/85 tracking-tight">{title}</span>
        {action}
        <ChevronDown
          size={14}
          className={`text-white/25 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}
