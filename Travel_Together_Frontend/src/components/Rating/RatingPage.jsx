import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Star, CheckCircle } from "lucide-react";
import { tripsApi } from "../../services/api.js";
import AppNav from "../shared/AppNav.jsx";
import MobileBottomNav from "../shared/MobileBottomNav.jsx";

const GOLD = "#F5C518";
const GOLD_DIM = "rgba(245,197,24,0.18)";

function StarRow({ value, onChange, size = 30 }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map(n => {
        const active = (hover || value) >= n;
        return (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(n)}
            className="cursor-pointer bg-transparent border-none p-0"
            style={{ lineHeight: 1 }}
          >
            <Star
              size={size}
              fill={active ? GOLD : "transparent"}
              color={active ? GOLD : "rgba(255,255,255,0.12)"}
              style={{ transition: "fill 120ms, color 120ms" }}
            />
          </button>
        );
      })}
    </div>
  );
}

function Avatar({ name, avatarUrl, size = 48 }) {
  const initials = (name || "?")[0].toUpperCase();
  const colors   = ["#4ade80", "#60a5fa", "#a78bfa", "#f472b6", "#34d399", "#818cf8"];
  const bg       = colors[(name?.charCodeAt(0) || 0) % colors.length];
  return avatarUrl
    ? <img src={avatarUrl} alt={name} className="rounded-full object-cover"
        style={{ width: size, height: size }} />
    : <div className="rounded-full flex items-center justify-center font-bold text-white"
        style={{ width: size, height: size, background: bg, fontSize: size * 0.38 }}>
        {initials}
      </div>;
}

export default function RatingPage() {
  const { tripId } = useParams();
  const navigate   = useNavigate();
  const isMobile   = typeof window !== "undefined" && window.innerWidth < 768;

  const [loading,     setLoading]     = useState(true);
  const [tripName,    setTripName]    = useState("");
  const [pending,     setPending]     = useState([]);
  const [ratings,     setRatings]     = useState({});
  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [error,       setError]       = useState("");

  useEffect(() => {
    if (!tripId) return;
    tripsApi.getRatings(tripId)
      .then(({ data }) => {
        if (data.has_rated_all) { setAlreadyDone(true); return; }
        const sorted = [...(data.pending ?? [])].sort((a, b) => {
          if (a.role === "chief" && b.role !== "chief") return -1;
          if (b.role === "chief" && a.role !== "chief") return 1;
          return 0;
        });
        setPending(sorted);
        setRatings(Object.fromEntries(sorted.map(m => [m.user_id, 0])));
        if (data.trip_name) setTripName(data.trip_name);
      })
      .catch(() => setError("Couldn't load rating data."))
      .finally(() => setLoading(false));
  }, [tripId]);

  const ratedCount = pending.filter(m => (ratings[m.user_id] ?? 0) > 0).length;
  const allRated   = pending.length > 0 && ratedCount === pending.length;

  async function handleSubmit() {
    if (!allRated || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await Promise.all(
        pending.map(m =>
          tripsApi.submitRating(tripId, { rated_user: m.user_id, overall: ratings[m.user_id] })
        )
      );
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#071422] flex items-center justify-center">
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid rgba(245,197,24,0.2)", borderTopColor: GOLD, animation: "spin .7s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (alreadyDone || submitted) return (
    <div className="min-h-screen bg-[#071422] flex flex-col">
      {!isMobile && <AppNav />}
      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: GOLD_DIM, border: `1px solid rgba(245,197,24,0.3)` }}>
          <CheckCircle size={30} color={GOLD} />
        </div>
        <div>
          <p className="text-[18px] font-bold text-white mb-1.5">
            {submitted ? "Ratings Submitted" : "Already Rated"}
          </p>
          <p className="text-[12px] text-white/35 leading-relaxed max-w-[260px] mx-auto">
            {submitted
              ? "Your ratings have been recorded and will update your crew's karma scores."
              : "You've already rated everyone on this trip."}
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="px-5 py-2 rounded-xl text-[13px] font-semibold cursor-pointer transition-all"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
        >
          Go Back
        </button>
      </div>
      {isMobile && <MobileBottomNav />}
    </div>
  );

  if (error && !pending.length) return (
    <div className="min-h-screen bg-[#071422] flex flex-col items-center justify-center gap-3">
      <p className="text-white/35 text-[13px]">{error}</p>
      <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-xl bg-white/[0.06] text-white/50 text-[13px] cursor-pointer">Go Back</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#071422] flex flex-col">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
      {!isMobile && <AppNav />}

      <div className="flex-1 flex flex-col max-w-[480px] mx-auto w-full px-5 pt-6 pb-28">
        {/* Back + header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <ChevronLeft size={16} color="rgba(255,255,255,0.4)" />
          </button>
          <div>
            {tripName && <p className="text-[10px] font-semibold tracking-widest uppercase text-white/25 mb-0.5">{tripName}</p>}
            <h1 className="text-[17px] font-bold text-white leading-none">Rate Your Crew</h1>
          </div>
        </div>

        {/* Member list */}
        <div className="flex flex-col gap-3">
          {pending.map((member, i) => {
            const name  = member.first_name
              ? `${member.first_name} ${member.last_name || ""}`.trim()
              : member.username || "Member";
            const stars = ratings[member.user_id] ?? 0;
            const rated = stars > 0;

            return (
              <div
                key={member.user_id}
                className="flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all"
                style={{
                  background: rated ? "rgba(245,197,24,0.04)" : "rgba(255,255,255,0.025)",
                  border: `1px solid ${rated ? "rgba(245,197,24,0.18)" : "rgba(255,255,255,0.06)"}`,
                  animation: `fadeUp .22s ease ${i * 0.05}s both`,
                }}
              >
                <Avatar name={name} avatarUrl={member.avatar_url} size={44} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[13px] font-semibold text-white/90 truncate">{name}</span>
                    {member.role === "chief" && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: "rgba(255,107,53,0.15)", color: "rgba(255,107,53,0.8)", border: "1px solid rgba(255,107,53,0.2)" }}>
                        Chief
                      </span>
                    )}
                  </div>
                  <StarRow value={stars} onChange={v => setRatings(r => ({ ...r, [member.user_id]: v }))} size={22} />
                </div>

                {rated && (
                  <span className="text-[11px] font-bold flex-shrink-0" style={{ color: GOLD }}>{stars}.0</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress */}
        <div className="mt-5 flex items-center gap-3">
          <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pending.length ? (ratedCount / pending.length) * 100 : 0}%`, background: GOLD }}
            />
          </div>
          <span className="text-[10px] flex-shrink-0" style={{ color: "rgba(255,255,255,0.25)" }}>
            {ratedCount}/{pending.length}
          </span>
        </div>

        {error && <p className="text-[11px] text-red-400/70 text-center mt-4">{error}</p>}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!allRated || submitting}
          className="mt-6 w-full py-3 rounded-2xl text-[13px] font-semibold transition-all"
          style={{
            background: allRated && !submitting ? "rgba(245,197,24,0.12)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${allRated && !submitting ? "rgba(245,197,24,0.3)" : "rgba(255,255,255,0.07)"}`,
            color: allRated && !submitting ? GOLD : "rgba(255,255,255,0.2)",
            cursor: allRated && !submitting ? "pointer" : "not-allowed",
          }}
        >
          {submitting ? "Submitting…" : "Submit Ratings"}
        </button>
      </div>

      {isMobile && <MobileBottomNav />}
    </div>
  );
}
