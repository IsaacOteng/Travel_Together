import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function Section({ title, icon: Icon, children, action, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className={`flex w-full cursor-pointer items-center gap-3 border-none bg-transparent px-5 py-4 text-left ${
          open ? "border-b border-line" : ""
        }`}
      >
        {Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Icon size={15} />
          </span>
        )}
        <span className="flex-1 font-display text-[16px] font-semibold text-ink">{title}</span>
        {action}
        <ChevronDown
          size={16}
          className={`text-ink-mute transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="p-5">{children}</div>}
    </div>
  );
}
