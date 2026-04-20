import { useState, useEffect, useRef, useCallback } from "react";
import {
  MapPin, Settings, Edit3, Star,
  CheckCircle, Award, Map, Calendar, X,
  ArrowLeft, Flag, UserCheck, Clock, TrendingUp,
  MessageCircle, Camera, ImagePlus, Loader2, Move,
} from "lucide-react";
import { useNavigate } from 'react-router-dom';
import AppNav from '../shared/AppNav.jsx';
import MobileBottomNav from '../shared/MobileBottomNav.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { usersApi, authApi } from '../../services/api.js';
import api from '../../services/api.js';
import { karmaApi, tripsApi, chatApi } from '../../services/api.js';
import { fmtDate } from '../../utils/date.js';

function LevelBadge({ level }) {
  const styles = {
    Explorer:  "bg-green-400/15  border-green-400/30  text-green-400",
    Navigator: "bg-blue-400/15   border-blue-400/30   text-blue-400",
    Legend:    "bg-yellow-400/15 border-yellow-400/30 text-yellow-400",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold tracking-wide ${styles[level] ?? styles.Explorer}`}>
      <Star size={10} fill="currentColor" /> {level}
    </span>
  );
}

function RarityDot({ rarity }) {
  const map = { common: "bg-white/30", rare: "bg-blue-400", epic: "bg-purple-400", legendary: "bg-yellow-400" };
  return <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${map[rarity]}`} />;
}

/* ─── STAT CARD ───────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, color = "#FF6B35" }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 flex flex-col gap-1">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-1 flex-shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
        <Icon size={15} color={color} />
      </div>
      <div className="text-xl font-black text-white font-serif leading-none">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-white/25">{label}</div>
      {sub && <div className="text-[10px] text-white/20">{sub}</div>}
    </div>
  );
}

/* ─── BADGE CARD ──────────────────────────── */
function BadgeCard({ badge }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className={`relative flex flex-col items-center gap-2 p-3 rounded-2xl border cursor-default transition-all duration-200
        ${badge.earned
          ? "bg-white/[0.05] border-white/10 hover:border-[#FF6B35]/30 hover:bg-[#FF6B35]/[0.06]"
          : "bg-white/[0.02] border-white/[0.04] opacity-50"}`}
    >
      <RarityDot rarity={badge.rarity} />
      <div className={`text-xl leading-none ${!badge.earned ? "grayscale" : ""}`}>{badge.icon}</div>
      <div className="text-center">
        <div className={`text-[11px] font-bold leading-tight ${badge.earned ? "text-white/80" : "text-white/35"}`}>
          {badge.label}
        </div>
        {!badge.earned && badge.progress && (
          <div className="text-[10px] text-white/25 mt-0.5">{badge.progress}</div>
        )}
      </div>
      {hov && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#1a2e45] border border-white/10 rounded-xl px-3 py-1.5 text-[10px] text-white/70 whitespace-nowrap z-10 shadow-xl">
          {badge.desc}
        </div>
      )}
      {badge.earned && (
        <div className="absolute top-2 right-2">
          <CheckCircle size={11} className="text-green-400" />
        </div>
      )}
    </div>
  );
}

/* ─── TRIP HISTORY CARD ───────────────────── */
function TripCard({ trip, onClick, isOwner = true }) {
  const navigate    = useNavigate();
  const isCompleted = trip.status === "completed";
  const isActive    = trip.status === "active" || trip.status === "published";

  const roleStyle = {
    Chief:  "bg-[#FF6B35]/20 text-[#FF6B35] border-[#FF6B35]/30",
    Scout:  "bg-blue-400/15  text-blue-400   border-blue-400/25",
    Member: "bg-white/10     text-white/40   border-white/10",
  };

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

/* ─── SECTION ─────────────────────────────── */
function Section({ title, icon: Icon, iconColor, children, action }) {
  return (
    <div className="bg-[#0d1b2a] rounded-2xl border border-white/[0.07]">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/[0.05]">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${iconColor}18`, border: `1px solid ${iconColor}30` }}>
          <Icon size={14} color={iconColor} />
        </div>
        <span className="flex-1 text-[13px] font-bold text-white/85 tracking-tight">{title}</span>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ─── EDIT MODAL ──────────────────────────── */
const UN_RE = /^[a-z0-9._]{3,20}$/;

function useUsernameCheck(val, currentUsername) {
  const [status, setStatus] = useState("idle");
  const t = useRef(null);
  useEffect(() => {
    clearTimeout(t.current);
    if (!val || val === currentUsername) { setStatus("idle"); return; }
    if (!UN_RE.test(val)) { setStatus("invalid"); return; }
    setStatus("checking");
    t.current = setTimeout(async () => {
      try {
        const { data } = await authApi.checkUsername(val);
        setStatus(data.available ? "available" : "taken");
      } catch { setStatus("available"); }
    }, 650);
    return () => clearTimeout(t.current);
  }, [val, currentUsername]);
  return status;
}

function monthsAgo(dateStr) {
  if (!dateStr) return Infinity;
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24 * 30);
}

function nextAllowedDate(dateStr, months) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function parseCoverPosition(str) {
  if (!str) return { x: 50, y: 50 };
  const [x, y] = str.split(" ").map(v => parseFloat(v));
  return { x: isNaN(x) ? 50 : x, y: isNaN(y) ? 50 : y };
}

function EditModal({ onClose, onSave, initialData }) {
  const avatarRef        = useRef();
  const coverRef         = useRef();
  const coverContainerRef = useRef(null);
  const isDraggingCover  = useRef(false);
  const dragStartRef     = useRef(null);
  const pointerMoved     = useRef(false);

  const [form, setForm] = useState({
    name:     initialData.name,
    username: initialData.username,
    bio:      initialData.bio,
    city:     initialData.city,
  });
  const [avatarFile,    setAvatarFile]    = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(initialData.avatarUrl || null);
  const [coverFile,     setCoverFile]     = useState(null);
  const [coverPreview,  setCoverPreview]  = useState(initialData.coverUrl || null);
  const [coverPosition, setCoverPosition] = useState(() => parseCoverPosition(initialData.coverPosition));
  const [saving,        setSaving]        = useState(false);
  const [saveErr,       setSaveErr]       = useState("");

  const usernameStatus = useUsernameCheck(form.username, initialData.username);

  const usernameLocked = monthsAgo(initialData.usernameChangedAt) < 6;
  const nameLocked     = monthsAgo(initialData.nameChangedAt)     < 3;

  const handleAvatarFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };
  const handleCoverFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setCoverPosition({ x: 50, y: 50 });
  };

  const onCoverPointerDown = (e) => {
    if (!coverPreview) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingCover.current = true;
    pointerMoved.current = false;
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      posX: coverPosition.x,
      posY: coverPosition.y,
    };
  };

  const onCoverPointerMove = (e) => {
    if (!isDraggingCover.current || !dragStartRef.current || !coverContainerRef.current) return;
    const { width, height } = coverContainerRef.current.getBoundingClientRect();
    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) pointerMoved.current = true;
    setCoverPosition({
      x: Math.max(0, Math.min(100, dragStartRef.current.posX - (dx / width)  * 100)),
      y: Math.max(0, Math.min(100, dragStartRef.current.posY - (dy / height) * 100)),
    });
  };

  const onCoverPointerUp = () => {
    isDraggingCover.current = false;
    if (!pointerMoved.current) coverRef.current?.click();
  };

  async function handleSave() {
    if (saving) return;
    if (usernameStatus === "taken" || usernameStatus === "invalid") return;
    setSaving(true);
    setSaveErr("");
    try {
      await onSave({ ...form, avatarFile, coverFile, coverPosition });
      onClose();
    } catch (err) {
      const d = err?.response?.data;
      const msg = d?.username?.[0] || d?.first_name?.[0] || d?.detail || "Failed to save. Please try again.";
      setSaveErr(msg);
    } finally {
      setSaving(false);
    }
  }

  const inputCls = (locked) =>
    `w-full bg-white/[0.06] border rounded-xl px-3.5 py-2.5 text-[13px] text-white outline-none transition-colors placeholder-white/20 ${
      locked ? "border-white/5 opacity-40 cursor-not-allowed" : "border-white/10 focus:border-[#FF6B35]/50"
    }`;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[2000] flex items-center justify-center p-4"
      style={{ animation: "fadeIn .2s ease" }}>
      <div className="bg-[#0d1b2a] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[92vh]"
        style={{ animation: "slideUp .25s ease" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.06] flex-shrink-0">
          <h2 className="text-[17px] font-light text-white font-serif">Edit Profile</h2>
          <button onClick={onClose} disabled={saving} className="bg-transparent border-none cursor-pointer text-white/40 hover:text-white/70 transition-colors disabled:opacity-40">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-4">

          {/* Photos */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Photos</label>
            <div className="rounded-2xl overflow-hidden border border-white/[0.07]">
              {/* Cover */}
              <div
                ref={coverContainerRef}
                onPointerDown={coverPreview ? onCoverPointerDown : undefined}
                onPointerMove={coverPreview ? onCoverPointerMove : undefined}
                onPointerUp={coverPreview ? onCoverPointerUp : undefined}
                onPointerCancel={() => { isDraggingCover.current = false; }}
                onClick={!coverPreview ? () => coverRef.current?.click() : undefined}
                className={`relative h-24 bg-linear-to-r from-[#FF6B35]/20 via-[#4ade80]/10 to-[#60a5fa]/10 select-none overflow-hidden
                  ${coverPreview ? "cursor-grab active:cursor-grabbing" : "cursor-pointer group"}`}
              >
                {coverPreview ? (
                  <>
                    <img
                      src={coverPreview}
                      alt="Cover"
                      draggable={false}
                      className="w-full h-full object-cover pointer-events-none"
                      style={{ objectPosition: `${coverPosition.x}% ${coverPosition.y}%` }}
                    />
                    <button
                      onPointerDown={e => e.stopPropagation()}
                      onClick={e => { e.stopPropagation(); coverRef.current?.click(); }}
                      className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-white/80 text-[10px] font-semibold hover:bg-black/80 transition z-10"
                    >
                      <Camera size={10} /> Change
                    </button>
                    <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1 text-white/50 text-[9px] pointer-events-none whitespace-nowrap">
                      <Move size={8} /> Drag to reposition
                    </div>
                  </>
                ) : (
                  <>
                    <div className="absolute inset-0 flex items-center justify-center gap-1.5 text-white/30">
                      <ImagePlus size={16} /><span className="text-[10px] font-semibold uppercase tracking-wider">Upload cover</span>
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition bg-black/50 rounded-full p-1.5">
                        <Camera size={13} className="text-white" />
                      </div>
                    </div>
                  </>
                )}
              </div>
              <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={e => handleCoverFile(e.target.files[0])} />

              {/* Avatar */}
              <div className="bg-[#0d1b2a] px-4 pb-3 flex items-end gap-3">
                <div onClick={() => avatarRef.current?.click()}
                  className="relative -mt-7 w-14 h-14 rounded-full cursor-pointer group flex-shrink-0">
                  {avatarPreview
                    ? <img src={avatarPreview} alt="Avatar" className="w-14 h-14 rounded-full object-cover border-[3px] border-[#0d1b2a] shadow" />
                    : <div className="w-14 h-14 rounded-full border-[3px] border-[#0d1b2a] bg-[#FF6B35]/20 flex items-center justify-center">
                        <Camera size={16} className="text-[#FF6B35]" />
                      </div>
                  }
                  <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                    <Camera size={13} className="text-white opacity-0 group-hover:opacity-100 transition" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-[#0d1b2a] flex items-center justify-center shadow" style={{ background: "#FF6B35" }}>
                    <Camera size={9} className="text-white" />
                  </div>
                </div>
                <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={e => handleAvatarFile(e.target.files[0])} />
                <p className="text-[10px] text-white/25 pb-1">Tap to change profile or cover photo</p>
              </div>
            </div>
          </div>

          {/* Username */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30">Username</label>
              {usernameLocked && (
                <span className="text-[9px] text-amber-400/80 font-semibold">
                  Locked · available {nextAllowedDate(initialData.usernameChangedAt, 6)}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-[13px] font-semibold pointer-events-none">@</span>
              <input
                value={form.username}
                onChange={e => !usernameLocked && setForm(p => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, "") }))}
                disabled={saving || usernameLocked}
                placeholder="your_username"
                className={`${inputCls(usernameLocked)} pl-7`}
              />
              {!usernameLocked && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px]">
                  {usernameStatus === "checking"  && <Loader2 size={12} className="text-white/40 animate-spin" />}
                  {usernameStatus === "available" && <span className="text-green-400">✓</span>}
                  {usernameStatus === "taken"     && <span className="text-red-400">Taken</span>}
                  {usernameStatus === "invalid"   && <span className="text-amber-400">Invalid</span>}
                </span>
              )}
            </div>
            {usernameLocked && (
              <p className="text-[10px] text-white/25 mt-1">Username can only be changed once every 6 months.</p>
            )}
          </div>

          {/* Full Name */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30">Full Name</label>
              {nameLocked && (
                <span className="text-[9px] text-amber-400/80 font-semibold">
                  Locked · available {nextAllowedDate(initialData.nameChangedAt, 3)}
                </span>
              )}
            </div>
            <input
              value={form.name}
              onChange={e => !nameLocked && setForm(p => ({ ...p, name: e.target.value }))}
              disabled={saving || nameLocked}
              placeholder="Your full name"
              className={inputCls(nameLocked)}
            />
            {nameLocked && (
              <p className="text-[10px] text-white/25 mt-1">Name can only be changed once every 3 months.</p>
            )}
          </div>

          {/* City */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">City</label>
            <input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
              disabled={saving} placeholder="Your city"
              className={inputCls(false)} />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Bio</label>
            <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
              rows={3} maxLength={200} disabled={saving}
              className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3.5 py-2.5 text-[13px] text-white outline-none focus:border-[#FF6B35]/50 transition-colors resize-none placeholder-white/20 disabled:opacity-50" />
            <div className="text-[10px] text-white/20 text-right mt-1">{(form.bio || "").length}/200</div>
          </div>
        </div>

        {saveErr && <p className="px-6 text-[11px] text-red-400 text-center pb-2">{saveErr}</p>}

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-5 pt-3 border-t border-white/[0.06] flex-shrink-0">
          <button onClick={onClose} disabled={saving}
            className="flex-1 py-2.5 rounded-xl border border-white/15 bg-transparent text-white/50 text-[13px] font-semibold cursor-pointer hover:bg-white/[0.05] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || usernameStatus === "taken" || usernameStatus === "invalid"}
            className={`flex-1 py-2.5 rounded-xl border-none text-white text-[13px] font-bold transition-colors shadow-[0_4px_14px_rgba(255,107,53,0.35)]
              ${saving || usernameStatus === "taken" || usernameStatus === "invalid"
                ? "bg-[#FF6B35]/50 cursor-not-allowed"
                : "bg-[#FF6B35] cursor-pointer hover:bg-[#e55c28]"}`}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}

/* ─── ROOT ────────────────────────────────── */
export default function ProfilePage({ isOwner = true, userId = null }) {
  const navigate             = useNavigate();
  const { user, updateUser, refreshUser } = useAuth();

  const [winW,       setWinW]       = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  const [editing,    setEditing]    = useState(false);
  const [mobileTab,  setMobileTab]  = useState("profile");
  const [publicUser, setPublicUser] = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [notFound,   setNotFound]   = useState(false);
  const [dmLoading,  setDmLoading]  = useState(false);

  const [stats,      setStats]      = useState(null);
  const [badges,     setBadges]     = useState([]);
  const [myTrips,    setMyTrips]    = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Treat as owner if the prop says so OR if the logged-in user is viewing their own profile via /profile/:id
  const effectiveIsOwner = isOwner || (!!user?.id && String(user.id) === String(userId));

  // Unified profile data source — never mix with the logged-in user's data on public views
  const profileUser    = effectiveIsOwner ? user : publicUser;
  const displayName    = profileUser
    ? `${profileUser.first_name || ""} ${profileUser.last_name || ""}`.trim() || profileUser.username || "Traveller"
    : "Traveller";
  const initials       = displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const karma          = profileUser?.travel_karma ?? 0;
  const level          = profileUser?.karma_level  ?? "Explorer";
  const joinDate       = profileUser?.created_at
    ? new Date(profileUser.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "—";
  const verified    = profileUser?.is_verified_traveller ?? false;
  const nationality = profileUser?.nationality ?? "";

  // Stats: owner uses dedicated stats API; public reads directly from the profile object
  const checkinRate    = effectiveIsOwner
    ? (stats?.checkin_rate    ?? 0)
    : (publicUser?.checkin_rate   ?? null);   // null = not available publicly
  const avgRating      = effectiveIsOwner
    ? (stats?.avg_rating      ?? 0)
    : (publicUser?.avg_rating     ?? null);
  const tripsTotal     = effectiveIsOwner
    ? (stats?.trips_total     ?? 0)
    : (publicUser?.trips_total    ?? publicUser?.trips_hosted ?? 0);
  const tripsCompleted = effectiveIsOwner
    ? (stats?.trips_completed ?? 0)
    : (publicUser?.trips_completed ?? 0);
  const ratingsCount   = effectiveIsOwner ? (stats?.ratings_count ?? 0) : (publicUser?.ratings_count ?? 0);

  const d = (v) => dataLoaded ? v : "—";
  const editProfile = {
    name:               displayName,
    username:           user?.username            || "",
    bio:                user?.bio                 || "",
    city:               user?.city                || "",
    avatarUrl:          user?.avatar_url          || null,
    coverUrl:           user?.cover_url           || null,
    coverPosition:      user?.cover_position      || "50% 50%",
    usernameChangedAt:  user?.username_changed_at || null,
    nameChangedAt:      user?.name_changed_at     || null,
  };

  const handleSaveProfile = async (data) => {
    const hasFiles = data.avatarFile || data.coverFile;

    const currentName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
    const nameChanged = data.name && data.name.trim() !== currentName;
    const coverPos = data.coverPosition
      ? `${Math.round(data.coverPosition.x)}% ${Math.round(data.coverPosition.y)}%`
      : undefined;

    if (hasFiles) {
      const fd = new FormData();
      if (data.avatarFile) fd.append("avatar", data.avatarFile);
      if (data.coverFile)  fd.append("cover",  data.coverFile);
      if (data.username && data.username !== user?.username) fd.append("username", data.username);
      if (nameChanged) {
        const [first, ...rest] = data.name.trim().split(" ");
        fd.append("first_name", first);
        fd.append("last_name",  rest.join(" "));
      }
      if (data.bio  !== undefined) fd.append("bio",  data.bio);
      if (data.city !== undefined) fd.append("city", data.city);
      if (coverPos)                fd.append("cover_position", coverPos);
      const { data: updated } = await api.patch("/api/users/me/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      updateUser(updated);
    } else {
      const payload = {};
      if (data.username && data.username !== user?.username) payload.username = data.username;
      if (nameChanged) {
        const [first, ...rest] = data.name.trim().split(" ");
        payload.first_name = first;
        payload.last_name  = rest.join(" ");
      }
      if (data.bio  !== undefined) payload.bio  = data.bio;
      if (data.city !== undefined) payload.city = data.city;
      if (coverPos)                payload.cover_position = coverPos;
      const { data: updated } = await usersApi.updateMe(payload);
      updateUser(updated);
    }
    setEditing(false);
  };

  const handleMessage = async () => {
    if (!publicUser?.id || dmLoading) return;
    setDmLoading(true);
    try {
      const { data } = await chatApi.startDM(publicUser.id);
      navigate("/chat", { state: { conversationId: data.id } });
    } catch {
      navigate("/chat");
    } finally {
      setDmLoading(false);
    }
  };

  const mobile = winW < 1024;

  useEffect(() => {
    const h = () => setWinW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  // Ensure we always have fresh profile data for the owner view
  useEffect(() => {
    if (effectiveIsOwner) refreshUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveIsOwner]);

  // Reset everything when the target userId changes so we never show stale data
  useEffect(() => {
    setPublicUser(null);
    setStats(null);
    setBadges([]);
    setMyTrips([]);
    setDataLoaded(false);
    setNotFound(false);

    if (effectiveIsOwner) {
      setLoading(false);
      Promise.all([
        usersApi.getMyStats().catch(() => ({ data: null })),
        karmaApi.getAllBadges().catch(() => ({ data: [] })),
        usersApi.getMyTrips().catch(() => ({ data: { results: [] } })),
      ]).then(([{ data: statsData }, { data: badgesData }, { data: tripsData }]) => {
        if (statsData) setStats(statsData);
        setBadges(Array.isArray(badgesData) ? badgesData : []);
        setMyTrips((tripsData?.results ?? []).map(normaliseTrip));
        setDataLoaded(true);
      });
    } else if (userId) {
      let cancelled = false;
      setLoading(true);
      usersApi.getPublicProfile(userId)
        .then(({ data }) => {
          if (cancelled) return;
          setPublicUser(data);
          // The public endpoint returns stats fields directly on the profile object.
          // If the backend ever nests them under data.stats, handle both.
          if (data.stats) setStats(data.stats);
          if (data.badges) setBadges(Array.isArray(data.badges) ? data.badges : []);
          if (data.trips)  setMyTrips((data.trips ?? []).map(normaliseTrip));
          setDataLoaded(true);
        })
        .catch(() => {
          if (!cancelled) setNotFound(true);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => { cancelled = true; };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, effectiveIsOwner]);

  const earnedBadges   = badges.filter(b => b.earned);
  const activeTrips    = myTrips.filter(t => t.status === "active" || t.status === "published");
  const completedTrips = myTrips.filter(t => t.status === "completed");

  /* ── BADGES SECTION ── */
  const BadgesSection = (
    <Section title="Achievement Badges" icon={Award} iconColor="#fbbf24"
      action={earnedBadges.length > 0
        ? <span className="text-[10px] text-white/30">{earnedBadges.length} earned</span>
        : null}>
      {!dataLoaded ? (
        <p className="text-[13px] text-white/25 text-center py-6">Loading…</p>
      ) : badges.length === 0 ? (
        <p className="text-[13px] text-white/25 text-center py-6">
          {effectiveIsOwner ? "Complete trips to earn badges." : "No badges earned yet."}
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2.5">
          {badges.filter(b => b.slug !== "social-butterfly" && b.slug !== "scout-master").map(b => (
            <BadgeCard key={b.slug} badge={{ ...b, id: b.slug, desc: b.description }} />
          ))}
        </div>
      )}
    </Section>
  );

  /* ── STATS SECTION ── */
  const checkinDisplay = checkinRate === null
    ? "—"
    : dataLoaded ? `${checkinRate}%` : "—";
  const checkinSub = checkinRate === null
    ? "no check-ins recorded"
    : "on-time arrivals";
  const ratingDisplay = avgRating === null
    ? "—"
    : dataLoaded ? (avgRating || "—") : "—";
  const ratingSub = ratingsCount
    ? `${ratingsCount} rating${ratingsCount !== 1 ? "s" : ""}`
    : "no ratings yet";

  const StatsSection = (
    <Section title="Reliability Stats" icon={CheckCircle} iconColor="#4ade80">
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard icon={Map}         label="Trips"         value={d(tripsTotal)}   sub={dataLoaded ? `${tripsCompleted} completed` : "—"} color="#FF6B35" />
        <StatCard icon={CheckCircle} label="Check-in Rate" value={checkinDisplay}  sub={checkinSub}  color="#4ade80" />
        <StatCard icon={Star}        label="Avg Rating"    value={ratingDisplay}   sub={ratingSub}   color="#fbbf24" />
      </div>
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12px] font-bold text-white/70">Overall Reliability</span>
          <span className="text-[20px] font-black font-serif"
            style={{ color: checkinRate === null || checkinRate === 0 ? "rgba(255,255,255,0.25)" : checkinRate >= 80 ? "#4ade80" : checkinRate >= 50 ? "#fbbf24" : "#fb923c" }}>
            {checkinRate === null ? "—" : `${checkinRate}%`}
          </span>
        </div>
        <div className="h-3 bg-white/[0.06] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000"
            style={{
              width: checkinRate ? `${checkinRate}%` : "0%",
              background: (checkinRate ?? 0) >= 80
                ? "linear-gradient(90deg,#4ade80,#22c55e)"
                : (checkinRate ?? 0) >= 50
                  ? "linear-gradient(90deg,#fbbf24,#f59e0b)"
                  : "linear-gradient(90deg,#fb923c,#f97316)",
            }} />
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-white/20">
          <span>{checkinRate === null ? "Check-in data not available" : "Based on itinerary check-ins"}</span>
          {!!checkinRate && checkinRate > 0 && (
            <span className="font-semibold" style={{ color: checkinRate >= 80 ? "rgba(74,222,128,0.7)" : "rgba(251,191,36,0.7)" }}>
              {checkinRate >= 80 ? "Above average ↑" : checkinRate >= 50 ? "On par" : "Below average"}
            </span>
          )}
        </div>
      </div>
    </Section>
  );

  /* ── TRIP HISTORY SECTION ── */
  const TripHistorySection = (
    <Section title={`Trip History (${myTrips.length})`} icon={Calendar} iconColor="#a855f7">
      {!dataLoaded ? (
        <p className="text-[13px] text-white/25 text-center py-6">Loading…</p>
      ) : myTrips.length === 0 ? (
        <p className="text-[13px] text-white/25 col-span-full text-center py-6">No trips yet.</p>
      ) : (
        <>
          {activeTrips.length > 0 && (
            <div className="mb-5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2.5">Active / Upcoming</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {activeTrips.map(t => (
                  <TripCard key={t.id} trip={t} onClick={() => navigate(`/trip/${t.id}`)} isOwner={effectiveIsOwner} />
                ))}
              </div>
            </div>
          )}
          {completedTrips.length > 0 && (
            <>
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2.5">Completed</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {completedTrips.map(t => <TripCard key={t.id} trip={t} onClick={() => navigate(`/trip/${t.id}`)} isOwner={effectiveIsOwner} />)}
              </div>
            </>
          )}
        </>
      )}
    </Section>
  );

  const globalStyles = `
    @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
    @keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
    ::-webkit-scrollbar{width:4px}
    ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:99px}
  `;

  /* ── LOADING / NOT FOUND (public only) ── */
  if (!effectiveIsOwner && (loading || notFound)) {
    return (
      <div className="min-h-screen bg-[#071422] font-sans">
        <style>{globalStyles}</style>
        <AppNav />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          {loading
            ? <p className="text-[14px] text-white/30">Loading profile…</p>
            : <>
                <p className="text-[16px] font-bold text-white/50">User not found</p>
                <button onClick={() => navigate(-1)} className="text-[13px] text-[#FF6B35] cursor-pointer bg-transparent border-none flex items-center gap-1.5">
                  <ArrowLeft size={14} /> Go back
                </button>
              </>
          }
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  /* ── PROFILE CARD (shared between mobile hero and desktop sidebar) ── */
  const ProfileMeta = ({ avatarSize = "mobile" }) => (
    <>
      <div className="relative">
        {profileUser?.avatar_url
          ? <img src={profileUser.avatar_url} alt={displayName}
              className={`${avatarSize === "desktop" ? "w-16 h-16" : "w-20 h-20"} rounded-full object-cover ring-4 ring-[#0d1b2a]`} />
          : <div className={`${avatarSize === "desktop" ? "w-16 h-16 text-lg" : "w-20 h-20 text-2xl"} bg-[#4ade80] rounded-full flex items-center justify-center font-black text-white font-serif ring-4 ring-[#0d1b2a]`}>
              {initials}
            </div>
        }
        {verified && (
          <div className={`absolute -bottom-1 -right-1 ${avatarSize === "desktop" ? "w-5 h-5" : "w-6 h-6"} bg-[#FF6B35] rounded-full flex items-center justify-center border-2 border-[#0d1b2a]`}>
            <UserCheck size={avatarSize === "desktop" ? 10 : 12} className="text-white" />
          </div>
        )}
      </div>
    </>
  );

  /* ── MOBILE ── */
  if (mobile) {
    return (
      <div className="min-h-screen bg-[#071422] font-sans pb-[78px]">
        <style>{globalStyles}</style>
        {editing && effectiveIsOwner && (
          <EditModal onClose={() => setEditing(false)} onSave={handleSaveProfile} initialData={editProfile} />
        )}

        <header className="sticky top-0 z-40 h-14 bg-[#071422]/95 backdrop-blur-xl border-b border-white/[0.06] flex items-center px-4 justify-between">
          <button onClick={() => navigate(-1)} className="bg-transparent border-none cursor-pointer text-white/40 flex"><ArrowLeft size={20} /></button>
          <span className="text-[14px] font-bold text-white">Profile</span>
          {effectiveIsOwner
            ? <button onClick={() => navigate('/settings')} className="bg-transparent border-none cursor-pointer text-white/40 flex"><Settings size={18} /></button>
            : <div className="w-[18px]" />
          }
        </header>

        <div className="p-3.5 flex flex-col gap-3">
          {/* profile hero */}
          <div className="relative bg-gradient-to-br from-[#0d1b2a] to-[#071422] border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="h-24 relative overflow-hidden">
              {profileUser?.cover_url
                ? <img src={profileUser.cover_url} alt="Cover" className="w-full h-full object-cover"
                    style={{ objectPosition: profileUser.cover_position || "50% 50%" }} />
                : <>
                    <div className="absolute inset-0 bg-linear-to-r from-[#FF6B35]/20 via-[#4ade80]/10 to-[#60a5fa]/10" />
                    <div className="absolute inset-0 opacity-30"
                      style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #FF6B35 0%, transparent 50%), radial-gradient(circle at 80% 50%, #4ade80 0%, transparent 50%)" }} />
                  </>
              }
            </div>
            <div className="px-5 pb-5">
              <div className="relative -mt-10 mb-3 flex items-end justify-between">
                <ProfileMeta avatarSize="mobile" />
                {effectiveIsOwner ? (
                  <button onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/15 bg-white/[0.07] text-white/60 text-[12px] font-semibold cursor-pointer hover:bg-white/15 hover:text-white/90 transition-all">
                    <Edit3 size={13} /> Edit Profile
                  </button>
                ) : (
                  <button onClick={handleMessage} disabled={dmLoading}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#FF6B35]/30 bg-[#FF6B35]/10 text-[#FF6B35] text-[12px] font-semibold cursor-pointer hover:bg-[#FF6B35]/20 transition-all disabled:opacity-50">
                    <MessageCircle size={13} /> {dmLoading ? "Opening…" : "Message"}
                  </button>
                )}
              </div>

              <div className="mb-3">
                <div className="flex items-center gap-2.5 mb-1">
                  <h1 className="text-[20px] font-bold text-white font-serif tracking-tight">{displayName}</h1>
                  <LevelBadge level={level} />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-white/40 mb-1">
                  <span className="text-white/30">@{profileUser?.username}</span>
                  {(profileUser?.city || profileUser?.country) && (
                    <>
                      <span className="text-white/15">·</span>
                      <MapPin size={11} className="text-[#FF6B35]/60" />
                      <span>{profileUser?.city}{profileUser?.country ? `, ${profileUser.country}` : ""}</span>
                    </>
                  )}
                  {nationality && (
                    <>
                      <span className="text-white/15">·</span>
                      <Flag size={11} className="text-white/30" />
                      <span>{nationality}</span>
                    </>
                  )}
                </div>
                {profileUser?.bio && <p className="text-[13px] text-white/55 leading-relaxed">{profileUser.bio}</p>}
              </div>

              <div className="flex gap-3 pt-3 border-t border-white/[0.06] flex-wrap">
                {[
                  { val: d(tripsTotal),     label: "Trips"       },
                  { val: karma,             label: "Karma"       },
                  { val: checkinDisplay,    label: "Reliability" },
                  { val: d(avgRating ?? 0), label: "Rating"      },
                ].map(s => (
                  <div key={s.label} className="flex flex-col items-center min-w-[56px]">
                    <span className="text-[17px] font-black text-white font-serif leading-none">{s.val}</span>
                    <span className="text-[9px] text-white/30 font-medium uppercase tracking-wider mt-0.5">{s.label}</span>
                  </div>
                ))}
                <div className="ml-auto flex items-center gap-1.5 text-[10px] text-white/25">
                  <Clock size={10} />
                  <span>Joined {joinDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* mobile tab pills */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { id: "profile", label: "Overview" },
              { id: "badges",  label: "Badges"   },
              { id: "trips",   label: "Trips"    },
            ].map(t => (
              <button key={t.id} onClick={() => setMobileTab(t.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-[12px] font-bold border cursor-pointer transition-all
                  ${mobileTab === t.id ? "bg-[#FF6B35] border-[#FF6B35] text-white" : "bg-transparent border-white/20 text-white/50"}`}>
                {t.label}
              </button>
            ))}
          </div>

          {mobileTab === "profile" && <>{StatsSection}</>}
          {mobileTab === "badges"  && <>{BadgesSection}</>}
          {mobileTab === "trips"   && <>{TripHistorySection}</>}
        </div>

        <MobileBottomNav />
      </div>
    );
  }

  /* ── DESKTOP ── */
  return (
    <div className="min-h-screen bg-[#071422] font-sans">
      <style>{globalStyles}</style>
      {editing && effectiveIsOwner && (
        <EditModal onClose={() => setEditing(false)} onSave={handleSaveProfile} initialData={editProfile} />
      )}

      <AppNav rightExtra={
        effectiveIsOwner ? (
          <button onClick={() => navigate('/settings')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.05] text-white/50 text-[12px] font-semibold cursor-pointer hover:bg-white/10 transition-colors">
            <Settings size={13} /> Settings
          </button>
        ) : null
      } />

      <div className="max-w-[1200px] mx-auto px-6 py-6 flex gap-6">

        {/* LEFT — sticky profile card */}
        <div className="w-[300px] flex-shrink-0 flex flex-col gap-4 self-start sticky top-[76px]">
          <div className="bg-[#0d1b2a] border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="h-20 relative overflow-hidden">
              {profileUser?.cover_url
                ? <img src={profileUser.cover_url} alt="Cover" className="w-full h-full object-cover"
                    style={{ objectPosition: profileUser.cover_position || "50% 50%" }} />
                : <>
                    <div className="absolute inset-0 bg-linear-to-r from-[#FF6B35]/20 via-[#4ade80]/10 to-[#60a5fa]/10" />
                    <div className="absolute inset-0 opacity-30"
                      style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #FF6B35 0%, transparent 50%), radial-gradient(circle at 80% 50%, #4ade80 0%, transparent 50%)" }} />
                  </>
              }
            </div>
            <div className="px-4 pb-4">
              <div className="relative -mt-8 mb-3 flex items-end justify-between">
                <ProfileMeta avatarSize="desktop" />
                {effectiveIsOwner ? (
                  <button onClick={() => setEditing(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/15 bg-white/[0.07] text-white/50 text-[11px] font-semibold cursor-pointer hover:bg-white/15 transition-all">
                    <Edit3 size={11} /> Edit
                  </button>
                ) : (
                  <button onClick={handleMessage} disabled={dmLoading}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#FF6B35]/30 bg-[#FF6B35]/10 text-[#FF6B35] text-[11px] font-semibold cursor-pointer hover:bg-[#FF6B35]/20 transition-all disabled:opacity-50">
                    <MessageCircle size={11} /> {dmLoading ? "Opening…" : "Message"}
                  </button>
                )}
              </div>
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[15px] font-bold text-white font-serif">{displayName}</span>
                  <LevelBadge level={level} />
                </div>
                <div className="text-[11px] text-white/35 mb-0.5">@{profileUser?.username}</div>
                {(profileUser?.city || profileUser?.country) && (
                  <div className="flex items-center gap-1 text-[11px] text-white/35 mb-0.5">
                    <MapPin size={10} className="text-[#FF6B35]/60" />
                    {profileUser?.city}{profileUser?.country ? `, ${profileUser.country}` : ""}
                  </div>
                )}
                {nationality && (
                  <div className="flex items-center gap-1 text-[11px] text-white/35 mb-2">
                    <Flag size={10} className="text-white/30" />
                    {nationality}
                  </div>
                )}
                {!nationality && (profileUser?.city || profileUser?.country) && <div className="mb-2" />}
                {profileUser?.bio && <p className="text-[12px] text-white/50 leading-relaxed">{profileUser.bio}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/[0.06]">
                {[
                  { val: d(tripsTotal),     label: "Trips"       },
                  { val: karma,             label: "Karma"       },
                  { val: checkinDisplay,    label: "Reliability" },
                  { val: d(avgRating ?? 0), label: "Avg Rating"  },
                ].map(s => (
                  <div key={s.label} className="text-center py-1.5 bg-white/[0.03] rounded-xl">
                    <div className="text-[16px] font-black text-white font-serif leading-none">{s.val}</div>
                    <div className="text-[9px] text-white/25 uppercase tracking-wider mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — scrollable content */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">
          {StatsSection}
          {BadgesSection}
          {TripHistorySection}
        </div>

      </div>
    </div>
  );
}

/* ─── HELPERS ─────────────────────────────── */
function normaliseTrip(t) {
  return {
    id:     t.id,
    name:   t.title || t.name,
    dest:   (t.destination || "").split(",")[0].trim(),
    date:   fmtDate(t.date_start),
    status: t.status,
    cover:  t.cover_image || "",
    role:   t.my_role
      ? t.my_role.charAt(0).toUpperCase() + t.my_role.slice(1)
      : "Member",
    karma:  t.karma_earned ?? 0,
  };
}
