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
  } catch { /* fall through to the unavailable state */ }
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

  if (!coords) {
    return (
      <div
        className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-surface-alt text-ink-mute"
        style={{ height }}
      >
        <MapPin size={14} />
        <span className="text-[13px]">Location preview unavailable</span>
      </div>
    );
  }

  const { lat, lng } = coords;
  const url = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.5},${lat - 0.4},${lng + 0.5},${lat + 0.4}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-line">
        <iframe
          src={url}
          width="100%"
          height={height}
          className="block border-0"
          title={`Map – ${trip.destination}`}
          loading="lazy"
        />
        {trip.distance && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1.5 text-[11.5px] font-medium text-ink">
            <MapPin size={11} className="text-accent" />
            {trip.distance} away
          </div>
        )}
      </div>

      {/* the actual journey, spelled out */}
      <div className="mt-3 flex rounded-2xl border border-line bg-surface-alt">
        {[
          { label: "From",  value: trip.meetingPlace || "—" },
          { label: "To",    value: (trip.destination || "").split(",")[0] || "—" },
          { label: "Drive", value: trip.drive || "—", accent: true },
        ].map((r, i) => (
          <div
            key={r.label}
            className={`min-w-0 flex-1 px-4 py-3.5 ${i > 0 ? "border-l border-line" : ""}`}
          >
            <div className="text-[10.5px] uppercase tracking-[0.12em] text-ink-mute">
              {r.label}
            </div>
            <div
              className={`mt-1 truncate text-[13px] font-semibold leading-tight ${
                r.accent ? "text-accent" : "text-ink"
              }`}
            >
              {r.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
