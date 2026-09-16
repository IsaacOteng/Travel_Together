import { useState } from "react";
import { Star, Lock, Clock, CheckCircle, BarChart2, X, Plus, Trash2 } from "lucide-react";

export function relativeTime(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function StarRow({ value, onChange, size = 22, disabled }) {
  const [hov, setHov] = useState(0);
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(s => {
        const active = hov ? s <= hov : s <= (value ?? 0);
        return (
          <button key={s} disabled={disabled}
            onMouseEnter={() => !disabled && setHov(s)} onMouseLeave={() => !disabled && setHov(0)}
            onClick={() => !disabled && onChange?.(s)}
            className={`bg-transparent border-none p-0.5 transition-transform ${disabled ? "cursor-not-allowed" : "cursor-pointer hover:scale-110"}`}>
            <Star size={size} className={`transition-colors ${active ? "fill-[var(--tt-accent)] text-accent" : "text-ink-mute"}`} />
          </button>
        );
      })}
    </div>
  );
}

export function PollCard({ poll, isChief, onVote, onLock }) {
  const closed = poll.is_locked || poll.is_expired;
  const total  = poll.total_votes;

  const YesNo = () => {
    const voted = poll.my_vote != null;
    const dis   = voted || closed;
    const myAns = poll.my_vote?.yes_no_value;
    const yesCt = poll.options.find(o => o.text === "Yes")?.vote_count ?? 0;
    const noCt  = poll.options.find(o => o.text === "No")?.vote_count  ?? 0;
    const tot   = yesCt + noCt;
    return (
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          {[["yes","Yes","bg-green-400/15 border-green-400/30 text-green-400"],
            ["no","No","bg-red-400/15 border-red-400/30 text-red-400"]].map(([val,label,ac]) => (
            <button key={val} disabled={dis} onClick={() => !dis && onVote?.({ yes_no_value: val })}
              className={`flex-1 py-2 rounded-xl text-[12px] font-bold border transition-all cursor-pointer
                ${myAns === val ? ac : dis ? "bg-surface-alt border-line text-ink-mute cursor-not-allowed"
                : "bg-surface-alt border-line text-ink-soft hover:bg-surface-alt hover:text-ink"}`}>
              {label}
            </button>
          ))}
        </div>
        {(voted || closed) && tot > 0 && (
          <div className="flex flex-col gap-1.5">
            {[["Yes", yesCt, "bg-green-400"], ["No", noCt, "bg-red-400"]].map(([l, c, col]) => (
              <div key={l} className="flex items-center gap-2">
                <span className="text-[10px] text-ink-mute w-5">{l}</span>
                <div className="flex-1 h-1.5 bg-surface-alt rounded-full overflow-hidden">
                  <div className={`h-full ${col} rounded-full`} style={{ width: `${tot ? Math.round(c/tot*100) : 0}%`, transition: "width .5s" }} />
                </div>
                <span className="text-[10px] font-bold text-ink-soft w-7 text-right">{tot ? Math.round(c/tot*100) : 0}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const MultiChoice = () => {
    const voted = poll.my_vote != null;
    const dis   = voted || closed;
    return (
      <div className="flex flex-col gap-2">
        {poll.options.map(opt => {
          const chosen = poll.my_vote?.option_id === opt.id;
          const pct    = total ? Math.round(opt.vote_count / total * 100) : 0;
          return (
            <button key={opt.id} disabled={dis} onClick={() => !dis && onVote?.({ option_id: opt.id })}
              className={`relative w-full text-left px-3 py-2.5 rounded-xl border text-[12px] font-semibold transition-all overflow-hidden cursor-pointer
                ${chosen ? "border-accent/40 text-accent bg-accent/10"
                : dis ? "border-line text-ink-mute bg-surface-alt cursor-not-allowed"
                : "border-line text-ink-soft bg-surface-alt hover:bg-surface-alt hover:text-ink"}`}>
              {(voted || closed) && total > 0 && (
                <span className={`absolute inset-y-0 left-0 rounded-xl ${chosen ? "bg-accent/10" : "bg-surface-alt"}`}
                  style={{ width: `${pct}%`, transition: "width .5s" }} />
              )}
              <span className="relative flex items-center justify-between">
                <span>{opt.text}</span>
                {(voted || closed) && total > 0 && (
                  <span className={`text-[10px] font-black ${chosen ? "text-accent" : "text-ink-mute"}`}>{pct}%</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  const Rating = () => {
    const voted = poll.my_vote != null;
    const dis   = voted || closed;
    const avg   = total
      ? (poll.options.reduce((s, o, i) => s + (i+1) * o.vote_count, 0) / total).toFixed(1)
      : null;
    return (
      <div className="flex flex-col gap-2">
        <div className="flex justify-center">
          <StarRow value={poll.my_vote?.rating_value ?? 0} onChange={v => !dis && onVote?.({ rating_value: v })} size={26} disabled={dis} />
        </div>
        {(voted || closed) && avg && (
          <p className="text-center text-[11px] text-ink-mute">
            Average: <span className="font-bold text-accent">{avg}</span> / 5
            <span className="text-ink-mute ml-1.5">({total} vote{total !== 1 ? "s" : ""})</span>
          </p>
        )}
      </div>
    );
  };

  return (
    <div className={`rounded-xl border p-4 transition-all ${closed ? "bg-surface-alt border-line" : "bg-surface-alt border-line"}`}>
      <div className="flex items-start gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-ink leading-snug">{poll.question}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10px] text-ink-mute">{poll.created_by_username}</span>
            <span className="text-ink-mute text-[10px]">·</span>
            <span className="text-[10px] text-ink-mute">{relativeTime(poll.created_at)}</span>
            {(poll.time_impact_minutes || poll.budget_impact_ghs) && (
              <>
                <span className="text-ink-mute text-[10px]">·</span>
                <span className="text-[10px] text-amber-400/70 font-semibold">
                  {poll.time_impact_minutes ? `+${poll.time_impact_minutes}min` : ""}
                  {poll.time_impact_minutes && poll.budget_impact_ghs ? " / " : ""}
                  {poll.budget_impact_ghs ? `+GHS ${poll.budget_impact_ghs}` : ""}
                </span>
              </>
            )}
          </div>
        </div>
        {poll.is_locked ? (
          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-ink-mute bg-surface-alt border border-line rounded-full px-2 py-1 flex-shrink-0">
            <Lock size={9} /> Locked
          </span>
        ) : poll.is_expired ? (
          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-400/60 bg-amber-400/10 border border-amber-400/15 rounded-full px-2 py-1 flex-shrink-0">
            <Clock size={9} /> Expired
          </span>
        ) : poll.my_vote != null ? (
          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-green-400/70 bg-green-400/10 border border-green-400/20 rounded-full px-2 py-1 flex-shrink-0">
            <CheckCircle size={9} /> Voted
          </span>
        ) : (
          <span className="text-[9px] font-black uppercase tracking-wider text-accent/70 bg-accent/10 border border-accent/20 rounded-full px-2 py-1 flex-shrink-0">Open</span>
        )}
      </div>

      {poll.poll_type === "yes_no"         && <YesNo />}
      {poll.poll_type === "multiple_choice" && <MultiChoice />}
      {poll.poll_type === "rating"          && <Rating />}

      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-line">
        <span className="text-[10px] text-ink-mute">{total} vote{total !== 1 ? "s" : ""}</span>
        {isChief && !closed && (
          <button onClick={() => onLock?.(poll.id)}
            className="flex items-center gap-1 text-[10px] text-ink-mute hover:text-amber-400 bg-transparent border-none cursor-pointer transition-colors">
            <Lock size={11} /> Lock poll
          </button>
        )}
      </div>
    </div>
  );
}

export function CreatePollModal({ open, onClose, onCreate }) {
  const [question,    setQuestion]    = useState("");
  const [pollType,    setPollType]    = useState("yes_no");
  const [options,     setOptions]     = useState(["", ""]);
  const [expiresHrs,  setExpiresHrs]  = useState("");
  const [timeImpact,  setTimeImpact]  = useState("");
  const [budgetImpact,setBudgetImpact]= useState("");
  const [submitting,  setSubmitting]  = useState(false);

  if (!open) return null;

  const isMulti   = pollType === "multiple_choice";
  const canSubmit = question.trim().length >= 5 && (!isMulti || options.filter(o => o.trim()).length >= 2);

  const TYPES = [
    { value: "yes_no",          label: "Yes / No"  },
    { value: "multiple_choice", label: "Multi Choice" },
    { value: "rating",          label: "Rating (★)" },
  ];

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    const payload = {
      question: question.trim(), poll_type: pollType,
      expires_at: expiresHrs ? new Date(Date.now() + Number(expiresHrs) * 3_600_000).toISOString() : null,
      time_impact_minutes:  timeImpact   ? Number(timeImpact)   : null,
      budget_impact_ghs:    budgetImpact ? Number(budgetImpact) : null,
      ...(isMulti && { options: options.filter(o => o.trim()).map((o, i) => ({ text: o.trim(), order: i })) }),
    };
    try { await onCreate?.(payload); setQuestion(""); setPollType("yes_no"); setOptions(["",""]); setExpiresHrs(""); setTimeImpact(""); setBudgetImpact(""); onClose?.(); }
    finally { setSubmitting(false); }
  }

  return (
    <>
      <div className="fixed inset-0 z-[1800] bg-black/60 backdrop-blur-[3px]" onClick={onClose} />
      <div className="fixed inset-0 z-[1900] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-surface border border-line rounded-3xl w-full max-w-[420px] shadow-[0_20px_60px_rgba(0,0,0,0.5)] pointer-events-auto flex flex-col max-h-[90vh]"
          style={{ animation: "slideUp .22s ease both" }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-line flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-accent/15 border border-accent/25 flex items-center justify-center">
                <BarChart2 size={14} className="text-accent" />
              </div>
              <span className="text-[14px] font-bold text-ink">New Poll</span>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-surface-alt border border-line flex items-center justify-center cursor-pointer text-ink-mute hover:text-ink transition-all"><X size={13} /></button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-bold tracking-[.08em] uppercase text-ink-mute mb-1.5">Question</label>
              <textarea value={question} onChange={e => setQuestion(e.target.value)} rows={2} maxLength={200} placeholder="Ask the group something…"
                className="w-full bg-surface-alt border border-line rounded-xl px-3.5 py-2.5 text-[13px] text-ink placeholder-white/20 resize-none focus:outline-none focus:border-accent/40 transition-colors" />
              <div className="text-right text-[10px] text-ink-mute mt-0.5">{question.length}/200</div>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-[.08em] uppercase text-ink-mute mb-1.5">Poll Type</label>
              <div className="grid grid-cols-3 gap-2">
                {TYPES.map(pt => (
                  <button key={pt.value} onClick={() => setPollType(pt.value)}
                    className={`py-2.5 px-2 rounded-xl border text-[11px] font-bold text-center cursor-pointer transition-all
                      ${pollType === pt.value ? "bg-accent/10 border-accent/35 text-accent" : "bg-surface-alt border-line text-ink-mute hover:text-ink-soft hover:bg-surface-alt"}`}>
                    {pt.label}
                  </button>
                ))}
              </div>
            </div>

            {isMulti && (
              <div>
                <label className="block text-[10px] font-bold tracking-[.08em] uppercase text-ink-mute mb-1.5">Options</label>
                <div className="flex flex-col gap-2">
                  {options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-surface-alt border border-line flex items-center justify-center text-[9px] font-bold text-ink-mute flex-shrink-0">{i+1}</span>
                      <input type="text" value={opt} onChange={e => setOptions(p => p.map((o,idx) => idx===i ? e.target.value : o))}
                        placeholder={`Option ${i+1}`} maxLength={80}
                        className="flex-1 bg-surface-alt border border-line rounded-lg px-3 py-2 text-[12px] text-ink placeholder-white/20 focus:outline-none focus:border-accent/40 transition-colors" />
                      {options.length > 2 && (
                        <button onClick={() => setOptions(p => p.filter((_,idx) => idx !== i))}
                          className="w-6 h-6 flex items-center justify-center bg-transparent border-none cursor-pointer text-ink-mute hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                      )}
                    </div>
                  ))}
                  {options.length < 6 && (
                    <button onClick={() => setOptions(p => [...p, ""])}
                      className="flex items-center gap-1.5 text-[11px] text-ink-mute hover:text-accent bg-transparent border-none cursor-pointer transition-colors mt-1">
                      <Plus size={13} /> Add option
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Expires (hrs)", val: expiresHrs,   set: setExpiresHrs,   unit: "hrs" },
                { label: "Time impact",   val: timeImpact,   set: setTimeImpact,   unit: "min" },
                { label: "Budget impact", val: budgetImpact, set: setBudgetImpact, unit: "GHS" },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-[10px] font-bold tracking-[.08em] uppercase text-ink-mute mb-1.5">{f.label}</label>
                  <div className="relative">
                    <input type="number" min="0" value={f.val} onChange={e => f.set(e.target.value)} placeholder="—"
                      className="w-full bg-surface-alt border border-line rounded-lg px-2.5 py-2 text-[12px] text-ink placeholder-white/20 focus:outline-none focus:border-accent/40 transition-colors" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-ink-mute">{f.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-5 py-4 border-t border-line flex gap-2 flex-shrink-0">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-surface-alt border border-line text-[13px] font-semibold text-ink-soft hover:bg-surface-alt transition-all cursor-pointer">Cancel</button>
            <button onClick={handleSubmit} disabled={!canSubmit || submitting}
              className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all
                ${canSubmit && !submitting ? "bg-accent text-ink hover:bg-accent/90 cursor-pointer shadow-[0_4px_20px_rgba(255,107,53,0.3)]" : "bg-accent/20 text-accent/30 cursor-not-allowed"}`}>
              {submitting ? "Creating…" : "Create Poll"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
