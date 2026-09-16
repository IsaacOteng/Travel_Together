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
      <div className="bg-surface border-2 border-danger/40 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
        style={{ animation: "slideUp .25s ease" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-danger-soft border border-danger/30 flex items-center justify-center flex-shrink-0">
            <Trash2 size={17} className="text-danger" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-danger">Delete Account</h2>
            <p className="text-[10px] text-ink-mute">This cannot be undone</p>
          </div>
        </div>

        {step === 1 && (
          <>
            <p className="text-[12px] text-ink-soft leading-relaxed mb-4">
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
                      ${checks[c.key] ? "bg-danger border-danger" : "border-line bg-transparent group-hover:border-accent"}`}>
                    {checks[c.key] && <Check size={11} className="text-ink" />}
                  </div>
                  <span className="text-[12px] text-ink-soft leading-snug">{c.label}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-line bg-transparent text-ink-soft text-[13px] font-semibold cursor-pointer hover:bg-surface-alt transition-colors">
                Cancel
              </button>
              <button disabled={!allChecked} onClick={() => setStep(2)}
                className="flex-1 cursor-pointer rounded-full border-none bg-danger py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35">
                Continue
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-[12px] text-ink-soft leading-relaxed mb-3">
              Type <span className="text-danger font-bold font-mono">DELETE MY ACCOUNT</span> to confirm.
            </p>
            <input value={typed} onChange={e => setTyped(e.target.value)}
              placeholder="Type here..."
              className="w-full bg-surface-alt border border-danger/30 rounded-xl px-3.5 py-2.5 text-[13px] text-ink outline-none focus:border-danger transition-colors mb-4 placeholder:text-ink-mute font-mono" />

            {error && (
              <p className="text-[11px] text-danger mb-3 flex items-center gap-1.5">
                <AlertTriangle size={11} /> {error}
              </p>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="flex-1 py-2.5 rounded-xl border border-line bg-transparent text-ink-soft text-[13px] font-semibold cursor-pointer hover:bg-surface-alt transition-colors">
                Back
              </button>
              <button disabled={!confirmed || loading}
                onClick={handleDelete}
                className="flex-1 cursor-pointer rounded-full border-none bg-danger py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35">
                {loading ? "Deleting…" : "Delete Account"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
