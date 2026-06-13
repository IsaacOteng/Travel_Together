import { useState, useEffect } from "react";
import { Wallet, Check } from "lucide-react";
import { Label, TTInput, TTSelect } from "./uiComponents.jsx";
import { paymentsApi } from "../../services/api.js";

const PROVIDERS = [
  { code: "MTN", label: "MTN MoMo" },
  { code: "VOD", label: "Telecel Cash" },
  { code: "ATL", label: "AirtelTigo Money" },
];

/**
 * Collected during trip creation, but stored on the organizer's account (per-user)
 * and reused for future trips — keeps a stable payout identity for fraud
 * monitoring. Editable anytime in Settings.
 */
export default function PayoutSetup() {
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [current, setCurrent] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form,    setForm]    = useState({ bank_code: "MTN", account_number: "", account_name: "" });

  useEffect(() => {
    paymentsApi.getPayoutMethod()
      .then(({ data }) => { setCurrent(data); setEditing(!data.configured); })
      .catch(() => setEditing(true))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!form.account_number.trim() || saving) return;
    setSaving(true);
    try {
      await paymentsApi.setPayoutMethod({
        type: "mobile_money",
        bank_code: form.bank_code,
        account_number: form.account_number.trim(),
        account_name: form.account_name.trim(),
      });
      const { data } = await paymentsApi.getPayoutMethod();
      setCurrent(data); setSaved(true); setEditing(false);
      setForm(f => ({ ...f, account_number: "" }));
    } catch { /* surfaced by no state change */ }
    finally { setSaving(false); }
  };

  if (loading) return null;

  return (
    <div className="bg-white/[0.03] border-[1.5px] border-white/[0.08] rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-1">
        <Wallet size={14} className="text-[#FF6B35]" />
        <span className="text-[13px] font-bold text-white">Where you'll get paid</span>
      </div>
      <p className="text-[11px] text-white/35 mb-3 leading-snug">
        Your trip earnings are released here after the trip ends. Saved to your account and
        reused for future trips — change anytime in Settings.
      </p>

      {current?.configured && !editing ? (
        <div className="flex items-center justify-between bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5">
          <div className="text-[12px] text-white/70">
            {PROVIDERS.find(p => p.code === current.bank_code)?.label || current.bank_code}
            <span className="text-white/40 ml-1.5 font-mono">{current.account_masked}</span>
          </div>
          <button onClick={() => setEditing(true)}
            className="text-[11px] text-[#FF6B35] font-semibold cursor-pointer bg-transparent border-none">
            Change
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <div className="w-[150px] flex-shrink-0">
              <TTSelect value={form.bank_code} onChange={e => setForm(f => ({ ...f, bank_code: e.target.value }))}>
                {PROVIDERS.map(p => <option key={p.code} value={p.code}>{p.label}</option>)}
              </TTSelect>
            </div>
            <div className="flex-1">
              <TTInput value={form.account_number} onChange={e => setForm(f => ({ ...f, account_number: e.target.value }))} placeholder="MoMo number" />
            </div>
          </div>
          <TTInput value={form.account_name} onChange={e => setForm(f => ({ ...f, account_name: e.target.value }))} placeholder="Account name (optional)" />
          <button
            onClick={save}
            disabled={!form.account_number.trim() || saving}
            className="py-2.5 rounded-xl text-[12.5px] font-bold text-white border-none cursor-pointer flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg,#FF6B35,#ff8c5a)" }}
          >
            {saving ? "Saving…" : saved ? <><Check size={14} /> Saved</> : "Save payout method"}
          </button>
        </div>
      )}
    </div>
  );
}
