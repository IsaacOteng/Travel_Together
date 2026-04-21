import { useState } from "react";
import { Trash2, Check, AlertTriangle } from "lucide-react";
import { authApi } from "../../services/api.js";

export default function DeleteModal({ onClose, onDeleted }) {
  const [step,    setStep]    = useState(1);
  const [typed,   setTyped]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [checks,  setChecks]  = useState({ trips: false, media: false, data: false });

  const allChecked = Object.values(checks).every(Boolean);
  const confirmed  = typed === "DELETE MY ACCOUNT";

  const handleDelete = async () => {
    if (!confirmed) return;
    setLoading(true);
    setError("");
    try {
      await authApi.deleteAccount();
      onDeleted();
    } catch {
      setError("Failed to delete account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[2000] flex items-center justify-center p-4"
      style={{ animation: "fadeIn .2s ease" }}>
      <div className="bg-[#0d1b2a] border-2 border-red-500/30 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
        style={{ animation: "slideUp .25s ease" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-shrink-0">
            <Trash2 size={17} className="text-red-400" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-red-400">Delete Account</h2>
            <p className="text-[10px] text-white/35">This cannot be undone</p>
          </div>
        </div>

        {step === 1 && (
          <>
            <p className="text-[12px] text-white/50 leading-relaxed mb-4">
              Before continuing, confirm you understand what will happen to your data.
            </p>
            <div className="flex flex-col gap-2.5 mb-5">
              {[
                { key: "trips", label: "My trips will be removed from all groups" },
                { key: "media", label: "My media will be permanently deleted"     },
                { key: "data",  label: "I have downloaded any data I want to keep" },
              ].map(c => (
                <label key={c.key} className="flex items-start gap-2.5 cursor-pointer group">
                  <div onClick={() => setChecks(p => ({ ...p, [c.key]: !p[c.key] }))}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all cursor-pointer
                      ${checks[c.key] ? "bg-red-500 border-red-500" : "border-white/20 bg-transparent group-hover:border-white/40"}`}>
                    {checks[c.key] && <Check size={11} className="text-white" />}
                  </div>
                  <span className="text-[12px] text-white/55 leading-snug">{c.label}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-white/15 bg-transparent text-white/50 text-[13px] font-semibold cursor-pointer hover:bg-white/[0.05] transition-colors">
                Cancel
              </button>
              <button disabled={!allChecked} onClick={() => setStep(2)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 border-none text-white text-[13px] font-bold cursor-pointer hover:bg-red-600 transition-colors disabled:opacity-35 disabled:cursor-not-allowed">
                Continue
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-[12px] text-white/50 leading-relaxed mb-3">
              Type <span className="text-red-400 font-bold font-mono">DELETE MY ACCOUNT</span> to confirm.
            </p>
            <input value={typed} onChange={e => setTyped(e.target.value)}
              placeholder="Type here..."
              className="w-full bg-white/[0.06] border border-red-500/25 rounded-xl px-3.5 py-2.5 text-[13px] text-white outline-none focus:border-red-500/50 transition-colors mb-4 placeholder-white/20 font-mono" />

            {error && (
              <p className="text-[11px] text-red-400 mb-3 flex items-center gap-1.5">
                <AlertTriangle size={11} /> {error}
              </p>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="flex-1 py-2.5 rounded-xl border border-white/15 bg-transparent text-white/50 text-[13px] font-semibold cursor-pointer hover:bg-white/[0.05] transition-colors">
                Back
              </button>
              <button disabled={!confirmed || loading}
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-500 border-none text-white text-[13px] font-bold cursor-pointer hover:bg-red-600 transition-colors disabled:opacity-35 disabled:cursor-not-allowed">
                {loading ? "Deleting…" : "Delete Account"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
