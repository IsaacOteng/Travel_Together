import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MapPin, Navigation, Calendar, Car, Globe, Users,
  Star, Info, ArrowLeft, Check, Clock,
} from "lucide-react";
import MapEmbed from "./MapEmbed.jsx";
import TripGallery from "./TripGallery.jsx";
import { Avatar, WhoIsGoing } from "./helpers.jsx";
import { fmtTime } from "../../utils/date.js";
import { formatPrice, titleCase } from "../../utils/money.js";
import PayButton from "../Payments/PayButton.jsx";
import ShareToast from "./ShareToast.jsx";
import AppNav from "../shared/AppNav.jsx";
import MobileBottomNav from "../shared/MobileBottomNav.jsx";
import GuestDialog from "../shared/GuestDialog.jsx";
import ThemeToggle from "../shared/ThemeToggle.jsx";
import NotificationBell from "../Notifications/NotificationBell.jsx";
import NotificationsPanel from "../Notifications/NotificationsPanel.jsx";
import { useNotifications } from "../../context/NotificationsContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useOnboardingGate } from "../shared/OnboardingGate.jsx";
import { tripsApi, usersApi } from "../../services/api.js";
import api from "../../services/api.js";
import { displayName } from "../../utils/name.js";
import { formatDriveTime } from "../../utils/driveTime.js";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function absUrl(url) {
  if (!url) return "";
  return url.startsWith("http") ? url : `${API_BASE}${url}`;
}

function normalise(t) {
  const entryPrice = t.entry_price != null ? parseFloat(t.entry_price) : 0;
  return {
    ...t,
    entryPrice,
    title:        t.title,
    destination:  t.destination,
    meetingPlace: t.meeting_point || t.meeting_place || "",
    dateStart:    t.date_start
      ? new Date(t.date_start).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
      : "—",
    dateEnd: t.date_end
      ? new Date(t.date_end).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
      : "—",
    drive:       formatDriveTime(t.drive_time),
    distance:    t.distance_km ? `${t.distance_km} km` : "",
    spotsTotal:  t.spots_total  ?? 0,
    spotsFilled: t.spots_filled ?? (t.spots_total || 0) - (t.spots_left || 0),
    description: t.description || "",
    tags:        t.tags || [],
    chief: {
      id:       t.chief_id,
      name:     displayName({ first_name: t.chief_first_name, last_name: t.chief_last_name }, "Organiser"),
      username: t.chief_username  || "",
      avatarUrl: t.chief_avatar_url ? (t.chief_avatar_url.startsWith("/") ? `${API_BASE}${t.chief_avatar_url}` : t.chief_avatar_url) : null,
      trips:    t.chief_trip_count ?? 0,
      karma:    t.chief_karma      ?? 0,
      rating:   t.chief_rating     ?? 0,
    },
    saved: t.is_saved ?? false,
    media: t.images?.length
      ? t.images.map(img => ({ type: "image", url: absUrl(img.image_url ?? img.url) })).filter(i => i.url)
      : t.cover_image ? [{ type: "image", url: absUrl(t.cover_image) }] : [],
    // members come pre-filtered (approved only) and tiered by the backend
    members: (t.members || []).map(m => ({
      user_id:      m.user_id,
      username:     m.username     || "?",
      first_name:   m.first_name   || "",
      last_name:    m.last_name    || null,
      avatar_url:   m.avatar_url   || null,
      karma_level:  m.karma_level  || "Explorer",
      travel_karma: m.travel_karma ?? 0,
      is_verified:  m.is_verified  ?? false,
      trip_count:   m.trip_count   ?? 0,
      role:         m.role         || "member",
      bio:          m.bio          || null,
      nationality:  m.nationality  || null,
      city:         m.city         || null,
      country:      m.country      || null,
      profile_tier: m.profile_tier || "card",
      approved_at:  m.approved_at  || null,
    })),
    viewer_is_member: t.viewer_is_member ?? false,
    my_status:        t.my_status || "none",
    mapCoords:   t.destination_lat && t.destination_lng
      ? { lat: t.destination_lat, lng: t.destination_lng }
      : null,
  };
}

/* ── small building blocks ──────────────────────────────────── */

function SectionHeading({ children, aside }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <h2 className="m-0 font-display text-[19px] font-semibold text-ink">{children}</h2>
      {aside}
    </div>
  );
}

export default function TripPublicPage() {
  const { tripId }               = useParams();
  const navigate                 = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { requireOnboarding, GateModal } = useOnboardingGate();
  const { unreadCount, resetUnread }   = useNotifications();

  const [trip,      setTrip]      = useState(null);
  const [chiefRating, setChiefRating] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [joinState, setJoinState] = useState("none");
  const [joining,   setJoining]   = useState(false);
  const [activeImg,   setActiveImg]   = useState(0);
  const [saved,       setSaved]       = useState(false);
  const [sharing,     setSharing]     = useState(false);
  const [showNotifs,  setShowNotifs]  = useState(false);
  const [guestDialog, setGuestDialog] = useState({ open: false, reason: "" });
  const [winW,      setWinW]      = useState(typeof window !== "undefined" ? window.innerWidth : 1024);

  const requireAuth = (reason, fn) => {
    if (!user) { setGuestDialog({ open: true, reason }); return; }
    fn();
  };

  useEffect(() => {
    const h = () => setWinW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  // Wait for auth to restore before deciding which endpoint to use
  useEffect(() => {
    if (authLoading || !tripId) return;

    let cancelled = false;
    setLoading(true);

    const fetchTrip = async () => {
      try {
        let data;
        if (user) {
          // Authenticated: gets my_status, chief_trip_count, etc.
          const res = await tripsApi.get(tripId);
          data = res.data;
        } else {
          // Public endpoint no auth required
          const res = await fetch(`${API_BASE}/api/public/trips/${tripId}/`);
          if (!res.ok) throw new Error("not found");
          data = await res.json();
        }
        if (cancelled) return;
        const t = normalise(data);
        setTrip(t);
        setSaved(t.saved);
        setJoinState((() => {
          const s = t.my_status && typeof t.my_status === "object" ? t.my_status.status : t.my_status;
          return s === "approved" ? "approved"
            : s === "awaiting_payment" ? "awaiting_payment"
            : s === "pending" ? "pending"
            : "none";
        })());
        if (t.chief?.id) {
          usersApi.getPublicProfile(t.chief.id)
            .then(({ data: profile }) => { if (!cancelled) setChiefRating(profile.avg_rating ?? null); })
            .catch(() => {});
        }
      } catch {
        if (!cancelled) setTrip(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTrip();
    return () => { cancelled = true; };
  }, [tripId, user, authLoading]);

  const handleJoin = () => {
    if (!user) { setGuestDialog({ open: true, reason: "Send a join request and travel with this group" }); return; }
    requireOnboarding(doJoin);
  };

  const doJoin = async () => {
    if (joinState !== "none" || joining) return;
    setJoining(true);
    try {
      await tripsApi.join(trip.id);
      setJoinState("pending");
    } catch (err) {
      const detail = err?.response?.data?.detail || "";
      if (detail.includes("already a member")) setJoinState("approved");
      else if (detail.includes("already pending")) setJoinState("pending");
    } finally {
      setJoining(false);
    }
  };

  const handleSave = async () => {
    if (!user) { setGuestDialog({ open: true, reason: "Save trips you're interested in" }); return; }
    const next = !saved;
    setSaved(next);
    try {
      if (next) await api.post(`/api/trips/${trip.id}/save/`);
      else      await api.delete(`/api/trips/${trip.id}/save/`);
    } catch {
      setSaved(!next); // revert on failure
    }
  };

  const mobile = winW < 768;

  /* ── loading / not-found ─────────────────────────────────── */
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-ground">
        {user && !mobile && <AppNav />}
        <div className="tt-shell block py-10">
          <div style={{ animation: "ttShimmer 1.4s ease-in-out infinite" }} aria-hidden="true">
            <div className="h-[440px] rounded-3xl bg-line-soft" />
            <div className="mt-8 h-9 w-1/2 rounded-full bg-line-soft" />
            <div className="mt-4 h-4 w-1/3 rounded-full bg-line-soft" />
          </div>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-ground">
        {user && !mobile && <AppNav />}
        <div className="flex flex-col items-center px-6 py-28 text-center">
          <h1 className="font-display text-[26px] font-semibold text-ink">Trip not found</h1>
          <p className="mt-3 max-w-[38ch] text-[15px] leading-relaxed text-ink-soft">
            This trip may have been cancelled, or the link is no longer valid.
          </p>
          <button
            onClick={() => navigate(user ? "/discover" : "/")}
            className="mt-7 cursor-pointer rounded-full border-none bg-accent px-6 py-3 text-[14.5px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
          >
            {user ? "Back to Discover" : "Go to home"}
          </button>
        </div>
      </div>
    );
  }

  const spotsLeft = trip.spotsTotal - trip.spotsFilled;
  const isChief   = user && String(user.id) === String(trip.chief?.id);
  const full      = spotsLeft <= 0;

  /* ── the join / pay control, used in the rail and the mobile bar ── */
  const CTA = (
    <>
      {(isChief || joinState === "approved") && (
        <button
          onClick={() => navigate(`/group-dashboard/${trip.id}`)}
          className="w-full cursor-pointer rounded-full border-none bg-accent py-3.5 text-[15px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
        >
          Open group dashboard
        </button>
      )}
      {!isChief && joinState === "none" && (
        <button
          onClick={handleJoin}
          disabled={joining || full}
          className="w-full cursor-pointer rounded-full border-none bg-accent py-3.5 text-[15px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-line disabled:text-ink-mute"
        >
          {joining ? "Sending…" : full ? "Trip is full" : user ? "Send join request" : "Log in to join"}
        </button>
      )}
      {!isChief && joinState === "pending" && (
        <div className="flex items-center justify-center gap-2 rounded-full border border-sun/40 bg-sun/10 py-3.5 text-[14px] font-semibold text-sun">
          <Clock size={15} /> Waiting for approval
        </div>
      )}
      {!isChief && joinState === "awaiting_payment" && (
        <PayButton tripId={trip.id} amount={trip.entryPrice} onPaid={() => setJoinState("approved")} />
      )}
    </>
  );

  /* ── booking rail ────────────────────────────────────────── */
  const BookingCard = (
    <div className="rounded-3xl border border-line bg-surface p-6">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-display text-[30px] font-semibold leading-none text-ink">
          {formatPrice(trip.entryPrice)}
        </span>
        <span className="text-[12.5px] text-ink-mute">per person</span>
      </div>

      {(trip.price_covers || []).length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {trip.price_covers.map(c => (
            <span
              key={c}
              className="rounded-full bg-accent-soft px-2.5 py-1 text-[11.5px] font-medium text-accent"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {trip.price_note && (
        <p className="mt-3 flex gap-1.5 text-[12px] leading-relaxed text-ink-mute">
          <Info size={12} className="mt-0.5 shrink-0" /> {trip.price_note}
        </p>
      )}

      <div className="my-5 border-t border-line-soft" />

      <div className="flex items-center justify-between text-[13px]">
        <span className="text-ink-soft">Spots</span>
        <span className={`font-semibold ${full ? "text-ink-mute" : spotsLeft <= 2 ? "text-accent" : "text-ink"}`}>
          {full ? "Full" : `${spotsLeft} of ${trip.spotsTotal} left`}
        </span>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {Array.from({ length: trip.spotsTotal }).map((_, i) => (
          <span
            key={i}
            className={`h-2.5 w-2.5 rounded-full ${i < trip.spotsFilled ? "bg-accent" : "bg-line"}`}
          />
        ))}
      </div>

      <div className="mt-6">{CTA}</div>

      <p className="mt-3 text-center text-[12px] text-ink-mute">
        You won't be charged until the organiser approves you.
      </p>
    </div>
  );

  const OrganiserCard = (
    <div className="rounded-3xl border border-line bg-surface p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-mute">
        Trip organiser
      </p>
      <div className="mt-4 flex items-center gap-3">
        <Avatar name={trip.chief?.name} src={trip.chief?.avatarUrl} size={44} />
        <div className="min-w-0">
          <p className="truncate text-[14.5px] font-semibold text-ink">{trip.chief?.name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-ink-mute">
            <Star size={11} className="text-sun" fill="currentColor" />
            {chiefRating ? Number(chiefRating).toFixed(1) : "—"}
            <span aria-hidden="true">·</span>
            {trip.chief?.trips ?? 0} trip{(trip.chief?.trips ?? 0) !== 1 ? "s" : ""} hosted
          </p>
        </div>
      </div>
      {/* No "Ask organiser" button by design. Direct messages are limited to
          people who have both joined and confirmed their spots on the same
          trip, so an organiser and a prospective joiner cannot DM each other —
          keeping the sales conversation, and any pressure or off-platform
          side-deal that comes with it, out of private channels. Trip questions
          belong in the public trip details; the group chat opens once paid. */}
      {user && !isChief && (
        <p className="mt-4 border-t border-line-soft pt-4 text-[12.5px] leading-relaxed text-ink-mute">
          Group chat opens once you've joined and confirmed your spot.
        </p>
      )}
    </div>
  );

  const FACTS = [
    { icon: Calendar,   label: "Dates",         value: `${trip.dateStart}${trip.start_time ? `, ${fmtTime(trip.start_time)}` : ""} – ${trip.dateEnd}` },
    { icon: Navigation, label: "Meeting point", value: trip.meetingPlace || "—" },
    { icon: Car,        label: "Travel time",   value: trip.drive || "—" },
    { icon: Globe,      label: "Distance",      value: trip.distance || "—" },
    { icon: Users,      label: "Group size",    value: `${trip.spotsFilled}/${trip.spotsTotal} joined` },
    { icon: MapPin,     label: "Destination",   value: trip.destination },
  ];

  return (
    <div className="min-h-screen bg-ground font-sans">
      {GateModal}

      {mobile ? (
        <>
          <header className="sticky top-0 z-100 flex items-center justify-between border-b border-line bg-ground/95 px-3.5 py-3 backdrop-blur-md">
            <button
              onClick={() => navigate("/discover")}
              className="flex cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-[14px] text-ink-soft"
            >
              <ArrowLeft size={17} /> Back
            </button>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <NotificationBell
                count={user ? unreadCount : 0}
                onClick={() => requireAuth("See trip updates and notifications", () => setShowNotifs(true))}
              />
            </div>
          </header>
          <NotificationsPanel open={showNotifs} onClose={() => { setShowNotifs(false); resetUnread(); }} />
        </>
      ) : (
        <AppNav />
      )}

      <div className={mobile ? "px-4 pb-32 pt-4" : "tt-shell block pb-24 pt-7"}>
        {!mobile && (
          <button
            onClick={() => navigate("/discover")}
            className="mb-5 flex cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-[13.5px] text-ink-mute transition-colors hover:text-accent"
          >
            <ArrowLeft size={15} /> Back to Discover
          </button>
        )}

        <TripGallery
          media={trip.media}
          title={trip.title}
          activeImg={activeImg}
          setActiveImg={setActiveImg}
          saved={saved}
          onSave={handleSave}
          onShare={() => setSharing(true)}
          onBack={() => navigate("/discover")}
          mobile={mobile}
        />

        {sharing && <ShareToast trip={trip} onClose={() => setSharing(false)} />}

        {/* ── title block ─────────────────────────────────── */}
        <header className="mt-9 max-w-[70ch]">
          <p className="flex items-center gap-2 text-[13px] text-ink-mute">
            <MapPin size={13} className="shrink-0" />
            {trip.destination}
          </p>
          <h1 className="mt-3 font-display text-[clamp(30px,4.2vw,46px)] font-semibold leading-[1.03] text-ink">
            {trip.title}
          </h1>
          {trip.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {trip.tags.map(tag => (
                <span
                  key={tag}
                  className="rounded-full border border-line bg-surface px-3 py-1.5 text-[12.5px] font-medium text-ink-soft"
                >
                  {titleCase(tag)}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* ── body ────────────────────────────────────────── */}
        <div className={mobile ? "mt-8" : "mt-10 flex items-start gap-12"}>
          <div className="min-w-0 flex-1">
            {/* facts as a hairline table, not six little boxes */}
            <dl className="grid grid-cols-2 gap-x-8 border-y border-line lg:grid-cols-3">
              {FACTS.map((f, i) => (
                <div
                  key={f.label}
                  className={`flex flex-col gap-1 py-4 ${i >= 2 ? "border-t border-line-soft lg:border-t-0" : ""} ${i >= 3 ? "lg:border-t lg:border-line-soft" : ""}`}
                >
                  <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-ink-mute">
                    <f.icon size={12} className="shrink-0 text-accent" /> {f.label}
                  </dt>
                  <dd className="m-0 text-[14px] font-medium leading-snug text-ink">{f.value}</dd>
                </div>
              ))}
            </dl>

            {trip.description && (
              <section className="mt-10">
                <SectionHeading>About this trip</SectionHeading>
                <p className="max-w-[68ch] whitespace-pre-line text-[15.5px] leading-[1.8] text-ink-soft">
                  {trip.description}
                </p>
              </section>
            )}

            {(trip.highlights || []).length > 0 && (
              <section className="mt-10">
                <SectionHeading>What's planned</SectionHeading>
                <ul className="m-0 grid list-none gap-x-8 gap-y-0 p-0 sm:grid-cols-2">
                  {trip.highlights.map((h, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 border-b border-line-soft py-3.5 text-[14.5px] leading-relaxed text-ink-soft"
                    >
                      <Check size={15} className="mt-0.5 shrink-0 text-accent" />
                      {h}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="mt-10">
              <WhoIsGoing
                members={trip.members}
                spotsFilled={trip.spotsFilled}
                spotsTotal={trip.spotsTotal}
                viewerIsMember={trip.viewer_is_member}
                tripId={trip.id}
                onMemberClick={!user ? () => setGuestDialog({ open: true, reason: "View member profiles and travel history" }) : undefined}
              />
            </section>

            <section className="mt-10">
              <SectionHeading>Getting there</SectionHeading>
              <MapEmbed trip={trip} height={mobile ? 240 : 360} />
            </section>

            {/* the rail's content, inlined below the fold on mobile */}
            {mobile && (
              <div className="mt-10 flex flex-col gap-4">
                {OrganiserCard}
              </div>
            )}
          </div>

          {!mobile && (
            <aside className="sticky top-24 flex w-[350px] shrink-0 flex-col gap-4">
              {BookingCard}
              {OrganiserCard}
            </aside>
          )}
        </div>
      </div>

      {/* ── mobile: price + action always reachable ──────────── */}
      {mobile && (
        <div className="fixed inset-x-0 bottom-[58px] z-90 border-t border-line bg-ground/95 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="shrink-0">
              <div className="font-display text-[20px] font-semibold leading-none text-ink">
                {formatPrice(trip.entryPrice)}
              </div>
              <div className="mt-1 text-[11.5px] text-ink-mute">
                {full ? "Full" : `${spotsLeft} left`}
              </div>
            </div>
            <div className="min-w-0 flex-1">{CTA}</div>
          </div>
        </div>
      )}

      {mobile && <MobileBottomNav />}

      <GuestDialog
        open={guestDialog.open}
        reason={guestDialog.reason}
        onClose={() => setGuestDialog({ open: false, reason: "" })}
      />
    </div>
  );
}
