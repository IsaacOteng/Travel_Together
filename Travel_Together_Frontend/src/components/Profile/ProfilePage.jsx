import { useState, useEffect } from "react";
import toast from 'react-hot-toast';
import {
  MapPin, Settings, Edit3, Star,
  CheckCircle, Map, Calendar,
  ArrowLeft, Flag, UserCheck, Clock,
  MessageCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppNav from "../shared/AppNav.jsx";
import MobileBottomNav from "../shared/MobileBottomNav.jsx";
import ThemeToggle from "../shared/ThemeToggle.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { usersApi } from "../../services/api.js";
import api from "../../services/api.js";
import { karmaApi, chatApi } from "../../services/api.js";
import LevelBadge from "./LevelBadge.jsx";
import StatCard from "./StatCard.jsx";
import BadgeCard from "./BadgeCard.jsx";
import TripCard from "./TripCard.jsx";
import Section from "./Section.jsx";
import EditModal from "./EditModal.jsx";
import { normaliseTrip } from "./helpers.js";
import { displayName } from "../../utils/name.js";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "badges",   label: "Badges"   },
  { id: "trips",    label: "Trips"    },
];

export default function ProfilePage({ isOwner = true, userId = null }) {
  const navigate             = useNavigate();
  const { user, updateUser, refreshUser } = useAuth();

  const [winW,       setWinW]       = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  const [editing,    setEditing]    = useState(false);
  const [tab,        setTab]        = useState("overview");
  const [publicUser, setPublicUser] = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [notFound,   setNotFound]   = useState(false);
  const [dmLoading,  setDmLoading]  = useState(false);

  const [stats,      setStats]      = useState(null);
  const [badges,     setBadges]     = useState([]);
  const [myTrips,    setMyTrips]    = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  const effectiveIsOwner = isOwner || (!!user?.id && String(user.id) === String(userId));

  const profileUser = effectiveIsOwner ? user : publicUser;
  const name = displayName(profileUser);
  const initials    = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const karma       = profileUser?.travel_karma ?? 0;
  const level       = profileUser?.karma_level  ?? "Explorer";
  const joinDate    = profileUser?.created_at
    ? new Date(profileUser.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "—";
  const verified    = profileUser?.is_verified_traveller ?? false;
  const nationality = profileUser?.nationality ?? "";

  const checkinRate    = effectiveIsOwner ? (stats?.checkin_rate    ?? 0) : (publicUser?.checkin_rate   ?? null);
  const avgRating      = effectiveIsOwner ? (stats?.avg_rating      ?? 0) : (publicUser?.avg_rating     ?? null);
  const tripsTotal     = effectiveIsOwner ? (stats?.trips_total     ?? 0) : (publicUser?.trips_total    ?? publicUser?.trips_hosted ?? 0);
  const tripsCompleted = effectiveIsOwner ? (stats?.trips_completed ?? 0) : (publicUser?.trips_completed ?? 0);
  const ratingsCount   = effectiveIsOwner ? (stats?.ratings_count ?? 0) : (publicUser?.ratings_count ?? 0);

  const d = (v) => dataLoaded ? v : "—";
  const editProfile = {
    name:              name,
    username:          user?.username            || "",
    bio:               user?.bio                 || "",
    city:              user?.city                || "",
    avatarUrl:         user?.avatar_url          || null,
    coverUrl:          user?.cover_url           || null,
    coverPosition:     user?.cover_position      || "50% 50%",
    usernameChangedAt: user?.username_changed_at || null,
    nameChangedAt:     user?.name_changed_at     || null,
  };

  const handleSaveProfile = async (data) => {
    const hasFiles = data.avatarFile || data.coverFile;
    const currentName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
    const nameChanged = data.name && data.name.trim() !== currentName;
    const coverPos = data.coverPosition
      ? `${Math.round(data.coverPosition.x)}% ${Math.round(data.coverPosition.y)}%`
      : undefined;

    if (hasFiles) {
      const fd = new FormData();
      if (data.avatarFile) fd.append("avatar", data.avatarFile);
      if (data.coverFile)  fd.append("cover",  data.coverFile);
      if (data.username && data.username !== user?.username) fd.append("username", data.username);
      if (nameChanged) {
        const [first, ...rest] = data.name.trim().split(" ");
        fd.append("first_name", first);
        fd.append("last_name",  rest.join(" "));
      }
      if (data.bio  !== undefined) fd.append("bio",  data.bio);
      if (data.city !== undefined) fd.append("city", data.city);
      if (coverPos)                fd.append("cover_position", coverPos);
      const { data: updated } = await api.patch("/api/users/me/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      updateUser(updated);
    } else {
      const payload = {};
      if (data.username && data.username !== user?.username) payload.username = data.username;
      if (nameChanged) {
        const [first, ...rest] = data.name.trim().split(" ");
        payload.first_name = first;
        payload.last_name  = rest.join(" ");
      }
      if (data.bio  !== undefined) payload.bio  = data.bio;
      if (data.city !== undefined) payload.city = data.city;
      if (coverPos)                payload.cover_position = coverPos;
      const { data: updated } = await usersApi.updateMe(payload);
      updateUser(updated);
    }
    setEditing(false);
  };

  const handleMessage = async () => {
    if (!publicUser?.id || dmLoading) return;
    setDmLoading(true);
    try {
      const { data } = await chatApi.startDM(publicUser.id);
      navigate("/chat", { state: { conversationId: data.id } });
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Couldn't open that chat.");
    } finally {
      setDmLoading(false);
    }
  };

  const mobile = winW < 1024;

  useEffect(() => {
    const h = () => setWinW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  useEffect(() => {
    if (effectiveIsOwner) refreshUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveIsOwner]);

  useEffect(() => {
    setPublicUser(null);
    setStats(null);
    setBadges([]);
    setMyTrips([]);
    setDataLoaded(false);
    setNotFound(false);

    if (effectiveIsOwner) {
      setLoading(false);
      Promise.all([
        usersApi.getMyStats().catch(() => ({ data: null })),
        karmaApi.getAllBadges().catch(() => ({ data: [] })),
        usersApi.getMyTrips().catch(() => ({ data: { results: [] } })),
      ]).then(([{ data: statsData }, { data: badgesData }, { data: tripsData }]) => {
        if (statsData) setStats(statsData);
        setBadges(Array.isArray(badgesData) ? badgesData : []);
        setMyTrips((tripsData?.results ?? []).map(normaliseTrip));
        setDataLoaded(true);
      });
    } else if (userId) {
      let cancelled = false;
      setLoading(true);
      usersApi.getPublicProfile(userId)
        .then(({ data }) => {
          if (cancelled) return;
          setPublicUser(data);
          if (data.stats)  setStats(data.stats);
          if (data.badges) setBadges(Array.isArray(data.badges) ? data.badges : []);
          if (data.trips)  setMyTrips((data.trips ?? []).map(normaliseTrip));
          setDataLoaded(true);
        })
        .catch(() => { if (!cancelled) setNotFound(true); })
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }
  }, [userId, effectiveIsOwner]);

  const earnedBadges   = badges.filter(b => b.earned);
  const activeTrips    = myTrips.filter(t => t.status === "active" || t.status === "published");
  const completedTrips = myTrips.filter(t => t.status === "completed");

  const checkinDisplay = checkinRate === null ? "—" : dataLoaded ? `${checkinRate}%` : "—";
  const ratingDisplay  = avgRating  === null ? "—" : dataLoaded ? (avgRating || "—") : "—";

  /* ── panels ─────────────────────────────────────────────── */

  const OverviewPanel = (
    <Section title="Reliability">
      {/* The headline figures live once, in the profile card. This panel adds
          what they mean, rather than printing the same three numbers again. */}
      <div className="max-w-[620px]">
        <div className="mb-2.5 flex items-baseline justify-between">
          <span className="text-[13px] text-ink-soft">On-time check-in rate</span>
          <span className="font-display text-[17px] font-semibold text-ink">
            {checkinRate === null ? "—" : `${checkinRate}%`}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-line">
          <div
            className={`h-full rounded-full transition-[width] duration-1000 ${
              (checkinRate ?? 0) >= 80 ? "bg-moss" : (checkinRate ?? 0) >= 50 ? "bg-sun" : "bg-accent"
            }`}
            style={{ width: checkinRate ? `${checkinRate}%` : "0%" }}
          />
        </div>
        <div className="mt-2.5 flex flex-wrap justify-between gap-2 text-[12.5px] text-ink-mute">
          <span>
            {checkinRate === null ? "Check-in data not available" : "Based on itinerary check-ins"}
          </span>
          {!!checkinRate && checkinRate > 0 && (
            <span className="font-medium text-ink-soft">
              {checkinRate >= 80 ? "Above average" : checkinRate >= 50 ? "On par" : "Below average"}
            </span>
          )}
        </div>
      </div>

      <dl className="mt-9 grid gap-6 border-t border-line pt-7 sm:grid-cols-3">
        <StatCard icon={Map}         label="Trips"      value={d(tripsTotal)}
          sub={dataLoaded ? `${tripsCompleted} completed` : "—"} />
        <StatCard icon={CheckCircle} label="Check-ins"  value={checkinDisplay}
          sub={checkinRate === null ? "none recorded" : "on-time arrivals"} />
        <StatCard icon={Star}        label="Avg rating" value={ratingDisplay}
          sub={ratingsCount ? `${ratingsCount} rating${ratingsCount !== 1 ? "s" : ""}` : "no ratings yet"} />
      </dl>
    </Section>
  );

  const BadgesPanel = (
    <Section
      title="Badges"
      action={earnedBadges.length > 0
        ? <span className="text-[13px] text-ink-mute">{earnedBadges.length} earned</span>
        : null}
    >
      {!dataLoaded ? (
        <p className="py-6 text-[14px] text-ink-mute">Loading…</p>
      ) : badges.length === 0 ? (
        <p className="py-6 text-[14px] text-ink-mute">
          {effectiveIsOwner ? "Complete trips to earn badges." : "No badges earned yet."}
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {badges.filter(b => b.slug !== "social-butterfly" && b.slug !== "scout-master").map(b => (
            <BadgeCard key={b.slug} badge={{ ...b, id: b.slug, desc: b.description }} />
          ))}
        </div>
      )}
    </Section>
  );

  const TripsPanel = (
    <Section
      title="Trips"
      action={myTrips.length > 0
        ? <span className="text-[13px] text-ink-mute">{myTrips.length} total</span>
        : null}
    >
      {!dataLoaded ? (
        <p className="py-6 text-[14px] text-ink-mute">Loading…</p>
      ) : myTrips.length === 0 ? (
        <p className="py-6 text-[14px] text-ink-mute">No trips yet.</p>
      ) : (
        <div className="flex flex-col gap-10">
          {activeTrips.length > 0 && (
            <div>
              <h3 className="mb-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-mute">
                Active &amp; upcoming
              </h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {activeTrips.map(t => <TripCard key={t.id} trip={t} onClick={() => navigate(`/trip/${t.id}`)} />)}
              </div>
            </div>
          )}
          {completedTrips.length > 0 && (
            <div>
              <h3 className="mb-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-mute">
                Completed
              </h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {completedTrips.map(t => <TripCard key={t.id} trip={t} onClick={() => navigate(`/trip/${t.id}`)} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </Section>
  );

  /* ── not found / loading ────────────────────────────────── */

  if (!effectiveIsOwner && (loading || notFound)) {
    return (
      <div className="min-h-screen bg-ground font-sans">
        {!mobile && <AppNav />}
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
          {loading
            ? <p className="text-[15px] text-ink-mute">Loading profile…</p>
            : <>
                <p className="m-0 font-display text-[22px] font-semibold text-ink">User not found</p>
                <button onClick={() => navigate(-1)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line bg-surface px-5 py-2.5 text-[14px] font-medium text-ink transition-colors hover:border-accent hover:text-accent">
                  <ArrowLeft size={15} /> Go back
                </button>
              </>
          }
        </div>
        {mobile && <MobileBottomNav />}
      </div>
    );
  }

  /* ── pieces ─────────────────────────────────────────────── */

  const avatarSize = mobile ? 88 : 116;

  const Avatar = (
    <div className="relative shrink-0">
      {profileUser?.avatar_url
        ? <img src={profileUser.avatar_url} alt=""
            className="rounded-full object-cover ring-4 ring-surface"
            style={{ width: avatarSize, height: avatarSize }} />
        : <div className="flex items-center justify-center rounded-full bg-accent-soft font-display font-semibold text-accent ring-4 ring-surface"
            style={{ width: avatarSize, height: avatarSize, fontSize: avatarSize * 0.32 }}>
            {initials}
          </div>
      }
      {verified && (
        <span className="absolute bottom-1 right-1 flex items-center justify-center rounded-full border-2 border-surface bg-accent text-accent-ink"
          style={{ width: avatarSize * 0.28, height: avatarSize * 0.28 }}>
          <UserCheck size={avatarSize * 0.15} />
        </span>
      )}
    </div>
  );

  const actionButton = effectiveIsOwner ? (
    <button onClick={() => setEditing(true)}
      className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 text-[14px] font-medium text-ink transition-colors hover:border-accent hover:text-accent">
      <Edit3 size={14} /> Edit profile
    </button>
  ) : (
    <button onClick={handleMessage} disabled={dmLoading}
      className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full border-none bg-accent px-5 py-2.5 text-[14px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-50">
      <MessageCircle size={14} /> {dmLoading ? "Opening…" : "Message"}
    </button>
  );

  const headlineStats = [
    { val: d(tripsTotal),  label: "Trips"     },
    { val: d(karma),       label: "Karma"     },
    { val: checkinDisplay, label: "Check-ins" },
    { val: ratingDisplay,  label: "Rating"    },
  ];

  /* Identity and figures sit on one card that overlaps the cover, instead of
     floating as light text on a darkened photo. */
  const ProfileCard = (
    <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        {Avatar}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 font-display text-[clamp(24px,3vw,32px)] font-semibold leading-tight text-ink">
              {name}
            </h1>
            <LevelBadge level={level} />
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-ink-mute">
            <span>@{profileUser?.username}</span>
            {(profileUser?.city || profileUser?.country) && (
              <span className="flex items-center gap-1.5">
                <MapPin size={12} className="text-accent" />
                {profileUser?.city}{profileUser?.country ? `, ${profileUser.country}` : ""}
              </span>
            )}
            {nationality && (
              <span className="flex items-center gap-1.5"><Flag size={12} />{nationality}</span>
            )}
            <span className="flex items-center gap-1.5"><Clock size={12} />Joined {joinDate}</span>
          </div>

          {profileUser?.bio && (
            <p className="mt-4 max-w-[62ch] text-[14.5px] leading-relaxed text-ink-soft">
              {profileUser.bio}
            </p>
          )}
        </div>

        <div className="flex gap-2 sm:flex-col sm:items-end">
          {actionButton}
          {effectiveIsOwner && !mobile && (
            <button onClick={() => navigate("/settings")}
              className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 text-[14px] font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent">
              <Settings size={14} /> Settings
            </button>
          )}
        </div>
      </div>

      <dl className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-line sm:grid-cols-4">
        {headlineStats.map(s => (
          <div key={s.label} className="flex flex-col items-center gap-1 bg-surface px-3 py-4">
            <dd className="m-0 font-display text-[24px] font-semibold leading-none text-ink">{s.val}</dd>
            <dt className="text-[11px] uppercase tracking-[0.12em] text-ink-mute">{s.label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );

  const tabs = (
    <div className="scrollbar-none flex gap-2 overflow-x-auto" role="tablist">
      {TABS.map(t => (
        <button
          key={t.id}
          role="tab"
          aria-selected={tab === t.id}
          onClick={() => setTab(t.id)}
          className={`shrink-0 cursor-pointer rounded-full border px-4 py-2.5 text-[14px] transition-colors ${
            tab === t.id
              ? "border-accent bg-accent font-semibold text-accent-ink"
              : "border-line bg-surface font-medium text-ink-soft hover:border-accent hover:text-accent"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  const panel =
    tab === "badges" ? BadgesPanel :
    tab === "trips"  ? TripsPanel  :
    OverviewPanel;

  return (
    <div className="min-h-screen bg-ground font-sans">
      {editing && effectiveIsOwner && (
        <EditModal onClose={() => setEditing(false)} onSave={handleSaveProfile} initialData={editProfile} />
      )}

      {mobile ? (
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-ground/95 px-4 backdrop-blur-md">
          <button onClick={() => navigate(-1)} aria-label="Go back"
            className="flex cursor-pointer border-none bg-transparent text-ink-soft">
            <ArrowLeft size={20} />
          </button>
          <span className="font-display text-[16px] font-semibold text-ink">Profile</span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {effectiveIsOwner && (
              <button onClick={() => navigate("/settings")} aria-label="Settings"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink-mute">
                <Settings size={16} />
              </button>
            )}
          </div>
        </header>
      ) : (
        <AppNav />
      )}

      {/* cover */}
      <div className="relative overflow-hidden bg-surface-alt" style={{ height: mobile ? 210 : 340 }}>
        {profileUser?.cover_url
          ? <img src={profileUser.cover_url} alt=""
              className="h-full w-full object-cover"
              style={{ objectPosition: profileUser.cover_position || "50% 50%" }} />
          : <div className="h-full w-full bg-gradient-to-br from-accent-soft via-surface-alt to-ground" />
        }
      </div>

      {/* relative + z-10: the cover above is positioned, so without its own
          stacking order this column paints underneath it and the negative
          margin hides the card's top edge — name and level badge included. */}
      <div className={`relative z-10 ${mobile ? "px-4 pb-28" : "tt-shell block pb-24"}`}>
        <div className={mobile ? "-mt-10" : "-mt-14"}>
          {ProfileCard}
        </div>

        <div className="mt-8">{tabs}</div>

        <div className="mt-7" style={{ animation: "ttFadeUp .3s ease both" }} key={tab}>
          {panel}
        </div>
      </div>

      {mobile && <MobileBottomNav />}
    </div>
  );
}
