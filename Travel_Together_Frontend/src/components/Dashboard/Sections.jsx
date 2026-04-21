import { fmtDate } from "../../utils/date.js";
import SectionHeader from "./SectionHeader.jsx";
import DashEmptyState from "./DashEmptyState.jsx";
import { JoinedRow, SavedRow, CreatedRow } from "./TripRows.jsx";

const PREVIEW_COUNT = 2;

export function JoinedSection({ loading, trips, full, onExpand, onCollapse, onNavigate, onViewGroup }) {
  const items = full ? trips : trips.slice(0, PREVIEW_COUNT);
  const rows = items.map(t => ({
    id:         t.id,
    title:      t.title || t.destination,
    date:       fmtDate(t.date_start),
    joinStatus: t.my_status || "pending",
    tripStatus: t.status    || "published",
    members:    t.member_count ?? 0,
    daysLeft:   t.date_start
                  ? Math.max(0, Math.ceil((new Date(t.date_start) - Date.now()) / 86400000))
                  : null,
    chief:      t.chief_username || "Organiser",
  }));
  return (
    <div>
      <SectionHeader
        title="Trips I've Joined"
        count={trips.length}
        hasMore={trips.length > PREVIEW_COUNT}
        onViewAll={onExpand}
        onBack={onCollapse}
        expanded={full}
      />
      {loading ? (
        <DashEmptyState msg="Loading…"/>
      ) : rows.length === 0 ? (
        <DashEmptyState msg="No joined trips yet"/>
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map(t => (
            <JoinedRow key={t.id} trip={t} onNavigate={onNavigate} onViewGroup={onViewGroup}/>
          ))}
        </div>
      )}
      {!full && trips.length > PREVIEW_COUNT && (
        <div className="mt-2 text-center">
          <span className="text-[11px] text-white/20">+{trips.length - PREVIEW_COUNT} more</span>
        </div>
      )}
    </div>
  );
}

export function SavedSection({ loading, trips, full, onExpand, onCollapse, onNavigate, onUnsave }) {
  const items = full ? trips : trips.slice(0, PREVIEW_COUNT);
  const rows = items.map(t => ({
    id:      t.id,
    title:   t.title || t.destination,
    date:    fmtDate(t.date_start),
    members: t.member_count ?? 0,
    spots:   t.spots_left   ?? 0,
    status:  t.status       || "published",
  }));
  return (
    <div>
      <SectionHeader
        title="Saved Trips"
        count={trips.length}
        hasMore={trips.length > PREVIEW_COUNT}
        onViewAll={onExpand}
        onBack={onCollapse}
        expanded={full}
      />
      {loading ? (
        <DashEmptyState msg="Loading…"/>
      ) : rows.length === 0 ? (
        <DashEmptyState msg="No saved trips yet"/>
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map(t => (
            <SavedRow key={t.id} trip={t} onNavigate={onNavigate} onUnsave={onUnsave}/>
          ))}
        </div>
      )}
      {!full && trips.length > PREVIEW_COUNT && (
        <div className="mt-2 text-center">
          <span className="text-[11px] text-white/20">+{trips.length - PREVIEW_COUNT} more</span>
        </div>
      )}
    </div>
  );
}

export function CreatedSection({ loading, trips, full, onExpand, onCollapse, onViewTrip, onManage, onDelete, onEndTrip }) {
  const items = full ? trips : trips.slice(0, PREVIEW_COUNT);
  const rows = items.map(t => ({
    id:         t.id,
    title:      t.title || t.destination,
    date:       fmtDate(t.date_start),
    status:     t.status,
    members:    t.member_count     ?? 0,
    maxMembers: t.spots_total      ?? 0,
    requests:   t.pending_requests ?? 0,
  }));
  return (
    <div>
      <SectionHeader
        title="Trips I've Created"
        count={trips.length}
        hasMore={trips.length > PREVIEW_COUNT}
        onViewAll={onExpand}
        onBack={onCollapse}
        expanded={full}
      />
      {loading ? (
        <DashEmptyState msg="Loading…"/>
      ) : rows.length === 0 ? (
        <DashEmptyState msg="No trips created yet"/>
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map(t => (
            <CreatedRow
              key={t.id}
              trip={t}
              onViewTrip={onViewTrip}
              onManage={onManage}
              onDelete={onDelete}
              onEndTrip={onEndTrip}
            />
          ))}
        </div>
      )}
      {!full && trips.length > PREVIEW_COUNT && (
        <div className="mt-2 text-center">
          <span className="text-[11px] text-white/20">+{trips.length - PREVIEW_COUNT} more</span>
        </div>
      )}
    </div>
  );
}
