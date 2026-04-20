import { useState, useRef } from "react";
import { MapPin, Navigation, Image, Plus, X } from "lucide-react";
import { ProgressBar, SectionHead, Label, TTInput, TTTextarea, PrimaryBtn, Err } from './uiComponents.jsx';

const MAX_PHOTOS = 5;

/* ══════════════════════════════════════════
   STEP 1 — BASICS
══════════════════════════════════════════ */
export default function Step1({ form, patch, onNext }) {
  const [touched, setTouched] = useState({});
  const touch = (...keys) => setTouched(t => keys.reduce((a, k) => ({ ...a, [k]: true }), t));
  const fileRef = useRef(null);

  const images = form.images || [];

  const handleFiles = (e) => {
    const incoming = Array.from(e.target.files || []);
    const remaining = MAX_PHOTOS - images.length;
    const toAdd = incoming.slice(0, remaining);
    if (toAdd.length) {
      patch({
        images:      [...images, ...toAdd.map(f => URL.createObjectURL(f))],
        imageFiles:  [...(form.imageFiles || []), ...toAdd],
      });
    }
    e.target.value = "";
  };

  const removeImage = (idx) => {
    patch({
      images:     images.filter((_, i) => i !== idx),
      imageFiles: (form.imageFiles || []).filter((_, i) => i !== idx),
    });
  };

  const errs = {
    title:       !form.title?.trim()       ? "Trip title is required" : form.title.trim().length < 5 ? "Too short" : "",
    destination: !form.destination?.trim() ? "Destination is required" : "",
    description: !form.description?.trim() ? "Add a short description" : "",
  };
  const allOk = Object.values(errs).every(e => !e);

  return (
    <div className="animate-[fadeUp_.22s_ease_both]">
      <ProgressBar step={1} total={4} />
      <SectionHead icon="✈️" title="Tell us about your trip"
        sub="Give it a name and destination — this is what travellers see first." />

      {/* Photo uploader */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1">
          <Label>Trip photos</Label>
          <span className="text-[11px] text-white/30">{images.length}/{MAX_PHOTOS}</span>
        </div>
        <p className="text-[10px] text-white/30 mb-2">Landscape photos look best · first photo becomes the cover</p>

        {/* Cover preview / upload zone */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFiles}
        />
        <div
          onClick={() => images.length < MAX_PHOTOS && fileRef.current?.click()}
          className={`rounded-2xl overflow-hidden h-44 mb-2.5 relative transition-all duration-150
            ${images.length < MAX_PHOTOS ? "cursor-pointer" : "cursor-default"}
            ${images[0]
              ? "border-0"
              : "bg-white/3 border-[1.5px] border-dashed border-white/15 hover:border-white/30 hover:bg-white/5"
            }`}
        >
          {images[0] ? (
            <>
              <img src={images[0]} alt="cover" className="w-full h-full object-cover block" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#071422]/70 to-transparent pointer-events-none" />
              <span className="absolute bottom-2 left-3 text-[10px] font-bold text-white/50 tracking-[0.08em] uppercase pointer-events-none">
                Cover
              </span>
              {images.length < MAX_PHOTOS && (
                <button
                  onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
                  className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-white/80 text-[11px] font-semibold hover:bg-black/70 transition-all"
                >
                  <Plus size={11} /> Add photo
                </button>
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-white/6 border border-white/10 flex items-center justify-center">
                <Image size={18} className="text-white/30" />
              </div>
              <div className="text-center">
                <p className="text-[13px] text-white/50 font-medium m-0">Upload trip photos</p>
                <p className="text-[11px] text-white/25 m-0 mt-0.5">First photo becomes the cover · max {MAX_PHOTOS}</p>
              </div>
            </div>
          )}
        </div>

        {/* Thumbnails row */}
        {images.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {images.map((src, i) => (
              <div key={i} className="relative w-15 h-15 rounded-xl overflow-hidden border-2 border-white/8 shrink-0 group">
                <img src={src} alt="" className="w-full h-full object-cover block" />
                {i === 0 && (
                  <div className="absolute bottom-0 left-0 right-0 bg-[#FF6B35]/80 text-[8px] font-bold text-white text-center py-0.5 tracking-wide">
                    COVER
                  </div>
                )}
                <button
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={9} color="white" />
                </button>
              </div>
            ))}
            {images.length < MAX_PHOTOS && (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-15 h-15 rounded-xl border-[1.5px] border-dashed border-white/20 flex items-center justify-center text-white/30 hover:border-white/40 hover:text-white/50 transition-all shrink-0"
              >
                <Plus size={18} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Title */}
      <div className="mb-4">
        <Label required>Trip title</Label>
        <TTInput
          value={form.title || ""}
          onChange={e => { patch({ title: e.target.value }); touch("title"); }}
          placeholder="e.g. Mount Afadja Weekend Expedition"
        />
        <Err msg={touched.title ? errs.title : ""} />
      </div>

      {/* Destination + Meeting point */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <Label required>Destination</Label>
          <div className="relative">
            <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FF6B35] pointer-events-none" />
            <TTInput
              value={form.destination || ""}
              onChange={e => { patch({ destination: e.target.value }); touch("destination"); }}
              placeholder="Mount Afadja, Volta Region, Ghana"
              className="pl-8"
            />
          </div>
          <Err msg={touched.destination ? errs.destination : ""} />
          <p className="text-[10px] text-white/30 mt-1 leading-relaxed">
            Use <span className="text-white/50">Place, Region, Country</span> for an accurate map pin.
          </p>
        </div>
        <div>
          <Label>Meeting point</Label>
          <div className="relative">
            <Navigation size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            <TTInput
              value={form.meetingPoint || ""}
              onChange={e => patch({ meetingPoint: e.target.value })}
              placeholder="Dansoman, Accra"
              className="pl-8"
            />
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="mb-6">
        <Label required>Description</Label>
        <TTTextarea
          value={form.description || ""}
          onChange={e => { patch({ description: e.target.value }); touch("description"); }}
          placeholder="What's the plan? Who should join? What will you all experience together?"
          rows={4}
        />
        <Err msg={touched.description ? errs.description : ""} />
      </div>

      <PrimaryBtn
        onClick={() => { touch("title","destination","description"); if (allOk) onNext(); }}
        disabled={!allOk}
      >
        Continue →
      </PrimaryBtn>
    </div>
  );
}