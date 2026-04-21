import { X, CheckCircle } from "lucide-react";

export default function EmergencyContactCard({ contact, onRemove }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-9 h-9 rounded-full bg-[#FF6B35]/20 border border-[#FF6B35]/30 flex items-center justify-center flex-shrink-0">
        <span className="text-[12px] font-bold text-[#FF6B35] font-serif">
          {contact.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-semibold text-white/85 truncate">{contact.name}</span>
          {contact.verified && <CheckCircle size={12} className="text-green-400 flex-shrink-0" />}
        </div>
        <div className="text-[11px] text-white/35">{contact.dial_code} {contact.phone} · {contact.relationship}</div>
      </div>
      <button onClick={() => onRemove(contact.id)}
        className="w-7 h-7 rounded-lg bg-red-500/[0.08] border border-red-500/20 flex items-center justify-center cursor-pointer hover:bg-red-500/15 transition-colors flex-shrink-0">
        <X size={12} className="text-red-400" />
      </button>
    </div>
  );
}
