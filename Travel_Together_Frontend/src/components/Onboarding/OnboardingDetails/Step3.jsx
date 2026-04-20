import { useState } from "react";
import { ProgressBar } from "./ProgressBar";
import { SectionHead } from "./SectionHead";
import { Err } from "./Err";
import { Ok } from "./Ok";
import { useUsername } from "./useUsername";

/* ─────────────────────────────────────────────
  STEP 3 — Username
───────────────────────────────────────────── */
export function Step3({ form, patch, onNext, onBack, submitting }) {
  const status = useUsername(form.username || "");

  const suggestions = (() => {
    if (!form.firstName) return [];
    const base = (form.firstName + (form.lastName?.[0] || ""))
      .toLowerCase().replace(/[^a-z0-9]/g,"");
    return [base, `${base}_travels`, `${base}${new Date().getFullYear().toString().slice(2)}`, `explorer_${base}`]
      .filter(s => !["admin","traveler","explorer","wanderer","tripper","nomad"].includes(s)).slice(0,4);
  })();

  const unCls =
    !form.username       ? "tt-un-default" :
    status === "available" ? "tt-un-ok"    :
    status === "taken" || status === "invalid" ? "tt-un-err" : "tt-un-busy";

  const canGo = status === "available";

  return (
    <div className="tt-fadeUp">
      <ProgressBar step={3} total={3}/>
      <SectionHead icon="✦" title="Pick your username"
        sub="How fellow travelers find and recognise you — changeable anytime from your profile settings."/>

      <div style={{ marginBottom: 16 }}>
        <label className="tt-label">Username <span className="tt-label-required">*</span></label>
        <div style={{ position:"relative" }}>
          <span style={{
            position:"absolute", left:12, top:"50%", transform:"translateY(-50%)",
            fontSize:14, color:"#9ca3af", fontWeight:500, userSelect:"none", pointerEvents:"none"
          }}>@</span>
          <input type="text" placeholder="yourname" value={form.username || ""}
            onChange={e => patch({ username: e.target.value.toLowerCase().replace(/\s/g,"") })}
            className={`tt-input ${unCls}`}
            style={{ paddingLeft:26, paddingRight:36 }}/>
          {/* status icon */}
          <div style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)" }}>
            {status === "checking" && (
              <svg className="tt-spin" width="15" height="15" viewBox="0 0 15 15" fill="none">
                <circle cx="7.5" cy="7.5" r="5.5" stroke="#FF6B35" strokeWidth="2" strokeDasharray="20 11"/>
              </svg>
            )}
            {status === "available" && (
              <div style={{ width:20,height:20,borderRadius:"50%",background:"#dcfce7",display:"flex",alignItems:"center",justifyContent:"center" }}>
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M2.5 5.5l2.5 2.5 3.5-4" stroke="#22c55e" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
            {(status === "taken" || status === "invalid") && (
              <div style={{ width:20,height:20,borderRadius:"50%",background:"#fee2e2",display:"flex",alignItems:"center",justifyContent:"center" }}>
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M3 3l5 5M8 3l-5 5" stroke="#ef4444" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </div>
            )}
          </div>
        </div>
        {status === "available" && <Ok  msg={`@${form.username} is available!`}/>}
        {status === "taken"     && <Err msg={`@${form.username} is taken — try a suggestion below.`}/>}
        {status === "invalid"   && <Err msg="3–20 chars · lowercase letters, numbers, dots or underscores"/>}
        {!form.username && <div style={{ fontSize:11, color:"#9ca3af", marginTop:5 }}>Letters, numbers, underscores &amp; dots — no spaces</div>}
      </div>

      {(status === "taken" || !form.username) && suggestions.length > 0 && (
        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#9ca3af", letterSpacing:".1em", textTransform:"uppercase", marginBottom:8 }}>Suggestions</div>
          <div className="tt-suggestions">
            {suggestions.map(s => (
              <button key={s} type="button" className="tt-suggestion" onClick={() => patch({ username:s })}>
                @{s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="tt-rules">
        {["Visible to all travelers on the platform",
          "Unique — no two travelers share the same username",
          "Can be changed anytime from profile settings"].map(r => (
          <div key={r} className="tt-rule">
            <span className="tt-rule-dot">✦</span>{r}
          </div>
        ))}
      </div>

      <div className="tt-btn-row">
        <button type="button" className="tt-btn-ghost" onClick={onBack}>← Back</button>
        <button type="button" className="tt-btn-primary" onClick={() => canGo && onNext()} disabled={!canGo || submitting}>
          {submitting ? "Saving…" : "Finish Setup →"}
        </button>
      </div>
    </div>
  );
}