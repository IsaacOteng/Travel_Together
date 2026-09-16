import { fmtDate, fmtTime } from "../../utils/date.js";
import DashEmptyState from "./DashEmptyState.jsx";
import { JoinedRow, SavedRow, CreatedRow } from "./TripRows.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

/* Cover photos come back either absolute or root-relative depending on
   whether media is served from R2 or from Django. */
function coverOf(t) {
  const raw = t.cover_image || t.images?.[0]?.image_url || t.images?.[0]?.url || "";
  if (!raw) return "";
  return raw.startsWith("/") ? `${API_BASE}${raw}` : raw;
}

const when = t => fmtDate(t.date_start) + (t.start_time ? ` · ${fmtTime(t.start_time)}` : "");

function Skeletons({ n = 3 }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: n }).map((_, i) => (
        <div
          key={i}
          className="rounded-3xl border border-line bg-surface p-5"
          style={{ animation: "ttShimmer 1.4s ease-in-out infinite" }}
          aria-hidden="true"
        >
          <div className="flex gap-4">
            <div className="h-20 w-20 shrink-0 rounded-2xl bg-line-soft" />
            <div className="flex-1">
              <div className="h-4 w-1/3 rounded-full bg-line-soft" />
              <div className="mt-3 h-3 w-2/3 rounded-full bg-line-soft" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function JoinedSection({ loading, trips, onNavigate, onViewGroup, onLeave, onBrowse }) {
  if (loading) return <Skeletons />;
  if (!trips.length) {
    return (
      <DashEmptyState
        title="You haven't joined a trip yet"
        body="Find a group heading somewhere you want to go, and send a join request."
        actionLabel="Browse trips"
        onAction={onBrowse}
      />
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {trips.map(t => (
        <JoinedRow
          key={t.id}
          trip={{
            id:         t.id,
            title:      t.title || t.destination,
            img:        coverOf(t),
            date:       when(t),
            joinStatus: t.my_status || "pending",
            tripStatus: t.status    || "published",
            entryPrice: t.entry_price,
            members:    t.member_count ?? 0,
            daysLeft:   t.date_start
                          ? Math.max(0, Math.ceil((new Date(t.date_start) - Date.now()) / 86400000))
                          : null,
            chief:      t.chief_username || "Organiser",
          }}
          onNavigate={onNavigate}
          onViewGroup={onViewGroup}
          onLeave={onLeave}
        />
      ))}
    </div>
  );
}

export function SavedSection({ loading, trips, onNavigate, onUnsave, onBrowse }) {
  if (loading) return <Skeletons n={2} />;
  if (!trips.length) {
    return (
      <DashEmptyState
        title="Nothing saved yet"
        body="Tap the heart on any trip and it'll wait for you here while you decide."
        actionLabel="Browse trips"
        onAction={onBrowse}
      />
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {trips.map(t => (
        <SavedRow
          key={t.id}
          trip={{
            id:      t.id,
            title:   t.title || t.destination,
            img:     coverOf(t),
            date:    when(t),
            members: t.member_count ?? 0,
            spots:   t.spots_left   ?? 0,
            status:  t.status       || "published",
          }}
          onNavigate={onNavigate}
          onUnsave={onUnsave}
        />
      ))}
    </div>
  );
}

export function CreatedSection({ loading, trips, onViewTrip, onManage, onDelete, onCancel, onEndTrip, onCreate }) {
  if (loading) return <Skeletons n={2} />;
  if (!trips.length) {
    return (
      <DashEmptyState
        title="You haven't organised a trip yet"
        body="Set the route, the dates and the price. People request to join, and you approve who comes."
        actionLabel="Create a trip"
        onAction={onCreate}
      />
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {trips.map(t => (
        <CreatedRow
          key={t.id}
          trip={{
            id:         t.id,
            title:      t.title || t.destination,
            img:        coverOf(t),
            date:       when(t),
            status:     t.status,
            members:    t.member_count     ?? 0,
            maxMembers: t.spots_total      ?? 0,
            requests:   t.pending_requests ?? 0,
            actions:    t.my_actions ?? null,
          }}
          onViewTrip={onViewTrip}
          onManage={onManage}
          onDelete={onDelete}
          onCancel={onCancel}
          onEndTrip={onEndTrip}
        />
      ))}
    </div>
  );
}
