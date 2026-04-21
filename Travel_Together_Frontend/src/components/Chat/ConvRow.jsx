import { Users } from "lucide-react";
import Avatar from "./Avatar.jsx";
import TypingDots from "./TypingDots.jsx";

export default function ConvRow({ c, isActive, onClick }) {
  const isGroup = c.type === "group";
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 cursor-pointer text-left transition-all duration-100 border-b border-white/[0.07]
        ${isActive ? "lg:bg-[#FF6B35]/10 lg:border-l-[3px] lg:border-l-[#FF6B35]" : "bg-transparent hover:bg-white/[0.04]"}`}
    >
      {isGroup
        ? <div className="relative w-11 h-11 flex-shrink-0">
            {c.cover
              ? <img src={c.cover} alt={c.name} className="w-11 h-11 rounded-full object-cover"
                  onError={e => { e.target.style.background = "#1a2e45"; }} />
              : <div className={`w-11 h-11 rounded-full ${c.avatar} flex items-center justify-center font-bold text-white font-serif text-[14px]`}>
                  {c.name?.slice(0, 1).toUpperCase()}
                </div>
            }
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#0d1b2a] rounded-full flex items-center justify-center border border-white/10">
              <Users size={10} className="text-[#FF6B35]" />
            </div>
          </div>
        : <Avatar name={c.name} colorClass={c.avatar} online={c.online} imgSrc={c.avatarUrl} />
      }

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className={`text-[14px] truncate ${c.unread > 0 ? "text-white font-bold" : "text-white/75 font-semibold"}`}>
            {c.name}
          </span>
          <span className={`text-[10px] flex-shrink-0 ml-2 ${c.unread > 0 ? "text-[#FF6B35] font-semibold" : "text-white/30"}`}>
            {c.time}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] text-white/40 truncate flex items-center gap-1 min-w-0">
            {c.typing
              ? <span className="flex items-center gap-1.5 text-[#FF6B35] text-[11px] font-medium">
                  <TypingDots /> typing...
                </span>
              : <>
                  {isGroup && c.previewSender && (
                    <span className="text-white/30 flex-shrink-0">{c.previewSender}:</span>
                  )}
                  <span className="truncate">{c.preview}</span>
                </>
            }
          </span>
          {c.unread > 0 && (
            <div className="w-5 h-5 rounded-full bg-[#FF6B35] flex items-center justify-center text-[9px] font-black text-white flex-shrink-0">
              {c.unread > 9 ? "9+" : c.unread}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
