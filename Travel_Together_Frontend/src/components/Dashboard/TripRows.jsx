import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin, Calendar, Users, Star, Clock,
  Heart, Edit3, X, Trash2, FlagOff, LayoutDashboard,
} from "lucide-react";

export function JoinedRow({ trip, onNavigate, onViewGroup }) {
  const navigate    = useNavigate();
  const isCompleted = trip.tripStatus === "completed";
  const approved    = trip.joinStatus === "approved";
  return (
    <div
      onClick={() => onNavigate?.(trip.id)}
      className="flex items-center gap-3.5 p-3.5 rounded-xl border border-white/[0.07] bg-white/[0.03] cursor-pointer hover:bg-white/[0.06] hover:border-white/10 transition-all duration-150"
    >
      <div className="w-10 h-10 rounded-xl flex-shrink-0 bg-gradient-to-br from-[#1E3A5F] to-[#2d5f8a] flex items-center justify-center">
        <MapPin size={15} color="#FF6B35"/>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-white/90 truncate">{trip.title}</div>
        <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
          <span className="flex items-center gap-1 text-[11px] text-white/35"><Calendar size={10}/>{trip.date}</span>
          <span className="flex items-center gap-1 text-[11px] text-white/35"><Users size={10}/>{trip.members}</span>
          <span className="text-[11px] text-white/25">· {trip.chief}</span>
          {!isCompleted && trip.daysLeft !== null && (
            <span className="flex items-center gap-1 text-[11px] text-white/25">
              <Clock size={9}/>{trip.daysLeft === 0 ? "today" : `in ${trip.daysLeft}d`}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {isCompleted ? (
          <button
            onClick={e => { e.stopPropagation(); navigate(`/trips/${trip.id}/rate`); }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white/60 border border-white/[0.1] bg-white/[0.05] hover:text-white/80 hover:bg-white/[0.09] transition-colors cursor-pointer"
          >
            <Star size={10} className="fill-current" /> Rate Crew
          </button>
        ) : (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${approved ? "bg-green-400/15 text-green-400" : "bg-orange-400/15 text-orange-400"}`}>
            {approved ? "Approved" : "Pending"}
          </span>
        )}
        <button
          onClick={e => { e.stopPropagation(); onViewGroup?.(trip.id); }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white/50 border border-white/[0.08] bg-white/[0.04] hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          <LayoutDashboard size={10}/> View Group
        </button>
      </div>
    </div>
  );
}

export function SavedRow({ trip, onNavigate, onUnsave }) {
  const [removing, setRemoving] = useState(false);
  const isCompleted = trip.status === "completed";

  async function handleUnsave(e) {
    e.stopPropagation();
    if (removing) return;
    setRemoving(true);
    try { await onUnsave?.(trip.id); }
    finally { setRemoving(false); }
  }

  return (
    <div
      onClick={() => onNavigate?.(trip.id)}
      className="flex items-center gap-3.5 p-3.5 rounded-xl border border-white/[0.07] bg-white/[0.03] cursor-pointer hover:bg-white/[0.06] hover:border-white/10 transition-all duration-150"
    >
      <div className="w-10 h-10 rounded-xl flex-shrink-0 bg-gradient-to-br from-[#3d1a2a] to-[#7a2050] flex items-center justify-center">
        <Heart size={15} color="#f472b6" fill="#f472b6"/>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-white/90 truncate">{trip.title}</div>
        <div className="flex items-center gap-2.5 mt-0.5">
          <span className="flex items-center gap-1 text-[11px] text-white/35"><Calendar size={10}/>{trip.date}</span>
          <span className="flex items-center gap-1 text-[11px] text-white/35"><Users size={10}/>{trip.members}</span>
          {!isCompleted && <span className="text-[11px] text-white/25">· {trip.spots} left</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {isCompleted && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-400/15 text-blue-400">Completed</span>
        )}
        <button
          onClick={handleUnsave}
          disabled={removing}
          className="w-6 h-6 rounded-full flex items-center justify-center bg-white/[0.05] border border-white/[0.08] text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer disabled:opacity-40"
          title="Remove from saved"
        >
          {removing ? <span className="text-[9px]">…</span> : <X size={11}/>}
        </button>
      </div>
    </div>
  );
}

export function CreatedRow({ trip, onViewTrip, onManage, onDelete, onEndTrip }) {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmEnd,    setConfirmEnd]    = useState(false);
  const [ending,        setEnding]        = useState(false);

  const canEnd = trip.status === "active" || trip.status === "published";

  const statusMap = {
    active:    { label: "Active",    cls: "bg-[#FF6B35]/15 text-[#FF6B35]" },
    published: { label: "Published", cls: "bg-green-400/15 text-green-400" },
    draft:     { label: "Draft",     cls: "bg-white/[0.07] text-white/40"  },
    completed: { label: "Completed", cls: "bg-blue-400/15 text-blue-400"   },
  };
  const s = statusMap[trip.status] || statusMap.draft;

  async function handleEnd(e) {
    e.stopPropagation();
    if (ending) return;
    setEnding(true);
    try { await onEndTrip?.(trip.id); }
    finally { setEnding(false); setConfirmEnd(false); }
  }

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/10 transition-all duration-150 overflow-hidden">
      <div className="flex items-center gap-3 px-3.5 pt-3.5 pb-2 cursor-pointer" onClick={() => onViewTrip?.(trip.id)}>
        <div className="w-9 h-9 rounded-xl flex-shrink-0 bg-gradient-to-br from-[#3d1a0f] to-[#7a3520] flex items-center justify-center">
          <Edit3 size={14} color="#fb923c"/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-white/90 truncate">{trip.title}</div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="flex items-center gap-1 text-[11px] text-white/35"><Calendar size={10}/>{trip.date}</span>
            <span className="flex items-center gap-1 text-[11px] text-white/35"><Users size={10}/>{trip.members}/{trip.maxMembers}</span>
            {trip.requests > 0 && (
              <span className="text-[11px] text-[#FF6B35]/80 font-semibold">{trip.requests} req</span>
            )}
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${s.cls}`}>{s.label}</span>
      </div>

      <div className="flex items-center justify-end gap-2 px-3.5 pb-3 pt-1 border-t border-white/[0.04]">
        {trip.status === "completed" && (
          <button
            onClick={e => { e.stopPropagation(); navigate(`/trips/${trip.id}/rate`); }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white/60 border border-white/[0.1] bg-white/[0.05] hover:text-white/80 hover:bg-white/[0.09] transition-colors cursor-pointer"
          >
            <Star size={10} className="fill-current" /> Rate Crew
          </button>
        )}
        <button
          onClick={e => { e.stopPropagation(); onManage?.(trip.id); }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white/50 border border-white/[0.08] bg-white/[0.04] hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          <LayoutDashboard size={10}/> Manage
        </button>
        {canEnd && (
          confirmEnd ? (
            <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
              <span className="text-[10px] text-amber-400/80">End trip?</span>
              <button onClick={handleEnd} disabled={ending}
                className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-lg cursor-pointer">
                {ending ? "…" : "Yes"}
              </button>
              <button onClick={e => { e.stopPropagation(); setConfirmEnd(false); }}
                className="text-[10px] text-white/40 bg-white/[0.05] border border-white/10 px-2 py-0.5 rounded-lg cursor-pointer">
                No
              </button>
            </div>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); setConfirmEnd(true); setConfirmDelete(false); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-amber-400 border border-amber-400/25 bg-amber-400/[0.07] hover:bg-amber-400/15 transition-colors cursor-pointer"
            >
              <FlagOff size={10}/> End Trip
            </button>
          )
        )}
        {confirmDelete ? (
          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            <span className="text-[10px] text-red-400/80">Delete?</span>
            <button onClick={e => { e.stopPropagation(); onDelete?.(trip.id); }}
              className="text-[10px] font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 rounded-lg cursor-pointer">
              Yes, delete
            </button>
            <button onClick={e => { e.stopPropagation(); setConfirmDelete(false); }}
              className="text-[10px] text-white/40 bg-white/[0.05] border border-white/10 px-2 py-0.5 rounded-lg cursor-pointer">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={e => { e.stopPropagation(); setConfirmDelete(true); setConfirmEnd(false); }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-red-400 border border-red-400/20 bg-red-400/[0.07] hover:bg-red-400/15 transition-colors cursor-pointer"
          >
            <Trash2 size={10}/> Delete
          </button>
        )}
      </div>
    </div>
  );
}
