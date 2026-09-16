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
    `w-full rounded-xl border bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-mute ${
      locked ? "border-line cursor-not-allowed opacity-50" : "border-line focus:border-accent"
    }`;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[2000] flex items-center justify-center p-4"
      style={{ animation: "fadeIn .2s ease" }}>
      <div className="flex max-h-[92vh] w-full max-w-md flex-col rounded-3xl border border-line bg-surface shadow-[0_24px_64px_var(--tt-shadow-lg)]"
        style={{ animation: "slideUp .25s ease" }}>

        <div className="flex shrink-0 items-center justify-between border-b border-line px-6 pb-4 pt-5">
          <h2 className="m-0 font-display text-[20px] font-semibold text-ink">Edit profile</h2>
          <button onClick={onClose} disabled={saving} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink-mute transition-colors hover:border-accent hover:text-accent disabled:opacity-40">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-4">

          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-mute">Photos</label>
            <div className="overflow-hidden rounded-2xl border border-line">
              <div
                ref={coverContainerRef}
                onPointerDown={coverPreview ? onCoverPointerDown : undefined}
                onPointerMove={coverPreview ? onCoverPointerMove : undefined}
                onPointerUp={coverPreview ? onCoverPointerUp : undefined}
                onPointerCancel={() => { isDraggingCover.current = false; }}
                onClick={!coverPreview ? () => coverRef.current?.click() : undefined}
                className={`relative h-24 select-none overflow-hidden bg-surface-alt
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
                      className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-ground/90 px-2.5 py-1 text-[11px] font-semibold text-ink backdrop-blur-sm transition hover:text-accent">
                      <Camera size={10} /> Change
                    </button>
                    <div className="pointer-events-none absolute bottom-1.5 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-ground/90 px-2.5 py-1 text-[10px] text-ink-mute backdrop-blur-sm">
                      <Move size={8} /> Drag to reposition
                    </div>
                  </>
                ) : (
                  <>
                    <div className="absolute inset-0 flex items-center justify-center gap-1.5 text-ink-mute">
                      <ImagePlus size={16} /><span className="text-[10px] font-semibold uppercase tracking-wider">Upload cover</span>
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition bg-black/50 rounded-full p-1.5">
                        <Camera size={13} className="text-accent-ink" />
                      </div>
                    </div>
                  </>
                )}
              </div>
              <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={e => handleCoverFile(e.target.files[0])} />

              <div className="flex items-end gap-3 bg-surface px-4 pb-3">
                <div onClick={() => avatarRef.current?.click()}
                  className="relative -mt-7 w-14 h-14 rounded-full cursor-pointer group flex-shrink-0">
                  {avatarPreview
                    ? <img src={avatarPreview} alt="Avatar" className="h-14 w-14 rounded-full border-[3px] border-surface object-cover" />
                    : <div className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-surface bg-accent-soft">
                        <Camera size={16} className="text-accent" />
                      </div>
                  }
                  <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                    <Camera size={13} className="text-accent-ink opacity-0 transition group-hover:opacity-100" />
                  </div>
                  <div className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-surface bg-accent">
                    <Camera size={9} className="text-accent-ink" />
                  </div>
                </div>
                <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={e => handleAvatarFile(e.target.files[0])} />
                <p className="pb-1 text-[12px] text-ink-mute">Tap to change profile or cover photo</p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-mute">Username</label>
              {usernameLocked && (
                <span className="text-[9px] text-amber-400/80 font-semibold">
                  Locked · available {nextAllowedDate(initialData.usernameChangedAt, 6)}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-semibold text-ink-mute">@</span>
              <input
                value={form.username}
                onChange={e => !usernameLocked && setForm(p => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, "") }))}
                disabled={saving || usernameLocked}
                placeholder="your_username"
                className={`${inputCls(usernameLocked)} pl-7`}
              />
              {!usernameLocked && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px]">
                  {usernameStatus === "checking"  && <Loader2 size={13} className="animate-spin text-ink-mute" />}
                  {usernameStatus === "available" && <span className="text-green-400">✓</span>}
                  {usernameStatus === "taken"     && <span className="text-red-400">Taken</span>}
                  {usernameStatus === "invalid"   && <span className="text-amber-400">Invalid</span>}
                </span>
              )}
            </div>
            {usernameLocked && <p className="mt-1.5 text-[12px] text-ink-mute">Username can only be changed once every 6 months.</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-mute">Full Name</label>
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
            {nameLocked && <p className="mt-1.5 text-[12px] text-ink-mute">Name can only be changed once every 3 months.</p>}
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-mute">City</label>
            <input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
              disabled={saving} placeholder="Your city" className={inputCls(false)} />
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-mute">Bio</label>
            <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
              rows={3} maxLength={200} disabled={saving}
              className="w-full resize-none rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-mute focus:border-accent disabled:opacity-50" />
            <div className="mt-1.5 text-right text-[12px] text-ink-mute">{(form.bio || "").length}/200</div>
          </div>
        </div>

        {saveErr && <p className="px-6 text-[11px] text-red-400 text-center pb-2">{saveErr}</p>}

        <div className="flex shrink-0 gap-3 border-t border-line px-6 pb-5 pt-4">
          <button onClick={onClose} disabled={saving}
            className="flex-1 cursor-pointer rounded-full border border-line bg-surface py-3 text-[14px] font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || usernameStatus === "taken" || usernameStatus === "invalid"}
            className={`flex-1 rounded-full border-none py-3 text-[14px] font-semibold text-accent-ink transition-colors
              ${saving || usernameStatus === "taken" || usernameStatus === "invalid"
                ? "cursor-not-allowed bg-line text-ink-mute"
                : "cursor-pointer bg-accent hover:bg-accent-hover"}`}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
