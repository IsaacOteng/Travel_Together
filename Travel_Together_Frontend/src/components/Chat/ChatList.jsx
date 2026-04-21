import { useState } from "react";
import { Search } from "lucide-react";
import ConvRow from "./ConvRow.jsx";
import { fuzzyMatch } from "./utils.js";

export default function ChatList({ onOpen, activeId, conversations = [] }) {
  const [tab,    setTab]    = useState("message");
  const [search, setSearch] = useState("");

  const shown =
    tab === "groups" ? conversations.filter(c => c.type === "group") :
    tab === "unread" ? conversations.filter(c => c.unread > 0) :
    conversations;

  const filtered = shown.filter(c => fuzzyMatch(c.name, search));

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-5 pb-3 flex-shrink-0">
        <h1 className="text-xl font-light text-white font-serif tracking-tight mb-4">Messages</h1>

        <div className="relative mb-4">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search messages"
            className="w-full bg-white/[0.06] border border-white/[0.08] rounded-2xl py-2.5 pl-9 pr-4 text-[13px] text-white placeholder-white/30 outline-none focus:border-[#FF6B35]/40 transition-colors"
          />
        </div>

        <div className="flex gap-2 pb-3 border-b border-white/[0.06]">
          {[
            { id: "message", label: "Message" },
            { id: "unread",  label: "Unread"  },
            { id: "groups",  label: "Groups"  },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-full text-[12px] font-bold border cursor-pointer transition-all duration-150
                ${tab === t.id
                  ? "bg-[#FF6B35] border-[#FF6B35] text-white shadow-[0_4px_14px_rgba(255,107,53,0.35)]"
                  : "bg-transparent border-white/20 text-white/50 hover:border-white/40"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0
          ? <p className="text-center py-12 text-[12px] text-white/25">No conversations found</p>
          : filtered.map(c => (
              <ConvRow key={c.id} c={c} isActive={activeId === c.id} onClick={() => onOpen(c)} />
            ))
        }
      </div>
    </div>
  );
}
