import { MapPin, Calendar, TrendingUp } from "lucide-react";

const roleStyle = {
  Chief:  "bg-accent text-accent-ink",
  Scout:  "bg-moss text-white",
  Member: "bg-ground/90 text-ink",
};

export default function TripCard({ trip, onClick }) {
  const isActive = trip.status === "active" || trip.status === "published";

  return (
    <button onClick={onClick} className="group block w-full cursor-pointer border-none bg-transparent p-0 text-left">
      <div className="relative h-40 overflow-hidden rounded-2xl border border-line bg-surface-alt">
        {trip.cover && (
          <img src={trip.cover} alt="" loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        )}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/40 to-transparent" />

        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-semibold backdrop-blur-sm ${roleStyle[trip.role] ?? roleStyle.Member}`}>
            {trip.role}
          </span>
          {isActive && (
            <span className="rounded-full bg-moss px-2.5 py-1 text-[10.5px] font-semibold text-white backdrop-blur-sm">
              Active
            </span>
          )}
        </div>

        {trip.karma > 0 && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-ground/90 px-2.5 py-1 backdrop-blur-sm">
            <TrendingUp size={11} className="text-accent" />
            <span className="text-[11px] font-bold text-accent">+{trip.karma}</span>
          </span>
        )}
      </div>

      <div className="mt-3">
        <div className="truncate font-display text-[16px] font-semibold text-ink transition-colors group-hover:text-accent">
          {trip.name}
        </div>
        <div className="mt-1.5 flex items-center gap-3 text-[12.5px] text-ink-mute">
          <span className="flex min-w-0 items-center gap-1.5 truncate">
            <MapPin size={12} className="shrink-0" />{trip.dest}
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            <Calendar size={12} />{trip.date}
          </span>
        </div>
      </div>
    </button>
  );
}
