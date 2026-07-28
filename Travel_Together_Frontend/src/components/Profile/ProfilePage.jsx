import { useState, useEffect } from "react";
import {
  MapPin, Settings, Edit3, Star,
  CheckCircle, Award, Map, Calendar,
  ArrowLeft, Flag, UserCheck, Clock,
  MessageCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppNav from "../shared/AppNav.jsx";
import MobileBottomNav from "../shared/MobileBottomNav.jsx";
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

const globalStyles = `
  @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
  @keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  ::-webkit-scrollbar{width:4px}
  ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:99px}
`;

const COVER_FALLBACK = {
  backgroundImage:
    "radial-gradient(circle at 18% 40%, rgba(255,107,53,0.55) 0%, transparent 55%)," +
    "radial-gradient(circle at 70% 60%, rgba(74,222,128,0.35) 0%, transparent 55%)," +
    "radial-gradient(circle at 92% 20%, rgba(96,165,250,0.35) 0%, transparent 50%)",
};

export default function ProfilePage({ isOwner = true, userId = null }) {
  const navigate             = useNavigate();
  const { user, updateUser, refreshUser } = useAuth();

  const [winW,       setWinW]       = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  const [editing,    setEditing]    = useState(false);
  const [mobileTab,  setMobileTab]  = useState("profile");
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
  const displayName = profileUser
    ? `${profileUser.first_name || ""} ${profileUser.last_name || ""}`.trim() || profileUser.username || "Traveller"
    : "Traveller";
  const initials    = displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
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
    name:              displayName,
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
    } catch {
      navigate("/chat");
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
  const checkinSub     = checkinRate === null ? "no check-ins recorded" : "on-time arrivals";
  const ratingDisplay  = avgRating  === null ? "—" : dataLoaded ? (avgRating || "—") : "—";
  const ratingSub      = ratingsCount ? `${ratingsCount} rating${ratingsCount !== 1 ? "s" : ""}` : "no ratings yet";

  const reliabilityColor =
    checkinRate === null || checkinRate === 0 ? "rgba(255,255,255,0.3)"
    : checkinRate >= 80 ? "#4ade80"
    : checkinRate >= 50 ? "#fbbf24" : "#fb923c";

  const reliabilityGradient =
    (checkinRate ?? 0) >= 80 ? "linear-gradient(90deg,#4ade80,#22c55e)"
    : (checkinRate ?? 0) >= 50 ? "linear-gradient(90deg,#fbbf24,#f59e0b)"
    : "linear-gradient(90deg,#fb923c,#f97316)";

  const BadgesSection = (
    <Section title="Achievement Badges" icon={Award} iconColor="#fbbf24"
      action={earnedBadges.length > 0
        ? <span className="text-[10px] uppercase tracking-widest text-white/25 whitespace-nowrap">{earnedBadges.length} earned</span>
        : null}>
      {!dataLoaded ? (
        <p className="text-[13px] text-white/25 py-6">Loading…</p>
      ) : badges.length === 0 ? (
        <p className="text-[13px] text-white/25 py-6">
          {effectiveIsOwner ? "Complete trips to earn badges." : "No badges earned yet."}
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-x-2 gap-y-3">
          {badges.filter(b => b.slug !== "social-butterfly" && b.slug !== "scout-master").map(b => (
            <BadgeCard key={b.slug} badge={{ ...b, id: b.slug, desc: b.description }} />
          ))}
        </div>
      )}
    </Section>
  );

  const StatsSection = (
    <Section title="Reliability" icon={CheckCircle} iconColor="#4ade80">
      <div className="flex flex-wrap items-start divide-x divide-white/[0.07] mb-8">
        <StatCard icon={Map}         label="Trips"         value={d(tripsTotal)}  sub={dataLoaded ? `${tripsCompleted} completed` : "—"} color="#FF6B35" />
        <StatCard icon={CheckCircle} label="Check-in Rate" value={checkinDisplay} sub={checkinSub} color="#4ade80" />
        <StatCard icon={Star}        label="Avg Rating"    value={ratingDisplay}  sub={ratingSub}  color="#fbbf24" />
      </div>

      <div className="max-w-[560px]">
        <div className="flex items-baseline justify-between mb-2.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/35">Overall</span>
          <span className="text-[15px] font-black font-serif" style={{ color: reliabilityColor }}>
            {checkinRate === null ? "—" : `${checkinRate}%`}
          </span>
        </div>
        <div className="h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000"
            style={{ width: checkinRate ? `${checkinRate}%` : "0%", background: reliabilityGradient }} />
        </div>
        <div className="flex justify-between mt-2 text-[10.5px] text-white/20">
          <span>{checkinRate === null ? "Check-in data not available" : "Based on itinerary check-ins"}</span>
          {!!checkinRate && checkinRate > 0 && (
            <span className="font-semibold" style={{ color: checkinRate >= 80 ? "rgba(74,222,128,0.7)" : "rgba(251,191,36,0.7)" }}>
              {checkinRate >= 80 ? "Above average ↑" : checkinRate >= 50 ? "On par" : "Below average"}
            </span>
          )}
        </div>
      </div>
    </Section>
  );

  const TripHistorySection = (
    <Section title="Trip History" icon={Calendar} iconColor="#a855f7"
      action={myTrips.length > 0
        ? <span className="text-[10px] uppercase tracking-widest text-white/25 whitespace-nowrap">{myTrips.length} total</span>
        : null}>
      {!dataLoaded ? (
        <p className="text-[13px] text-white/25 py-6">Loading…</p>
      ) : myTrips.length === 0 ? (
        <p className="text-[13px] text-white/25 py-6">No trips yet.</p>
      ) : (
        <>
          {activeTrips.length > 0 && (
            <div className="mb-8">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-3">Active / Upcoming</div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {activeTrips.map(t => <TripCard key={t.id} trip={t} onClick={() => navigate(`/trip/${t.id}`)} />)}
              </div>
            </div>
          )}
          {completedTrips.length > 0 && (
            <>
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-3">Completed</div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {completedTrips.map(t => <TripCard key={t.id} trip={t} onClick={() => navigate(`/trip/${t.id}`)} />)}
              </div>
            </>
          )}
        </>
      )}
    </Section>
  );

  if (!effectiveIsOwner && (loading || notFound)) {
    return (
      <div className="min-h-screen bg-[#071422] font-sans">
        <style>{globalStyles}</style>
        <AppNav />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          {loading
            ? <p className="text-[14px] text-white/30">Loading profile…</p>
            : <>
                <p className="text-[16px] font-bold text-white/50">User not found</p>
                <button onClick={() => navigate(-1)} className="text-[13px] text-[#FF6B35] cursor-pointer bg-transparent border-none flex items-center gap-1.5">
                  <ArrowLeft size={14} /> Go back
                </button>
              </>
          }
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  const Avatar = ({ size }) => (
    <div className="relative shrink-0">
      {profileUser?.avatar_url
        ? <img src={profileUser.avatar_url} alt={displayName}
            className="rounded-full object-cover ring-4 ring-[#071422]"
            style={{ width: size, height: size }} />
        : <div className="bg-linear-to-br from-[#4ade80] to-[#22c55e] rounded-full flex items-center justify-center font-black text-white font-serif ring-4 ring-[#071422]"
            style={{ width: size, height: size, fontSize: size * 0.34 }}>
            {initials}
          </div>
      }
      {verified && (
        <div className="absolute bottom-0.5 right-0.5 bg-[#FF6B35] rounded-full flex items-center justify-center border-2 border-[#071422]"
          style={{ width: size * 0.28, height: size * 0.28 }}>
          <UserCheck size={size * 0.15} className="text-white" />
        </div>
      )}
    </div>
  );

  const MetaLine = ({ compact = false }) => (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-white/40 ${compact ? "text-[12px]" : "text-[12.5px]"}`}>
      <span className="text-white/30">@{profileUser?.username}</span>
      {(profileUser?.city || profileUser?.country) && (
        <span className="flex items-center gap-1.5">
          <MapPin size={11} className="text-[#FF6B35]/70" />
          {profileUser?.city}{profileUser?.country ? `, ${profileUser.country}` : ""}
        </span>
      )}
      {nationality && (
        <span className="flex items-center gap-1.5"><Flag size={11} className="text-white/25" />{nationality}</span>
      )}
      <span className="flex items-center gap-1.5 text-white/25"><Clock size={11} />Joined {joinDate}</span>
    </div>
  );

  const ActionButton = ({ compact = false }) =>
    effectiveIsOwner ? (
      <button onClick={() => setEditing(true)}
        className={`flex items-center gap-1.5 rounded-full bg-white/[0.06] text-white/60 font-semibold cursor-pointer hover:bg-white/[0.12] hover:text-white transition-colors
          ${compact ? "px-3.5 py-2 text-[12px]" : "px-5 py-2.5 text-[12.5px]"}`}>
        <Edit3 size={13} /> Edit Profile
      </button>
    ) : (
      <button onClick={handleMessage} disabled={dmLoading}
        className={`flex items-center gap-1.5 rounded-full bg-[#FF6B35] text-white font-semibold cursor-pointer hover:bg-[#ff7d4d] transition-colors disabled:opacity-50
          ${compact ? "px-3.5 py-2 text-[12px]" : "px-5 py-2.5 text-[12.5px]"}`}>
        <MessageCircle size={13} /> {dmLoading ? "Opening…" : "Message"}
      </button>
    );

  const Cover = ({ height }) => (
    <div className="absolute inset-x-0 top-0 overflow-hidden" style={{ height }}>
      {profileUser?.cover_url
        ? <img src={profileUser.cover_url} alt="" className="w-full h-full object-cover"
            style={{ objectPosition: profileUser.cover_position || "50% 50%" }} />
        : <div className="w-full h-full opacity-70" style={COVER_FALLBACK} />
      }
      <div className="absolute inset-0 bg-linear-to-b from-[#071422]/30 via-[#071422]/70 to-[#071422]" />
    </div>
  );

  const HeroStats = ({ compact = false }) => (
    <div className={`flex flex-wrap items-center gap-y-4 ${compact ? "gap-x-7" : "gap-x-10"}`}>
      {[
        { val: d(tripsTotal),     label: "Trips"       },
        { val: karma,             label: "Karma"       },
        { val: checkinDisplay,    label: "Reliability" },
        { val: d(avgRating ?? 0), label: "Rating"      },
      ].map(s => (
        <div key={s.label} className="flex flex-col">
          <span className={`font-black text-white font-serif leading-none tracking-tight ${compact ? "text-[22px]" : "text-[26px]"}`}>{s.val}</span>
          <span className="text-[9.5px] text-white/30 font-bold uppercase tracking-[0.16em] mt-1.5">{s.label}</span>
        </div>
      ))}
    </div>
  );

  if (mobile) {
    return (
      <div className="min-h-screen bg-[#071422] font-sans pb-[78px]">
        <style>{globalStyles}</style>
        {editing && effectiveIsOwner && (
          <EditModal onClose={() => setEditing(false)} onSave={handleSaveProfile} initialData={editProfile} />
        )}

        <header className="sticky top-0 z-40 h-14 bg-[#071422]/85 backdrop-blur-xl flex items-center px-4 justify-between">
          <button onClick={() => navigate(-1)} className="bg-transparent border-none cursor-pointer text-white/40 flex"><ArrowLeft size={20} /></button>
          <span className="text-[13px] font-bold uppercase tracking-widest text-white/60">Profile</span>
          {effectiveIsOwner
            ? <button onClick={() => navigate("/settings")} className="bg-transparent border-none cursor-pointer text-white/40 flex"><Settings size={18} /></button>
            : <div className="w-[18px]" />
          }
        </header>

        <div className="relative -mt-14">
          <Cover height={200} />
          <div className="relative px-5 pt-[132px]">
            <div className="flex items-end justify-between mb-4">
              <Avatar size={82} />
              <ActionButton compact />
            </div>

            <div className="flex items-center gap-2.5 mb-2 flex-wrap">
              <h1 className="text-[24px] font-bold text-white font-serif tracking-tight leading-none">{displayName}</h1>
              <LevelBadge level={level} />
            </div>
            <MetaLine compact />
            {profileUser?.bio && <p className="text-[13.5px] text-white/55 leading-relaxed mt-3">{profileUser.bio}</p>}

            <div className="mt-6 pt-5 border-t border-white/[0.07]">
              <HeroStats compact />
            </div>
          </div>
        </div>

        <div className="flex gap-6 px-5 mt-7 border-b border-white/[0.07]">
          {[
            { id: "profile", label: "Overview" },
            { id: "badges",  label: "Badges"   },
            { id: "trips",   label: "Trips"    },
          ].map(t => (
            <button key={t.id} onClick={() => setMobileTab(t.id)}
              className={`relative pb-3 bg-transparent border-none text-[12px] font-bold uppercase tracking-widest cursor-pointer transition-colors
                ${mobileTab === t.id ? "text-white" : "text-white/30"}`}>
              {t.label}
              {mobileTab === t.id && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[#FF6B35] rounded-full" />}
            </button>
          ))}
        </div>

        <div className="px-5 pt-7">
          {mobileTab === "profile" && StatsSection}
          {mobileTab === "badges"  && BadgesSection}
          {mobileTab === "trips"   && TripHistorySection}
        </div>

        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#071422] font-sans">
      <style>{globalStyles}</style>
      {editing && effectiveIsOwner && (
        <EditModal onClose={() => setEditing(false)} onSave={handleSaveProfile} initialData={editProfile} />
      )}

      <AppNav rightExtra={
        effectiveIsOwner ? (
          <button onClick={() => navigate("/settings")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] text-white/50 text-[12px] font-semibold cursor-pointer hover:bg-white/[0.12] hover:text-white/80 transition-colors">
            <Settings size={13} /> Settings
          </button>
        ) : null
      } />

      <div className="relative">
        <Cover height={340} />

        <div className="relative max-w-[1080px] mx-auto px-8 pt-[196px] pb-20">
          <div className="flex items-end gap-6">
            <Avatar size={128} />
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-[34px] font-bold text-white font-serif tracking-tight leading-none">{displayName}</h1>
                <LevelBadge level={level} />
              </div>
              <MetaLine />
            </div>
            <div className="pb-2">
              <ActionButton />
            </div>
          </div>

          {profileUser?.bio && (
            <p className="mt-5 max-w-[620px] text-[14px] text-white/55 leading-relaxed">{profileUser.bio}</p>
          )}

          <div className="mt-8 py-6 border-y border-white/[0.07]">
            <HeroStats />
          </div>

          <div className="mt-12 flex flex-col gap-14">
            {StatsSection}
            {BadgesSection}
            {TripHistorySection}
          </div>
        </div>
      </div>
    </div>
  );
}
