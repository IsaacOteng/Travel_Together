import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Radio } from "lucide-react";
import { AVATAR_COLORS, MARKER_COLORS_HEX } from './GDConstants.js';

export function makeAvatarIcon(name, colorHex, stale = false, avatarUrl = null) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const bg      = stale ? "#4b5563" : colorHex;
  const opacity = stale ? 0.55 : 1;
  const uid     = `av_${Math.random().toString(36).slice(2, 8)}`;
  const inner   = avatarUrl
    ? `<defs>
        <clipPath id="cp_${uid}"><circle cx="19" cy="19" r="16"/></clipPath>
       </defs>
       <image href="${avatarUrl}" x="3" y="3" width="32" height="32" clip-path="url(#cp_${uid})"/>`
    : `<text x="19" y="24" text-anchor="middle" font-size="11" font-weight="800"
           font-family="sans-serif" fill="white">${initials}</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="38" height="46" viewBox="0 0 38 46">
    <defs>
      <filter id="sh_${uid}" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="${bg}" flood-opacity="0.5"/>
      </filter>
    </defs>
    <g opacity="${opacity}" filter="url(#sh_${uid})">
      <circle cx="19" cy="19" r="17" fill="${bg}" stroke="white" stroke-width="2.5"/>
      ${inner}
      <polygon points="13,34 25,34 19,44" fill="${bg}"/>
    </g>
  </svg>`;
  return L.divIcon({
    html:        svg,
    className:   "",
    iconSize:    [38, 46],
    iconAnchor:  [19, 46],
    popupAnchor: [0, -48],
  });
}

export function MapController({ flyTo, resetKey, allPoints }) {
  const map = useMap();

  useEffect(() => {
    if (flyTo) map.flyTo(flyTo, 15, { duration: 1 });
  }, [flyTo]);

  useEffect(() => {
    if (!resetKey) return;
    if (allPoints.length === 0) {
      map.flyTo([5.614, -0.205], 6, { duration: 1 });
    } else if (allPoints.length === 1) {
      map.flyTo(allPoints[0], 14, { duration: 1 });
    } else {
      map.fitBounds(L.latLngBounds(allPoints), { padding: [40, 40], animate: true, duration: 1 });
    }
  }, [resetKey]);

  return null;
}

export function makeYouIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <circle cx="18" cy="18" r="16" fill="none" stroke="#3b82f6" stroke-width="1.5" opacity="0.4"/>
    <circle cx="18" cy="18" r="11" fill="#3b82f6" stroke="white" stroke-width="2.5" opacity="0.95"/>
    <text x="18" y="22" text-anchor="middle" font-size="7" font-weight="900" font-family="sans-serif" fill="white" letter-spacing="0.5">YOU</text>
  </svg>`;
  return L.divIcon({ html: svg, className: "", iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -20] });
}

export default function FleetMap({ height = 280, members = [], myLocation = null, flyTo = null, resetKey = 0 }) {
  const staleMs = 5 * 60 * 1000;
  const located = members.filter(m => m.lat != null && m.lng != null);

  const allPoints = [
    ...located.map(m => [m.lat, m.lng]),
    ...(myLocation ? [[myLocation.lat, myLocation.lng]] : []),
  ];
  const center = allPoints.length
    ? [allPoints.reduce((s, p) => s + p[0], 0) / allPoints.length,
       allPoints.reduce((s, p) => s + p[1], 0) / allPoints.length]
    : [5.614, -0.205];
  const defaultZoom = allPoints.length === 0 ? 6 : allPoints.length === 1 ? 14 : 12;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/[0.07]" style={{ height }}>
      <MapContainer
        center={center}
        zoom={defaultZoom}
        style={{ width: "100%", height: "100%", background: "#071422" }}
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="" />
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" attribution="" />
        <MapController flyTo={flyTo} resetKey={resetKey} allPoints={allPoints} />
        {myLocation && (
          <Marker position={[myLocation.lat, myLocation.lng]} icon={makeYouIcon()} zIndexOffset={1000}>
            <Popup>
              <div style={{ minWidth: 100, fontFamily: "sans-serif" }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: "#3b82f6" }}>You</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>Your live location</div>
              </div>
            </Popup>
          </Marker>
        )}
        {located.map((m, idx) => {
          const stale = m.lastSeenMs != null && (Date.now() - m.lastSeenMs) > staleMs;
          const colorIdx = AVATAR_COLORS.indexOf(m.avatar);
          const colorHex = MARKER_COLORS_HEX[colorIdx >= 0 ? colorIdx : idx % MARKER_COLORS_HEX.length];
          return (
            <Marker key={m.id} position={[m.lat, m.lng]} icon={makeAvatarIcon(m.name, colorHex, stale, m.avatar_url)}>
              <Popup className="fleet-popup">
                <div style={{ minWidth: 120, fontFamily: "sans-serif" }}>
                  <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 2 }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>
                    {stale ? `Last seen ${m.lastSeen}` : "Live location"}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div className="absolute top-2.5 right-2.5 z-[500] flex items-center gap-1.5 bg-black/60 backdrop-blur-sm border border-white/[0.15] rounded-full px-2.5 py-1 pointer-events-none">
        <Radio size={10} className="text-blue-400 animate-pulse" />
        <span className="text-[10px] font-semibold text-white/70">LIVE</span>
      </div>

      {members.filter(m => m.lat == null).length > 0 && (
        <div className="absolute bottom-2.5 left-2.5 z-[500] bg-black/60 backdrop-blur-sm border border-white/[0.12] rounded-xl px-2.5 py-1.5">
          <span className="text-[10px] text-white/50">
            {members.filter(m => m.lat == null).length} member{members.filter(m => m.lat == null).length !== 1 ? "s" : ""} not sharing location
          </span>
        </div>
      )}
    </div>
  );
}
