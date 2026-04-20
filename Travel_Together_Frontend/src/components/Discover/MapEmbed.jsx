import { useState, useEffect } from "react";
import { MapPin } from "lucide-react";

async function geocode(placeName) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)}&format=json&limit=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    if (data?.[0]) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {}
  return null;
}

export default function MapEmbed({ trip, height = 200 }) {
  const [coords, setCoords] = useState(trip.mapCoords || null);

  useEffect(() => {
    if (trip.mapCoords) {
      setCoords(trip.mapCoords);
      return;
    }
    if (!trip.destination) return;
    geocode(trip.destination).then(c => { if (c) setCoords(c); });
  }, [trip.destination, trip.mapCoords]);

  if (!coords) return (
    <div className="rounded-xl overflow-hidden mb-2.5 flex items-center justify-center gap-2 text-white/30"
      style={{ height, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <MapPin size={14} className="text-white/20" />
      <span className="text-[12px]">Location preview unavailable</span>
    </div>
  );

  const { lat, lng } = coords;
  const url = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.5},${lat - 0.4},${lng + 0.5},${lat + 0.4}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <div>
      <div className="rounded-xl overflow-hidden relative mb-2.5">
        <iframe
          src={url}
          width="100%"
          height={height}
          className="border-0 block"
          title={`Map – ${trip.destination}`}
          loading="lazy"
        />
        {trip.distance && (
          <div className="absolute bottom-2 right-2 bg-[rgba(13,27,42,0.85)] backdrop-blur-md rounded-lg px-2 py-1 flex items-center gap-1 text-white/70 text-[10px]">
            <MapPin size={9} color="#FF6B35" />
            {trip.distance} away
          </div>
        )}
      </div>
      <div className="bg-white/5 rounded-xl p-3 border border-white/[0.07]">
        <div className="text-[9px] text-white/35 tracking-[0.08em] uppercase mb-2">Route info</div>
        <div className="flex">
          {[
            { label: "From",  value: trip.meetingPlace || "—" },
            { label: "To",    value: (trip.destination || "").split(",")[0] || "—" },
            { label: "Drive", value: trip.drive || "—", accent: true },
          ].map((r, i) => (
            <div
              key={r.label}
              className={`flex-1 ${i > 0 ? "pl-3 border-l border-white/[0.08]" : ""} ${i < 2 ? "pr-3" : ""}`}
            >
              <div className="text-[10px] text-white/35 mb-1">{r.label}</div>
              <div className={`text-[12px] font-semibold leading-tight ${r.accent ? "text-[#FF6B35]" : "text-white"}`}>
                {r.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
