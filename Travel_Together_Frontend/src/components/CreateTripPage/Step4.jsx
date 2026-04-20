import { useState } from "react";
import { MapPin, Calendar, Users, Navigation, Check, Send } from "lucide-react";
import { ProgressBar, SectionHead, PrimaryBtn, GhostBtn } from './uiComponents.jsx';
import PricePill from './PricePill.jsx';
import { tripsApi } from '../../services/api.js';

/* ══════════════════════════════════════════
   STEP 4 — PREVIEW & PUBLISH
══════════════════════════════════════════ */
export default function Step4({ form, onBack, onPublish, onDraft }) {
  const [publishing, setPublishing] = useState(false);
  const [drafted,    setDrafted]    = useState(false);
  const isFree    = !form.entryPrice || form.entryPrice === "0";

  const doPublish = async () => {
    setPublishing(true);
    try {
      const payload = {
        title:         form.title,
        destination:   form.destination,
        description:   form.description,
        date_start:    form.dateStart,
        date_end:      form.dateEnd,
        spots_total:   form.spots_total,
        entry_price:   form.entryPrice || "0",
        price_covers:  form.priceCovers || [],
        tags:          form.tags || [],
        meeting_point: form.meetingPoint || "",
        drive_time:    form.driveTime    || "",
        distance_km:   form.distanceKm   ? parseFloat(form.distanceKm) : null,
        visibility:    "public",
      };
      const { data: trip } = await tripsApi.create(payload);

      // Save itinerary stops entered during Step 3
      const validStops = (form.stops || []).filter(s => s.name?.trim());
      if (validStops.length) {
        await Promise.all(
          validStops.map((s, i) =>
            tripsApi.addStop(trip.id, {
              order:           i,
              name:            s.name.trim(),
              arrival_time:    s.arrival_time   || null,
              geofence_radius: s.radius         ?? 100,
              note:            s.note?.trim()   || "",
            })
          )
        );
      }

      // Upload images (File objects collected during Step 1)
      if (form.imageFiles?.length) {
        await tripsApi.uploadImages(trip.id, form.imageFiles);
      }

      await tripsApi.publish(trip.id);
      onPublish(trip.id);
    } catch (err) {
      console.error("Trip create/publish failed:", err?.response?.data || err);
      onPublish(null);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="animate-[fadeUp_.22s_ease_both]">
      <ProgressBar step={4} total={4} />
      <SectionHead icon="👁️" title="Preview your trip"
        sub="This is exactly how it appears on Discover. Publish when you're happy." />

      {/* Live card preview */}
      <div className="bg-[#0d1b2a] border-[1.5px] border-white/[0.08] rounded-[20px] overflow-hidden mb-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        {/* Cover */}
        <div className="relative h-48 bg-[#0a1628]">
          {form.images?.[0] && (
            <img src={form.images[0]} alt="cover" className="w-full h-full object-cover block" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d1b2a]/85 to-transparent" />

          {/* Tags */}
          <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
            {(form.tags || []).slice(0, 2).map(tag => (
              <span key={tag} className="text-[10px] px-[9px] py-[3px] rounded-full bg-white/[0.18] backdrop-blur-md text-white font-bold">
                {tag}
              </span>
            ))}
          </div>

          {/* Price badge top right */}
          <div className={`absolute top-3 right-3 backdrop-blur-md rounded-[10px] px-[10px] py-1.5 text-center
            ${isFree ? "bg-green-400/80" : "bg-[rgba(255,107,53,0.9)]"}`}>
            <div className="text-[13px] font-black text-white leading-none">
              {isFree ? "Free" : `GH₵${form.entryPrice}`}
            </div>
            {!isFree && <div className="text-[8px] text-white/70 font-semibold mt-0.5">entry</div>}
          </div>

          {/* Title */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-3.5">
            <h3 className="m-0 mb-1 text-[19px] font-light text-white font-serif tracking-[-0.3px] leading-tight">
              {form.title || "Your trip title"}
            </h3>
            <div className="flex items-center gap-1.5 text-[11px] text-white/60">
              <MapPin size={10} color="#FF6B35" />
              {form.destination || "Destination"}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          <div className="flex gap-1.5 flex-wrap mb-3">
            {[
              { Icon: Calendar,   text: form.dateStart || "Start date" },
              { Icon: Users,      text: `0 / ${form.spots_total || "?"}` },
              form.driveTime && { Icon: Navigation, text: form.driveTime },
            ].filter(Boolean).map((m, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-white/[0.06] border border-white/[0.07] rounded-lg px-[9px] py-[5px]">
                <m.Icon size={11} className="text-white/40" />
                <span className="text-[11px] text-white/60 font-medium">{m.text}</span>
              </div>
            ))}
          </div>

          <p className="text-[12px] text-white/50 leading-[1.65] mb-3 line-clamp-2">
            {form.description || "Your trip description will appear here."}
          </p>

          {/* Itinerary preview */}
          {(form.stops || []).filter(s => s.name).length > 0 && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-[10px] px-3 py-2.5 mb-3">
              <div className="text-[9px] font-bold tracking-[.1em] uppercase text-white/25 mb-2">Itinerary</div>
              {(form.stops || []).filter(s => s.name).slice(0, 4).map((s, i, arr) => (
                <div key={i} className={`flex items-center gap-2 ${i < arr.length - 1 ? "mb-1.5" : ""}`}>
                  <div className="w-[18px] h-[18px] rounded-full bg-[rgba(255,107,53,0.2)] border border-[rgba(255,107,53,0.35)] flex items-center justify-center text-[9px] font-bold text-[#FF6B35] flex-shrink-0">
                    {i + 1}
                  </div>
                  <span className="text-[11px] text-white/65 font-medium flex-1">{s.name}</span>
                  {s.arrival_time && <span className="text-[10px] text-white/30">{s.arrival_time}</span>}
                </div>
              ))}
            </div>
          )}

          {form.meetingPoint && (
            <div className="flex items-center gap-1.5 text-[11px] text-white/40">
              <Navigation size={11} className="text-[#FF6B35]" />
              Meets at <span className="text-white/65 font-semibold ml-0.5">{form.meetingPoint}</span>
            </div>
          )}
        </div>
      </div>

      {/* Entry price breakdown */}
      <PricePill form={form} />

      {/* Publish */}
      <PrimaryBtn onClick={doPublish} loading={publishing}>
        <Send size={15} /> Publish trip
      </PrimaryBtn>

      <div className="flex gap-2.5 mt-2.5">
        <GhostBtn onClick={onBack}>← Edit</GhostBtn>
        <button
          onClick={() => { setDrafted(true); setTimeout(onDraft, 900); }}
          className={`flex-1 py-3 rounded-xl text-[13px] font-semibold cursor-pointer
            flex items-center justify-center gap-1.5 transition-all duration-200
            ${drafted
              ? "bg-green-400/10 border-[1.5px] border-green-400/30 text-green-400"
              : "bg-transparent border-[1.5px] border-white/10 text-white/50 hover:border-white/20"
            }`}
        >
          {drafted ? <><Check size={13} /> Saved!</> : "Save as draft"}
        </button>
      </div>
    </div>
  );
}