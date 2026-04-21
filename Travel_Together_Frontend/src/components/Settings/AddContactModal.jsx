import { useState } from "react";
import { X } from "lucide-react";

export default function AddContactModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ name: "", phone: "", dial_code: "+233", relationship: "Parent" });
  const valid = form.name.trim() && form.phone.trim();
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-[2000] flex items-center justify-center p-4"
      style={{ animation: "fadeIn .2s ease" }}>
      <div className="bg-[#0d1b2a] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
        style={{ animation: "slideUp .25s ease" }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[16px] font-light text-white font-serif">Add Emergency Contact</h2>
          <button onClick={onClose} className="bg-transparent border-none cursor-pointer text-white/40 hover:text-white/70"><X size={17} /></button>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1.5">Full Name</label>
            <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Contact's name"
              className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3.5 py-2.5 text-[13px] text-white outline-none focus:border-[#FF6B35]/50 transition-colors placeholder-white/20" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1.5">Phone Number</label>
            <div className="flex gap-2">
              <select value={form.dial_code} onChange={e => setForm(p => ({ ...p, dial_code: e.target.value }))}
                className="bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2.5 text-[13px] text-white outline-none focus:border-[#FF6B35]/50 transition-colors cursor-pointer appearance-none flex-shrink-0">
                {["+233","+1","+44","+27","+234","+254"].map(d => (
                  <option key={d} value={d} className="bg-[#0d1b2a]">{d}</option>
                ))}
              </select>
              <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value.replace(/[^0-9\s\-]/g, "") }))}
                placeholder="24 000 0000"
                className="flex-1 bg-white/[0.06] border border-white/10 rounded-xl px-3.5 py-2.5 text-[13px] text-white outline-none focus:border-[#FF6B35]/50 transition-colors placeholder-white/20" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1.5">Relationship</label>
            <select value={form.relationship} onChange={e => setForm(p => ({ ...p, relationship: e.target.value }))}
              className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3.5 py-2.5 text-[13px] text-white outline-none focus:border-[#FF6B35]/50 transition-colors cursor-pointer appearance-none">
              {["Parent","Guardian","Sibling","Friend","Partner","Other"].map(r => (
                <option key={r} value={r} className="bg-[#0d1b2a]">{r}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/15 bg-transparent text-white/50 text-[13px] font-semibold cursor-pointer hover:bg-white/[0.05] transition-colors">
            Cancel
          </button>
          <button disabled={!valid} onClick={() => { onAdd(form); onClose(); }}
            className="flex-1 py-2.5 rounded-xl bg-[#FF6B35] border-none text-white text-[13px] font-bold cursor-pointer hover:bg-[#e55c28] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(255,107,53,0.3)]">
            Add Contact
          </button>
        </div>
      </div>
    </div>
  );
}
