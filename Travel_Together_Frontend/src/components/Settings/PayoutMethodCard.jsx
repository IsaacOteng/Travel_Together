import { useState, useEffect } from "react";
import { Wallet, Check } from "lucide-react";
import { SectionCard } from "./atoms.jsx";
import { paymentsApi } from "../../services/api.js";

// Paystack Ghana mobile-money provider codes
const PROVIDERS = [
  { code: "MTN", label: "MTN MoMo" },
  { code: "VOD", label: "Telecel Cash" },
  { code: "ATL", label: "AirtelTigo Money" },
];

/**
 * Organizer's payout destination (where escrowed funds are sent after a trip).
 * The name need not match identity — accountability comes from verification.
 */
export default function PayoutMethodCard() {
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [current, setCurrent] = useState(null);   // { configured, account_masked, bank_code, ... }
  const [form,    setForm]    = useState({ account_number: "", bank_code: "MTN", account_name: "" });

  useEffect(() => {
    paymentsApi.getPayoutMethod()
      .then(({ data }) => setCurrent(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!form.account_number.trim() || saving) return;
    setSaving(true);
    setSaved(false);
    try {
      await paymentsApi.setPayoutMethod({
        type: "mobile_money",
        account_number: form.account_number.trim(),
        bank_code: form.bank_code,
        account_name: form.account_name.trim(),
      });
      const { data } = await paymentsApi.getPayoutMethod();
      setCurrent(data);
      setSaved(true);
      setForm(f => ({ ...f, account_number: "" }));
    } catch { /* surfaced via no state change */ }
    finally { setSaving(false); }
  };

  if (loading) return null;

  return (
    <SectionCard title="Payout Method">
      <div className="px-4 pt-3 pb-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "#FF6B3515", border: "1px solid #FF6B3525" }}>
            <Wallet size={15} color="#FF6B35" />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-white/85">Where you get paid</div>
            <p className="text-[11px] text-white/40 mt-0.5 leading-snug">
              The mobile-money number that receives your trip payouts. It doesn't have to be in your name.
            </p>
          </div>
        </div>

        {current?.configured && (
          <div className="flex items-center justify-between bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 mb-3">
            <div className="text-[12px] text-white/70">
              {PROVIDERS.find(p => p.code === current.bank_code)?.label || current.bank_code}
              <span className="text-white/40 ml-1.5 font-mono">{current.account_masked}</span>
            </div>
            {current.tokenized
              ? <span className="text-[10px] text-green-400 font-semibold flex items-center gap-1"><Check size={11} /> Active</span>
              : <span className="text-[10px] text-amber-400/80 font-semibold">Saved</span>}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <select
              value={form.bank_code}
              onChange={e => setForm(f => ({ ...f, bank_code: e.target.value }))}
              className="w-[140px] rounded-[10px] px-2.5 py-2.5 text-[12.5px] bg-white/[0.06] border-[1.5px] border-white/10 text-white outline-none cursor-pointer"
            >
              {PROVIDERS.map(p => <option key={p.code} value={p.code} className="bg-[#0d1b2a]">{p.label}</option>)}
            </select>
            <input
              value={form.account_number}
              onChange={e => setForm(f => ({ ...f, account_number: e.target.value }))}
              placeholder="MoMo number"
              inputMode="numeric"
              className="flex-1 rounded-[10px] px-3 py-2.5 text-[12.5px] bg-white/[0.06] border-[1.5px] border-white/10 text-white outline-none placeholder:text-white/25 focus:border-[#FF6B35]"
            />
          </div>
          <input
            value={form.account_name}
            onChange={e => setForm(f => ({ ...f, account_name: e.target.value }))}
            placeholder="Account name (optional)"
            className="rounded-[10px] px-3 py-2.5 text-[12.5px] bg-white/[0.06] border-[1.5px] border-white/10 text-white outline-none placeholder:text-white/25 focus:border-[#FF6B35]"
          />
          <button
            onClick={save}
            disabled={!form.account_number.trim() || saving}
            className="py-2.5 rounded-xl text-[12.5px] font-bold text-white border-none cursor-pointer flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg,#FF6B35,#ff8c5a)" }}
          >
            {saving ? "Saving…" : saved ? <><Check size={14} /> Saved</> : current?.configured ? "Update payout method" : "Save payout method"}
          </button>
        </div>
      </div>
    </SectionCard>
  );
}
