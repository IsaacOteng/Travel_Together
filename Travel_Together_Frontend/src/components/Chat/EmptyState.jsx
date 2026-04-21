import { MessageCircle } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-[#071422]">
      <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
        <MessageCircle size={26} className="text-white/20" />
      </div>
      <p className="text-[14px] font-semibold text-white/30">
        Select a conversation to start chatting
      </p>
    </div>
  );
}
