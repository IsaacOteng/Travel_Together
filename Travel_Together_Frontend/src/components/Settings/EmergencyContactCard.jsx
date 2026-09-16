import { X, CheckCircle } from "lucide-react";

export default function EmergencyContactCard({ contact, onRemove }) {
  return (
    <div className="flex items-center gap-3.5 px-5 py-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent">
        {contact.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[14px] font-semibold text-ink">{contact.name}</span>
          {contact.verified && <CheckCircle size={13} className="shrink-0 text-moss" />}
        </div>
        <p className="m-0 mt-0.5 truncate text-[12.5px] text-ink-mute">
          {contact.dial_code} {contact.phone} · {contact.relationship}
        </p>
      </div>
      <button
        onClick={() => onRemove(contact.id)}
        aria-label={`Remove ${contact.name}`}
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink-mute transition-colors hover:border-danger hover:text-danger"
      >
        <X size={14} />
      </button>
    </div>
  );
}
