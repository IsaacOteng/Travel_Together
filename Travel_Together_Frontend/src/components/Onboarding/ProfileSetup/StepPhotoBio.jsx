import { useState, useRef } from "react";
import { Camera, ImagePlus, Move } from "lucide-react";
import { SectionHead } from "./SectionHead";
import { Label, Hint, Err, Ok } from "./atoms";
import { inputBase, inputError } from "./buttons";

export const StepPhotoBio = ({ form, patch }) => {
  const fileRef            = useRef();
  const coverRef           = useRef();
  const coverContainerRef  = useRef(null);
  const isDraggingCover    = useRef(false);
  const dragStartRef       = useRef(null);
  const pointerMoved       = useRef(false);

  const [preview,       setPreview]       = useState(form.photoPreview || null);
  const [coverPreview,  setCoverPreview]  = useState(form.coverPreview || null);
  const [coverPosition, setCoverPosition] = useState(form.coverPosition || { x: 50, y: 50 });
  const [dragOver,      setDragOver]      = useState(false);
  const [touched,       setTouched]       = useState(false);
  const [bioTouched,    setBioTouched]    = useState(false);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    patch({ photo: file, photoPreview: url });
  };

  const handleCover = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    const pos = { x: 50, y: 50 };
    setCoverPreview(url);
    setCoverPosition(pos);
    patch({ cover: file, coverPreview: url, coverPosition: pos });
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
    const pos = {
      x: Math.max(0, Math.min(100, dragStartRef.current.posX - (dx / width)  * 100)),
      y: Math.max(0, Math.min(100, dragStartRef.current.posY - (dy / height) * 100)),
    };
    setCoverPosition(pos);
    patch({ coverPosition: pos });
  };

  const onCoverPointerUp = () => {
    isDraggingCover.current = false;
    if (!pointerMoved.current) coverRef.current?.click();
  };

  const bioLen  = (form.bio || "").length;
  const nameErr = touched    && !form.displayName?.trim() ? "Please enter a name."    : "";
  const bioErr  = bioTouched && !form.bio?.trim()         ? "Please write a short bio." : "";

  return (
    <div>
      <SectionHead
        title="How should people know you?"
        sub="Your photo, name and bio are the first things an organiser sees when you ask to join a trip."
      />

      {/* Live preview of the profile card other travellers will actually see,
          rather than two disconnected file pickers. */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-line bg-surface">
        <div
          ref={coverContainerRef}
          onPointerDown={coverPreview ? onCoverPointerDown : undefined}
          onPointerMove={coverPreview ? onCoverPointerMove : undefined}
          onPointerUp={coverPreview ? onCoverPointerUp : undefined}
          onPointerCancel={() => { isDraggingCover.current = false; }}
          onClick={!coverPreview ? () => coverRef.current?.click() : undefined}
          className={`relative h-28 select-none overflow-hidden bg-surface-alt ${
            coverPreview ? "cursor-grab active:cursor-grabbing" : "group cursor-pointer"
          }`}
        >
          {coverPreview ? (
            <>
              <img
                src={coverPreview}
                alt="Cover"
                draggable={false}
                className="pointer-events-none h-full w-full object-cover"
                style={{ objectPosition: `${coverPosition.x}% ${coverPosition.y}%` }}
              />
              <button
                type="button"
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); coverRef.current?.click(); }}
                className="absolute right-2.5 top-2.5 z-10 flex cursor-pointer items-center gap-1.5 rounded-full border-none bg-black/55 px-2.5 py-1.5 text-[11.5px] font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/75"
              >
                <Camera size={11} /> Change
              </button>
              <span className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-black/45 px-2.5 py-1 text-[11px] text-white/80 backdrop-blur-sm">
                <Move size={9} /> Drag to reposition
              </span>
            </>
          ) : (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-ink-mute transition-colors group-hover:text-accent">
              <ImagePlus size={20} />
              <span className="text-[12.5px] font-medium">Add a cover photo</span>
            </span>
          )}
        </div>
        <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleCover(e.target.files[0])} />

        <div className="flex items-end gap-3.5 px-4 pb-4">
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            className={`relative -mt-9 h-[72px] w-[72px] shrink-0 cursor-pointer transition-transform duration-200 ${dragOver ? "scale-105" : ""}`}
          >
            {preview ? (
              <img
                src={preview}
                alt="Profile preview"
                className="h-[72px] w-[72px] rounded-full border-[3px] border-surface object-cover"
              />
            ) : (
              <span className="flex h-[72px] w-[72px] flex-col items-center justify-center gap-0.5 rounded-full border-[3px] border-surface bg-accent-soft text-accent">
                <Camera size={18} />
                <span className="text-[10px] font-semibold">Photo</span>
              </span>
            )}
            {preview && (
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 transition-opacity hover:opacity-100">
                <Camera size={15} className="text-white" />
              </span>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />

          <div className="min-w-0 flex-1 pb-0.5">
            <p className="m-0 truncate text-[15px] font-semibold text-ink">
              {form.displayName?.trim() || "Your name"}
            </p>
            <p className="m-0 mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-ink-mute">
              {form.bio?.trim() || "Your bio appears here."}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-5">
        <Label htmlFor="ob-name">Display name</Label>
        <input
          id="ob-name"
          type="text"
          placeholder="How you'd like to be called"
          value={form.displayName || ""}
          onChange={(e) => patch({ displayName: e.target.value })}
          onBlur={() => setTouched(true)}
          maxLength={40}
          aria-invalid={!!nameErr || undefined}
          className={`${inputBase} ${nameErr ? inputError : ""}`}
        />
        {nameErr
          ? <Err msg={nameErr} />
          : form.displayName?.trim() && <Ok msg={`You'll appear as "${form.displayName.trim()}"`} />}
      </div>

      <div>
        <Label htmlFor="ob-bio">Short bio</Label>
        <Hint>A line or two on how you travel. Organisers read this before approving a request.</Hint>
        <div className="relative">
          <textarea
            id="ob-bio"
            rows={4}
            maxLength={200}
            placeholder="Your travel style, interests, dream destinations…"
            value={form.bio || ""}
            onChange={(e) => patch({ bio: e.target.value })}
            onBlur={() => setBioTouched(true)}
            aria-invalid={!!bioErr || undefined}
            className={`${inputBase} resize-none pb-7 ${bioErr ? inputError : ""}`}
          />
          <span
            className={`pointer-events-none absolute bottom-2.5 right-3 text-[11.5px] tabular-nums ${
              bioLen >= 180 ? "text-accent" : "text-ink-mute"
            }`}
          >
            {bioLen}/200
          </span>
        </div>
        <Err msg={bioErr} />
      </div>
    </div>
  );
};
