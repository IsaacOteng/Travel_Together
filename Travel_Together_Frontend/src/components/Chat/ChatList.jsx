import { useState } from "react";
import { Search, X } from "lucide-react";
import ConvRow from "./ConvRow.jsx";
import { fuzzyMatch } from "./utils.js";

const TABS = [
  { id: "message", label: "All"    },
  { id: "unread",  label: "Unread" },
  { id: "groups",  label: "Groups" },
];

export default function ChatList({ onOpen, activeId, conversations = [] }) {
  const [tab,    setTab]    = useState("message");
  const [search, setSearch] = useState("");

  const shown =
    tab === "groups" ? conversations.filter(c => c.type === "group") :
    tab === "unread" ? conversations.filter(c => c.unread > 0) :
    conversations;

  const filtered = shown.filter(c => fuzzyMatch(c.name, search));
  const unreadTotal = conversations.reduce((n, c) => n + (c.unread || 0), 0);

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-4 pb-3 pt-5">
        <div className="mb-4 flex items-baseline gap-2.5">
          <h1 className="m-0 font-display text-[22px] font-semibold text-ink">Messages</h1>
          {unreadTotal > 0 && (
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[12px] font-semibold text-accent">
              {unreadTotal} new
            </span>
          )}
        </div>

        <div className="relative mb-4">
          <Search size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-mute" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search messages"
            aria-label="Search messages"
            className="w-full rounded-full border border-line bg-surface py-2.5 pl-10 pr-9 text-[13.5px] text-ink outline-none transition-colors placeholder:text-ink-mute focus:border-accent"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-3.5 top-1/2 flex -translate-y-1/2 cursor-pointer items-center border-none bg-transparent p-0 text-ink-mute hover:text-ink"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex gap-2" role="tablist">
          {TABS.map(t => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 cursor-pointer rounded-full border py-2 text-[13px] transition-colors ${
                tab === t.id
                  ? "border-accent bg-accent font-semibold text-accent-ink"
                  : "border-line bg-surface font-medium text-ink-soft hover:border-accent hover:text-accent"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 divide-y divide-line-soft overflow-y-auto border-t border-line">
        {filtered.length === 0
          ? <p className="px-6 py-14 text-center text-[13.5px] leading-relaxed text-ink-mute">
              {search ? "No conversations match that search." : "No conversations yet."}
            </p>
          : filtered.map(c => (
              <ConvRow key={c.id} c={c} isActive={activeId === c.id} onClick={() => onOpen(c)} />
            ))
        }
      </div>
    </div>
  );
}
