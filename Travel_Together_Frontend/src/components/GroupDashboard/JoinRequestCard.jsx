import { useState } from "react";
import { UserCheck } from "lucide-react";
import Avatar from "./GDAvatar.jsx";

export default function JoinRequestCard({ req, onApprove, onReject }) {
  const [decided, setDecided] = useState(null);

  if (decided) return (
    <div className={`rounded-2xl py-2.5 text-center text-[12px] font-bold border
      ${decided === "approve"
        ? "bg-green-400/10 border-green-400/20 text-green-400"
        : "bg-red-500/10   border-red-500/20  text-red-400"}`}
    >
      {decided === "approve" ? "✓ Approved" : "✗ Declined"}
    </div>
  );

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3">
      <div className="flex items-start gap-2.5 mb-3">
        <Avatar name={req.name} colorClass={req.avatar ?? "bg-[#FF6B35]"} imgSrc={req.avatar_url} />
        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[13px] font-bold text-white">{req.name}</span>
            {req.verified && <UserCheck size={13} className="text-green-400" />}
          </div>
          <div className="flex gap-2.5 text-[10px] text-white/35">
            <span>{req.trips} trip{req.trips !== 1 ? "s" : ""}</span>
            <span>· ⭐ {req.rating}</span>
          </div>
          <span className="text-[10px] text-white/20">{req.time}</span>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => { setDecided("approve"); onApprove?.(req.id); }}
          className="flex-1 py-2 rounded-xl border border-green-400/30 bg-green-400/10 text-green-400 text-[12px] font-bold cursor-pointer hover:bg-green-400/20 transition-colors"
        >✓ Approve</button>
        <button
          onClick={() => { setDecided("reject"); onReject?.(req.id); }}
          className="flex-1 py-2 rounded-xl border border-red-500/20 bg-red-500/[0.08] text-red-400 text-[12px] font-bold cursor-pointer hover:bg-red-500/15 transition-colors"
        >✗ Decline</button>
      </div>
    </div>
  );
}
