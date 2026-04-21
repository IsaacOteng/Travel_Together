import { useState, useRef } from "react";
import { X, Camera, ImagePlus, Move, Loader2 } from "lucide-react";
import { useUsernameCheck, monthsAgo, nextAllowedDate, parseCoverPosition } from "./helpers.js";

export default function EditModal({ onClose, onSave, initialData }) {
  const avatarRef         = useRef();
  const coverRef          = useRef();
  const coverContainerRef = useRef(null);
  const isDraggingCover   = useRef(false);
  const dragStartRef      = useRef(null);
  const pointerMoved      = useRef(false);

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
    dragStartRef.current = { clientX: e.clientX, clientY: e.clientY, posX: coverPosition.x, posY: coverPosition.y };
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

        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.06] flex-shrink-0">
          <h2 className="text-[17px] font-light text-white font-serif">Edit Profile</h2>
          <button onClick={onClose} disabled={saving} className="bg-transparent border-none cursor-pointer text-white/40 hover:text-white/70 transition-colors disabled:opacity-40">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-4">

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Photos</label>
            <div className="rounded-2xl overflow-hidden border border-white/[0.07]">
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
                    <img src={coverPreview} alt="Cover" draggable={false}
                      className="w-full h-full object-cover pointer-events-none"
                      style={{ objectPosition: `${coverPosition.x}% ${coverPosition.y}%` }} />
                    <button
                      onPointerDown={e => e.stopPropagation()}
                      onClick={e => { e.stopPropagation(); coverRef.current?.click(); }}
                      className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-white/80 text-[10px] font-semibold hover:bg-black/80 transition z-10">
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
            {usernameLocked && <p className="text-[10px] text-white/25 mt-1">Username can only be changed once every 6 months.</p>}
          </div>

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
            {nameLocked && <p className="text-[10px] text-white/25 mt-1">Name can only be changed once every 3 months.</p>}
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">City</label>
            <input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
              disabled={saving} placeholder="Your city" className={inputCls(false)} />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Bio</label>
            <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
              rows={3} maxLength={200} disabled={saving}
              className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3.5 py-2.5 text-[13px] text-white outline-none focus:border-[#FF6B35]/50 transition-colors resize-none placeholder-white/20 disabled:opacity-50" />
            <div className="text-[10px] text-white/20 text-right mt-1">{(form.bio || "").length}/200</div>
          </div>
        </div>

        {saveErr && <p className="px-6 text-[11px] text-red-400 text-center pb-2">{saveErr}</p>}

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
    </div>
  );
}
