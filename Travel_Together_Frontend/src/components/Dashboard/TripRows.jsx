import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin, Calendar, Users, Star, Clock,
  Heart, X, Trash2, FlagOff, XCircle, LayoutDashboard, LogOut,
} from "lucide-react";
import PayButton from "../Payments/PayButton.jsx";

/* ── shared pieces ──────────────────────────────────────────── */

const ACTION =
  "flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2 text-[12.5px] font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent cursor-pointer disabled:cursor-not-allowed disabled:opacity-50";

const DANGER =
  "flex items-center gap-1.5 rounded-full border border-accent/30 bg-transparent px-3.5 py-2 text-[12.5px] font-medium text-accent transition-colors hover:bg-accent-soft cursor-pointer disabled:cursor-not-allowed disabled:opacity-50";

function Pill({ tone = "neutral", children }) {
  const tones = {
    neutral: "bg-surface-alt text-ink-soft",
    good:    "bg-moss/15 text-moss",
    warn:    "bg-sun/15 text-sun",
    accent:  "bg-accent-soft text-accent",
  };
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

/* Trip thumbnail — the real cover photo where there is one. Takes the
   fallback as an element, not a component, so it needs no local alias. */
function Thumb({ src, fallback = <MapPin size={20} /> }) {
  return src ? (
    <img src={src} alt="" loading="lazy" className="h-[72px] w-[72px] shrink-0 rounded-2xl object-cover sm:h-20 sm:w-20" />
  ) : (
    <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent sm:h-20 sm:w-20">
      {fallback}
    </span>
  );
}

/** Inline "are you sure?" strip shared by the organizer's destructive actions. */
function ConfirmRow({ prompt, confirmLabel, busy, onConfirm, onDismiss }) {
  return (
    <div
      className="flex w-full flex-wrap items-center justify-end gap-2 rounded-2xl border border-accent/30 bg-accent-soft px-3.5 py-2.5"
      onClick={e => e.stopPropagation()}
    >
      <span className="min-w-0 flex-1 text-[12.5px] leading-snug text-accent">{prompt}</span>
      <button onClick={onConfirm} disabled={busy}
        className="shrink-0 cursor-pointer rounded-full border-none bg-accent px-3.5 py-1.5 text-[12.5px] font-semibold text-accent-ink disabled:opacity-50">
        {busy ? "…" : confirmLabel}
      </button>
      <button onClick={e => { e.stopPropagation(); onDismiss(); }}
        className="shrink-0 cursor-pointer rounded-full border border-line bg-surface px-3.5 py-1.5 text-[12.5px] font-medium text-ink-soft">
        No
      </button>
    </div>
  );
}

function RowShell({ children, onClick }) {
  return (
    <article
      onClick={onClick}
      className="cursor-pointer rounded-3xl border border-line bg-surface p-4 transition-colors hover:border-accent/40 sm:p-5"
    >
      {children}
    </article>
  );
}

/* ── joined ─────────────────────────────────────────────────── */

export function JoinedRow({ trip, onNavigate, onViewGroup, onLeave }) {
  const navigate    = useNavigate();
  const [paid, setPaid] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const isCompleted = trip.tripStatus === "completed";
  const approved    = trip.joinStatus === "approved" || paid;
  const awaiting    = !approved && trip.joinStatus === "awaiting_payment";
  const within7     = trip.daysLeft != null && trip.daysLeft < 7;   // refund cutoff

  const doLeave = async (e) => {
    e.stopPropagation();
    if (leaving) return;
    setLeaving(true);
    try { await onLeave?.(trip.id); }
    finally { setLeaving(false); setConfirmLeave(false); }
  };

  return (
    <RowShell onClick={() => onNavigate?.(trip.id)}>
      <div className="flex gap-4">
        <Thumb src={trip.img} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="m-0 truncate font-display text-[17px] font-semibold text-ink">{trip.title}</h3>
            {isCompleted ? <Pill>Completed</Pill> : (
              <Pill tone={approved ? "good" : awaiting ? "warn" : "accent"}>
                {approved ? "Approved" : awaiting ? "Payment due" : "Pending"}
              </Pill>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-ink-mute">
            <span className="flex items-center gap-1.5"><Calendar size={13} />{trip.date}</span>
            <span className="flex items-center gap-1.5"><Users size={13} />{trip.members}</span>
            <span className="truncate">by {trip.chief}</span>
            {!isCompleted && trip.daysLeft !== null && (
              <span className="flex items-center gap-1.5 font-medium text-ink-soft">
                <Clock size={13} />{trip.daysLeft === 0 ? "Today" : `in ${trip.daysLeft} days`}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-line-soft pt-4" onClick={e => e.stopPropagation()}>
        {confirmLeave ? (
          <ConfirmRow
            busy={leaving}
            confirmLabel="Leave trip"
            prompt={within7
              ? "You're within 7 days of departure — leaving now means no refund."
              : "You'll be refunded, minus a small processing fee."}
            onConfirm={doLeave}
            onDismiss={() => setConfirmLeave(false)}
          />
        ) : (
          <>
            {isCompleted && (
              <button onClick={() => navigate(`/trips/${trip.id}/rate`)} className={ACTION}>
                <Star size={13} className="fill-current" /> Rate crew
              </button>
            )}

            {/* Awaiting payment → Pay button (becomes View Group once paid).
                Approved / completed → View Group. Pending → no group access. */}
            {awaiting ? (
              <PayButton compact tripId={trip.id} amount={trip.entryPrice} onPaid={() => setPaid(true)} />
            ) : (approved || isCompleted) ? (
              <button onClick={() => onViewGroup?.(trip.id)} className={ACTION}>
                <LayoutDashboard size={13} /> View group
              </button>
            ) : null}

            {/* Leave group for in-group (approved) members on upcoming trips */}
            {approved && !isCompleted && (
              <button onClick={() => setConfirmLeave(true)} className={DANGER}>
                <LogOut size={13} /> Leave
              </button>
            )}
          </>
        )}
      </div>
    </RowShell>
  );
}

/* ── saved ──────────────────────────────────────────────────── */

export function SavedRow({ trip, onNavigate, onUnsave }) {
  const [removing, setRemoving] = useState(false);
  const isCompleted = trip.status === "completed";

  async function handleUnsave(e) {
    e.stopPropagation();
    if (removing) return;
    setRemoving(true);
    try { await onUnsave?.(trip.id); }
    finally { setRemoving(false); }
  }

  return (
    <RowShell onClick={() => onNavigate?.(trip.id)}>
      <div className="flex gap-4">
        <Thumb src={trip.img} fallback={<Heart size={20} />} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="m-0 truncate font-display text-[17px] font-semibold text-ink">{trip.title}</h3>
            <div className="flex shrink-0 items-center gap-2">
              {isCompleted && <Pill>Completed</Pill>}
              <button
                onClick={handleUnsave}
                disabled={removing}
                title="Remove from saved"
                aria-label="Remove from saved"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink-mute transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
              >
                {removing ? <span className="text-[11px]">…</span> : <X size={14} />}
              </button>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-ink-mute">
            <span className="flex items-center gap-1.5"><Calendar size={13} />{trip.date}</span>
            <span className="flex items-center gap-1.5"><Users size={13} />{trip.members}</span>
            {!isCompleted && (
              <span className={trip.spots <= 3 ? "font-medium text-accent" : ""}>
                {trip.spots} spot{trip.spots !== 1 ? "s" : ""} left
              </span>
            )}
          </div>
        </div>
      </div>
    </RowShell>
  );
}

/* ── created ────────────────────────────────────────────────── */

export function CreatedRow({ trip, onViewTrip, onManage, onDelete, onCancel, onEndTrip }) {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmEnd,    setConfirmEnd]    = useState(false);
  const [busy,          setBusy]          = useState(false);

  // The server decides which exits a trip has — see apps/trips/lifecycle.py.
  // Guessing from `status` here is what put a dead Delete button on active and
  // completed trips. Older payloads without my_actions fall back to hiding the
  // destructive actions rather than offering ones the API would refuse.
  const actions   = trip.actions ?? {};
  const canDelete = actions.delete === true;
  const canCancel = actions.cancel === true;
  const canEnd    = actions.end    === true;
  const cancelIsLate = actions.cancel_late === true;

  const statusMap = {
    active:    { label: "Active",    tone: "accent"  },
    published: { label: "Published", tone: "good"    },
    draft:     { label: "Draft",     tone: "neutral" },
    completed: { label: "Completed", tone: "neutral" },
    cancelled: { label: "Cancelled", tone: "warn"    },
  };
  const s = statusMap[trip.status] || statusMap.draft;

  function run(fn, clear) {
    return async (e) => {
      e.stopPropagation();
      if (busy) return;
      setBusy(true);
      try { await fn?.(trip.id); }
      finally { setBusy(false); clear(false); }
    };
  }

  const handleEnd    = run(onEndTrip, setConfirmEnd);
  const handleCancel = run(onCancel,  setConfirmCancel);
  const handleDelete = run(onDelete,  setConfirmDelete);

  const closeAll = () => { setConfirmEnd(false); setConfirmCancel(false); setConfirmDelete(false); };
  const confirming = confirmEnd || confirmCancel || confirmDelete;

  return (
    <RowShell onClick={() => onViewTrip?.(trip.id)}>
      <div className="flex gap-4">
        <Thumb src={trip.img} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="m-0 truncate font-display text-[17px] font-semibold text-ink">{trip.title}</h3>
            <Pill tone={s.tone}>{s.label}</Pill>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-ink-mute">
            <span className="flex items-center gap-1.5"><Calendar size={13} />{trip.date}</span>
            <span className="flex items-center gap-1.5"><Users size={13} />{trip.members}/{trip.maxMembers}</span>
            {trip.requests > 0 && (
              <span className="font-semibold text-accent">
                {trip.requests} request{trip.requests !== 1 ? "s" : ""} waiting
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-line-soft pt-4" onClick={e => e.stopPropagation()}>
        {confirmEnd && (
          <ConfirmRow prompt="End this trip for everyone?" confirmLabel="Yes, end it"
            busy={busy} onConfirm={handleEnd} onDismiss={() => setConfirmEnd(false)} />
        )}

        {/* Calling the trip off once people have joined: refunds everyone.
            Also the way out of a trip that's under way but has to be abandoned. */}
        {confirmCancel && (
          <ConfirmRow
            busy={busy} confirmLabel="Yes, cancel"
            prompt={cancelIsLate
              ? "Everyone is refunded and told now. This close to departure it costs extra karma and pauses your early payouts."
              : "Cancel this trip and refund everyone?"}
            onConfirm={handleCancel} onDismiss={() => setConfirmCancel(false)} />
        )}

        {confirmDelete && (
          <ConfirmRow prompt="Delete this trip permanently?" confirmLabel="Yes, delete"
            busy={busy} onConfirm={handleDelete} onDismiss={() => setConfirmDelete(false)} />
        )}

        {!confirming && (
          <>
            {trip.status === "completed" && (
              <button onClick={() => navigate(`/trips/${trip.id}/rate`)} className={ACTION}>
                <Star size={13} className="fill-current" /> Rate crew
              </button>
            )}
            <button onClick={() => onManage?.(trip.id)} className={ACTION}>
              <LayoutDashboard size={13} /> Manage
            </button>
            {canEnd && (
              <button onClick={() => { closeAll(); setConfirmEnd(true); }} className={ACTION}>
                <FlagOff size={13} /> End trip
              </button>
            )}
            {canCancel && !canDelete && (
              <button onClick={() => { closeAll(); setConfirmCancel(true); }} className={DANGER}>
                <XCircle size={13} /> Cancel trip
              </button>
            )}
            {/* Only ever offered while the trip is nobody else's business. */}
            {canDelete && (
              <button onClick={() => { closeAll(); setConfirmDelete(true); }} className={DANGER}>
                <Trash2 size={13} /> Delete
              </button>
            )}
          </>
        )}
      </div>
    </RowShell>
  );
}
