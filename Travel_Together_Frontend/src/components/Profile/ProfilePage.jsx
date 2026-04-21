import { useState, useEffect } from "react";
import {
  MapPin, Settings, Edit3, Star,
  CheckCircle, Award, Map, Calendar, X,
  ArrowLeft, Flag, UserCheck, Clock, TrendingUp,
  MessageCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppNav from "../shared/AppNav.jsx";
import MobileBottomNav from "../shared/MobileBottomNav.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { usersApi } from "../../services/api.js";
import api from "../../services/api.js";
import { karmaApi, tripsApi, chatApi } from "../../services/api.js";
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, effectiveIsOwner]);

  const earnedBadges   = badges.filter(b => b.earned);
  const activeTrips    = myTrips.filter(t => t.status === "active" || t.status === "published");
  const completedTrips = myTrips.filter(t => t.status === "completed");

  const BadgesSection = (
    <Section title="Achievement Badges" icon={Award} iconColor="#fbbf24"
      action={earnedBadges.length > 0 ? <span className="text-[10px] text-white/30">{earnedBadges.length} earned</span> : null}>
      {!dataLoaded ? (
        <p className="text-[13px] text-white/25 text-center py-6">Loading…</p>
      ) : badges.length === 0 ? (
        <p className="text-[13px] text-white/25 text-center py-6">
          {effectiveIsOwner ? "Complete trips to earn badges." : "No badges earned yet."}
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2.5">
          {badges.filter(b => b.slug !== "social-butterfly" && b.slug !== "scout-master").map(b => (
            <BadgeCard key={b.slug} badge={{ ...b, id: b.slug, desc: b.description }} />
          ))}
        </div>
      )}
    </Section>
  );

  const checkinDisplay = checkinRate === null ? "—" : dataLoaded ? `${checkinRate}%` : "—";
  const checkinSub     = checkinRate === null ? "no check-ins recorded" : "on-time arrivals";
  const ratingDisplay  = avgRating  === null ? "—" : dataLoaded ? (avgRating || "—") : "—";
  const ratingSub      = ratingsCount ? `${ratingsCount} rating${ratingsCount !== 1 ? "s" : ""}` : "no ratings yet";

  const StatsSection = (
    <Section title="Reliability Stats" icon={CheckCircle} iconColor="#4ade80">
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard icon={Map}         label="Trips"         value={d(tripsTotal)}   sub={dataLoaded ? `${tripsCompleted} completed` : "—"} color="#FF6B35" />
        <StatCard icon={CheckCircle} label="Check-in Rate" value={checkinDisplay}  sub={checkinSub}  color="#4ade80" />
        <StatCard icon={Star}        label="Avg Rating"    value={ratingDisplay}   sub={ratingSub}   color="#fbbf24" />
      </div>
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12px] font-bold text-white/70">Overall Reliability</span>
          <span className="text-[20px] font-black font-serif"
            style={{ color: checkinRate === null || checkinRate === 0 ? "rgba(255,255,255,0.25)" : checkinRate >= 80 ? "#4ade80" : checkinRate >= 50 ? "#fbbf24" : "#fb923c" }}>
            {checkinRate === null ? "—" : `${checkinRate}%`}
          </span>
        </div>
        <div className="h-3 bg-white/[0.06] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000"
            style={{
              width: checkinRate ? `${checkinRate}%` : "0%",
              background: (checkinRate ?? 0) >= 80
                ? "linear-gradient(90deg,#4ade80,#22c55e)"
                : (checkinRate ?? 0) >= 50
                  ? "linear-gradient(90deg,#fbbf24,#f59e0b)"
                  : "linear-gradient(90deg,#fb923c,#f97316)",
            }} />
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-white/20">
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
    <Section title={`Trip History (${myTrips.length})`} icon={Calendar} iconColor="#a855f7">
      {!dataLoaded ? (
        <p className="text-[13px] text-white/25 text-center py-6">Loading…</p>
      ) : myTrips.length === 0 ? (
        <p className="text-[13px] text-white/25 col-span-full text-center py-6">No trips yet.</p>
      ) : (
        <>
          {activeTrips.length > 0 && (
            <div className="mb-5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2.5">Active / Upcoming</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {activeTrips.map(t => <TripCard key={t.id} trip={t} onClick={() => navigate(`/trip/${t.id}`)} isOwner={effectiveIsOwner} />)}
              </div>
            </div>
          )}
          {completedTrips.length > 0 && (
            <>
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2.5">Completed</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {completedTrips.map(t => <TripCard key={t.id} trip={t} onClick={() => navigate(`/trip/${t.id}`)} isOwner={effectiveIsOwner} />)}
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

  const ProfileMeta = ({ avatarSize = "mobile" }) => (
    <>
      <div className="relative">
        {profileUser?.avatar_url
          ? <img src={profileUser.avatar_url} alt={displayName}
              className={`${avatarSize === "desktop" ? "w-16 h-16" : "w-20 h-20"} rounded-full object-cover ring-4 ring-[#0d1b2a]`} />
          : <div className={`${avatarSize === "desktop" ? "w-16 h-16 text-lg" : "w-20 h-20 text-2xl"} bg-[#4ade80] rounded-full flex items-center justify-center font-black text-white font-serif ring-4 ring-[#0d1b2a]`}>
              {initials}
            </div>
        }
        {verified && (
          <div className={`absolute -bottom-1 -right-1 ${avatarSize === "desktop" ? "w-5 h-5" : "w-6 h-6"} bg-[#FF6B35] rounded-full flex items-center justify-center border-2 border-[#0d1b2a]`}>
            <UserCheck size={avatarSize === "desktop" ? 10 : 12} className="text-white" />
          </div>
        )}
      </div>
    </>
  );

  if (mobile) {
    return (
      <div className="min-h-screen bg-[#071422] font-sans pb-[78px]">
        <style>{globalStyles}</style>
        {editing && effectiveIsOwner && (
          <EditModal onClose={() => setEditing(false)} onSave={handleSaveProfile} initialData={editProfile} />
        )}

        <header className="sticky top-0 z-40 h-14 bg-[#071422]/95 backdrop-blur-xl border-b border-white/[0.06] flex items-center px-4 justify-between">
          <button onClick={() => navigate(-1)} className="bg-transparent border-none cursor-pointer text-white/40 flex"><ArrowLeft size={20} /></button>
          <span className="text-[14px] font-bold text-white">Profile</span>
          {effectiveIsOwner
            ? <button onClick={() => navigate("/settings")} className="bg-transparent border-none cursor-pointer text-white/40 flex"><Settings size={18} /></button>
            : <div className="w-[18px]" />
          }
        </header>

        <div className="p-3.5 flex flex-col gap-3">
          <div className="relative bg-gradient-to-br from-[#0d1b2a] to-[#071422] border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="h-24 relative overflow-hidden">
              {profileUser?.cover_url
                ? <img src={profileUser.cover_url} alt="Cover" className="w-full h-full object-cover"
                    style={{ objectPosition: profileUser.cover_position || "50% 50%" }} />
                : <>
                    <div className="absolute inset-0 bg-linear-to-r from-[#FF6B35]/20 via-[#4ade80]/10 to-[#60a5fa]/10" />
                    <div className="absolute inset-0 opacity-30"
                      style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #FF6B35 0%, transparent 50%), radial-gradient(circle at 80% 50%, #4ade80 0%, transparent 50%)" }} />
                  </>
              }
            </div>
            <div className="px-5 pb-5">
              <div className="relative -mt-10 mb-3 flex items-end justify-between">
                <ProfileMeta avatarSize="mobile" />
                {effectiveIsOwner ? (
                  <button onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/15 bg-white/[0.07] text-white/60 text-[12px] font-semibold cursor-pointer hover:bg-white/15 hover:text-white/90 transition-all">
                    <Edit3 size={13} /> Edit Profile
                  </button>
                ) : (
                  <button onClick={handleMessage} disabled={dmLoading}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#FF6B35]/30 bg-[#FF6B35]/10 text-[#FF6B35] text-[12px] font-semibold cursor-pointer hover:bg-[#FF6B35]/20 transition-all disabled:opacity-50">
                    <MessageCircle size={13} /> {dmLoading ? "Opening…" : "Message"}
                  </button>
                )}
              </div>

              <div className="mb-3">
                <div className="flex items-center gap-2.5 mb-1">
                  <h1 className="text-[20px] font-bold text-white font-serif tracking-tight">{displayName}</h1>
                  <LevelBadge level={level} />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-white/40 mb-1">
                  <span className="text-white/30">@{profileUser?.username}</span>
                  {(profileUser?.city || profileUser?.country) && (
                    <>
                      <span className="text-white/15">·</span>
                      <MapPin size={11} className="text-[#FF6B35]/60" />
                      <span>{profileUser?.city}{profileUser?.country ? `, ${profileUser.country}` : ""}</span>
                    </>
                  )}
                  {nationality && (
                    <>
                      <span className="text-white/15">·</span>
                      <Flag size={11} className="text-white/30" />
                      <span>{nationality}</span>
                    </>
                  )}
                </div>
                {profileUser?.bio && <p className="text-[13px] text-white/55 leading-relaxed">{profileUser.bio}</p>}
              </div>

              <div className="flex gap-3 pt-3 border-t border-white/[0.06] flex-wrap">
                {[
                  { val: d(tripsTotal),     label: "Trips"       },
                  { val: karma,             label: "Karma"       },
                  { val: checkinDisplay,    label: "Reliability" },
                  { val: d(avgRating ?? 0), label: "Rating"      },
                ].map(s => (
                  <div key={s.label} className="flex flex-col items-center min-w-[56px]">
                    <span className="text-[17px] font-black text-white font-serif leading-none">{s.val}</span>
                    <span className="text-[9px] text-white/30 font-medium uppercase tracking-wider mt-0.5">{s.label}</span>
                  </div>
                ))}
                <div className="ml-auto flex items-center gap-1.5 text-[10px] text-white/25">
                  <Clock size={10} />
                  <span>Joined {joinDate}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { id: "profile", label: "Overview" },
              { id: "badges",  label: "Badges"   },
              { id: "trips",   label: "Trips"    },
            ].map(t => (
              <button key={t.id} onClick={() => setMobileTab(t.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-[12px] font-bold border cursor-pointer transition-all
                  ${mobileTab === t.id ? "bg-[#FF6B35] border-[#FF6B35] text-white" : "bg-transparent border-white/20 text-white/50"}`}>
                {t.label}
              </button>
            ))}
          </div>

          {mobileTab === "profile" && <>{StatsSection}</>}
          {mobileTab === "badges"  && <>{BadgesSection}</>}
          {mobileTab === "trips"   && <>{TripHistorySection}</>}
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.05] text-white/50 text-[12px] font-semibold cursor-pointer hover:bg-white/10 transition-colors">
            <Settings size={13} /> Settings
          </button>
        ) : null
      } />

      <div className="max-w-[1200px] mx-auto px-6 py-6 flex gap-6">

        <div className="w-[300px] flex-shrink-0 flex flex-col gap-4 self-start sticky top-[76px]">
          <div className="bg-[#0d1b2a] border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="h-20 relative overflow-hidden">
              {profileUser?.cover_url
                ? <img src={profileUser.cover_url} alt="Cover" className="w-full h-full object-cover"
                    style={{ objectPosition: profileUser.cover_position || "50% 50%" }} />
                : <>
                    <div className="absolute inset-0 bg-linear-to-r from-[#FF6B35]/20 via-[#4ade80]/10 to-[#60a5fa]/10" />
                    <div className="absolute inset-0 opacity-30"
                      style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #FF6B35 0%, transparent 50%), radial-gradient(circle at 80% 50%, #4ade80 0%, transparent 50%)" }} />
                  </>
              }
            </div>
            <div className="px-4 pb-4">
              <div className="relative -mt-8 mb-3 flex items-end justify-between">
                <ProfileMeta avatarSize="desktop" />
                {effectiveIsOwner ? (
                  <button onClick={() => setEditing(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/15 bg-white/[0.07] text-white/50 text-[11px] font-semibold cursor-pointer hover:bg-white/15 transition-all">
                    <Edit3 size={11} /> Edit
                  </button>
                ) : (
                  <button onClick={handleMessage} disabled={dmLoading}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#FF6B35]/30 bg-[#FF6B35]/10 text-[#FF6B35] text-[11px] font-semibold cursor-pointer hover:bg-[#FF6B35]/20 transition-all disabled:opacity-50">
                    <MessageCircle size={11} /> {dmLoading ? "Opening…" : "Message"}
                  </button>
                )}
              </div>
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[15px] font-bold text-white font-serif">{displayName}</span>
                  <LevelBadge level={level} />
                </div>
                <div className="text-[11px] text-white/35 mb-0.5">@{profileUser?.username}</div>
                {(profileUser?.city || profileUser?.country) && (
                  <div className="flex items-center gap-1 text-[11px] text-white/35 mb-0.5">
                    <MapPin size={10} className="text-[#FF6B35]/60" />
                    {profileUser?.city}{profileUser?.country ? `, ${profileUser.country}` : ""}
                  </div>
                )}
                {nationality && (
                  <div className="flex items-center gap-1 text-[11px] text-white/35 mb-2">
                    <Flag size={10} className="text-white/30" />
                    {nationality}
                  </div>
                )}
                {!nationality && (profileUser?.city || profileUser?.country) && <div className="mb-2" />}
                {profileUser?.bio && <p className="text-[12px] text-white/50 leading-relaxed">{profileUser.bio}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/[0.06]">
                {[
                  { val: d(tripsTotal),     label: "Trips"      },
                  { val: karma,             label: "Karma"      },
                  { val: checkinDisplay,    label: "Reliability"},
                  { val: d(avgRating ?? 0), label: "Avg Rating" },
                ].map(s => (
                  <div key={s.label} className="text-center py-1.5 bg-white/[0.03] rounded-xl">
                    <div className="text-[16px] font-black text-white font-serif leading-none">{s.val}</div>
                    <div className="text-[9px] text-white/25 uppercase tracking-wider mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-5">
          {StatsSection}
          {BadgesSection}
          {TripHistorySection}
        </div>

      </div>
    </div>
  );
}
