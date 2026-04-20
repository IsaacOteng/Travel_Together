import { useState, useRef } from "react";
import { Camera, ImagePlus, Move } from "lucide-react";
import { SectionHead } from "./SectionHead";
import { Label, Hint, Err, Ok } from "./atoms";
import { inputBase } from "./buttons";

/* ══════════════════════════════════════════════════
   STEP 1 — Photo & Bio
══════════════════════════════════════════════════ */
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

  const [bioTouched, setBioTouched] = useState(false);
  const nameErr = touched && !form.displayName?.trim() ? "Required" : "";
  const bioErr  = bioTouched && !form.bio?.trim() ? "Required" : "";

  return (
    <div>
      <SectionHead icon="📸" title="Photo & display name" sub="Your photo and name are shown to other travelers on all group pages." />

      {/* Cover + Avatar stacked preview */}
      <div className="mb-6 rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
        {/* Cover banner */}
        <div
          ref={coverContainerRef}
          onPointerDown={coverPreview ? onCoverPointerDown : undefined}
          onPointerMove={coverPreview ? onCoverPointerMove : undefined}
          onPointerUp={coverPreview ? onCoverPointerUp : undefined}
          onPointerCancel={() => { isDraggingCover.current = false; }}
          onClick={!coverPreview ? () => coverRef.current?.click() : undefined}
          className={`relative h-24 bg-linear-to-r from-orange-100 via-green-50 to-blue-100 overflow-hidden select-none
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
                className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-white/90 text-[10px] font-semibold hover:bg-black/70 transition z-10"
              >
                <Camera size={10} /> Change
              </button>
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1 text-white/70 text-[9px] pointer-events-none whitespace-nowrap">
                <Move size={8} /> Drag to reposition
              </div>
            </>
          ) : (
            <>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 opacity-60">
                <ImagePlus size={20} className="text-gray-400" />
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Add cover photo</span>
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition bg-black/50 rounded-full p-1.5">
                  <Camera size={14} className="text-white" />
                </div>
              </div>
            </>
          )}
        </div>
        <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleCover(e.target.files[0])} />

        {/* Avatar — overlapping the cover bottom edge */}
        <div className="bg-white px-4 pb-3 flex items-end gap-3" style={{ paddingTop: 0 }}>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            className={`relative -mt-8 w-16 h-16 rounded-full cursor-pointer flex-shrink-0 transition-all duration-200 ${dragOver ? "scale-105" : ""}`}
          >
            {preview
              ? <img src={preview} alt="Profile preview" className="w-16 h-16 rounded-full object-cover border-[3px] border-white shadow" />
              : (
                <div className="w-16 h-16 rounded-full bg-orange-50 border-[3px] border-dashed border-[#FF6B35] shadow flex flex-col items-center justify-center gap-1">
                  <Camera size={16} className="text-[#FF6B35]" />
                  <span className="text-[8px] text-[#FF6B35] font-bold uppercase tracking-wider">Photo</span>
                </div>
              )
            }
            {preview && (
              <div className="absolute inset-0 rounded-full bg-black/25 opacity-0 hover:opacity-100 transition flex items-center justify-center">
                <Camera size={14} className="text-white" />
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow" style={{ background: "#FF6B35" }}>
              <Camera size={9} className="text-white" />
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
          <p className="text-[10px] text-gray-400 pb-1">JPG, PNG or WEBP · Max 5 MB</p>
        </div>
      </div>

      {/* Display name */}
      <div className="mb-4">
        <Label>Display name <span className="text-[#FF6B35]">*</span></Label>
        <input
          type="text"
          placeholder="How you'd like to be called"
          value={form.displayName || ""}
          onChange={(e) => patch({ displayName: e.target.value })}
          onBlur={() => setTouched(true)}
          maxLength={40}
          className={inputBase}
        />
        {nameErr
          ? <Err msg={nameErr} />
          : form.displayName && <Ok msg={`You'll appear as "${form.displayName}" to other travelers`} />
        }
      </div>

      {/* Bio */}
      <div className="mb-2">
        <Label>Short bio <span className="text-[#FF6B35]">*</span></Label>
        <Hint>Shown on your profile and join-request previews.</Hint>
        <div className="relative">
          <textarea
            rows={4}
            maxLength={200}
            placeholder="Your travel style, interests, dream destinations…"
            value={form.bio || ""}
            onChange={(e) => patch({ bio: e.target.value })}
            onBlur={() => setBioTouched(true)}
            className={`${inputBase} resize-none`}
          />
          <span className={`absolute bottom-2.5 right-2.5 text-[10px] pointer-events-none ${
            (form.bio || "").length >= 180 ? "text-orange-400" : "text-gray-300"
          }`}>
            {(form.bio || "").length}/200
          </span>
        </div>
        {bioErr && <Err msg={bioErr} />}
      </div>
    </div>
  );
};