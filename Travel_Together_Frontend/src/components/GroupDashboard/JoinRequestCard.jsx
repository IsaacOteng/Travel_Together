import { useState } from "react";
import { UserCheck, Check, X, Star } from "lucide-react";
import Avatar from "./GDAvatar.jsx";

export default function JoinRequestCard({ req, onApprove, onReject }) {
  const [decided, setDecided] = useState(null);

  if (decided) return (
    <div className={`flex items-center justify-center gap-1.5 rounded-2xl border py-2.5 text-[13px] font-semibold ${
      decided === "approve"
        ? "border-moss/30 bg-moss/10 text-moss"
        : "border-line bg-surface-alt text-ink-mute"
    }`}>
      {decided === "approve" ? <><Check size={14} /> Approved</> : <><X size={14} /> Declined</>}
    </div>
  );

  return (
    <div className="rounded-2xl border border-line bg-surface-alt p-4">
      <div className="mb-3.5 flex items-start gap-3">
        <Avatar name={req.name} colorClass={req.avatar ?? "bg-accent-soft"} imgSrc={req.avatar_url} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[14px] font-semibold text-ink">{req.name}</span>
            {req.verified && <UserCheck size={14} className="shrink-0 text-moss" />}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 text-[12px] text-ink-mute">
            <span>{req.trips} trip{req.trips !== 1 ? "s" : ""}</span>
            <span className="flex items-center gap-1">
              <Star size={11} className="text-sun" fill="currentColor" />{req.rating}
            </span>
            <span>{req.time}</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => { setDecided("approve"); onApprove?.(req.id); }}
          className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full border-none bg-accent py-2.5 text-[13px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
        ><Check size={14} /> Approve</button>
        <button
          onClick={() => { setDecided("reject"); onReject?.(req.id); }}
          className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-line bg-surface py-2.5 text-[13px] font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent"
        ><X size={14} /> Decline</button>
      </div>
    </div>
  );
}
