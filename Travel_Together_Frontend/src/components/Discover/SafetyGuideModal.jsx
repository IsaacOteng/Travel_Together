import { createPortal } from "react-dom";
import {
  Shield, ShieldCheck, BadgeCheck, Users, MapPin, Bell,
  AlertTriangle, Flag, Eye, Phone, X, CheckCircle2,
} from "lucide-react";

/**
 * In-app travel safety documentation. Opens as an overlay on the Discover page
 * never navigates away or links to an external URL.
 *
 * Props:
 *   open    – boolean
 *   onClose – () => void
 */

const SECTIONS = [
  {
    icon: BadgeCheck,
    title: "Before you join a trip",
    points: [
      "Open the organiser's profile and confirm the verified badge every chief is identity-checked before they can publish.",
      "Check their karma score and star rating, plus how many trips they've successfully hosted.",
      "Read the full itinerary, meeting point and what the entry price covers so there are no surprises.",
      "Browse who else is going established travellers with their own karma are a good sign.",
    ],
  },
  {
    icon: ShieldCheck,
    title: "What verification & karma mean",
    points: [
      "Identity-verified: the organiser confirmed a government ID it does not vouch for the trip itself, so still use your judgement.",
      "Travel karma is earned from completed trips and positive ratings; a higher score reflects a longer, well-reviewed history.",
      "A brand-new account with no trips or reviews isn't a red flag on its own just ask more questions before committing.",
    ],
  },
  {
    icon: MapPin,
    title: "Before you depart",
    points: [
      "Add at least one emergency contact in Settings they can be alerted if you ever trigger an SOS.",
      "Share the trip itinerary and meeting point with someone who isn't travelling with you.",
      "Pack essentials: charged phone + power bank, water, any medication, and a copy of your ID.",
      "Confirm the meeting time and pick-up details with the group chat the night before.",
    ],
  },
  {
    icon: Users,
    title: "During the trip",
    points: [
      "Stay with the group and check in at each itinerary stop so the chief can account for everyone.",
      "Keep your phone reachable and location sharing on for the duration of the trip.",
      "Trust your instincts if a situation feels unsafe, speak up to the chief or a scout immediately.",
      "Look out for fellow travellers; safety is a shared responsibility within the group.",
    ],
  },
  {
    icon: Bell,
    title: "Emergencies & SOS",
    points: [
      "Trigger an in-app SOS from the trip screen if you feel unsafe it alerts the chief, your group and your emergency contacts with your location.",
      "The app also watches for unusual patterns (e.g. a member separated from the group for too long) and can raise an alert automatically.",
      "For any real-world emergency, always contact local emergency services first, then raise the in-app SOS.",
    ],
  },
  {
    icon: Flag,
    title: "Reporting & accountability",
    points: [
      "Report any organiser or member who behaves inappropriately using the report option on their profile or the trip page.",
      "Reports are confidential and reviewed by the Travel Together safety team.",
      "Rate your trip honestly afterwards your feedback protects the next traveller.",
    ],
  },
  {
    icon: Eye,
    title: "Watch for these red flags",
    points: [
      "Pressure to pay or share personal details outside the app.",
      "An organiser who won't answer reasonable questions about the plan, transport or accommodation.",
      "Last-minute changes to the meeting point, price or group that feel off.",
      "Requests to travel alone or split from the group without a clear, agreed reason.",
    ],
  },
];

const EMERGENCY = [
  { label: "National Emergency", number: "112" },
  { label: "Police",            number: "191" },
  { label: "Ambulance",         number: "193" },
  { label: "Fire Service",      number: "192" },
];

export default function SafetyGuideModal({ open, onClose }) {
  if (!open) return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(10px)",
        animation: "safetyFadeIn .18s ease",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-[640px] flex-col overflow-hidden rounded-3xl border border-line bg-surface"
        style={{ animation: "safetySlideUp .24s cubic-bezier(0.34,1.4,0.64,1)", boxShadow: "0 24px 64px var(--tt-shadow-lg)" }}
      >
        {/* top accent stripe */}
        <div className="h-1 w-full shrink-0 bg-accent" />

        {/* Sticky header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft">
              <Shield size={20} className="text-accent" />
            </div>
            <div className="min-w-0">
              <h2 className="m-0 font-display text-[18px] font-semibold leading-tight text-ink">Travel safely</h2>
              <p className="m-0 mt-0.5 truncate text-[11.5px] text-ink-mute">Your guide to staying safe on every trip</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink-mute transition-colors hover:border-accent hover:text-accent"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-6 py-5 flex flex-col gap-5">
          {/* intro */}
          <p className="m-0 text-[13.5px] leading-[1.7] text-ink-soft">
            Travel Together connects you with identity-verified organisers and groups across Ghana.
            Verification helps, but your own judgement keeps you safest here's how to make every trip a safe one.
          </p>

          {SECTIONS.map(({ icon: Icon, title, points }) => (
            <div key={title} className="rounded-2xl border border-line bg-surface-alt p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <Icon size={15} className="text-accent" />
                <h3 className="m-0 font-display text-[14.5px] font-semibold text-ink">{title}</h3>
              </div>
              <ul className="m-0 p-0 list-none flex flex-col gap-2">
                {points.map((p, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 size={14} className="mt-[2px] shrink-0 text-moss" />
                    <span className="text-[12.5px] leading-[1.6] text-ink-soft">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Emergency numbers */}
          <div className="rounded-2xl border border-accent/30 bg-accent-soft p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <AlertTriangle size={15} className="text-accent" />
              <h3 className="m-0 font-display text-[14.5px] font-semibold text-ink">Ghana emergency numbers</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {EMERGENCY.map(({ label, number }) => (
                <div key={number} className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2.5">
                  <Phone size={14} className="shrink-0 text-accent" />
                  <div className="min-w-0">
                    <div className="truncate text-[10.5px] leading-tight text-ink-mute">{label}</div>
                    <div className="font-display text-[16px] font-semibold leading-tight text-ink">{number}</div>
                  </div>
                </div>
              ))}
            </div>
            <p className="mb-0 mt-3 text-[11px] leading-snug text-ink-mute">
              In a real-world emergency, always call local services first then raise an in-app SOS so your group and contacts are alerted.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-line bg-surface px-6 py-4">
          <button
            onClick={onClose}
            className="w-full cursor-pointer rounded-full border-none bg-accent py-3 text-[14px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
          >
            Got it keep me safe
          </button>
        </div>
      </div>

      <style>{`
        @keyframes safetyFadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes safetySlideUp { from{opacity:0;transform:translateY(20px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
      `}</style>
    </div>,
    document.body
  );
}
