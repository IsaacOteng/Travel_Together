    import { useState, useEffect, useRef, useCallback } from "react";
    import {
    MapPin, Users, Calendar, Shield,
    ChevronRight, ChevronDown, AlertTriangle,
    CheckCircle, Clock,
    Crown, Compass, Radio, ArrowLeft, UserCheck,
    RefreshCw, LogOut,
    Plus, X, Check, MessageCircle, Map,
    BarChart2, Star, Lock, Trash2,
    } from "lucide-react";
    import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
    import L from 'leaflet';
    import 'leaflet/dist/leaflet.css';
    import { useNavigate, useParams } from 'react-router-dom';
    import toast from 'react-hot-toast';
    import AppNav from '../shared/AppNav.jsx';
    import MobileBottomNav from '../shared/MobileBottomNav.jsx';
    import { tripsApi, pollsApi, chatApi, tokenStore } from '../../services/api.js';
    import { useAuth } from '../../context/AuthContext.jsx';

    const WS_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/^http/, "ws");

    const AVATAR_COLORS = [
    "bg-[#FF6B35]", "bg-[#4ade80]", "bg-[#a855f7]",
    "bg-[#0ea5e9]", "bg-[#f43f5e]", "bg-[#fbbf24]",
    "bg-[#14b8a6]", "bg-[#ec4899]", "bg-[#6366f1]", "bg-[#84cc16]",
    ];

    /* ─── AVATAR ──────────────────────────────── */
    function Avatar({ name, size = "w-9 h-9", colorClass = "bg-[#FF6B35]", ring = false, imgSrc = null }) {
    const initials = name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
    const [failed, setFailed] = useState(false);
    return (
        <div className={`${size} ${colorClass} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 text-xs font-serif overflow-hidden ${ring ? "ring-2 ring-[#0d1b2a]" : ""}`}>
        {imgSrc && !failed
            ? <img src={imgSrc} alt={name} className="w-full h-full object-cover" onError={() => setFailed(true)} />
            : initials
        }
        </div>
    );
    }


    /* ─── ROLE BADGE ──────────────────────────── */
    function RoleBadge({ role }) {
    const cfg = {
        chief:  { label: "Chief",  Icon: Crown,   cls: "bg-[#FF6B35]/10 text-[#FF6B35]/75 border border-[#FF6B35]/15" },
        scout:  { label: "Scout",  Icon: Compass, cls: "bg-white/[0.06] text-white/45 border border-white/[0.09]"      },
        member: { label: "Member", Icon: Users,   cls: "bg-white/[0.04] text-white/30 border border-white/[0.06]"      },
    };
    const { label, Icon, cls } = cfg[role] ?? cfg.member;
    return (
        <span className={`inline-flex items-center gap-1 ${cls} rounded-full px-2 py-px text-[9px] font-bold tracking-wider uppercase`}>
        <Icon size={8} /> {label}
        </span>
    );
    }



    /* ─── FLEET MAP (Leaflet) ─────────────────── */
    const MARKER_COLORS_HEX = [
    "#FF6B35","#4ade80","#a855f7","#0ea5e9",
    "#f43f5e","#fbbf24","#14b8a6","#ec4899","#6366f1","#84cc16",
    ];

    function makeAvatarIcon(name, colorHex, stale = false, avatarUrl = null) {
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

    function MapController({ flyTo, resetKey, allPoints }) {
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

    function makeYouIcon() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="16" fill="none" stroke="#3b82f6" stroke-width="1.5" opacity="0.4"/>
        <circle cx="18" cy="18" r="11" fill="#3b82f6" stroke="white" stroke-width="2.5" opacity="0.95"/>
        <text x="18" y="22" text-anchor="middle" font-size="7" font-weight="900" font-family="sans-serif" fill="white" letter-spacing="0.5">YOU</text>
    </svg>`;
    return L.divIcon({ html: svg, className: "", iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -20] });
    }

    function FleetMap({ height = 280, members = [], myLocation = null, flyTo = null, resetKey = 0 }) {
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
            {/* Esri satellite imagery */}
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="" />
            {/* Place name labels on top */}
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" attribution="" />
            <MapController flyTo={flyTo} resetKey={resetKey} allPoints={allPoints} />
            {/* Current user marker */}
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
            {/* Other members */}
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

        {/* LIVE badge */}
        <div className="absolute top-2.5 right-2.5 z-[500] flex items-center gap-1.5 bg-black/60 backdrop-blur-sm border border-white/[0.15] rounded-full px-2.5 py-1 pointer-events-none">
            <Radio size={10} className="text-blue-400 animate-pulse" />
            <span className="text-[10px] font-semibold text-white/70">LIVE</span>
        </div>

        {/* members without location */}
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

    /* ─── SOS BUTTON ──────────────────────────── */
    function SOSButton({ onFire }) {
    const [phase, setPhase] = useState("idle"); // "idle" | "loading" | "success" | "error"

    const handleClick = async () => {
        if (phase !== "idle") return;
        setPhase("loading");
        try {
            await onFire?.();
            setPhase("success");
        } catch {
            setPhase("error");
        }
    };

    return (
        <div className="flex flex-col items-center gap-3">
        <button
            onClick={handleClick}
            disabled={phase === "loading" || phase === "success"}
            className={`
            w-16 h-16 rounded-full border-none cursor-pointer flex flex-col items-center justify-center gap-0.5 transition-all duration-200 select-none disabled:cursor-not-allowed
            ${phase === "success" ? "bg-gradient-to-br from-green-400 to-green-600 shadow-[0_0_20px_rgba(74,222,128,0.5)]"
            : phase === "error"   ? "bg-gradient-to-br from-orange-400 to-red-600 shadow-[0_0_20px_rgba(244,63,94,0.5)]"
            : phase === "loading" ? "bg-gradient-to-br from-red-400 to-red-600 opacity-70"
            : "bg-gradient-to-br from-red-400 to-red-600 [animation:sosPulse_2s_ease-in-out_infinite]"}
            `}
        >
            {phase === "success" ? <Check size={24} className="text-white" />
            : phase === "loading" ? <span className="text-[11px] font-black text-white animate-pulse">...</span>
            : phase === "error"   ? <AlertTriangle size={20} className="text-white" />
            : <>
                <AlertTriangle size={16} className="text-white" />
                <span className="text-[9px] font-black text-white tracking-widest">SOS</span>
            </>
            }
        </button>
        <span className={`text-[11px] font-semibold
            ${phase === "success" ? "text-green-400"
            : phase === "error"   ? "text-red-400"
            : phase === "loading" ? "text-white/50"
            : "text-white/30"}`}>
            {phase === "success" ? "Alert sent ✓"
            : phase === "error"  ? "Failed — tap to retry"
            : phase === "loading"? "Sending alert…"
            : "Tap to activate"}
        </span>
        {phase === "error" && (
            <button onClick={() => setPhase("idle")}
            className="text-[11px] text-white/40 underline bg-transparent border-none cursor-pointer">
            Try again
            </button>
        )}
        </div>
    );
    }

    /* ─── COUNTDOWN ──────────────────────────── */
    function Countdown({ days, hours }) {
    return (
        <div className="flex gap-2">
        {[{ val: days, label: "days" }, { val: hours, label: "hrs" }].map(({ val, label }) => (
            <div key={label} className="bg-white/[0.05] border border-white/[0.09] rounded-xl px-3 py-1.5 text-center">
            <div className="text-xl font-black text-white/80 leading-none font-serif">{val}</div>
            <div className="text-[9px] text-white/30 font-semibold tracking-widest uppercase">{label}</div>
            </div>
        ))}
        </div>
    );
    }

    /* ─── COLLAPSIBLE SECTION ─────────────────── */
    function Section({ title, icon: Icon, iconColor, children, action, defaultOpen = true }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="bg-[#0d1b2a] rounded-2xl border border-white/[0.07] overflow-hidden">
        <button
            onClick={() => setOpen(o => !o)}
            className={`w-full flex items-center gap-2.5 px-4 py-3.5 bg-transparent border-none cursor-pointer text-left
            ${open ? "border-b border-white/[0.05]" : ""}`}
        >
            <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${iconColor}18`, border: `1px solid ${iconColor}30` }}
            >
            <Icon size={14} color={iconColor} />
            </div>
            <span className="flex-1 text-[13px] font-bold text-white/85 tracking-tight">{title}</span>
            {action}
            <ChevronDown
            size={14}
            className={`text-white/25 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
        </button>
        {open && <div className="p-4">{children}</div>}
        </div>
    );
    }

    /* ─── QUICK ACTION BUTTON ─────────────────── */
    function QuickAction({ icon: Icon, label, color, onClick, badge }) {
    const disabled = !onClick;
    return (
        <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl border border-white/[0.07] bg-white/[0.04] relative transition-all duration-150 group
            ${disabled ? "cursor-not-allowed" : "cursor-pointer hover:-translate-y-0.5"}`}
        >
        <Icon size={20} color={disabled ? "rgba(255,255,255,0.2)" : color} />
        <span className={`text-[10px] font-bold tracking-wide transition-colors ${disabled ? "text-white/20" : "text-white/50 group-hover:text-white/80"}`}>
            {label}
        </span>
        {badge > 0 && (
            <div className="absolute top-1.5 right-2 min-w-[16px] h-4 bg-red-500 rounded-full text-[9px] font-black text-white flex items-center justify-center px-1">
            {badge}
            </div>
        )}
        </button>
    );
    }

    /* ─── MEMBER ROW ──────────────────────────── */
    function MemberRow({ m, isChief, tripId, isTripLive, onRemove, onMessage, onLocate, onViewProfile }) {
    const [expanded,    setExpanded]    = useState(false);
    const [showNav,     setShowNav]     = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    return (
        <>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden transition-colors duration-150 hover:border-[#FF6B35]/20">
        <div className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer" onClick={() => setExpanded(e => !e)}>
            {/* avatar — no status dot */}
            <Avatar name={m.name} colorClass={m.avatar} ring imgSrc={m.avatar_url} />

            {/* name + role */}
            <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
                <button
                onClick={e => { e.stopPropagation(); onViewProfile?.(m.user_id); }}
                className="text-[13px] font-bold text-white truncate bg-transparent border-none p-0 cursor-pointer hover:text-[#FF6B35] transition-colors text-left"
                >{m.name}</button>
                <RoleBadge role={m.role} />
            </div>
            <div className="flex items-center gap-2">
                {m.lat != null
                ? <span className="text-[10px] text-emerald-400/70 flex items-center gap-1"><MapPin size={9} />Location shared</span>
                : <span className="text-[10px] text-white/25 flex items-center gap-1"><MapPin size={9} />No location</span>
                }
            </div>
            </div>

            {/* check-in status + chevron */}
            <div className="flex items-center gap-2 flex-shrink-0">
            <div title={m.checkedIn ? "Checked in" : "Not checked in"}>
                {m.checkedIn
                ? <CheckCircle size={15} className="text-green-400" />
                : <Clock size={15} className="text-white/20" />
                }
            </div>
            <ChevronDown size={13} className={`text-white/20 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
            </div>
        </div>

        {expanded && (
            <div className="px-3 pb-3 pt-2 border-t border-white/[0.05] flex gap-2 flex-wrap">
            <button onClick={e => { e.stopPropagation(); onMessage?.(m.user_id); }}
                className="flex-1 py-1.5 rounded-xl border border-white/10 bg-white/[0.05] text-white/50 text-[11px] font-semibold cursor-pointer flex items-center justify-center gap-1.5 hover:bg-white/10 transition-colors min-w-[70px]">
                <MessageCircle size={12} /> Message
            </button>
            <button
                onClick={e => { e.stopPropagation(); if (isTripLive && m.lat != null) onLocate?.(m); }}
                disabled={!isTripLive || m.lat == null}
                title={!isTripLive ? "Available once the trip begins" : m.lat == null ? "No location available" : undefined}
                className={`flex-1 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors min-w-[70px]
                ${isTripLive && m.lat != null
                    ? "border-blue-400/20 bg-blue-400/[0.06] text-blue-400/80 hover:bg-blue-400/15 cursor-pointer"
                    : "border-white/[0.06] bg-white/[0.02] text-white/20 cursor-not-allowed"}`}
            >
                <MapPin size={12} /> Locate
            </button>
            <button
                onClick={e => { e.stopPropagation(); if (isTripLive && m.lat != null) setShowNav(true); }}
                disabled={!isTripLive || m.lat == null}
                title={!isTripLive ? "Available once the trip begins" : m.lat == null ? "No location available" : undefined}
                className={`flex-1 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors min-w-[70px]
                ${isTripLive && m.lat != null
                    ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-400/80 hover:bg-emerald-400/15 cursor-pointer"
                    : "border-white/[0.06] bg-white/[0.02] text-white/20 cursor-not-allowed"}`}
            >
                <Compass size={12} /> Share
            </button>
            {isChief && m.role !== "chief" && (
                <button onClick={e => { e.stopPropagation(); setShowConfirm(true); }}
                className="flex-1 py-1.5 rounded-xl border border-red-500/25 bg-red-500/[0.08] text-red-400 text-[11px] font-semibold cursor-pointer flex items-center justify-center gap-1.5 hover:bg-red-500/15 transition-colors min-w-[70px]">
                <LogOut size={12} /> Remove
                </button>
            )}
            </div>
        )}
        </div>

        <NavigateSheet open={showNav} onClose={() => setShowNav(false)} lat={m.lat} lng={m.lng} name={m.name} />

        {/* Remove confirmation */}
        {showConfirm && (
            <>
            <div className="fixed inset-0 z-[1800] bg-black/60 backdrop-blur-[3px]" onClick={() => setShowConfirm(false)} />
            <div className="fixed inset-0 z-[1900] flex items-center justify-center p-4 pointer-events-none">
                <div className="bg-[#0d1b2a] border border-white/[0.09] rounded-3xl w-full max-w-[360px] shadow-[0_20px_60px_rgba(0,0,0,0.5)] pointer-events-auto p-6"
                style={{ animation: "slideUp .22s ease both" }}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center flex-shrink-0">
                    <LogOut size={16} className="text-red-400" />
                    </div>
                    <div>
                    <p className="text-[14px] font-bold text-white">Remove {m.name.split(" ")[0]}?</p>
                    <p className="text-[11px] text-white/35">They will lose access to the trip and group chat.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.09] text-[13px] font-semibold text-white/45 hover:bg-white/10 transition-all cursor-pointer">
                    Cancel
                    </button>
                    <button onClick={() => { setShowConfirm(false); onRemove?.(m.user_id, m.name); }}
                    className="flex-1 py-2.5 rounded-xl bg-red-500/80 text-white text-[13px] font-bold cursor-pointer hover:bg-red-500 transition-all">
                    Remove
                    </button>
                </div>
                </div>
            </div>
            </>
        )}
        </>
    );
    }

    /* ─── JOIN REQUEST CARD ───────────────────── */
    function JoinRequestCard({ req, onApprove, onReject }) {
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

    /* ─── NAVIGATE SHEET ────────────────────────── */
    function NavigateSheet({ open, onClose, lat, lng, name }) {
    if (!open || lat == null || lng == null) return null;
    const [copied, setCopied] = useState(false);

    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    const apps = [
        { label: "Google Maps", icon: "🗺️", url: mapsUrl },
        { label: "Waze",        icon: "🚗", url: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes` },
    ];

    const canShare = typeof navigator.share === "function";

    const handleApp = (url) => {
        window.open(url, "_blank", "noopener");
        onClose();
    };

    const handleShare = async () => {
        try {
        await navigator.share({ title: `${name}'s location`, text: `${name} is at: ${mapsUrl}`, url: mapsUrl });
        } catch { /* user cancelled */ }
        onClose();
    };

    const handleCopy = async () => {
        try {
        await navigator.clipboard.writeText(mapsUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        } catch { toast("Copy not supported on this device."); }
    };

    return (
        <>
        <div className="fixed inset-0 z-[2100] bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
        <div className="fixed bottom-0 left-0 right-0 z-[2200] flex justify-center p-3 pb-6"
            style={{ animation: "slideUp .2s ease both" }}>
            <div className="bg-[#0d1b2a] border border-white/[0.1] rounded-3xl w-full max-w-sm shadow-[0_-8px_40px_rgba(0,0,0,0.5)] overflow-hidden">
            {/* handle */}
            <div className="flex justify-center pt-3 pb-1">
                <div className="w-8 h-1 rounded-full bg-white/20" />
            </div>
            {/* header */}
            <div className="px-5 pt-2 pb-4">
                <p className="text-[11px] font-bold tracking-[.08em] uppercase text-white/30 mb-0.5">Navigate to</p>
                <p className="text-[15px] font-semibold text-white">{name}</p>
            </div>
            {/* app buttons */}
            <div className="px-4 flex flex-col gap-2 pb-4">
                {apps.map(a => (
                <button key={a.label} onClick={() => handleApp(a.url)}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-left cursor-pointer hover:bg-white/[0.09] transition-colors w-full">
                    <span className="text-xl">{a.icon}</span>
                    <span className="text-[13px] font-semibold text-white/80">{a.label}</span>
                    <ChevronRight size={14} className="text-white/20 ml-auto" />
                </button>
                ))}
                {canShare && (
                <button onClick={handleShare}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-left cursor-pointer hover:bg-white/[0.09] transition-colors w-full">
                    <span className="text-xl">📤</span>
                    <span className="text-[13px] font-semibold text-white/80">Share location</span>
                    <ChevronRight size={14} className="text-white/20 ml-auto" />
                </button>
                )}
                <button onClick={handleCopy}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-left cursor-pointer hover:bg-white/[0.09] transition-colors w-full">
                    <span className="text-xl">{copied ? "✅" : "📋"}</span>
                    <span className="text-[13px] font-semibold text-white/80">{copied ? "Copied!" : "Copy link"}</span>
                    {!copied && <ChevronRight size={14} className="text-white/20 ml-auto" />}
                </button>
            </div>
            <div className="px-4 pb-5">
                <button onClick={onClose}
                className="w-full py-3 rounded-2xl bg-white/[0.04] border border-white/[0.07] text-[13px] font-semibold text-white/40 cursor-pointer hover:bg-white/[0.08] transition-colors">
                Cancel
                </button>
            </div>
            </div>
        </div>
        </>
    );
    }

    /* ─── POLL COMPONENTS ────────────────────────── */
    function relativeTime(iso) {
    const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (diff < 60)    return "just now";
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
    }

    function StarRow({ value, onChange, size = 22, disabled }) {
    const [hov, setHov] = useState(0);
    return (
        <div className="flex gap-1">
        {[1,2,3,4,5].map(s => {
            const active = hov ? s <= hov : s <= (value ?? 0);
            return (
            <button key={s} disabled={disabled}
                onMouseEnter={() => !disabled && setHov(s)} onMouseLeave={() => !disabled && setHov(0)}
                onClick={() => !disabled && onChange?.(s)}
                className={`bg-transparent border-none p-0.5 transition-transform ${disabled ? "cursor-not-allowed" : "cursor-pointer hover:scale-110"}`}>
                <Star size={size} className={`transition-colors ${active ? "fill-[#FF6B35] text-[#FF6B35]" : "text-white/20"}`} />
            </button>
            );
        })}
        </div>
    );
    }

    function PollCard({ poll, isChief, onVote, onLock }) {
    const closed = poll.is_locked || poll.is_expired;
    const total  = poll.total_votes;

    const YesNo = () => {
        const voted = poll.my_vote != null;
        const dis   = voted || closed;
        const myAns = poll.my_vote?.yes_no_value;
        const yesCt = poll.options.find(o => o.text === "Yes")?.vote_count ?? 0;
        const noCt  = poll.options.find(o => o.text === "No")?.vote_count  ?? 0;
        const tot   = yesCt + noCt;
        return (
        <div className="flex flex-col gap-2">
            <div className="flex gap-2">
            {[["yes","Yes","bg-green-400/15 border-green-400/30 text-green-400"],
                ["no","No","bg-red-400/15 border-red-400/30 text-red-400"]].map(([val,label,ac]) => (
                <button key={val} disabled={dis} onClick={() => !dis && onVote?.({ yes_no_value: val })}
                className={`flex-1 py-2 rounded-xl text-[12px] font-bold border transition-all cursor-pointer
                    ${myAns === val ? ac : dis ? "bg-white/[0.03] border-white/[0.06] text-white/25 cursor-not-allowed"
                    : "bg-white/[0.05] border-white/[0.08] text-white/50 hover:bg-white/10 hover:text-white/70"}`}>
                {label}
                </button>
            ))}
            </div>
            {(voted || closed) && tot > 0 && (
            <div className="flex flex-col gap-1.5">
                {[["Yes", yesCt, "bg-green-400"], ["No", noCt, "bg-red-400"]].map(([l, c, col]) => (
                <div key={l} className="flex items-center gap-2">
                    <span className="text-[10px] text-white/35 w-5">{l}</span>
                    <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className={`h-full ${col} rounded-full`} style={{ width: `${tot ? Math.round(c/tot*100) : 0}%`, transition: "width .5s" }} />
                    </div>
                    <span className="text-[10px] font-bold text-white/50 w-7 text-right">{tot ? Math.round(c/tot*100) : 0}%</span>
                </div>
                ))}
            </div>
            )}
        </div>
        );
    };

    const MultiChoice = () => {
        const voted = poll.my_vote != null;
        const dis   = voted || closed;
        return (
        <div className="flex flex-col gap-2">
            {poll.options.map(opt => {
            const chosen = poll.my_vote?.option_id === opt.id;
            const pct    = total ? Math.round(opt.vote_count / total * 100) : 0;
            return (
                <button key={opt.id} disabled={dis} onClick={() => !dis && onVote?.({ option_id: opt.id })}
                className={`relative w-full text-left px-3 py-2.5 rounded-xl border text-[12px] font-semibold transition-all overflow-hidden cursor-pointer
                    ${chosen ? "border-[#FF6B35]/40 text-[#FF6B35] bg-[#FF6B35]/10"
                    : dis ? "border-white/[0.06] text-white/35 bg-white/[0.02] cursor-not-allowed"
                    : "border-white/[0.08] text-white/55 bg-white/[0.03] hover:bg-white/[0.07] hover:text-white/75"}`}>
                {(voted || closed) && total > 0 && (
                    <span className={`absolute inset-y-0 left-0 rounded-xl ${chosen ? "bg-[#FF6B35]/10" : "bg-white/[0.04]"}`}
                    style={{ width: `${pct}%`, transition: "width .5s" }} />
                )}
                <span className="relative flex items-center justify-between">
                    <span>{opt.text}</span>
                    {(voted || closed) && total > 0 && (
                    <span className={`text-[10px] font-black ${chosen ? "text-[#FF6B35]" : "text-white/30"}`}>{pct}%</span>
                    )}
                </span>
                </button>
            );
            })}
        </div>
        );
    };

    const Rating = () => {
        const voted = poll.my_vote != null;
        const dis   = voted || closed;
        const avg   = total
        ? (poll.options.reduce((s, o, i) => s + (i+1) * o.vote_count, 0) / total).toFixed(1)
        : null;
        return (
        <div className="flex flex-col gap-2">
            <div className="flex justify-center">
            <StarRow value={poll.my_vote?.rating_value ?? 0} onChange={v => !dis && onVote?.({ rating_value: v })} size={26} disabled={dis} />
            </div>
            {(voted || closed) && avg && (
            <p className="text-center text-[11px] text-white/40">
                Average: <span className="font-bold text-[#FF6B35]">{avg}</span> / 5
                <span className="text-white/25 ml-1.5">({total} vote{total !== 1 ? "s" : ""})</span>
            </p>
            )}
        </div>
        );
    };

    return (
        <div className={`rounded-xl border p-4 transition-all ${closed ? "bg-white/[0.02] border-white/[0.05]" : "bg-white/[0.03] border-white/[0.07]"}`}>
        {/* header */}
        <div className="flex items-start gap-2 mb-3">
            <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white/85 leading-snug">{poll.question}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[10px] text-white/25">{poll.created_by_username}</span>
                <span className="text-white/15 text-[10px]">·</span>
                <span className="text-[10px] text-white/25">{relativeTime(poll.created_at)}</span>
                {(poll.time_impact_minutes || poll.budget_impact_ghs) && (
                <>
                    <span className="text-white/15 text-[10px]">·</span>
                    <span className="text-[10px] text-amber-400/70 font-semibold">
                    {poll.time_impact_minutes ? `+${poll.time_impact_minutes}min` : ""}
                    {poll.time_impact_minutes && poll.budget_impact_ghs ? " / " : ""}
                    {poll.budget_impact_ghs ? `+GHS ${poll.budget_impact_ghs}` : ""}
                    </span>
                </>
                )}
            </div>
            </div>
            {poll.is_locked ? (
            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-white/30 bg-white/[0.05] border border-white/[0.07] rounded-full px-2 py-1 flex-shrink-0">
                <Lock size={9} /> Locked
            </span>
            ) : poll.is_expired ? (
            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-400/60 bg-amber-400/10 border border-amber-400/15 rounded-full px-2 py-1 flex-shrink-0">
                <Clock size={9} /> Expired
            </span>
            ) : poll.my_vote != null ? (
            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-green-400/70 bg-green-400/10 border border-green-400/20 rounded-full px-2 py-1 flex-shrink-0">
                <CheckCircle size={9} /> Voted
            </span>
            ) : (
            <span className="text-[9px] font-black uppercase tracking-wider text-[#FF6B35]/70 bg-[#FF6B35]/10 border border-[#FF6B35]/20 rounded-full px-2 py-1 flex-shrink-0">Open</span>
            )}
        </div>

        {poll.poll_type === "yes_no"         && <YesNo />}
        {poll.poll_type === "multiple_choice" && <MultiChoice />}
        {poll.poll_type === "rating"          && <Rating />}

        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/[0.05]">
            <span className="text-[10px] text-white/25">{total} vote{total !== 1 ? "s" : ""}</span>
            {isChief && !closed && (
            <button onClick={() => onLock?.(poll.id)}
                className="flex items-center gap-1 text-[10px] text-white/35 hover:text-amber-400 bg-transparent border-none cursor-pointer transition-colors">
                <Lock size={11} /> Lock poll
            </button>
            )}
        </div>
        </div>
    );
    }

    /* ─── CREATE POLL MODAL ──────────────────────── */
    function CreatePollModal({ open, onClose, onCreate }) {
    const [question,    setQuestion]    = useState("");
    const [pollType,    setPollType]    = useState("yes_no");
    const [options,     setOptions]     = useState(["", ""]);
    const [expiresHrs,  setExpiresHrs]  = useState("");
    const [timeImpact,  setTimeImpact]  = useState("");
    const [budgetImpact,setBudgetImpact]= useState("");
    const [submitting,  setSubmitting]  = useState(false);

    if (!open) return null;

    const isMulti   = pollType === "multiple_choice";
    const canSubmit = question.trim().length >= 5 && (!isMulti || options.filter(o => o.trim()).length >= 2);

    const TYPES = [
        { value: "yes_no",          label: "Yes / No"  },
        { value: "multiple_choice", label: "Multi Choice" },
        { value: "rating",          label: "Rating (★)" },
    ];

    async function handleSubmit() {
        if (!canSubmit || submitting) return;
        setSubmitting(true);
        const payload = {
        question: question.trim(), poll_type: pollType,
        expires_at: expiresHrs ? new Date(Date.now() + Number(expiresHrs) * 3_600_000).toISOString() : null,
        time_impact_minutes:  timeImpact   ? Number(timeImpact)   : null,
        budget_impact_ghs:    budgetImpact ? Number(budgetImpact) : null,
        ...(isMulti && { options: options.filter(o => o.trim()).map((o, i) => ({ text: o.trim(), order: i })) }),
        };
        try { await onCreate?.(payload); setQuestion(""); setPollType("yes_no"); setOptions(["",""]); setExpiresHrs(""); setTimeImpact(""); setBudgetImpact(""); onClose?.(); }
        finally { setSubmitting(false); }
    }

    return (
        <>
        <div className="fixed inset-0 z-[1800] bg-black/60 backdrop-blur-[3px]" onClick={onClose} />
        <div className="fixed inset-0 z-[1900] flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-[#0d1b2a] border border-white/[0.09] rounded-3xl w-full max-w-[420px] shadow-[0_20px_60px_rgba(0,0,0,0.5)] pointer-events-auto flex flex-col max-h-[90vh]"
            style={{ animation: "slideUp .22s ease both" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07] flex-shrink-0">
                <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#FF6B35]/15 border border-[#FF6B35]/25 flex items-center justify-center">
                    <BarChart2 size={14} className="text-[#FF6B35]" />
                </div>
                <span className="text-[14px] font-bold text-white">New Poll</span>
                </div>
                <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/[0.07] border border-white/10 flex items-center justify-center cursor-pointer text-white/40 hover:text-white/70 transition-all"><X size={13} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
                <div>
                <label className="block text-[10px] font-bold tracking-[.08em] uppercase text-white/35 mb-1.5">Question</label>
                <textarea value={question} onChange={e => setQuestion(e.target.value)} rows={2} maxLength={200} placeholder="Ask the group something…"
                    className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder-white/20 resize-none focus:outline-none focus:border-[#FF6B35]/40 transition-colors" />
                <div className="text-right text-[10px] text-white/20 mt-0.5">{question.length}/200</div>
                </div>

                <div>
                <label className="block text-[10px] font-bold tracking-[.08em] uppercase text-white/35 mb-1.5">Poll Type</label>
                <div className="grid grid-cols-3 gap-2">
                    {TYPES.map(pt => (
                    <button key={pt.value} onClick={() => setPollType(pt.value)}
                        className={`py-2.5 px-2 rounded-xl border text-[11px] font-bold text-center cursor-pointer transition-all
                        ${pollType === pt.value ? "bg-[#FF6B35]/10 border-[#FF6B35]/35 text-[#FF6B35]" : "bg-white/[0.03] border-white/[0.07] text-white/40 hover:text-white/60 hover:bg-white/[0.06]"}`}>
                        {pt.label}
                    </button>
                    ))}
                </div>
                </div>

                {isMulti && (
                <div>
                    <label className="block text-[10px] font-bold tracking-[.08em] uppercase text-white/35 mb-1.5">Options</label>
                    <div className="flex flex-col gap-2">
                    {options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/[0.09] flex items-center justify-center text-[9px] font-bold text-white/30 flex-shrink-0">{i+1}</span>
                        <input type="text" value={opt} onChange={e => setOptions(p => p.map((o,idx) => idx===i ? e.target.value : o))}
                            placeholder={`Option ${i+1}`} maxLength={80}
                            className="flex-1 bg-white/[0.04] border border-white/[0.09] rounded-lg px-3 py-2 text-[12px] text-white placeholder-white/20 focus:outline-none focus:border-[#FF6B35]/40 transition-colors" />
                        {options.length > 2 && (
                            <button onClick={() => setOptions(p => p.filter((_,idx) => idx !== i))}
                            className="w-6 h-6 flex items-center justify-center bg-transparent border-none cursor-pointer text-white/20 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                        )}
                        </div>
                    ))}
                    {options.length < 6 && (
                        <button onClick={() => setOptions(p => [...p, ""])}
                        className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-[#FF6B35] bg-transparent border-none cursor-pointer transition-colors mt-1">
                        <Plus size={13} /> Add option
                        </button>
                    )}
                    </div>
                </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                {[
                    { label: "Expires (hrs)", val: expiresHrs,   set: setExpiresHrs,   unit: "hrs" },
                    { label: "Time impact",   val: timeImpact,   set: setTimeImpact,   unit: "min" },
                    { label: "Budget impact", val: budgetImpact, set: setBudgetImpact, unit: "GHS" },
                ].map(f => (
                    <div key={f.label}>
                    <label className="block text-[10px] font-bold tracking-[.08em] uppercase text-white/25 mb-1.5">{f.label}</label>
                    <div className="relative">
                        <input type="number" min="0" value={f.val} onChange={e => f.set(e.target.value)} placeholder="—"
                        className="w-full bg-white/[0.04] border border-white/[0.09] rounded-lg px-2.5 py-2 text-[12px] text-white placeholder-white/20 focus:outline-none focus:border-[#FF6B35]/40 transition-colors" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-white/20">{f.unit}</span>
                    </div>
                    </div>
                ))}
                </div>
            </div>

            <div className="px-5 py-4 border-t border-white/[0.07] flex gap-2 flex-shrink-0">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.09] text-[13px] font-semibold text-white/45 hover:bg-white/10 transition-all cursor-pointer">Cancel</button>
                <button onClick={handleSubmit} disabled={!canSubmit || submitting}
                className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all
                    ${canSubmit && !submitting ? "bg-[#FF6B35] text-white hover:bg-[#FF6B35]/90 cursor-pointer shadow-[0_4px_20px_rgba(255,107,53,0.3)]" : "bg-[#FF6B35]/20 text-[#FF6B35]/30 cursor-not-allowed"}`}>
                {submitting ? "Creating…" : "Create Poll"}
                </button>
            </div>
            </div>
        </div>
        </>
    );
    }

    /* ─── ROOT ────────────────────────────────── */
    export default function GroupDashboard() {
    const navigate     = useNavigate();
    const { tripId }   = useParams();
    const { user }     = useAuth();

    const [winW,          setWinW]          = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
    const [showSOS,       setShowSOS]       = useState(false);
    const [checkedIn,     setCheckedIn]     = useState(false);
    const [checkedInStops, setCheckedInStops] = useState([]);
    const [myLocation,    setMyLocation]    = useState(null);     // { lat, lng }
    const [locPerms,      setLocPerms]      = useState("prompt"); // "prompt" | "granted" | "denied"
    const [tick,          setTick]          = useState(0);        // ticks every 60s to recompute isTripLive
    const isTripLiveRef       = useRef(false);
    const wsRef               = useRef(null);
    const wsSendLocationRef   = useRef(null);
    const [requests,      setRequests]      = useState([]);
    const [polls,         setPolls]         = useState([]);
    const [sosAlerts,     setSosAlerts]     = useState([]);
    const alertsWsRef = useRef(null);
    const [showCreate,    setShowCreate]    = useState(false);
    const [itinerary,     setItinerary]     = useState([]);
    const [showAddStop,   setShowAddStop]   = useState(false);
    const [stopForm,      setStopForm]      = useState({ name: "", arrival_time: "", note: "" });
    const [mapFlyTo,      setMapFlyTo]      = useState(null);
    const [mapResetKey,   setMapResetKey]   = useState(0);
    const [locating,      setLocating]      = useState(false);
    const [trip,          setTrip]          = useState(null);
    const [chiefId,       setChiefId]       = useState(null);
    const [members,       setMembers]       = useState([]);
    const [loading,       setLoading]       = useState(true);

    // Chief if the user matches the stored chief_id (available as soon as trip loads)
    const isChief = !!user && (
        (chiefId && String(chiefId) === String(user.id)) ||
        members.some(m => m.role === "chief" && String(m.user_id) === String(user.id))
    );

    // Fetch trip, members, polls on mount — each independently so partial failures don't block the page
    useEffect(() => {
        if (!tripId) return;
        let cancelled = false;
        setLoading(true);

        const normMembers = (raw) => {
            const all = raw.results ?? raw;
            const approved = all.filter(m => m.status === "approved");
            setMembers(approved.map((m, idx) => ({
                id:         m.user_id || m.id,
                user_id:    m.user_id,
                name:       `${m.first_name || ""} ${m.last_name || ""}`.trim() || m.username || "Member",
                role:       m.role === "chief" ? "chief" : m.role === "scout" ? "scout" : "member",
                karma:      m.travel_karma ?? m.karma_earned ?? 0,
                status:     "offline",
                lastSeen:   "—",
                battery:    null,
                checkedIn:  false,
                avatar:     AVATAR_COLORS[idx % AVATAR_COLORS.length],
                avatar_url: m.avatar_url || null,
            })));
            const pending = all.filter(m => m.status === "pending");
            setRequests(pending.map((m, idx) => ({
                id:       m.user_id || m.id,
                name:     `${m.first_name || ""} ${m.last_name || ""}`.trim() || m.username || "Member",
                karma:    m.travel_karma ?? 0,
                trips:    m.trips_count ?? 0,
                rating:   m.average_rating ?? 0,
                time:       "—",
                verified:   m.is_verified ?? false,
                avatar:     AVATAR_COLORS[idx % AVATAR_COLORS.length],
                avatar_url: m.avatar_url || null,
            })));
        };

        tripsApi.get(tripId)
            .then(({ data: t }) => {
                if (cancelled) return;
                setChiefId(t.chief_id ?? null);
                const now       = Date.now();
                const startMs   = t.date_start ? new Date(t.date_start).getTime() : null;
                const endMs     = t.date_end   ? new Date(t.date_end).getTime()   : null;
                const targetMs  = (startMs && startMs > now) ? startMs : (endMs ?? startMs);
                const diffMs    = targetMs ? Math.max(0, targetMs - now) : null;
                const daysLeft  = diffMs != null ? Math.floor(diffMs / 86400000)   : "—";
                const hoursLeft = diffMs != null ? Math.floor((diffMs % 86400000) / 3600000) : 0;
                setTrip({
                    title:       t.title,
                    destination: t.destination || "",
                    daysLeft,
                    hoursLeft,
                    spotsTotal:  t.spots_total  ?? 0,
                    spotsFilled: t.member_count ?? 0,
                    groupKarma:  t.group_karma  ?? 0,
                    status:      t.status       ?? "",
                    startMs,
                    endMs,
                });
            })
            .catch(() => {})
            .finally(() => { if (!cancelled) setLoading(false); });

        tripsApi.members(tripId)
            .then(({ data }) => { if (!cancelled) normMembers(data); })
            .catch(() => {});

        pollsApi.list(tripId)
            .then(({ data }) => { if (!cancelled) setPolls(data.results ?? data); })
            .catch(() => {});

        tripsApi.itinerary(tripId)
            .then(({ data }) => { if (!cancelled) setItinerary(data.results ?? data); })
            .catch(() => {});

        tripsApi.getCheckins(tripId)
            .then(({ data }) => { if (!cancelled) setCheckedInStops(data.checked_in_stops ?? []); })
            .catch(() => {});

        return () => { cancelled = true; };
    }, [tripId]);

    // ── Live location WebSocket (auto-reconnect + Page Visibility recovery) ──────
    useEffect(() => {
        if (!tripId) return;
        let cancelled        = false;
        let pingInterval     = null;
        let reconnectTimeout = null;
        let reconnectDelay   = 1_000; // starts at 1s, doubles each attempt, caps at 30s
        let ws               = null;

        const STALE_MS = 10 * 60 * 1000; // 10 minutes — beyond this, treat as no location
        const applyPosition = (user_id, latitude, longitude, updatedAt = null) => {
            const tsMs  = updatedAt ? new Date(updatedAt).getTime() : Date.now();
            const ageMs = Date.now() - tsMs;

            if (ageMs > STALE_MS) {
                // Too old — clear location entirely so map pin and "Location shared" are removed
                setMembers(prev => prev.map(m =>
                    String(m.user_id) === String(user_id)
                        ? { ...m, lat: null, lng: null }
                        : m
                ));
                return;
            }
            setMembers(prev => prev.map(m =>
                String(m.user_id) === String(user_id)
                    ? { ...m, lat: latitude, lng: longitude, lastSeen: "now", lastSeenMs: tsMs }
                    : m
            ));
        };

        const connect = () => {
            if (cancelled) return;
            ws = new WebSocket(`${WS_BASE}/ws/trips/${tripId}/locations/`);
            wsRef.current = ws;

            ws.onopen = () => {
                if (cancelled) { ws.close(); return; }
                reconnectDelay = 1_000; // reset backoff on clean connect
                ws.send(JSON.stringify({ type: "auth", token: tokenStore.getAccess() }));
            };

            ws.onmessage = (e) => {
                if (cancelled) return;
                const msg = JSON.parse(e.data);

                if (msg.type === "auth.ok") {
                    const sendLocation = () => {
                        if (!isTripLiveRef.current) return;   // only share during the trip window
                        if (!navigator.geolocation) return;
                        navigator.geolocation.getCurrentPosition(pos => {
                            if (cancelled) return;
                            const { latitude, longitude } = pos.coords;
                            setMyLocation({ lat: latitude, lng: longitude });
                            setLocPerms("granted");
                            if (user?.id) applyPosition(user.id, latitude, longitude);
                            if (ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify({ type: "location.update", latitude, longitude }));
                            }
                        }, () => { if (!cancelled) setLocPerms("denied"); });
                    };
                    wsSendLocationRef.current = sendLocation;
                    if (isTripLiveRef.current) sendLocation();
                    pingInterval = setInterval(sendLocation, 30_000);
                }

                if (msg.type === "location.snapshot") {
                    (msg.positions ?? []).forEach(p => applyPosition(p.user_id, p.latitude, p.longitude, p.updated_at));
                }
                if (msg.type === "location.update") {
                    applyPosition(msg.user_id, msg.latitude, msg.longitude, msg.updated_at);
                }
                if (msg.type === "location.stopped") {
                    setMembers(prev => prev.map(m =>
                        String(m.user_id) === String(msg.user_id)
                            ? { ...m, lat: null, lng: null } : m
                    ));
                }
            };

            ws.onclose = () => {
                clearInterval(pingInterval);
                pingInterval = null;
                if (!cancelled) {
                    // Exponential backoff: 1s → 2s → 4s → … → 30s
                    reconnectTimeout = setTimeout(() => {
                        reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
                        connect();
                    }, reconnectDelay);
                }
            };

            ws.onerror = () => { /* onclose fires next — reconnect handled there */ };
        };

        connect();

        // Page Visibility API — skip the backoff timer and reconnect immediately
        // when the user returns to this tab after it was suspended
        const handleVisibility = () => {
            if (document.visibilityState !== "visible") return;
            if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
                clearTimeout(reconnectTimeout);
                reconnectDelay = 1_000;
                connect();
            }
        };
        document.addEventListener("visibilitychange", handleVisibility);

        return () => {
            cancelled = true;
            clearInterval(pingInterval);
            clearTimeout(reconnectTimeout);
            document.removeEventListener("visibilitychange", handleVisibility);
            if (ws && ws.readyState !== WebSocket.CLOSED) ws.close();
            wsRef.current = null;
            wsSendLocationRef.current = null;
        };
    }, [tripId, user]);

    // ── SOS Alerts WebSocket ─────────────────────────────────────────────
    useEffect(() => {
        if (!tripId) return;
        let cancelled = false;
        const ws = new WebSocket(`${WS_BASE}/ws/trips/${tripId}/alerts/`);
        alertsWsRef.current = ws;
        ws.onopen = () => {
            if (cancelled) { ws.close(); return; }
            ws.send(JSON.stringify({ type: "auth", token: tokenStore.getAccess() }));
        };
        ws.onmessage = (e) => {
            if (cancelled) return;
            const msg = JSON.parse(e.data);
            if (msg.type === "sos.alert") {
                setSosAlerts(prev => [...prev, {
                    id:        msg.alert_id ?? Date.now(),
                    user_id:   msg.user_id,
                    name:      msg.name ?? "Member",
                    lat:       msg.lat,
                    lng:       msg.lng,
                    ts:        msg.timestamp ?? new Date().toISOString(),
                }]);
            }
            if (msg.type === "sos.resolved") {
                setSosAlerts(prev => prev.filter(a => a.id !== msg.alert_id));
            }
        };
        return () => {
            cancelled = true;
            alertsWsRef.current = null;
            if (ws.readyState !== WebSocket.CLOSED) ws.close();
        };
    }, [tripId]);

    // Pending stop = not yet checked in by current user
    const pendingStop = itinerary.find(s => !checkedInStops.includes(String(s.id)));
    const canCheckIn  = !!pendingStop;

    const handleCheckIn = async () => {
        if (!canCheckIn) return;
        const doCheckin = async (lat, lng) => {
            if (lat == null || lng == null) {
                toast.error("Location required to check in.");
                return;
            }
            try {
                await tripsApi.checkin(tripId, { lat, lng, stop_id: pendingStop.id });
                const newStopId = String(pendingStop.id);
                setCheckedInStops(prev => [...prev, newStopId]);
                // Mark current user checked in on the member list
                if (user) {
                    setMembers(prev => prev.map(m =>
                        String(m.user_id) === String(user.id) ? { ...m, checkedIn: true } : m
                    ));
                }
                // Refresh itinerary so checkin_count updates
                tripsApi.itinerary(tripId)
                    .then(({ data }) => setItinerary(data.results ?? data))
                    .catch(() => {});
                toast.success(`Checked in at ${pendingStop.name}!`);
            } catch {
                toast.error("Check-in failed. Try again.");
            }
        };
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => doCheckin(pos.coords.latitude, pos.coords.longitude),
                ()  => toast.error("Enable location to check in."),
                { timeout: 8000 }
            );
        } else {
            toast.error("Geolocation not supported on this device.");
        }
    };

    const handleRemoveMember = async (userId, name) => {
        setMembers(prev => prev.filter(m => String(m.user_id) !== String(userId)));
        try {
            await tripsApi.declineMember(tripId, userId);
            toast.success(`${name ?? "Member"} removed from the trip.`);
        } catch {
            toast.error("Failed to remove member.");
        }
    };

    const handleLocateMember = (m) => {
        if (m.lat == null || m.lng == null) {
            toast(`Location unavailable for ${m.name.split(" ")[0]}.`, { icon: "📍" });
            return;
        }
        setMapFlyTo([m.lat, m.lng]);
        // Scroll map into view on mobile
        document.getElementById("fleet-map-anchor")?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    const handleViewProfile = (userId) => {
        navigate(`/profile/${userId}`);
    };

    const handleMessageMember = async (userId) => {
        try {
            const { data } = await chatApi.startDM(userId);
            navigate('/chat', { state: { conversationId: data.id } });
        } catch {
            navigate('/chat');
        }
    };

    function handleLocate() {
        if (!navigator.geolocation) return;
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            pos => { setMapFlyTo([pos.coords.latitude, pos.coords.longitude]); setLocating(false); },
            ()  => { toast.error("Could not get your location."); setLocating(false); },
            { timeout: 8000 }
        );
    }
    const mobile = winW < 768;

    // Check-ins for Group Health: track the LATEST stop only.
    // Using a union of all stops would keep counts stale when new stops are added.
    const latestStop           = itinerary.length > 0 ? itinerary[itinerary.length - 1] : null;
    const latestStopCheckedIds = new Set(
        (latestStop?.checked_in_users ?? []).map(u => String(u.user_id))
    );
    const checkedInCount    = members.filter(m => latestStopCheckedIds.has(String(m.user_id))).length;
    const checkedInStopName = latestStop?.name ?? null;

    // Keep member.checkedIn in sync — a member is "checked in" if they checked into the latest stop
    useEffect(() => {
        if (itinerary.length === 0) return;
        const latest = itinerary[itinerary.length - 1];
        const ids = new Set((latest?.checked_in_users ?? []).map(u => String(u.user_id)));
        setMembers(prev => prev.map(m => ({ ...m, checkedIn: ids.has(String(m.user_id)) })));
    }, [itinerary]);

    useEffect(() => {
        const h = () => setWinW(window.innerWidth);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);

    // Tick every 60s so isTripLive recomputes when the trip start time is reached
    useEffect(() => {
        const t = setInterval(() => setTick(n => n + 1), 60_000);
        return () => clearInterval(t);
    }, []);

    // Trip is "live" from start time until end time (date-based, not status-based)
    const isTripLive = !!(
        trip?.startMs != null &&
        Date.now() >= trip.startMs &&
        (trip?.endMs == null || Date.now() <= trip.endMs)
    );

    // Keep ref in sync so WS closure can read it without re-subscribing
    useEffect(() => { isTripLiveRef.current = isTripLive; }, [isTripLive]);

    // When the trip goes live while the user is already on the dashboard,
    // immediately trigger a location send without waiting for the next 30s tick
    useEffect(() => {
        if (isTripLive) wsSendLocationRef.current?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isTripLive]);

    /* ──────────── REUSABLE PANEL BLOCKS ──────────── */

    const STATUS_CFG = {
        active:    { label: "Active",    cls: "bg-green-400/10 text-green-400 border-green-400/20"   },
        published: { label: "Published", cls: "bg-blue-400/10  text-blue-400  border-blue-400/20"   },
        draft:     { label: "Draft",     cls: "bg-white/[0.06] text-white/40  border-white/[0.09]"  },
        completed: { label: "Completed", cls: "bg-white/[0.06] text-white/30  border-white/[0.08]"  },
    };

    const TripHeader = (
        <div className="bg-[#0d1b2a] border border-white/[0.07] rounded-2xl p-5">
        {/* breadcrumb */}
        <div className="flex items-center gap-1.5 mb-3">
            <button onClick={() => navigate('/dashboard')} className="bg-transparent border-none cursor-pointer text-white/40 flex p-0">
            <ArrowLeft size={14} />
            </button>
            <span className="text-[10px] text-white/25">My Trips</span>
            <ChevronRight size={10} className="text-white/20" />
            <span className="text-[10px] text-[#FF6B35]/70 font-semibold">Group Dashboard</span>
        </div>

        <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-[22px] font-light text-white font-serif tracking-tight leading-tight">
                {trip?.title ?? "—"}
                </h1>
                {trip?.status && STATUS_CFG[trip.status] && (
                <span className={`text-[9px] font-black uppercase tracking-wider border rounded-full px-2 py-px flex-shrink-0 ${STATUS_CFG[trip.status].cls}`}>
                    {STATUS_CFG[trip.status].label}
                </span>
                )}
            </div>
            <div className="flex items-center gap-1.5">
                <MapPin size={11} className="text-white/30" />
                <span className="text-[12px] text-white/40">{trip?.destination ?? ""}</span>
            </div>
            </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
            <Countdown days={trip?.daysLeft ?? "—"} hours={trip?.hoursLeft ?? 0} />
        </div>
        </div>
    );

    const handleOpenGroupChat = async () => {
        if (!tripId) return;
        try {
            const { data } = await tripsApi.groupConversation(tripId);
            navigate('/chat', { state: { conversationId: data.id } });
        } catch {
            navigate('/chat');
        }
    };

    const preTripTitle = "Available once the trip begins";
    const QuickActionsPanel = (
        <div className="bg-[#0d1b2a] rounded-2xl border border-white/[0.07] p-4">
        <p className="text-[9px] font-bold tracking-[.1em] uppercase text-white/25 mb-3">Quick Actions</p>
        <div className="grid grid-cols-3 gap-2">
            <div className="relative"
                title={!isTripLive ? preTripTitle : itinerary.length === 0 ? "Add an itinerary stop first." : !canCheckIn ? "All stops checked in." : undefined}>
                <QuickAction
                    icon={CheckCircle}
                    label="Check In"
                    color={isTripLive && canCheckIn ? "#52A882" : "#4b5563"}
                    onClick={isTripLive && canCheckIn ? handleCheckIn : undefined}
                />
                {isTripLive && !canCheckIn && itinerary.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-green-400/80 flex items-center justify-center border-2 border-[#0d1b2a] pointer-events-none">
                        <Check size={7} className="text-white" />
                    </span>
                )}
            </div>
            <QuickAction icon={MessageCircle} label="Chat" color="#8B9FC4" onClick={handleOpenGroupChat} />
            <div title={!isTripLive ? preTripTitle : undefined}>
                <QuickAction
                    icon={AlertTriangle}
                    label="SOS"
                    color={isTripLive ? "#C0504A" : "#4b5563"}
                    onClick={isTripLive ? () => setShowSOS(true) : undefined}
                />
            </div>
        </div>
        {checkedIn && pendingStop === undefined && itinerary.length > 0 && (
            <div className="mt-3 px-3 py-2 bg-emerald-500/[0.07] border border-emerald-500/20 rounded-xl flex items-center gap-2 text-[12px] text-emerald-400/80 font-semibold">
            <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" /> All stops checked in!
            </div>
        )}
        {checkedIn && pendingStop && (
            <div className="mt-3 px-3 py-2 bg-emerald-500/[0.07] border border-emerald-500/20 rounded-xl flex items-center gap-2 text-[12px] text-emerald-400/80 font-semibold">
            <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
            Checked in{pendingStop ? ` — next: ${pendingStop.name}` : ""}
            </div>
        )}
        </div>
    );

    const locatedCount = members.filter(m => m.lat != null).length;
    const HealthPanel = (
        <div className="bg-[#0d1b2a] rounded-2xl border border-white/[0.07] p-4">
        <p className="text-[9px] font-bold tracking-[.1em] uppercase text-white/25 mb-3">Group Health</p>
        <div className="grid grid-cols-2 gap-2">
            {[
            { label: "Sharing Loc", val: `${locatedCount}/${members.length}`, sub: "location active",                                        color: "text-white/70"   },
            { label: "Check-ins",   val: `${checkedInCount}/${members.length}`, sub: checkedInStopName ? `at ${checkedInStopName}` : "checked in", color: "text-[#FF6B35]"  },
            { label: "SOS Alerts",  val: `${sosAlerts.length}`,                 sub: sosAlerts.length ? "active alerts!" : "no active alerts", color: sosAlerts.length ? "text-red-400" : "text-white/70" },
            { label: "Spots Left",  val: `${(trip?.spotsTotal ?? 0) - (trip?.spotsFilled ?? 0)}`, sub: `${trip?.spotsFilled ?? 0}/${trip?.spotsTotal ?? 0} filled`, color: "text-white/70" },
            ].map(s => (
            <div key={s.label} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3">
                <div className={`text-xl font-black leading-none font-serif ${s.color}`}>{s.val}</div>
                <div className="text-[9px] font-bold uppercase tracking-wide text-white/20 mt-1">{s.label}</div>
                <div className="text-[9px] text-white/15 mt-0.5">{s.sub}</div>
            </div>
            ))}
        </div>
        </div>
    );

    const MapPanel = (
        <div id="fleet-map-anchor">
        <Section title="Live Fleet Map" icon={Map} iconColor="#6B8BAA">
        <FleetMap height={300} members={members} myLocation={myLocation} flyTo={mapFlyTo} resetKey={mapResetKey} />
        <div className="flex gap-2 mt-3">
            <button onClick={handleLocate}
            className="flex-1 py-1.5 rounded-xl text-[10px] font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition-colors bg-white/[0.03] border border-white/[0.07] text-white/35 hover:text-white/60 hover:bg-white/[0.06]"
            >
            <MapPin size={11} className={locating ? "animate-spin" : ""} />
            {locating ? "Locating…" : "My Location"}
            </button>
            <button onClick={() => { setMapFlyTo(null); setMapResetKey(k => k + 1); }}
            className="flex-1 py-1.5 rounded-xl text-[10px] font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition-colors bg-white/[0.03] border border-white/[0.07] text-white/35 hover:text-white/60 hover:bg-white/[0.06]"
            >
            <RefreshCw size={11} /> Reset View
            </button>
        </div>
        </Section>
        </div>
    );

    const handleAddStop = async (form) => {
        try {
            const { data } = await tripsApi.addStop(tripId, {
                name:         form.name,
                arrival_time: form.arrival_time || null,
                note:         form.note || "",
                order:        itinerary.length,
            });
            setItinerary(prev => [...prev, data]);
        } catch {}
    };

    const handleDeleteStop = async (stopId) => {
        setItinerary(prev => prev.filter(s => s.id !== stopId));
        try { await tripsApi.deleteStop(tripId, stopId); }
        catch { /* re-fetch on error */ tripsApi.itinerary(tripId).then(r => setItinerary(r.data.results ?? r.data)).catch(() => {}); }
    };

    const ItineraryPanel = (
        <Section
            title="Itinerary"
            icon={Calendar}
            iconColor="#6B7FA6"
            action={isChief && (
                <button
                    onClick={() => setShowAddStop(true)}
                    className="flex items-center gap-1 text-[10px] font-bold text-[#6B7FA6] bg-[#6B7FA6]/10 border border-[#6B7FA6]/20 rounded-lg px-2.5 py-1 cursor-pointer hover:bg-[#6B7FA6]/20 transition-colors"
                >
                    <Plus size={10} /> Add Stop
                </button>
            )}
        >
        {itinerary.length === 0 ? (
            <p className="text-[11px] text-white/25 text-center py-2">No stops added yet.</p>
        ) : (
        <div className="relative pl-5">
            <div className="absolute left-[7px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-white/15 to-white/[0.03] rounded-full" />
            {itinerary.map((stop, i) => (
            <div key={stop.id} className={`relative flex gap-3 ${i < itinerary.length - 1 ? "mb-5" : ""}`}>
                <div className={`absolute -left-5 mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
                    ${stop.is_current ? "border-[#6B7FA6] bg-[#6B7FA6]" : "border-white/10 bg-white/[0.05]"}`}
                />
                <div className={`flex-1 rounded-xl px-3 py-2.5 border
                    ${stop.is_current ? "bg-[#6B7FA6]/[0.07] border-[#6B7FA6]/20" : "bg-white/[0.02] border-white/[0.05]"}`}
                >
                <div className="flex items-center justify-between mb-1">
                    <span className={`text-[13px] font-bold ${stop.is_current ? "text-[#8BA4C8]" : "text-white/70"}`}>
                        {stop.name}
                    </span>
                    <div className="flex items-center gap-2">
                        {stop.checkin_count > 0 && (
                        <span className="text-[9px] font-bold text-green-400/70 bg-green-400/10 border border-green-400/20 px-2 py-px rounded-full">
                            {stop.checkin_count} checked in
                        </span>
                        )}
                        {stop.is_current && (
                        <span className="text-[9px] font-semibold text-[#8BA4C8] bg-[#6B7FA6]/10 border border-[#6B7FA6]/20 px-2 py-px rounded-full tracking-wider uppercase">
                            Current
                        </span>
                        )}
                        {checkedInStops.includes(String(stop.id)) && (
                        <CheckCircle size={13} className="text-green-400" title="You've checked in" />
                        )}
                        {isChief && (
                        <button onClick={() => handleDeleteStop(stop.id)}
                            className="text-white/15 hover:text-red-400 transition-colors bg-transparent border-none cursor-pointer p-0">
                            <X size={11} />
                        </button>
                        )}
                    </div>
                </div>
                <div className="flex gap-3 text-[10px] text-white/30">
                    {stop.arrival_time && <span className="flex items-center gap-1"><Clock size={9} />{stop.arrival_time}</span>}
                    {stop.note        && <span className="flex items-center gap-1"><MapPin size={9} />{stop.note}</span>}
                </div>
                {/* Chief: show who checked in */}
                {isChief && stop.checked_in_users?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                    {stop.checked_in_users.map(u => (
                    <span key={u.user_id} className="text-[9px] text-white/40 bg-white/[0.04] border border-white/[0.06] rounded-full px-2 py-px">
                        {u.first_name || u.username}
                    </span>
                    ))}
                </div>
                )}
                </div>
            </div>
            ))}
        </div>
        )}
        </Section>
    );

    const RequestsPanel = requests.length > 0 && (
        <Section title={`Join Requests (${requests.length})`} icon={UserCheck} iconColor="#8B8B6A">
        <div className="flex flex-col gap-2">
            {requests.map(r => (
            <JoinRequestCard key={r.id} req={r}
                onApprove={handleApprove}
                onReject={handleReject}
            />
            ))}
        </div>
        </Section>
    );

    async function handlePollVote(pollId, payload) {
        // Optimistic update
        setPolls(prev => prev.map(p => p.id === pollId
            ? { ...p, my_vote: payload, total_votes: p.total_votes + (p.my_vote == null ? 1 : 0) }
            : p));
        try {
            await pollsApi.vote(tripId, pollId, payload);
        } catch {
            // Revert on failure
            setPolls(prev => prev.map(p => p.id === pollId
                ? { ...p, my_vote: null, total_votes: Math.max(0, p.total_votes - 1) }
                : p));
        }
    }

    async function handlePollLock(pollId) {
        setPolls(prev => prev.map(p => p.id === pollId ? { ...p, is_locked: true } : p));
        try {
            await pollsApi.lock(tripId, pollId);
        } catch {
            setPolls(prev => prev.map(p => p.id === pollId ? { ...p, is_locked: false } : p));
        }
    }

    async function handlePollCreate(payload) {
        try {
            const { data } = await pollsApi.create(tripId, payload);
            setPolls(prev => [data, ...prev]);
        } catch { /* ignore — modal stays closed */ }
    }

    async function handleApprove(memberId) {
        setRequests(rs => rs.filter(x => x.id !== memberId));
        try { await tripsApi.approveMember(tripId, memberId); } catch { /* ignore */ }
    }

    async function handleReject(memberId) {
        setRequests(rs => rs.filter(x => x.id !== memberId));
        try { await tripsApi.declineMember(tripId, memberId); } catch { /* ignore */ }
    }

    const openCount  = polls.filter(p => !p.is_locked && !p.is_expired).length;

    const PollsPanel = (
        <>
        <Section
            title={`Polls${openCount > 0 ? ` (${openCount} open)` : ""}`}
            icon={BarChart2}
            iconColor="#FF6B35"
            action={
            isChief && (
                <button onClick={e => { e.stopPropagation(); setShowCreate(true); }}
                className="mr-2 flex items-center gap-1 text-[11px] font-bold text-[#FF6B35] bg-[#FF6B35]/10 border border-[#FF6B35]/25 rounded-lg px-2 py-1 cursor-pointer hover:bg-[#FF6B35]/20 transition-all">
                <Plus size={12} /> New
                </button>
            )
            }
        >
            {polls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
                <BarChart2 size={18} className="text-white/20" />
                </div>
                <p className="text-[12px] text-white/25">No polls yet</p>
                {isChief && (
                <button onClick={() => setShowCreate(true)} className="mt-1 text-[11px] text-[#FF6B35]/70 hover:text-[#FF6B35] bg-transparent border-none cursor-pointer transition-colors">
                    Create the first poll
                </button>
                )}
            </div>
            ) : (
            <div className="flex flex-col gap-3">
                {polls.map(poll => (
                <PollCard key={poll.id} poll={poll} isChief={isChief}
                    onVote={payload => handlePollVote(poll.id, payload)}
                    onLock={() => handlePollLock(poll.id)}
                />
                ))}
            </div>
            )}
        </Section>
        <CreatePollModal open={showCreate} onClose={() => setShowCreate(false)} onCreate={handlePollCreate} />
        </>
    );

    const MembersPanel = (
        <Section
        title={`Members (${members.length}/${trip?.spotsTotal ?? 0})`}
        icon={Users}
        iconColor="#6B8BAA"
        >
        <div className="flex flex-col gap-2">
            {members.length === 0 && (
            <p className="text-[11px] text-white/25 text-center py-3">No members yet.</p>
            )}
            {members.map(m => (
                <MemberRow key={m.id} m={m} isChief={isChief} tripId={tripId} isTripLive={isTripLive}
                    onRemove={handleRemoveMember}
                    onMessage={handleMessageMember}
                    onLocate={handleLocateMember}
                    onViewProfile={handleViewProfile}
                />
            ))}
        </div>
        </Section>
    );

    const SafetyPanel = (
        <div className="bg-[#0d1b2a] border border-white/[0.07] rounded-2xl p-4">
        <p className="text-[9px] font-bold tracking-[.1em] uppercase text-white/25 mb-3">Safety Status</p>
        <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${sosAlerts.length ? "bg-red-400/10 border border-red-400/30" : "bg-green-400/10 border border-green-400/30"}`}>
            <Shield size={18} className={sosAlerts.length ? "text-red-400" : "text-green-400"} />
            </div>
            <div>
            <div className={`text-[13px] font-bold ${sosAlerts.length ? "text-red-400" : "text-green-400"}`}>
                {sosAlerts.length ? `${sosAlerts.length} Active Alert${sosAlerts.length > 1 ? "s" : ""}` : "All Clear"}
            </div>
            <div className="text-[10px] text-white/30">
                {sosAlerts.length ? sosAlerts.map(a => a.name).join(", ") : "No active SOS alerts"}
            </div>
            </div>
        </div>
        <div className="flex flex-col gap-2">
            {["GPS tracking", "Emergency contact", "Location sharing", "Notifications"].map(s => (
            <div key={s} className="flex items-center justify-between text-[11px] text-white/45">
                <span>{s}</span>
                <Check size={13} className="text-green-400" />
            </div>
            ))}
        </div>
        </div>
    );

    const CompactMembers = (
        <div className="bg-[#0d1b2a] border border-white/[0.07] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
            <p className="text-[9px] font-bold tracking-[.1em] uppercase text-white/25">Members</p>
            <span className="text-[11px] font-semibold text-white/40">{members.length} total</span>
        </div>
        <div className="flex flex-col gap-2">
            {members.map(m => (
            <div
                key={m.id}
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => handleViewProfile(m.user_id)}
            >
                <div className={`w-7 h-7 ${m.avatar} rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0`}>
                {m.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <span className="flex-1 text-[11px] font-semibold text-white/75 truncate">{m.name.split(" ")[0]}</span>
                {m.lat != null
                ? <MapPin size={11} className="text-emerald-400/60 flex-shrink-0" title="Sharing location" />
                : <MapPin size={11} className="text-white/15 flex-shrink-0" title="No location" />
                }
                {m.checkedIn
                ? <CheckCircle size={11} className="text-green-400 flex-shrink-0" />
                : <Clock size={11} className="text-white/15 flex-shrink-0" />
                }
            </div>
            ))}
        </div>
        </div>
    );

    if (loading) return (
        <div className="min-h-screen bg-[#071422] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-[#FF6B35]/30 border-t-[#FF6B35] animate-spin" />
            <span className="text-[12px] text-white/30 font-semibold">Loading trip…</span>
        </div>
        </div>
    );

    /* ── LOCATION BANNERS ── */
    // Urgent sticky banner — shown after AppNav when trip is live
    const LocationAlertBanner = (() => {
        if (!isTripLive) return null;
        if (locPerms === "denied") return (
            <div className="bg-red-500/10 border-b border-red-500/20 px-5 py-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={13} className="text-red-400" />
                </div>
                <p className="flex-1 text-[12px] text-red-300/80 leading-snug">
                    Location access is blocked. Enable it in your browser settings — it&apos;s required while the trip is active.
                </p>
                <button
                    onClick={() => navigator.geolocation?.getCurrentPosition(() => setLocPerms("granted"), () => {})}
                    className="text-[11px] font-bold text-red-300 bg-red-500/15 rounded-lg px-2.5 py-1 border border-red-500/20 cursor-pointer hover:bg-red-500/25 transition-colors flex-shrink-0"
                >
                    Retry
                </button>
            </div>
        );
        if (locPerms === "prompt") return (
            <div className="bg-[#FF6B35]/8 border-b border-[#FF6B35]/15 px-5 py-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[#FF6B35]/15 border border-[#FF6B35]/25 flex items-center justify-center flex-shrink-0">
                    <MapPin size={13} className="text-[#FF6B35]" />
                </div>
                <p className="flex-1 text-[12px] text-white/60 leading-snug">
                    <span className="text-[#FF6B35] font-semibold">Trip is live</span> — your location is required so the group can see you.
                </p>
                <button
                    onClick={() => wsSendLocationRef.current?.()}
                    className="text-[11px] font-bold text-white bg-[#FF6B35] rounded-lg px-3 py-1.5 border-none cursor-pointer hover:bg-[#e55c28] transition-colors flex-shrink-0 shadow-[0_2px_8px_rgba(255,107,53,0.35)]"
                >
                    Share Now
                </button>
            </div>
        );
        return null;
    })();

    // Soft pre-trip notice — shown inside content, below TripHeader
    const PreTripNotice = (!isTripLive && trip?.startMs != null && Date.now() < trip.startMs) && (
        <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-white/[0.025] border border-white/[0.06]">
            <div className="w-5 h-5 rounded-full bg-white/[0.06] flex items-center justify-center flex-shrink-0 mt-px">
                <Clock size={10} className="text-white/30" />
            </div>
            <p className="text-[11px] text-white/35 leading-relaxed">
                Check-in, SOS and location features unlock when the trip starts.
            </p>
        </div>
    );

    // Keep old name as alias so existing JSX slots still work
    const LocationBanner = LocationAlertBanner;

    /* ── SOS OVERLAY ── */
    const handleSOSFire = () => new Promise((resolve, reject) => {
        const doPost = (latitude, longitude) => {
            tripsApi.triggerSOS(tripId, { trigger_type: "manual", latitude, longitude })
                .then(() => {
                    // Auto-close modal after brief success display
                    setTimeout(() => setShowSOS(false), 1800);
                    resolve();
                })
                .catch(reject);
        };
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => doPost(pos.coords.latitude, pos.coords.longitude),
                ()  => doPost(0, 0),
                { timeout: 5000 }
            );
        } else {
            doPost(0, 0);
        }
    });

    const SOSOverlay = showSOS && (
        <div
        onClick={e => { if (e.target === e.currentTarget) setShowSOS(false); }}
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-[2000] flex items-center justify-center p-4"
        style={{ animation: "fadeIn .2s ease" }}
        >
        <div
            className="bg-[#0d1b2a] border-2 border-red-500/30 rounded-3xl p-8 w-full max-w-sm text-center shadow-[0_0_60px_rgba(244,63,94,0.2)]"
            style={{ animation: "slideUp .25s ease" }}
        >
            <p className="text-[11px] font-bold tracking-widest uppercase text-red-400 mb-1">Emergency Alert</p>
            <h2 className="text-xl font-light text-white font-serif mb-2">Activate SOS?</h2>
            <p className="text-[13px] text-white/45 leading-relaxed mb-6">
            Your live location will be sent immediately to the group chat so your travel group can reach you.
            </p>
            <SOSButton onFire={handleSOSFire} />
            <button
            onClick={() => setShowSOS(false)}
            className="mt-5 bg-transparent border-none cursor-pointer text-[12px] text-white/30 underline block mx-auto"
            >
            Cancel
            </button>
        </div>
        </div>
    );

    /* ── ADD STOP MODAL ── */
    const AddStopModal = showAddStop && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowAddStop(false); }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[2000] flex items-center justify-center p-4"
            style={{ animation: "fadeIn .2s ease" }}>
            <div className="bg-[#0d1b2a] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
                style={{ animation: "slideUp .25s ease" }}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[15px] font-semibold text-white">Add Itinerary Stop</h2>
                    <button onClick={() => setShowAddStop(false)} className="bg-transparent border-none cursor-pointer text-white/30 hover:text-white/60"><X size={16} /></button>
                </div>
                <div className="flex flex-col gap-3">
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wide text-white/30 mb-1 block">Stop Name *</label>
                        <input value={stopForm.name} onChange={e => setStopForm(p => ({ ...p, name: e.target.value }))}
                            placeholder="e.g. Ho, Volta Region"
                            className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-[13px] text-white placeholder-white/20 outline-none focus:border-white/25"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wide text-white/30 mb-1 block">Arrival Time</label>
                        <input type="time" value={stopForm.arrival_time} onChange={e => setStopForm(p => ({ ...p, arrival_time: e.target.value }))}
                            className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-[13px] text-white/70 outline-none focus:border-white/25 [color-scheme:dark]"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wide text-white/30 mb-1 block">Note</label>
                        <input value={stopForm.note} onChange={e => setStopForm(p => ({ ...p, note: e.target.value }))}
                            placeholder="Optional note"
                            className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-[13px] text-white placeholder-white/20 outline-none focus:border-white/25"
                        />
                    </div>
                </div>
                <div className="flex gap-3 mt-5">
                    <button onClick={() => { setShowAddStop(false); setStopForm({ name: "", arrival_time: "", note: "" }); }}
                        className="flex-1 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white/50 text-[13px] font-semibold cursor-pointer">
                        Cancel
                    </button>
                    <button disabled={!stopForm.name.trim()} onClick={async () => { await handleAddStop(stopForm); setShowAddStop(false); setStopForm({ name: "", arrival_time: "", note: "" }); }}
                        className="flex-1 py-2.5 rounded-xl bg-[#6B7FA6] border-none text-white text-[13px] font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                        Add Stop
                    </button>
                </div>
            </div>
        </div>
    );

    const styles = `
        @keyframes sosPulse {
        0%,100% { box-shadow: 0 0 20px rgba(244,63,94,.4), 0 0 40px rgba(244,63,94,.15); }
        50%      { box-shadow: 0 0 30px rgba(244,63,94,.7), 0 0 60px rgba(244,63,94,.3);  }
        }
        @keyframes fadeIn  { from { opacity: 0; }                    to { opacity: 1; }                  }
        @keyframes slideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        ::-webkit-scrollbar       { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 99px; }
    `;

    /* ── MOBILE ── */
    if (mobile) {
        return (
        <div className="min-h-screen bg-[#071422] font-sans pb-[78px]">
            <style>{styles}</style>
            {SOSOverlay}
            {AddStopModal}
            {LocationAlertBanner}
            <div className="p-3.5 flex flex-col gap-3">
            {TripHeader}
            {PreTripNotice}
            {QuickActionsPanel}
            {HealthPanel}
            {MapPanel}
            {ItineraryPanel}
            {PollsPanel}
            {RequestsPanel}
            {MembersPanel}
            </div>

            <MobileBottomNav />
        </div>
        );
    }

    /* ── DESKTOP ── */
    return (
        <div className="min-h-screen bg-[#071422] font-sans">
        <style>{styles}</style>
        {SOSOverlay}
        {AddStopModal}
        <AppNav rightExtra={
            <>
            {trip?.status && (
                <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 border text-[11px] font-bold
                    ${trip.status === "active"    ? "bg-green-400/10  border-green-400/20  text-green-400" :
                      trip.status === "published" ? "bg-blue-400/10   border-blue-400/20   text-blue-400"  :
                      trip.status === "completed" ? "bg-white/[0.06]  border-white/[0.09]  text-white/40"  :
                                                    "bg-white/[0.06]  border-white/[0.09]  text-white/40"}`}
                >
                    <Radio size={10} className={trip.status === "active" ? "animate-pulse" : ""} />
                    <span className="capitalize">{trip.status}</span>
                </div>
            )}
            </>
        } />

        {LocationAlertBanner}

        {/* three-column body */}
        <div className="flex gap-5 max-w-[1320px] mx-auto px-5 py-5">

            {/* left sidebar */}
            <div className="w-[280px] flex-shrink-0 flex flex-col gap-3.5">
            {TripHeader}
            {PreTripNotice}
            {QuickActionsPanel}
            {HealthPanel}
            </div>

            {/* main content */}
            <div className="flex-1 min-w-0 flex flex-col gap-3.5">
            {MapPanel}
            {ItineraryPanel}
            {PollsPanel}
            {RequestsPanel}
            {MembersPanel}
            </div>

            {/* right sidebar */}
            <div className="w-[250px] flex-shrink-0 flex flex-col gap-3.5">
            {SafetyPanel}
            {CompactMembers}
            </div>

        </div>
        </div>
    );
    }