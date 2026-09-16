import { MapPin, CheckCircle, ShieldAlert, ShieldCheck } from "lucide-react";

/* Replaces the old "Group Health" tiles and the "Safety Status" checklist.
   Both had the same flaw: they showed things that never changed. The checklist
   in particular rendered four hardcoded green ticks — GPS tracking, Emergency
   contact, Location sharing, Notifications — regardless of whether any of them
   were actually on, which on a safety product is worse than showing nothing.
   Everything here is derived from real state. */
export default function LiveStatus({
  members, locatedCount, checkedInCount, checkedInStopName, sosAlerts, phase,
}) {
  const total = members.length;
  const alerting = sosAlerts.length > 0;

  const rows = [
    {
      Icon: MapPin,
      label: "Sharing location",
      value: `${locatedCount} of ${total}`,
      tone: locatedCount === 0 ? "mute" : locatedCount < total ? "warn" : "good",
      note: locatedCount < total
        ? `${total - locatedCount} not sharing`
        : "everyone visible on the map",
    },
    {
      Icon: CheckCircle,
      label: "Checked in",
      value: `${checkedInCount} of ${total}`,
      tone: checkedInCount === 0 ? "mute" : checkedInCount < total ? "warn" : "good",
      note: checkedInStopName ? `at ${checkedInStopName}` : "no stop reached yet",
    },
  ];

  const toneCls = {
    good: "text-moss",
    warn: "text-sun",
    mute: "text-ink-mute",
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface">
      {/* the one thing worth shouting about */}
      <div className={`flex items-center gap-3.5 border-b border-line px-5 py-4 ${alerting ? "bg-danger-soft" : ""}`}>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          alerting ? "bg-danger text-white" : "bg-moss/15 text-moss"
        }`}>
          {alerting ? <ShieldAlert size={19} /> : <ShieldCheck size={19} />}
        </span>
        <div className="min-w-0">
          <p className={`m-0 font-display text-[16px] font-semibold ${alerting ? "text-danger" : "text-ink"}`}>
            {alerting
              ? `${sosAlerts.length} active SOS alert${sosAlerts.length > 1 ? "s" : ""}`
              : "No active alerts"}
          </p>
          <p className="m-0 mt-0.5 truncate text-[12.5px] text-ink-mute">
            {alerting
              ? sosAlerts.map(a => a.name).join(", ")
              : phase === "ended"
              ? "This trip has finished"
              : "Everyone is accounted for"}
          </p>
        </div>
      </div>

      {/* live signals only mean something while the trip is running */}
      {phase !== "ended" ? (
        <dl className="m-0 divide-y divide-line-soft">
          {rows.map(r => (
            <div key={r.label} className="flex items-center gap-3.5 px-5 py-3.5">
              <r.Icon size={15} className={`shrink-0 ${toneCls[r.tone]}`} />
              <div className="min-w-0 flex-1">
                <dt className="text-[13.5px] font-medium text-ink">{r.label}</dt>
                <dd className="m-0 mt-0.5 truncate text-[12px] text-ink-mute">{r.note}</dd>
              </div>
              <span className="shrink-0 font-display text-[15px] font-semibold text-ink">
                {r.value}
              </span>
            </div>
          ))}
        </dl>
      ) : (
        <p className="m-0 px-5 py-4 text-[13px] leading-relaxed text-ink-mute">
          Location sharing and check-ins stopped when the trip ended.
        </p>
      )}
    </div>
  );
}
