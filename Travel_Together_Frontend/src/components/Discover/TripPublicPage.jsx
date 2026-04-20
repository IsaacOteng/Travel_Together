import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MapPin, Navigation, Calendar, Car, Globe, Users,
  Star, Ticket, Info, Map, ArrowLeft, Send, Heart, Share2,
} from "lucide-react";
import MapEmbed from "./MapEmbed.jsx";
import { Avatar, WhoIsGoing } from "./helpers.jsx";
import ShareToast from "./ShareToast.jsx";
import AppNav from "../shared/AppNav.jsx";
import MobileBottomNav from "../shared/MobileBottomNav.jsx";
import GuestDialog from "../shared/GuestDialog.jsx";
import NotificationBell from "../Notifications/NotificationBell.jsx";
import NotificationsPanel from "../Notifications/NotificationsPanel.jsx";
import { useNotifications } from "../../context/NotificationsContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useOnboardingGate } from "../shared/OnboardingGate.jsx";
import { tripsApi, usersApi } from "../../services/api.js";
import api from "../../services/api.js";

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
    drive:       t.drive_time || "",
    distance:    t.distance_km ? `${t.distance_km} km` : "",
    spotsTotal:  t.spots_total  ?? 0,
    spotsFilled: t.spots_filled ?? (t.spots_total || 0) - (t.spots_left || 0),
    description: t.description || "",
    tags:        t.tags || [],
    chief: {
      id:       t.chief_id,
      name:     [t.chief_first_name, t.chief_last_name].filter(Boolean).join(" ") || t.chief_username || "Organiser",
      username: t.chief_username  || "",
      avatarUrl: t.chief_avatar_url ? (t.chief_avatar_url.startsWith("/") ? `${import.meta.env.VITE_API_URL || "http://localhost:8000"}${t.chief_avatar_url}` : t.chief_avatar_url) : null,
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
  const touchX = useRef(null);

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
          // Public endpoint — no auth required
          const res = await fetch(`${API_BASE}/api/public/trips/${tripId}/`);
          if (!res.ok) throw new Error("not found");
          data = await res.json();
        }
        if (cancelled) return;
        const t = normalise(data);
        setTrip(t);
        setSaved(t.saved);
        setJoinState(
          t.my_status === "approved" ? "approved"
          : t.my_status === "pending" ? "pending"
          : "none"
        );
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

  const handleSwipeStart = e => { touchX.current = e.touches[0].clientX; };
  const handleSwipeEnd   = e => {
    if (touchX.current === null || !trip?.media?.length) return;
    const diff = touchX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 45) {
      setActiveImg(a => diff > 0
        ? (a + 1) % trip.media.length
        : (a - 1 + trip.media.length) % trip.media.length);
    }
    touchX.current = null;
  };

  const spotsLeft = trip ? trip.spotsTotal - trip.spotsFilled : 0;
  const mobile    = winW < 768;

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#071422" }}>
        {user && <AppNav />}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 120 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid rgba(255,107,53,0.2)", borderTopColor: "#FF6B35", animation: "spin .7s linear infinite" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div style={{ minHeight: "100vh", background: "#071422", color: "#fff" }}>
        {user && <AppNav />}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 120, gap: 16 }}>
          <div style={{ fontSize: 16, color: "rgba(255,255,255,0.4)" }}>Trip not found or no longer available.</div>
          <button
            onClick={() => navigate(user ? "/discover" : "/")}
            style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "8px 20px", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 13 }}
          >
            {user ? "Back to Discover" : "Go to home"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#071422", color: "#fff", fontFamily: "system-ui, sans-serif", overflowX: "hidden" }}>
      {GateModal}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Navbar */}
      {mobile ? (
        <>
          <header className="sticky top-0 z-[100] bg-[rgba(7,20,34,0.96)] backdrop-blur-xl border-b border-white/[0.06] px-3.5 py-3 flex items-center justify-between">
            <img
              src="/src/assets/official_logo_nobg.png"
              alt="Travel Together"
              style={{ width: 36, height: 36, flexShrink: 0 }}
              onError={e => { e.target.style.display = "none"; }}
            />
            <NotificationBell count={user ? unreadCount : 0} onClick={() => requireAuth("See trip updates and notifications", () => setShowNotifs(true))} />
          </header>
          <NotificationsPanel open={showNotifs} onClose={() => { setShowNotifs(false); resetUnread(); }} />
        </>
      ) : (
        <AppNav />
      )}

      {/* Page content */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: mobile ? "16px 16px 90px" : "24px 24px 80px" }}>

        {/* Hero image carousel with overlay buttons */}
        <div
          style={{ borderRadius: 24, overflow: "hidden", marginBottom: 28, height: mobile ? 260 : 380, position: "relative", background: "#0a1628" }}
          onTouchStart={handleSwipeStart}
          onTouchEnd={handleSwipeEnd}
        >
          {trip.media.length > 0 && (
            <img
              src={trip.media[activeImg]?.url}
              alt={trip.title}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              onError={e => { e.target.style.display = "none"; }}
            />
          )}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(7,20,34,0.8) 0%, transparent 55%)",
          }} />

          {/* Back arrow — top left */}
          <button
            onClick={() => navigate("/discover")}
            style={{
              position: "absolute", top: 16, left: 16,
              width: 38, height: 38, borderRadius: "50%",
              background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#fff",
            }}
          >
            <ArrowLeft size={18} />
          </button>

          {/* Heart + Share — top right */}
          <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 8 }}>
            <button
              onClick={handleSave}
              style={{
                width: 38, height: 38, borderRadius: "50%",
                background: saved ? "#FF6B35" : "rgba(255,255,255,0.15)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#fff", transition: "background 200ms",
              }}
            >
              <Heart size={16} fill={saved ? "#fff" : "none"} />
            </button>
            <button
              onClick={() => setSharing(true)}
              style={{
                width: 38, height: 38, borderRadius: "50%",
                background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#fff",
              }}
            >
              <Share2 size={16} />
            </button>
          </div>

          {/* Dot navigation */}
          {trip.media.length > 1 && (
            <div style={{
              position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
              display: "flex", gap: 6,
            }}>
              {trip.media.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  style={{
                    width: i === activeImg ? 20 : 6, height: 6, borderRadius: 3,
                    background: i === activeImg ? "#FF6B35" : "rgba(255,255,255,0.4)",
                    border: "none", cursor: "pointer", transition: "all 200ms", padding: 0,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {sharing && <ShareToast trip={trip} onClose={() => setSharing(false)} />}

        {/* ── REUSABLE CARD BLOCKS ── */}
        {(() => {
          const PriceCard = (
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Ticket size={13} color="#FF6B35" />
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Entry price</span>
                </div>
                <span style={{ fontSize: 22, fontWeight: 900, lineHeight: 1, color: trip.entryPrice === 0 ? "#4ade80" : "#FF6B35" }}>
                  {trip.entryPrice === 0 ? "Free" : `GH₵${trip.entryPrice}`}
                </span>
              </div>
              {(trip.price_covers || []).length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                  {trip.price_covers.map(c => (
                    <span key={c} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(255,107,53,0.12)", color: "#FF6B35", border: "1px solid rgba(255,107,53,0.2)", fontWeight: 600 }}>{c}</span>
                  ))}
                </div>
              )}
              {trip.price_note && (
                <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.35)", display: "flex", gap: 4, lineHeight: 1.5 }}>
                  <Info size={9} style={{ marginTop: 2, flexShrink: 0 }} /> {trip.price_note}
                </p>
              )}
            </div>
          );

          const OrgCard = (
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 18 }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Trip organiser</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: user ? 12 : 0 }}>
                <Avatar name={trip.chief?.name} src={trip.chief?.avatarUrl} size={40} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{trip.chief?.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                    <Star size={10} color="#fbbf24" fill="#fbbf24" />
                    {chiefRating ? Number(chiefRating).toFixed(1) : "—"}
                    &nbsp;·&nbsp;
                    {trip.chief?.trips ?? 0} trip{(trip.chief?.trips ?? 0) !== 1 ? "s" : ""} hosted
                  </div>
                </div>
              </div>
              {user && String(user.id) !== String(trip.chief?.id) && (
                <button
                  onClick={() => requireOnboarding(async () => {
                    if (!trip.chief?.id) return;
                    try {
                      const { chatApi } = await import("../../services/api.js");
                      const { data } = await chatApi.startDM(trip.chief.id);
                      navigate("/chat", { state: { conversationId: data.id } });
                    } catch { navigate("/chat"); }
                  })}
                  style={{ width: "100%", padding: "8px 0", borderRadius: 10, background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  <Send size={12} /> Ask organiser
                </button>
              )}
            </div>
          );

          const SpotsCard = (
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 18 }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Spots</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                {Array.from({ length: trip.spotsTotal }).map((_, i) => (
                  <div key={i} style={{ width: 18, height: 18, borderRadius: 4, background: i < trip.spotsFilled ? "#FF6B35" : "rgba(255,255,255,0.1)", border: `1px solid ${i < trip.spotsFilled ? "rgba(255,107,53,0.5)" : "rgba(255,255,255,0.08)"}` }} />
                ))}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{trip.spotsFilled} of {trip.spotsTotal} spots filled</div>
            </div>
          );

          const isChief = user && trip && String(user.id) === String(trip.chief?.id);

          const CTA = (
            <>
              {(isChief || joinState === "approved") && (
                <button onClick={() => navigate(`/group-dashboard/${trip.id}`)} style={{ width: "100%", padding: "14px 0", borderRadius: 14, background: "linear-gradient(135deg,#FF6B35,#ff8c5a)", border: "none", cursor: "pointer", color: "#fff", fontSize: 13, fontWeight: 700, boxShadow: "0 4px 18px rgba(255,107,53,0.35)" }}>
                  View Group Dashboard
                </button>
              )}
              {!isChief && joinState === "none" && (
                <button onClick={handleJoin} disabled={joining} style={{ width: "100%", padding: "14px 0", borderRadius: 14, background: "linear-gradient(135deg,#FF6B35,#ff8c5a)", border: "none", cursor: joining ? "not-allowed" : "pointer", color: "#fff", fontSize: 13, fontWeight: 700, boxShadow: "0 4px 18px rgba(255,107,53,0.35)", opacity: joining ? 0.7 : 1 }}>
                  {joining ? "Sending…" : user ? "Send join request" : "Log in to join"}
                </button>
              )}
              {!isChief && joinState === "pending" && (
                <div style={{ padding: "14px 0", borderRadius: 14, textAlign: "center", background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1.5px solid rgba(251,191,36,0.25)", fontSize: 13, fontWeight: 600 }}>⏳ Waiting for approval</div>
              )}
            </>
          );

          const MetaGrid = (
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 8, marginBottom: 22 }}>
              {[
                { icon: MapPin,     label: "Location",      value: trip.destination },
                { icon: Navigation, label: "Meeting point", value: trip.meetingPlace || "—" },
                { icon: Calendar,   label: "Dates",         value: `${trip.dateStart} – ${trip.dateEnd}` },
                { icon: Car,        label: "Travel time",   value: trip.drive || "—" },
                { icon: Globe,      label: "Distance",      value: trip.distance || "—" },
                { icon: Users,      label: "Group size",    value: `${trip.spotsFilled}/${trip.spotsTotal} joined` },
              ].map(m => (
                <div key={m.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                    <m.icon size={10} color="#FF6B35" />
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{m.label}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#fff", fontWeight: 500, lineHeight: 1.3 }}>{m.value}</div>
                </div>
              ))}
            </div>
          );

          /* ── MOBILE: single column ── */
          if (mobile) {
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Title + tags */}
                <div>
                  <h1 style={{ margin: "0 0 10px", fontSize: 24, fontWeight: 300, letterSpacing: "-0.4px", lineHeight: 1.2 }}>{trip.title}</h1>
                  {trip.tags.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {trip.tags.map(tag => (
                        <span key={tag} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* CTA sticky-style at top on mobile */}
                {CTA}

                {/* Price + Organiser side by side on mobile */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {PriceCard}
                  {OrgCard}
                </div>

                {MetaGrid}

                <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.75 }}>{trip.description}</p>

                <WhoIsGoing
                  members={trip.members}
                  spotsFilled={trip.spotsFilled}
                  spotsTotal={trip.spotsTotal}
                  viewerIsMember={trip.viewer_is_member}
                  tripId={trip.id}
                  onMemberClick={!user ? () => setGuestDialog({ open: true, reason: "View member profiles and travel history" }) : undefined}
                />

                {SpotsCard}

                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <Map size={13} color="#FF6B35" />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#FF6B35", textTransform: "uppercase", letterSpacing: "0.08em" }}>Map View</span>
                  </div>
                  <MapEmbed trip={trip} height={200} />
                </div>
              </div>
            );
          }

          /* ── DESKTOP: two columns ── */
          return (
            <div style={{ display: "flex", gap: 28 }}>
              {/* Left */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ margin: "0 0 10px", fontSize: 28, fontWeight: 300, letterSpacing: "-0.5px", lineHeight: 1.2 }}>{trip.title}</h1>
                {trip.tags.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
                    {trip.tags.map(tag => (
                      <span key={tag} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>{tag}</span>
                    ))}
                  </div>
                )}
                {MetaGrid}
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.75, marginBottom: 22 }}>{trip.description}</p>
                <WhoIsGoing
                  members={trip.members}
                  spotsFilled={trip.spotsFilled}
                  spotsTotal={trip.spotsTotal}
                  viewerIsMember={trip.viewer_is_member}
                  tripId={trip.id}
                  onMemberClick={!user ? () => setGuestDialog({ open: true, reason: "View member profiles and travel history" }) : undefined}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <Map size={13} color="#FF6B35" />
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#FF6B35", textTransform: "uppercase", letterSpacing: "0.08em" }}>Map View</span>
                </div>
                <MapEmbed trip={trip} height={220} />
              </div>

              {/* Right */}
              <div style={{ width: 228, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>
                {PriceCard}
                {OrgCard}
                {SpotsCard}
                {CTA}
              </div>
            </div>
          );
        })()}
      </div>

      {mobile && <MobileBottomNav />}

      <GuestDialog
        open={guestDialog.open}
        reason={guestDialog.reason}
        onClose={() => setGuestDialog({ open: false, reason: "" })}
      />
    </div>
  );
}
