import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MapPin, Star, CheckCircle, Award, Users,
  Calendar, ArrowLeft, TrendingUp, Flag,
} from "lucide-react";
import AppNav from "../shared/AppNav.jsx";
import MobileBottomNav from "../shared/MobileBottomNav.jsx";
import { usersApi, chatApi } from "../../services/api.js";

const PANEL_BG = "#09162a";

function Avatar({ name = "", avatarUrl = null, size = 80 }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const [imgErr, setImgErr] = useState(false);
  if (avatarUrl && !imgErr) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        onError={() => setImgErr(true)}
        style={{
          width: size, height: size, borderRadius: "50%",
          objectFit: "cover", flexShrink: 0,
          border: "3px solid rgba(255,255,255,0.1)",
        }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg, #4ade80, #22c55e)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.32, fontWeight: 700, color: "#fff",
      border: "3px solid rgba(255,255,255,0.1)",
    }}>
      {initials}
    </div>
  );
}

function StatBox({ icon: Icon, label, value, color = "#FF6B35" }) {
  return (
    <div style={{
      flex: 1, minWidth: 100,
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 16, padding: "14px 12px",
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: 10,
        background: `${color}18`, border: `1px solid ${color}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={14} color={color} />
      </div>
      <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255,255,255,0.25)" }}>
        {label}
      </div>
    </div>
  );
}

const LEVEL_COLORS = {
  Explorer:  "#4ade80",
  Navigator: "#60a5fa",
  Legend:    "#fbbf24",
};

export default function PublicProfilePage() {
  const { userId }   = useParams();
  const navigate     = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dmLoading, setDmLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    setProfile(null);
    usersApi.getPublicProfile(userId)
      .then(({ data }) => {
        if (cancelled) return;
        setProfile(data);
      })
      .catch(() => { if (!cancelled) setProfile(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  const sendDm = async () => {
    if (!profile?.id || dmLoading) return;
    setDmLoading(true);
    try {
      const { data } = await chatApi.startDM(profile.id);
      navigate("/chat", { state: { conversationId: data.id } });
    } catch {
      navigate("/chat");
    } finally {
      setDmLoading(false);
    }
  };

  const displayName = profile
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.username || "Traveller"
    : "Traveller";

  const levelColor = LEVEL_COLORS[profile?.karma_level] ?? "#FF6B35";
  const joinDate   = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  return (
    <div style={{ minHeight: "100vh", background: PANEL_BG, color: "#fff" }}>
      <AppNav />

      <div style={{ maxWidth: 740, margin: "0 auto", padding: "28px 20px 60px" }}>
        {/* back */}
        <button
          onClick={() => navigate(-1)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "none", border: "none", cursor: "pointer",
            color: "rgba(255,255,255,0.45)", fontSize: 13, marginBottom: 24, padding: 0,
          }}
        >
          <ArrowLeft size={15} /> Back
        </button>

        {loading && (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", paddingTop: 80 }}>
            Loading profile…
          </div>
        )}

        {!loading && !profile && (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", paddingTop: 80 }}>
            User not found.
          </div>
        )}

        {!loading && profile && (
          <>
            {/* Header card */}
            <div style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 24, padding: "28px 28px 24px",
              marginBottom: 20,
            }}>
              <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
                <Avatar name={displayName} avatarUrl={profile.avatar_url} size={80} />

                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#fff" }}>
                      {displayName}
                    </h1>
                    {profile.is_verified_traveller && (
                      <CheckCircle size={16} color="#4ade80" />
                    )}
                  </div>

                  {profile.username && (
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>
                      @{profile.username}
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                    {profile.karma_level && (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "3px 10px", borderRadius: 20,
                        background: `${levelColor}18`, border: `1px solid ${levelColor}30`,
                        fontSize: 11, fontWeight: 700, color: levelColor,
                      }}>
                        <Star size={9} fill={levelColor} color={levelColor} /> {profile.karma_level}
                      </span>
                    )}
                    {(profile.city || profile.country) && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                        <MapPin size={11} /> {[profile.city, profile.country].filter(Boolean).join(", ")}
                      </span>
                    )}
                    {joinDate && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                        <Calendar size={11} /> Joined {joinDate}
                      </span>
                    )}
                  </div>

                  {profile.bio && (
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "rgba(255,255,255,0.5)" }}>
                      {profile.bio}
                    </p>
                  )}
                </div>

                {/* Message button */}
                <button
                  onClick={sendDm}
                  disabled={dmLoading}
                  style={{
                    padding: "9px 20px", borderRadius: 12, cursor: dmLoading ? "not-allowed" : "pointer",
                    background: "rgba(255,107,53,0.15)", border: "1px solid rgba(255,107,53,0.3)",
                    color: "#FF6B35", fontSize: 13, fontWeight: 700, flexShrink: 0,
                    opacity: dmLoading ? 0.6 : 1,
                  }}
                >
                  {dmLoading ? "Opening…" : "Message"}
                </button>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              <StatBox icon={TrendingUp} label="Karma"           value={profile.travel_karma ?? 0}                                color="#FF6B35" />
              <StatBox icon={Users}      label="Trips Hosted"    value={profile.trips_total ?? profile.trips_hosted ?? 0}     color="#4a9a72" />
              <StatBox icon={Flag}       label="Trips Completed" value={profile.trips_completed ?? 0}                         color="#4ade80" />
              {profile.nationality && (
                <StatBox icon={Award} label="Nationality" value={profile.nationality} color="#60a5fa" />
              )}
            </div>

          </>
        )}
      </div>
      <MobileBottomNav />
    </div>
  );
}
