import { ArrowRight, Check, X } from "lucide-react";
import { TYPE_CFG, TONE_CLS } from "./constants.js";
import { ago } from "./helpers.js";

export default function NotifItem({ n, onNav, onApprove, onDecline, onMarkRead, onProfile }) {
  const cfg        = TYPE_CFG[n.notification_type] ?? { Icon: TYPE_CFG.trip_reminder.Icon, tone: "plain" };
  const decided    = n.data?.decided;
  const isJoinReq  = n.notification_type === "join_request";
  const isDeclined = n.notification_type === "join_declined";

  /* Join requests are decided inline, so they don't get a navigation action
     as well — two competing primary actions in one row reads as a mistake. */
  const showAction = cfg.action && !(isJoinReq && !decided);

  function renderBody() {
    const body = n.body;
    if (!body || !n.sender_id) return body;
    const candidates = [n.sender_name, n.sender_username].filter(Boolean);
    for (const name of candidates) {
      const idx = body.indexOf(name);
      if (idx !== -1) {
        return (
          <>
            {body.slice(0, idx)}
            <button
              onClick={e => { e.stopPropagation(); onProfile(n.sender_id); }}
              className="cursor-pointer border-none bg-transparent p-0 font-semibold text-accent underline underline-offset-2"
            >
              {name}
            </button>
            {body.slice(idx + name.length)}
          </>
        );
      }
    }
    return body;
  }

  return (
    <div
      onClick={() => { onMarkRead(n.id); onNav(n); }}
      className={`relative flex cursor-pointer gap-3.5 border-b border-line-soft px-5 py-4 transition-colors hover:bg-surface-alt ${
        n.is_read ? "bg-transparent" : "bg-accent-soft/40"
      }`}
    >
      {!n.is_read && (
        <span className="absolute inset-y-3 left-0 w-[3px] rounded-r bg-accent" aria-hidden="true" />
      )}

      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${TONE_CLS[cfg.tone]}`}>
        <cfg.Icon size={16} strokeWidth={1.9} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <span className={`text-[14px] leading-snug ${n.is_read ? "font-medium text-ink-soft" : "font-semibold text-ink"}`}>
            {n.title}
          </span>
          <span className="mt-0.5 shrink-0 text-[11.5px] text-ink-mute">{ago(n.ts)}</span>
        </div>

        <p className="m-0 mt-1 text-[13px] leading-[1.6] text-ink-soft">
          {renderBody()}
        </p>

        {isJoinReq && !decided && (
          <div className="mt-3 flex gap-2" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => onApprove(n)}
              className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full border-none bg-accent py-2 text-[13px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
            >
              <Check size={14} /> Approve
            </button>
            <button
              onClick={() => onDecline(n)}
              className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-line bg-surface py-2 text-[13px] font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent"
            >
              <X size={14} /> Decline
            </button>
          </div>
        )}

        {isJoinReq && decided && (
          <p className={`m-0 mt-2 flex items-center gap-1.5 text-[12.5px] font-semibold ${
            decided === "approved" ? "text-moss" : "text-ink-mute"
          }`}>
            {decided === "approved" ? <><Check size={13} /> Approved</> : <><X size={13} /> Declined</>}
          </p>
        )}

        {isDeclined && (
          <p className="m-0 mt-2 text-[12.5px] font-medium text-ink-mute">
            Request not accepted
          </p>
        )}

        {showAction && (
          <button
            onClick={e => { e.stopPropagation(); onMarkRead(n.id); onNav(n); }}
            className="mt-3 flex cursor-pointer items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[12.5px] font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
          >
            {cfg.action} <ArrowRight size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
