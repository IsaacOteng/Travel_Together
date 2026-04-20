import { useState } from "react";

const CHIPS = [
  { icon: "📸", label: "Profile photo"     },
  { icon: "🗺️", label: "Trip interests"    },
  { icon: "💰", label: "Budget range"      },
  { icon: "🛡️", label: "Emergency contact" },
];

const STEPS = [
  { n: 1, label: "Sign Up & Verify",   done: true    },
  { n: 2, label: "Personal Details",   done: true    },
  { n: 3, label: "Travel Preferences", active: true  },
  { n: 4, label: "Explore & Connect",  upcoming: true},
];

export default function OnboardingBridge({ firstName = "traveler", onContinue }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="tt-page">

      {/* topbar — identical to OnboardingDetails */}
      <header className="tt-topbar">
        <div className="tt-logo">
          <img src="/src/assets/official_logo_nobg.png" alt="Logo"
            style={{ width: 40, height: 40 }} onError={e => e.target.style.display = "none"} />
          <span className="tt-logo-name">Travel Together</span>
        </div>
        <div className="tt-stepdots">
          {[1, 2, 3].map(s => (
            <div key={s} className={`tt-dot ${s < 3 ? "tt-dot-done" : "tt-dot-active"}`} />
          ))}
        </div>
      </header>

      {/* main */}
      <main className="tt-main">
        <div className="tt-wrap">
          <div className="tt-card" style={{ animation: "fadeUp .3s ease both" }}>

            {/* eyebrow */}
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px w-5 rounded-full" style={{ background: "linear-gradient(90deg,#FF6B35,transparent)" }} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase", color: "#FF6B35" }}>
                Account created ✓
              </span>
            </div>

            {/* headline */}
            <h1 style={{ fontFamily: "Georgia,serif", fontSize: "clamp(22px,4vw,28px)", fontWeight: 400, color: "#1E3A5F", lineHeight: 1.2, margin: "0 0 8px" }}>
              You're in,{" "}
              <span style={{ fontStyle: "italic", background: "linear-gradient(135deg,#FF6B35,#e8572a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {firstName}
              </span>
              . One last step.
            </h1>

            <p style={{ fontSize: 13, color: "#5576a0", lineHeight: 1.6, margin: "0 0 24px" }}>
              Tell us how you travel so groups know who you are. Under 2 minutes.
            </p>

            {/* step tracker */}
            <div className="flex items-start" style={{ marginBottom: 24 }}>
              {STEPS.map((s, i) => (
                <div key={s.n} className="flex flex-col items-center" style={{ flex: 1 }}>
                  <div className="flex items-center w-full">
                    {i > 0 && (
                      <div className="flex-1 h-px" style={{ background: STEPS[i - 1].done ? "linear-gradient(90deg,#2D9B6F,#FF6B35)" : "#e5e7eb" }} />
                    )}
                    <div
                      className="flex items-center justify-center shrink-0"
                      style={{
                        width: 28, height: 28, borderRadius: "50%",
                        fontSize: 11, fontWeight: 700,
                        ...(s.done
                          ? { background: "linear-gradient(135deg,#2D9B6F,#27ae60)", color: "#fff", boxShadow: "0 2px 8px rgba(45,155,111,.3)" }
                          : s.active
                          ? { background: "linear-gradient(135deg,#FF6B35,#ff8c5a)", color: "#fff", boxShadow: "0 2px 8px rgba(255,107,53,.35)" }
                          : { background: "#f0f0f0", color: "#b0b0b0" }),
                      }}
                    >
                      {s.done
                        ? <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 5.5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        : s.n}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="flex-1 h-px" style={{ background: s.done ? "linear-gradient(90deg,#2D9B6F,#e5e7eb)" : "#e5e7eb" }} />
                    )}
                  </div>
                  <span style={{
                    marginTop: 6, fontSize: 9, fontWeight: 600, textAlign: "center", lineHeight: 1.3, maxWidth: 64,
                    color: s.done ? "#2D9B6F" : s.active ? "#FF6B35" : "#c0c0c0",
                  }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

            {/* chips */}
            <div className="flex flex-wrap gap-2" style={{ marginBottom: 28 }}>
              {CHIPS.map(({ icon, label }) => (
                <div key={label}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{ background: "#fff4ee", border: "1px solid #fed7aa", color: "#FF6B35", fontSize: 11, fontWeight: 600 }}
                >
                  <span style={{ fontSize: 13, lineHeight: 1 }}>{icon}</span>
                  {label}
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={onContinue}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              style={{
                width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
                background: "linear-gradient(135deg,#FF6B35,#ff8c5a)",
                color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
                boxShadow: hovered ? "0 8px 28px rgba(255,107,53,.5)" : "0 3px 14px rgba(255,107,53,.35)",
                transform: hovered ? "translateY(-1px)" : "translateY(0)",
                transition: "transform .18s ease, box-shadow .18s ease",
              }}
            >
              Set up my travel profile →
            </button>

            <p style={{ textAlign: "center", fontSize: 11, color: "#9ca3af", marginTop: 10 }}>
              You can edit everything later from your profile settings
            </p>

          </div>
        </div>
      </main>

      <footer className="tt-footer">© {new Date().getFullYear()} Travel Together, Inc.</footer>

    </div>
  );
}
