import { Users } from "lucide-react";
import Avatar from "./Avatar.jsx";
import TypingDots from "./TypingDots.jsx";

export default function ConvRow({ c, isActive, onClick }) {
  const isGroup = c.type === "group";
  return (
    <button
      onClick={onClick}
      className={`relative flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition-colors ${
        isActive ? "bg-accent-soft" : "bg-transparent hover:bg-surface-alt"
      }`}
    >
      {isActive && <span className="absolute inset-y-0 left-0 w-[3px] bg-accent" aria-hidden="true" />}

      {isGroup
        ? <div className="relative h-11 w-11 shrink-0">
            {c.cover
              ? <img src={c.cover} alt="" className="h-11 w-11 rounded-full object-cover" />
              : <div className={`h-11 w-11 ${c.avatar} flex items-center justify-center rounded-full text-[15px] font-semibold text-accent`}>
                  {c.name?.slice(0, 1).toUpperCase()}
                </div>
            }
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-surface">
              <Users size={10} className="text-accent" />
            </span>
          </div>
        : <Avatar name={c.name} colorClass={c.avatar} online={c.online} imgSrc={c.avatarUrl} />
      }

      <span className="min-w-0 flex-1">
        <span className="mb-0.5 flex items-center justify-between gap-2">
          <span className={`truncate text-[14.5px] ${c.unread > 0 ? "font-semibold text-ink" : "font-medium text-ink"}`}>
            {c.name}
          </span>
          <span className={`shrink-0 text-[11.5px] ${c.unread > 0 ? "font-semibold text-accent" : "text-ink-mute"}`}>
            {c.time}
          </span>
        </span>

        <span className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1 truncate text-[13px] text-ink-mute">
            {c.typing
              ? <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-accent">
                  <TypingDots /> typing…
                </span>
              : <>
                  {isGroup && c.previewSender && (
                    <span className="shrink-0 text-ink-mute">{c.previewSender}:</span>
                  )}
                  <span className="truncate">{c.preview}</span>
                </>
            }
          </span>
          {c.unread > 0 && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-ink">
              {c.unread > 9 ? "9+" : c.unread}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}
