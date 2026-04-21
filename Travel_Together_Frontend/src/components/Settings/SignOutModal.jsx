import { LogOut } from "lucide-react";

export default function SignOutModal({ onClose, onConfirm }) {
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-[2000] flex items-center justify-center p-4"
      style={{ animation: "fadeIn .2s ease" }}>
      <div className="bg-[#0d1b2a] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center"
        style={{ animation: "slideUp .25s ease" }}>
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
          <LogOut size={20} className="text-red-400" />
        </div>
        <h2 className="text-[16px] font-light text-white font-serif mb-1">Sign out?</h2>
        <p className="text-[12px] text-white/40 mb-6">You'll need to log back in to access your account.</p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white/60 text-[13px] font-semibold cursor-pointer hover:bg-white/10 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-500/80 border-none text-white text-[13px] font-bold cursor-pointer hover:bg-red-500 transition-colors">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
