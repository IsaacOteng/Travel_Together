import { useNavigate } from "react-router-dom";
import { MapPin, Calendar, TrendingUp } from "lucide-react";

const roleStyle = {
  Chief:  "bg-[#FF6B35]/20 text-[#FF6B35] border-[#FF6B35]/30",
  Scout:  "bg-blue-400/15  text-blue-400   border-blue-400/25",
  Member: "bg-white/10     text-white/40   border-white/10",
};

export default function TripCard({ trip, onClick, isOwner = true }) {
  const isActive = trip.status === "active" || trip.status === "published";

  return (
    <div
      className="group bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-[#FF6B35]/40 cursor-pointer"
      onClick={onClick}
    >
      <div className="relative h-32 overflow-hidden">
        {trip.cover
          ? <img src={trip.cover} alt={trip.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          : <div className="w-full h-full bg-[#0a1628]" />
        }
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1b2a] via-transparent to-transparent" />
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${roleStyle[trip.role] ?? roleStyle.Member}`}>
            {trip.role}
          </span>
          {isActive && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border bg-green-500/20 text-green-400 border-green-500/30">
              Active
            </span>
          )}
        </div>
        {trip.karma > 0 && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-[#0d1b2a]/80 backdrop-blur-sm rounded-full px-2 py-0.5">
            <TrendingUp size={9} className="text-[#FF6B35]" />
            <span className="text-[10px] font-black text-[#FF6B35]">+{trip.karma}</span>
          </div>
        )}
      </div>
      <div className="px-3 py-2.5">
        <div className="text-[13px] font-bold text-white leading-tight mb-1.5 truncate">{trip.name}</div>
        <div className="flex items-center gap-3 text-[10px] text-white/35">
          <span className="flex items-center gap-1"><MapPin size={9} />{trip.dest}</span>
          <span className="flex items-center gap-1"><Calendar size={9} />{trip.date}</span>
        </div>
        {isActive && (
          <div className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-white/40 text-[11px] font-semibold">
            Tap to view trip →
          </div>
        )}
      </div>
    </div>
  );
}
