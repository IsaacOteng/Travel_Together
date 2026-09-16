import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Star, CheckCircle2, Crown } from "lucide-react";
import { tripsApi } from "../../services/api.js";
import AppNav from "../shared/AppNav.jsx";
import MobileBottomNav from "../shared/MobileBottomNav.jsx";
import { displayName } from "../../utils/name.js";

/* What each score means, so five stars isn't a shrug. Shown under the row for
   whichever rating is currently selected. */
const SCALE = {
  1: "Caused problems for the group",
  2: "Hard work to travel with",
  3: "Fine — no complaints",
  4: "Good company, pulled their weight",
  5: "Would travel with them again tomorrow",
};

function StarRow({ value, onChange, name }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div>
      <div className="flex items-center gap-1.5" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? "s" : ""} for ${name}`}
            aria-pressed={value === n}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n)}
            className="cursor-pointer border-none bg-transparent p-0.5 leading-none"
          >
            <Star
              size={26}
              className={shown >= n ? "text-sun" : "text-line"}
              fill={shown >= n ? "currentColor" : "none"}
            />
          </button>
        ))}
      </div>
      <p className="m-0 mt-2 h-[18px] text-[12.5px] text-ink-mute">
        {shown ? SCALE[shown] : "Not rated yet"}
      </p>
    </div>
  );
}

function Avatar({ name, avatarUrl, size = 48 }) {
  const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return avatarUrl
    ? <img src={avatarUrl} alt="" className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }} />
    : <span
        className="flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent"
        style={{ width: size, height: size, fontSize: size * 0.34 }}
      >
        {initials}
      </span>;
}

export default function RatingPage() {
  const { tripId } = useParams();
  const navigate   = useNavigate();

  /* Was read once at render with no listener, so resizing left the page in
     whichever layout it happened to load in. */
  const [winW, setWinW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const h = () => setWinW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  const isMobile = winW < 768;

  const [loading,     setLoading]     = useState(true);
  const [tripName,    setTripName]    = useState("");
  const [pending,     setPending]     = useState([]);
  const [ratings,     setRatings]     = useState({});
  const [saved,       setSaved]       = useState({});   // user_id -> true once accepted
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
      .catch(() => setError("Couldn't load the people on this trip."))
      .finally(() => setLoading(false));
  }, [tripId]);

  const ratedCount = pending.filter(m => (ratings[m.user_id] ?? 0) > 0).length;
  const allRated   = pending.length > 0 && ratedCount === pending.length;

  async function handleSubmit() {
    if (!allRated || submitting) return;
    setSubmitting(true);
    setError("");

    /* Each rating is its own request. The old version fired them with
       Promise.all and reported one generic failure — so a retry re-sent the
       ones that had already been accepted. Successes are remembered here and
       skipped, meaning "try again" only sends what actually failed. */
    const outstanding = pending.filter(m => !saved[m.user_id]);
    const results = await Promise.allSettled(
      outstanding.map(m =>
        tripsApi
          .submitRating(tripId, { rated_user: m.user_id, overall: ratings[m.user_id] })
          .then(() => m.user_id)
      )
    );

    const ok = results.filter(r => r.status === "fulfilled").map(r => r.value);
    if (ok.length) setSaved(s => ({ ...s, ...Object.fromEntries(ok.map(id => [id, true])) }));

    const failed = results.length - ok.length;
    if (failed === 0) {
      setSubmitted(true);
    } else {
      setError(
        failed === results.length
          ? "Couldn't save your ratings. Check your connection and try again."
          : `${failed} rating${failed > 1 ? "s" : ""} didn't save. Try again — the rest are already recorded.`
      );
    }
    setSubmitting(false);
  }

  const shell = (children) => (
    <div className="min-h-screen bg-ground font-sans">
      {!isMobile && <AppNav />}
      {children}
      {isMobile && <MobileBottomNav />}
    </div>
  );

  if (loading) return shell(
    <div className="flex min-h-[60vh] items-center justify-center">
      <span className="h-9 w-9 rounded-full border-[3px] border-line"
        style={{ borderTopColor: "var(--tt-accent)", animation: "ttSpin .7s linear infinite" }} />
    </div>
  );

  if (alreadyDone || submitted) return shell(
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-moss/15 text-moss">
        <CheckCircle2 size={30} strokeWidth={1.7} />
      </span>
      <h1 className="m-0 mt-6 font-display text-[24px] font-semibold text-ink">
        {submitted ? "Thanks — ratings recorded" : "You've already rated this crew"}
      </h1>
      <p className="m-0 mt-3 max-w-[40ch] text-[14.5px] leading-relaxed text-ink-soft">
        {submitted
          ? "These feed into each traveller's karma score, which is what organisers see when deciding who to approve."
          : "Every member of this trip has had your rating."}
      </p>
      <button
        onClick={() => navigate("/dashboard")}
        className="mt-7 cursor-pointer rounded-full border-none bg-accent px-6 py-3 text-[14.5px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
      >
        Back to my trips
      </button>
    </div>
  );

  if (error && !pending.length) return shell(
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="m-0 font-display text-[22px] font-semibold text-ink">Couldn't load this</h1>
      <p className="m-0 mt-2.5 text-[14.5px] text-ink-soft">{error}</p>
      <button
        onClick={() => navigate(-1)}
        className="mt-6 cursor-pointer rounded-full border border-line bg-surface px-5 py-2.5 text-[14px] font-medium text-ink transition-colors hover:border-accent hover:text-accent"
      >
        Go back
      </button>
    </div>
  );

  return shell(
    <div className={isMobile ? "px-4 pb-28 pt-5" : "tt-shell block py-9"}>
      <div className="mx-auto max-w-[620px]">
        <button
          onClick={() => navigate(-1)}
          className="mb-5 flex cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-[13.5px] text-ink-mute transition-colors hover:text-accent"
        >
          <ArrowLeft size={15} /> Back
        </button>

        <header className="mb-8">
          {tripName && (
            <p className="m-0 mb-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-accent">
              {tripName}
            </p>
          )}
          <h1 className="m-0 font-display text-[clamp(26px,3.4vw,34px)] font-semibold leading-tight text-ink">
            How was your crew?
          </h1>
          <p className="m-0 mt-3 max-w-[52ch] text-[15px] leading-relaxed text-ink-soft">
            Your ratings set each person's travel karma — the score organisers
            check before approving someone. They're private: nobody sees who
            gave what.
          </p>
        </header>

        <div className="flex flex-col gap-3">
          {pending.map((member, i) => {
            const name  = displayName(member, "Member");
            const stars = ratings[member.user_id] ?? 0;
            const isSaved = !!saved[member.user_id];
            return (
              <div
                key={member.user_id}
                className={`rounded-3xl border p-5 transition-colors ${
                  stars ? "border-accent/40 bg-surface" : "border-line bg-surface"
                }`}
                style={{ animation: `ttFadeUp .25s ease ${Math.min(i, 8) * 0.04}s both` }}
              >
                <div className="flex items-start gap-4">
                  <Avatar name={name} avatarUrl={member.avatar_url} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[16px] font-semibold text-ink">{name}</span>
                      {member.role === "chief" && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
                          <Crown size={10} /> Organiser
                        </span>
                      )}
                      {isSaved && (
                        <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-moss">
                          <CheckCircle2 size={12} /> Saved
                        </span>
                      )}
                    </div>
                    <div className="mt-3">
                      <StarRow
                        name={name}
                        value={stars}
                        onChange={v => setRatings(r => ({ ...r, [member.user_id]: v }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-7 flex items-center gap-4">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500"
              style={{ width: `${pending.length ? (ratedCount / pending.length) * 100 : 0}%` }}
            />
          </div>
          <span className="shrink-0 text-[13px] tabular-nums text-ink-mute">
            {ratedCount} of {pending.length}
          </span>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-[13.5px] text-accent">
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!allRated || submitting}
          className="mt-6 w-full cursor-pointer rounded-full border-none bg-accent py-3.5 text-[15px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-line disabled:text-ink-mute"
        >
          {submitting ? "Saving…" : allRated ? "Submit ratings" : `Rate everyone to continue (${ratedCount}/${pending.length})`}
        </button>
      </div>
    </div>
  );
}
