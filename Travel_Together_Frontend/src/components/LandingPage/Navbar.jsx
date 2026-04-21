import { useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";

export default function Navbar({ scrolled, onGetStarted, onSignIn, onBrowse }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "bg-[#071422]/96 backdrop-blur-xl border-b border-white/[0.07] shadow-2xl" : "bg-transparent"}`}>
        <div className="max-w-[1200px] mx-auto px-6 h-[68px] flex items-center justify-between">
          <div className="flex items-center gap-2 flex-shrink-0">
            <img src="/src/assets/official_logo_nobg.png" alt="logo" className="w-9 h-9"
              onError={e => { e.target.style.display = "none"; }} />
            <span className="text-[16px] font-bold text-white tracking-tight">Travel Together</span>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={onBrowse}
              className="text-[13px] text-white/55 font-semibold hover:text-white transition-colors px-3 py-2 bg-transparent border-none cursor-pointer">
              Browse trips
            </button>
            <button onClick={onSignIn}
              className="text-[13px] text-white/55 font-semibold hover:text-white transition-colors px-3 py-2 bg-transparent border-none cursor-pointer">
              Sign in
            </button>
            <button onClick={onGetStarted}
              className="flex items-center gap-1.5 bg-[#FF6B35] text-white text-[13px] font-bold px-4 py-2.5 rounded-xl hover:bg-[#e55c28] transition-all shadow-[0_4px_14px_rgba(255,107,53,0.35)] hover:shadow-[0_6px_20px_rgba(255,107,53,0.45)] hover:-translate-y-0.5 border-none cursor-pointer">
              Get started <ArrowRight size={14} />
            </button>
          </div>

          <button onClick={() => setOpen(o => !o)} className="md:hidden bg-transparent border-none cursor-pointer text-white/60 hover:text-white p-1">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="fixed inset-0 z-40 bg-[#071422]/98 backdrop-blur-xl flex flex-col pt-[68px]"
          style={{ animation: "fadeIn .15s ease" }}>
          <div className="flex flex-col gap-3 p-5 mt-4">
            <button onClick={() => { setOpen(false); onBrowse(); }}
              className="w-full py-3 text-center text-[14px] font-semibold text-white border border-white/15 rounded-2xl hover:bg-white/5 transition-colors bg-transparent cursor-pointer">
              Browse trips
            </button>
            <button onClick={() => { setOpen(false); onSignIn(); }}
              className="w-full py-3 text-center text-[14px] font-semibold text-white/60 border border-white/10 rounded-2xl hover:bg-white/5 transition-colors bg-transparent cursor-pointer">
              Sign in
            </button>
            <button onClick={() => { setOpen(false); onGetStarted(); }}
              className="w-full py-3 text-center text-[14px] font-bold text-white bg-[#FF6B35] rounded-2xl hover:bg-[#e55c28] transition-colors shadow-[0_4px_14px_rgba(255,107,53,0.35)] border-none cursor-pointer">
              Get started free
            </button>
          </div>
        </div>
      )}
    </>
  );
}
