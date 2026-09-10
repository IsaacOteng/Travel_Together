/**
 * `Trip.drive_time` is stored as a slug ("1_2h") because it is a database
 * choice value. It must never reach the screen in that form — the cards were
 * rendering the raw slug, underscore and all.
 *
 * Labels are kept in step with the choices in apps/trips/models.py DriveTime.
 */
const LABELS = {
  under_1h: "Under 1h",
  "1_2h": "1-2h",
  "2_4h": "2-4h",
  "4_6h": "4-6h",
  "6h_plus": "6h+",
};

/** Human-readable travel time, or "" when unset. */
export function formatDriveTime(value) {
  if (!value) return "";
  // Unknown values still get their underscores stripped, so a choice added to
  // the model before this map is updated degrades to "2-8h" rather than "2_8h".
  return LABELS[value] || String(value).replace(/_/g, "-");
}

/** The same options the create-trip form offers, in display order. */
export const DRIVE_TIME_OPTIONS = Object.entries(LABELS).map(([value, label]) => ({
  value,
  label,
}));
