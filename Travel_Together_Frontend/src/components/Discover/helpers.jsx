import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Award, MapPin, X, Users, Lock } from 'lucide-react';
import { AV_COLORS } from './constants.js';

export function Avatar({ name, src, size = 36, className = "" }) {
  const color = AV_COLORS[(name?.charCodeAt(0) || 0) % AV_COLORS.length];
  const initials = name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const fontSize = Math.round(size * 0.34);
  if (src) {
    return (
      <img
        src={src}
        alt={name || "avatar"}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 font-serif ${className}`}
      style={{
        width: size, height: size,
        background: `linear-gradient(135deg,${color},${color}99)`,
        fontSize,
      }}
    >
      {initials}
    </div>
  );
}

export function MemberStack({ members = [], max = 4, total }) {
  // members may be objects {id, name, avatar_url} or plain numbers (legacy mock)
  const shown = members.slice(0, max);
  // `total` lets callers pass the real headcount when `members` is a capped preview
  const extra = (total != null ? total : members.length) - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((m, i) => {
        // Support: {name} (normalised), {first_name,last_name} (detail serializer), {username}, or plain number (mock)
        const name     = typeof m === "object"
          ? (m.name || [m.first_name, m.last_name].filter(Boolean).join(" ") || m.username || "?")
          : String(i);
        const color    = AV_COLORS[(name.charCodeAt(0) || i) % AV_COLORS.length];
        const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
        const avatarUrl = typeof m === "object" ? m.avatar_url : null;
        const shared = {
          style: {
            width: 28, height: 28,
            borderRadius: "50%",
            border: "2px solid #0d1b2a",
            marginLeft: i > 0 ? -8 : 0,
            zIndex: shown.length - i,
            flexShrink: 0,
          },
        };
        const key = typeof m === "object" ? (m.id || m.user_id || i) : i;
        if (avatarUrl) {
          return (
            <img
              key={key}
              src={avatarUrl}
              alt={name}
              {...shared}
              style={{ ...shared.style, objectFit: "cover" }}
            />
          );
        }
        return (
          <div
            key={key}
            {...shared}
            style={{
              ...shared.style,
              background: `linear-gradient(135deg,${color},${color}88)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              fontWeight: 800,
              color: "#fff",
              fontFamily: "serif",
            }}
          >
            {initials}
          </div>
        );
      })}
      {extra > 0 && (
        <div
          style={{
            width: 28, height: 28, borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 800, fontSize: 9,
            marginLeft: -8, zIndex: 0, flexShrink: 0,
          }}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MemberProfileSheet
   Slide-up panel that shows Tier-1 or Tier-2 member data.
   Receives a `member` object shaped by TripMemberCardSerializer
   or TripMemberFullSerializer.
   ───────────────────────────────────────────────────────────── */
export function MemberProfileSheet({ member, onClose }) {
  if (!member) return null;

  const isFull   = member.profile_tier === "full";
  const name     = isFull && member.last_name
    ? `${member.first_name} ${member.last_name}`.trim()
    : member.first_name || member.username || "Member";
  const color    = AV_COLORS[(name.charCodeAt(0) || 0) % AV_COLORS.length];
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";

  const KARMA_COLORS = {
    Explorer:  { bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.3)",  text: "#4ade80"  },
    Navigator: { bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.3)",  text: "#60a5fa"  },
    Legend:    { bg: "rgba(168,85,247,0.12)",  border: "rgba(168,85,247,0.3)",  text: "#a855f7"  },
  };
  const kc = KARMA_COLORS[member.karma_level] || KARMA_COLORS.Explorer;

  const ROLE_LABEL = { chief: "Chief", scout: "Scout", member: "Member" };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "rgba(7,20,34,0.75)", backdropFilter: "blur(12px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        animation: "fadeIn 0.18s ease",
      }}
    >
      <div style={{
        background: "#0d1b2a",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "24px 24px 0 0",
        width: "100%", maxWidth: 480,
        padding: "28px 24px 40px",
        animation: "slideInUp 0.26s ease",
        position: "relative",
      }}>
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16,
            background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "50%",
            width: 30, height: 30, display: "flex", alignItems: "center",
            justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.6)",
          }}
        >
          <X size={15} />
        </button>

        {/* Avatar */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginBottom: 20 }}>
          {member.avatar_url
            ? <img src={member.avatar_url} alt={name}
                style={{ width: 76, height: 76, borderRadius: "50%", objectFit: "cover",
                  border: "3px solid rgba(255,107,53,0.4)" }}
              />
            : <div style={{
                width: 76, height: 76, borderRadius: "50%",
                background: `linear-gradient(135deg,${color},${color}88)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26, fontWeight: 800, color: "#fff", fontFamily: "serif",
                border: "3px solid rgba(255,107,53,0.4)",
              }}>{initials}</div>
          }
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{name}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>@{member.username}</div>
          </div>
        </div>

        {/* Badges row */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 18 }}>
          {/* Karma level */}
          <div style={{
            padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: kc.bg, border: `1px solid ${kc.border}`, color: kc.text,
          }}>
            <Award size={11} style={{ marginRight: 4, verticalAlign: "middle" }} />
            {member.karma_level} · {member.travel_karma} pts
          </div>
          {/* Verified badge */}
          {member.is_verified && (
            <div style={{
              padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.3)", color: "#60a5fa",
            }}>
              <Shield size={10} style={{ marginRight: 4, verticalAlign: "middle" }} />
              Verified Traveller
            </div>
          )}
          {/* Role */}
          <div style={{
            padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: member.role === "chief" ? "rgba(255,107,53,0.15)" : "rgba(255,255,255,0.07)",
            border: member.role === "chief" ? "1px solid rgba(255,107,53,0.35)" : "1px solid rgba(255,255,255,0.1)",
            color: member.role === "chief" ? "#FF6B35" : "rgba(255,255,255,0.55)",
          }}>
            {member.role === "chief" ? "👑 " : ""}{ROLE_LABEL[member.role] || "Member"}
          </div>
        </div>

        {/* Stats row */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 10, marginBottom: 18,
        }}>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "10px 14px" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Trips taken</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#FF6B35" }}>{member.trip_count ?? "—"}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "10px 14px" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Karma</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: kc.text }}>{member.travel_karma ?? "—"}</div>
          </div>
        </div>

        {/* Tier-2: bio + location — only for approved members */}
        {isFull ? (
          <>
            {member.bio && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>About</div>
                <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.65 }}>{member.bio}</p>
              </div>
            )}
            {(member.city || member.country || member.nationality) && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                <MapPin size={12} color="#FF6B35" />
                {[member.city, member.country, member.nationality].filter(Boolean).join(" · ")}
              </div>
            )}
          </>
        ) : (
          /* Pre-join — gated hint */
          <div style={{
            background: "rgba(255,107,53,0.07)", border: "1px solid rgba(255,107,53,0.2)",
            borderRadius: 12, padding: "12px 14px",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <Lock size={14} color="#FF6B35" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#FF6B35", marginBottom: 2 }}>Full profile unlocks after joining</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                Bio, location, and full name are visible to trip members only.
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
        @keyframes slideInUp { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   WhoIsGoing
   Full "Who's going" section used inside trip detail views.
   Props:
     members         — array of TripMemberCard or TripMemberFull objects
     spotsFilled     — number of filled spots
     spotsTotal      — total spots
     viewerIsMember  — boolean from viewer_is_member API field
   ───────────────────────────────────────────────────────────── */
export function WhoIsGoing({ members = [], spotsFilled = 0, spotsTotal = 0, viewerIsMember = false, tripId = null, onMemberClick }) {
  const navigate  = useNavigate();
  const spotsLeft = spotsTotal - spotsFilled;

  const handleMemberClick = (m) => {
    if (onMemberClick) { onMemberClick(m); return; }
    if (!m.user_id) return;
    navigate(`/profile/${m.user_id}`, { state: { memberData: m, tripId } });
  };

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Users size={13} color="#FF6B35" />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#FF6B35", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Who's going
          </span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
            {spotsFilled} of {spotsTotal} ·{" "}
            <span style={{ color: spotsLeft <= 2 ? "#fb923c" : "#4ade80" }}>
              {spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left
            </span>
          </span>
        </div>
        {!viewerIsMember && members.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
            <Lock size={10} />
            Full profiles after joining
          </div>
        )}
      </div>

      {/* Spots progress bar */}
      <div style={{ height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 99, marginBottom: 14, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 99,
          background: spotsLeft <= 2 ? "#fb923c" : "#FF6B35",
          width: `${Math.min((spotsFilled / spotsTotal) * 100, 100)}%`,
          transition: "width 0.7s ease",
        }} />
      </div>

      {/* Member cards horizontal scroll */}
      {members.length === 0 ? (
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", padding: "8px 0" }}>
          No members yet — be the first to join.
        </div>
      ) : (
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}
             className="scrollbar-none">
          {members.map((m, i) => {
            const displayName = viewerIsMember && m.last_name
              ? `${m.first_name} ${m.last_name}`.trim()
              : m.first_name || m.username || "?";
            const color    = AV_COLORS[(displayName.charCodeAt(0) || i) % AV_COLORS.length];
            const initials = displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
            const isChief  = m.role === "chief";

            return (
              <button
                key={m.user_id || i}
                onClick={() => handleMemberClick(m)}
                style={{
                  flexShrink: 0, width: 72,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 14, padding: "12px 6px 10px",
                  cursor: "pointer", textAlign: "center",
                  transition: "all 0.15s ease",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 7,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.border = "1px solid rgba(255,107,53,0.35)";
                  e.currentTarget.style.background = "rgba(255,107,53,0.06)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                }}
              >
                {/* Avatar wrapper — crown sits on top-right as a hat */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  {m.avatar_url
                    ? <img src={m.avatar_url} alt={displayName}
                        style={{
                          width: 42, height: 42, borderRadius: "50%", objectFit: "cover",
                          display: "block",
                          border: `2px solid ${isChief ? "#FF6B35" : "rgba(255,255,255,0.15)"}`,
                        }}
                      />
                    : <div style={{
                        width: 42, height: 42, borderRadius: "50%",
                        background: `linear-gradient(135deg,${color},${color}88)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, fontWeight: 800, color: "#fff", fontFamily: "serif",
                        border: `2px solid ${isChief ? "#FF6B35" : "rgba(255,255,255,0.15)"}`,
                      }}>{initials}</div>
                  }
                  {/* Crown hat — top-right corner, slightly overlapping */}
                  {isChief && (
                    <span style={{
                      position: "absolute", top: -10, right: -6,
                      fontSize: 15, lineHeight: 1, pointerEvents: "none",
                      filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))",
                    }}>👑</span>
                  )}
                  {/* Verified dot — bottom-right */}
                  {m.is_verified && (
                    <div style={{
                      position: "absolute", bottom: -2, right: -2,
                      width: 14, height: 14, borderRadius: "50%",
                      background: "rgba(96,165,250,0.9)", border: "2px solid #0d1b2a",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Shield size={7} color="#fff" />
                    </div>
                  )}
                </div>

                {/* First name only */}
                <div style={{
                  fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.85)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  width: "100%", textAlign: "center",
                }}>
                  {displayName.split(" ")[0]}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}