import { ChevronRight } from "lucide-react";

export function SettingRow({ icon: Icon, label, sub, children, onClick, danger = false }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`flex w-full items-center gap-3.5 border-none bg-transparent px-5 py-4 text-left transition-colors ${
        onClick ? "cursor-pointer hover:bg-surface-alt" : ""
      }`}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
        danger ? "bg-danger-soft text-danger" : "bg-accent-soft text-accent"
      }`}>
        <Icon size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[14px] font-semibold ${danger ? "text-danger" : "text-ink"}`}>
          {label}
        </span>
        {sub && <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-mute">{sub}</span>}
      </span>
      {children}
      {onClick && !children && <ChevronRight size={16} className="shrink-0 text-ink-mute" />}
    </Tag>
  );
}

export function SectionCard({ title, description, children }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-line bg-surface">
      {title && (
        <header className="border-b border-line px-5 py-4">
          <h2 className="m-0 font-display text-[16px] font-semibold text-ink">{title}</h2>
          {description && (
            <p className="m-0 mt-1.5 text-[13px] leading-relaxed text-ink-soft">{description}</p>
          )}
        </header>
      )}
      <div className="divide-y divide-line-soft">{children}</div>
    </section>
  );
}
