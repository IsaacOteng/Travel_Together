import { LogOut } from "lucide-react";

export default function SignOutModal({ onClose, onConfirm }) {
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-[2000] flex items-center justify-center p-4"
      style={{ animation: "fadeIn .2s ease" }}>
      <div className="bg-surface border border-line rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center"
        style={{ animation: "slideUp .25s ease" }}>
        <div className="w-12 h-12 rounded-full bg-danger-soft border border-danger/30 flex items-center justify-center mx-auto mb-4">
          <LogOut size={20} className="text-danger" />
        </div>
        <h2 className="text-[16px] font-light text-ink font-serif mb-1">Sign out?</h2>
        <p className="text-[12px] text-ink-mute mb-6">You'll need to log back in to access your account.</p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-surface-alt border border-line text-ink-soft text-[13px] font-semibold cursor-pointer hover:bg-surface-alt transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 cursor-pointer rounded-full border-none bg-danger py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
