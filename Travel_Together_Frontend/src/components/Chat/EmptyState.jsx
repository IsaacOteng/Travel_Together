import { MessageCircle } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 bg-ground px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full border border-line bg-surface text-ink-mute">
        <MessageCircle size={26} strokeWidth={1.5} />
      </span>
      <div>
        <p className="m-0 font-display text-[19px] font-semibold text-ink">Your messages</p>
        <p className="m-0 mt-2 max-w-[34ch] text-[14px] leading-relaxed text-ink-soft">
          Pick a conversation on the left. Group chats open once you've joined a
          trip and confirmed your spot.
        </p>
      </div>
    </div>
  );
}
