import { ChevronRight, ChevronLeft } from "lucide-react";

export default function SectionHeader({ title, count, hasMore, onViewAll, onBack, expanded }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        {expanded && (
          <button onClick={onBack} className="bg-transparent border-none cursor-pointer text-white/40 hover:text-white/70 flex transition-colors">
            <ChevronLeft size={16}/>
          </button>
        )}
        <h2 className="m-0 text-[11px] font-bold tracking-[0.08em] uppercase text-white/30">{title}</h2>
        <span className="text-[10px] text-white/20 font-medium bg-white/[0.05] px-1.5 py-0.5 rounded-full">{count}</span>
      </div>
      {!expanded && hasMore && (
        <button onClick={onViewAll} className="flex items-center gap-1 text-[12px] text-[#FF6B35] font-semibold bg-transparent border-none cursor-pointer hover:text-[#ff8c5a] transition-colors">
          View all <ChevronRight size={12}/>
        </button>
      )}
    </div>
  );
}
