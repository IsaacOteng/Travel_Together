import { useState } from "react";
import { MapPin, Calendar, Users, Navigation, Send } from "lucide-react";
import { AlertCircle } from 'lucide-react';
import { SectionHead, PrimaryBtn } from './uiComponents.jsx';
import PricePill from './PricePill.jsx';
import PayoutSetup from './PayoutSetup.jsx';
import { tripsApi } from '../../services/api.js';
import { formatDriveTime } from "../../utils/driveTime.js";

/* ══════════════════════════════════════════
   STEP 4 PREVIEW & PUBLISH
══════════════════════════════════════════ */
export default function Step4({ form, onBack, onPublish }) {
  const [publishing, setPublishing] = useState(false);
  const [failed,     setFailed]     = useState(null);
  const isFree    = !form.entryPrice || form.entryPrice === "0";

  const doPublish = async () => {
    setPublishing(true);
    setFailed(null);
    try {
      const payload = {
        title:         form.title,
        destination:   form.destination,
        description:   form.description,
        date_start:    form.dateStart,
        date_end:      form.dateEnd,
        start_time:    form.startTime || null,
        end_time:      form.endTime   || null,
        spots_total:   form.spots_total,
        entry_price:   form.entryPrice || "0",
        price_covers:  form.priceCovers || [],
        highlights:    form.highlights || [],
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
      if (import.meta.env.DEV) console.error("Trip create/publish failed:", err?.response?.data || err);
      /* The server is the authority on completeness (apps/trips/completeness.py).
         It answers with either per-field DRF errors from create, or a `missing`
         map from publish — show whichever came back rather than dropping the
         person on a blank success screen. */
      const data = err?.response?.data || {};
      const fieldErrors = data.missing && typeof data.missing === "object"
        ? data.missing
        : Object.fromEntries(
            Object.entries(data)
              .filter(([k, v]) => k !== "detail" && (typeof v === "string" || Array.isArray(v)))
              .map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
          );
      setFailed({
        detail: data.detail || "Couldn't publish this trip.",
        fields: Object.keys(fieldErrors).length ? fieldErrors : null,
      });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="animate-[fadeUp_.22s_ease_both]">
      <SectionHead title="Preview your trip"
        sub="This is exactly how it appears on Discover. Publish when you're happy." />

      {/* Live card preview */}
      <div className="bg-surface border-[1.5px] border-line rounded-[20px] overflow-hidden mb-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        {/* Cover */}
        <div className="relative h-48 bg-surface-alt">
          {form.images?.[0] && (
            <img src={form.images[0]} alt="cover" className="w-full h-full object-cover block" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />

          {/* Tags */}
          <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
            {(form.tags || []).slice(0, 2).map(tag => (
              <span key={tag} className="text-[10px] px-[9px] py-[3px] rounded-full bg-ground/90 backdrop-blur-sm text-ink font-semibold">
                {tag}
              </span>
            ))}
          </div>

          {/* Price badge top right */}
          <div className={`absolute top-3 right-3 backdrop-blur-md rounded-[10px] px-[10px] py-1.5 text-center
            ${isFree ? "bg-green-400/80" : "bg-[rgba(255,107,53,0.9)]"}`}>
            <div className="text-[13px] font-black text-ink leading-none">
              {isFree ? "Free" : `GH₵${form.entryPrice}`}
            </div>
            {!isFree && <div className="text-[8px] text-ink font-semibold mt-0.5">entry</div>}
          </div>

          {/* Title */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-3.5">
            <h3 className="m-0 mb-1 text-[19px] font-light text-ink font-serif tracking-[-0.3px] leading-tight">
              {form.title || "Your trip title"}
            </h3>
            <div className="flex items-center gap-1.5 text-[11px] text-ink-soft">
              <MapPin size={10} color="var(--tt-accent)" />
              {form.destination || "Destination"}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          <div className="flex gap-1.5 flex-wrap mb-3">
            {[
              { Icon: Calendar,   text: form.dateStart ? `${form.dateStart}${form.startTime ? ` · ${form.startTime}` : ""}` : "Start date" },
              { Icon: Users,      text: `0 / ${form.spots_total || "?"}` },
              form.driveTime && { Icon: Navigation, text: formatDriveTime(form.driveTime) },
            ].filter(Boolean).map((m, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-surface-alt border border-line rounded-lg px-[9px] py-[5px]">
                <m.Icon size={11} className="text-ink-mute" />
                <span className="text-[11px] text-ink-soft font-medium">{m.text}</span>
              </div>
            ))}
          </div>

          <p className="text-[12px] text-ink-soft leading-[1.65] mb-3 line-clamp-2">
            {form.description || "Your trip description will appear here."}
          </p>

          {/* Itinerary preview */}
          {(form.stops || []).filter(s => s.name).length > 0 && (
            <div className="bg-surface-alt border border-line rounded-[10px] px-3 py-2.5 mb-3">
              <div className="text-[9px] font-bold tracking-[.1em] uppercase text-ink-mute mb-2">Itinerary</div>
              {(form.stops || []).filter(s => s.name).slice(0, 4).map((s, i, arr) => (
                <div key={i} className={`flex items-center gap-2 ${i < arr.length - 1 ? "mb-1.5" : ""}`}>
                  <div className="w-[18px] h-[18px] rounded-full bg-[rgba(255,107,53,0.2)] border border-[rgba(255,107,53,0.35)] flex items-center justify-center text-[9px] font-bold text-accent flex-shrink-0">
                    {i + 1}
                  </div>
                  <span className="text-[11px] text-ink-soft font-medium flex-1">{s.name}</span>
                  {s.arrival_time && <span className="text-[10px] text-ink-mute">{s.arrival_time}</span>}
                </div>
              ))}
            </div>
          )}

          {/* What's planned preview */}
          {(form.highlights || []).length > 0 && (
            <div className="bg-surface-alt border border-line rounded-[10px] px-3 py-2.5 mb-3">
              <div className="text-[9px] font-bold tracking-[.1em] uppercase text-ink-mute mb-2">What's planned</div>
              <div className="flex flex-wrap gap-1.5">
                {(form.highlights || []).map((h, i) => (
                  <span key={i} className="text-[11px] px-2.5 py-[3px] rounded-full bg-[rgba(255,107,53,0.12)] text-accent border border-[rgba(255,107,53,0.2)] font-semibold">
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}

          {form.meetingPoint && (
            <div className="flex items-center gap-1.5 text-[11px] text-ink-mute">
              <Navigation size={11} className="text-accent" />
              Meets at <span className="text-ink-soft font-semibold ml-0.5">{form.meetingPoint}</span>
            </div>
          )}
        </div>
      </div>

      {/* Entry price breakdown */}
      <PricePill form={form} />

      {/* Payout method only relevant for paid trips */}
      {!isFree && <PayoutSetup />}

      {failed && (
        <div role="alert" className="mb-4 rounded-2xl border border-accent/30 bg-accent-soft p-4">
          <p className="m-0 flex items-center gap-2 text-[14px] font-semibold text-accent">
            <AlertCircle size={15} className="shrink-0" /> {failed.detail}
          </p>
          {failed.fields && (
            <ul className="m-0 mt-2.5 flex list-none flex-col gap-1.5 p-0">
              {Object.entries(failed.fields).map(([field, msg]) => (
                <li key={field} className="text-[13px] leading-snug text-ink-soft">
                  <span className="font-medium capitalize text-ink">
                    {field.replace(/_/g, " ")}:
                  </span>{" "}
                  {msg}
                </li>
              ))}
            </ul>
          )}
          <p className="m-0 mt-3 text-[12.5px] text-ink-mute">
            Use the steps on the left to fix these, then publish again.
          </p>
        </div>
      )}

      {/* Publish */}
      <PrimaryBtn onClick={doPublish} loading={publishing}>
        <Send size={15} /> Publish trip
      </PrimaryBtn>

      <div className="mt-2.5">
        <button
          onClick={onBack}
          className="w-full py-3 rounded-xl border-[1.5px] border-line bg-transparent
            text-ink-soft text-[13px] font-medium cursor-pointer
            hover:border-line hover:text-ink transition-all duration-150"
        >
          ← Edit details
        </button>
      </div>
    </div>
  );
}