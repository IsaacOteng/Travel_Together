import { useState, useRef, useEffect } from "react";
import { Loader2, Check, CreditCard, RefreshCw } from "lucide-react";
import { paymentsApi } from "../../services/api.js";

/**
 * Pay-to-confirm button for an approved-awaiting-payment member.
 *
 * Flow: initiate (server creates a Paystack checkout) → open Paystack in a new
 * tab → poll verify until the payment is confirmed (the webhook also confirms it
 * server-side, so this is just to update the UI). Calls onPaid() once confirmed.
 *
 * Props: tripId, amount (GHS), onPaid()
 */
export default function PayButton({ tripId, amount, onPaid }) {
  const [phase, setPhase] = useState("idle");   // idle | initiating | awaiting | paid | error
  const [error, setError] = useState("");
  const refStr   = useRef(null);
  const pollRef  = useRef(null);
  const triesRef = useRef(0);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const checkStatus = async () => {
    if (!refStr.current) return;
    triesRef.current += 1;
    try {
      const { data } = await paymentsApi.verify(refStr.current);
      if (data.paid) {
        clearInterval(pollRef.current);
        setPhase("paid");
        onPaid?.();
        return;
      }
    } catch { /* transient — keep polling */ }
    if (triesRef.current >= 30) clearInterval(pollRef.current);   // stop auto-poll after ~100s
  };

  const begin = async () => {
    setError("");
    setPhase("initiating");
    try {
      const { data } = await paymentsApi.initiate(tripId);
      refStr.current = data.reference;
      window.open(data.authorization_url, "_blank", "noopener");
      setPhase("awaiting");
      clearInterval(pollRef.current);
      triesRef.current = 0;
      pollRef.current = setInterval(checkStatus, 3500);
    } catch (err) {
      setError(err?.response?.data?.detail || "Couldn't start payment. Please try again.");
      setPhase("error");
    }
  };

  if (phase === "paid") {
    return (
      <div className="w-full py-[13px] rounded-xl text-[13px] font-semibold text-center flex items-center justify-center gap-1.5"
        style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1.5px solid rgba(74,222,128,0.25)" }}>
        <Check size={15} /> Payment confirmed — you're in!
      </div>
    );
  }

  if (phase === "awaiting") {
    return (
      <div className="w-full flex flex-col gap-2">
        <div className="w-full py-[13px] rounded-xl text-[12.5px] font-semibold text-center flex items-center justify-center gap-2"
          style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1.5px solid rgba(251,191,36,0.25)" }}>
          <Loader2 size={14} className="animate-spin" /> Waiting for payment…
        </div>
        <button
          onClick={checkStatus}
          className="w-full py-2.5 rounded-xl text-[12px] font-semibold text-white/60 bg-white/[0.06] border border-white/10 cursor-pointer flex items-center justify-center gap-1.5 hover:text-white/85 hover:border-white/20 transition-all"
        >
          <RefreshCw size={13} /> I've paid — check now
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <button
        onClick={begin}
        disabled={phase === "initiating"}
        className="w-full py-[13px] rounded-xl text-[13px] font-bold cursor-pointer text-white border-none flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-px disabled:opacity-70 disabled:cursor-not-allowed"
        style={{ background: "linear-gradient(135deg,#FF6B35,#ff8c5a)", boxShadow: "0 4px 16px rgba(255,107,53,0.3)" }}
      >
        {phase === "initiating"
          ? <><Loader2 size={15} className="animate-spin" /> Starting…</>
          : <><CreditCard size={15} /> Pay GH₵{amount} to confirm</>}
      </button>
      {error && <p className="text-[11px] text-red-400 mt-1.5 leading-snug">{error}</p>}
    </div>
  );
}
