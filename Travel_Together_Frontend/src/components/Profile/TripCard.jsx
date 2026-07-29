import { MapPin, Calendar, TrendingUp } from "lucide-react";

const roleStyle = {
  Chief:  "bg-[#FF6B35]/85 text-white",
  Scout:  "bg-blue-400/85  text-[#071422]",
  Member: "bg-black/45     text-white/70",
};

export default function TripCard({ trip, onClick }) {
  const isActive = trip.status === "active" || trip.status === "published";

  return (
    <div className="group cursor-pointer" onClick={onClick}>
      <div className="relative h-36 rounded-2xl overflow-hidden">
        {trip.cover
          ? <img src={trip.cover} alt={trip.name} className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500" />
          : <div className="w-full h-full bg-linear-to-br from-[#132437] to-[#0a1628]" />
        }
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />

        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm ${roleStyle[trip.role] ?? roleStyle.Member}`}>
            {trip.role}
          </span>
          {isActive && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-400/85 text-[#071422] backdrop-blur-sm">
              Active
            </span>
          )}
        </div>

        {trip.karma > 0 && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/45 backdrop-blur-sm rounded-full px-2 py-0.5">
            <TrendingUp size={9} className="text-[#FF6B35]" />
            <span className="text-[10px] font-black text-[#FF6B35]">+{trip.karma}</span>
          </div>
        )}

        <div className="absolute inset-x-3 bottom-2.5">
          <div className="text-[13.5px] font-bold text-white leading-tight truncate">{trip.name}</div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-[10.5px] text-white/35 mt-2 px-0.5">
        <span className="flex items-center gap-1 truncate"><MapPin size={9} className="shrink-0" />{trip.dest}</span>
        <span className="flex items-center gap-1 whitespace-nowrap"><Calendar size={9} />{trip.date}</span>
        <span className="ml-auto text-transparent group-hover:text-[#FF6B35] transition-colors whitespace-nowrap">View →</span>
      </div>
    </div>
  );
}
