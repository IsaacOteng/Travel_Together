import { useState } from "react";
import {
  MapPin, ChevronDown, CheckCircle, Clock,
  MessageCircle, Compass, LogOut, ChevronRight,
} from "lucide-react";
import toast from 'react-hot-toast';
import Avatar from "./GDAvatar.jsx";
import RoleBadge from "./RoleBadge.jsx";

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
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-8 h-1 rounded-full bg-white/20" />
          </div>
          <div className="px-5 pt-2 pb-4">
            <p className="text-[11px] font-bold tracking-[.08em] uppercase text-white/30 mb-0.5">Navigate to</p>
            <p className="text-[15px] font-semibold text-white">{name}</p>
          </div>
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

export default function MemberRow({ m, isChief, tripId, isTripLive, onRemove, onMessage, onLocate, onViewProfile }) {
  const [expanded,    setExpanded]    = useState(false);
  const [showNav,     setShowNav]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden transition-colors duration-150 hover:border-[#FF6B35]/20">
        <div className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer" onClick={() => setExpanded(e => !e)}>
          <Avatar name={m.name} colorClass={m.avatar} ring imgSrc={m.avatar_url} />

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
