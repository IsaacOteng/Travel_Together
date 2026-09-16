import { Bell } from "lucide-react";

export default function EmptyState({ filtered }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-surface-alt text-ink-mute">
        <Bell size={22} strokeWidth={1.5} />
      </span>
      <div>
        <p className="m-0 font-display text-[17px] font-semibold text-ink">
          {filtered ? "Nothing unread" : "You're all caught up"}
        </p>
        <p className="m-0 mt-1.5 max-w-[30ch] text-[13.5px] leading-relaxed text-ink-soft">
          {filtered
            ? "Everything here has been read."
            : "Join requests, payments and trip updates will show up here."}
        </p>
      </div>
    </div>
  );
}
