/* Miniature previews of what each feature actually does, standing in for
   decorative icons. Everything is drawn from theme tokens so the whole set
   survives a theme flip, and nothing here fetches an image. */

/* ── Live fleet tracking ─────────────────────────────────────── */
export function FleetViz() {
  const pins = [
    { x: 52, y: 150, s: "A", live: true },
    { x: 188, y: 74, s: "K", live: false },
    { x: 330, y: 96, s: "E", live: false },
  ];
  return (
    <svg viewBox="0 0 420 190" className="h-full w-full" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="ttGrid" width="34" height="34" patternUnits="userSpaceOnUse">
          <path d="M34 0H0V34" fill="none" stroke="var(--tt-line)" strokeWidth="1" opacity="0.5" />
        </pattern>
      </defs>

      <rect width="420" height="190" fill="var(--tt-surface-alt)" />
      <rect width="420" height="190" fill="url(#ttGrid)" />

      {/* a river, so it reads as terrain rather than a spreadsheet */}
      <path
        d="M-10 132 C 70 120 96 150 168 142 C 250 132 286 160 430 148"
        fill="none"
        stroke="var(--tt-moss)"
        strokeWidth="9"
        opacity="0.18"
        strokeLinecap="round"
      />

      {/* the route the group is actually on */}
      <path
        d="M52 150 C 118 142 126 78 188 74 C 252 70 258 118 330 96"
        fill="none"
        stroke="var(--tt-accent)"
        strokeWidth="2.5"
        strokeDasharray="6 7"
        strokeLinecap="round"
        opacity="0.85"
      />

      {pins.map(p => (
        <g key={p.s}>
          {p.live && (
            <circle cx={p.x} cy={p.y} r="13" fill="var(--tt-accent)" opacity="0.25">
              <animate attributeName="r" values="13;23;13" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;0;0.3" dur="2.4s" repeatCount="indefinite" />
            </circle>
          )}
          <circle cx={p.x} cy={p.y} r="13" fill="var(--tt-surface)" stroke="var(--tt-accent)" strokeWidth="2" />
          <text
            x={p.x}
            y={p.y + 4}
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill="var(--tt-ink)"
            fontFamily="Satoshi, sans-serif"
          >
            {p.s}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ── Find your crew ──────────────────────────────────────────── */
export function CrewViz() {
  return (
    <div className="rounded-2xl border border-line bg-surface-alt p-4">
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          {["A", "K", "E", "Y"].map(c => (
            <span
              key={c}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface bg-accent-soft text-[11px] font-bold text-accent"
            >
              {c}
            </span>
          ))}
        </div>
        <span className="text-[12.5px] text-ink-mute">+12 going</span>
      </div>

      <div className="mt-3.5 flex items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 py-2.5">
        <span className="min-w-0">
          <span className="block truncate text-[12.5px] font-semibold text-ink">
            Kwame wants to join
          </span>
          <span className="block text-[11px] text-ink-mute">Verified · karma 610</span>
        </span>
        <span className="flex flex-shrink-0 gap-1.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[12px] font-bold text-accent-ink">
            ✓
          </span>
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-line text-[12px] text-ink-mute">
            ✕
          </span>
        </span>
      </div>
    </div>
  );
}

/* ── Safety net — sits on the accent-filled tile ─────────────── */
export function SafetyViz() {
  return (
    <div className="rounded-2xl border border-accent-ink/20 bg-accent-ink/10 p-4">
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
          <span
            className="absolute inline-flex h-full w-full rounded-full bg-accent-ink opacity-60"
            style={{ animation: "ttPulse 1.9s ease-out infinite" }}
          />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent-ink" />
        </span>
        <span className="text-[12.5px] font-semibold text-accent-ink">
          Check-in missed · 21:40
        </span>
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        {["Emergency contact notified", "Last location shared with group"].map(l => (
          <div key={l} className="flex items-center gap-2 text-[11.5px] text-accent-ink/85">
            <span className="text-[11px]">✓</span>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Group chat and polls ────────────────────────────────────── */
export function PollViz() {
  const options = [
    { label: "Beach shack", pct: 64 },
    { label: "Night market", pct: 36 },
  ];
  return (
    <div className="rounded-2xl border border-line bg-surface-alt p-4">
      <p className="m-0 text-[12.5px] font-semibold text-ink">Dinner tonight?</p>
      <div className="mt-3 flex flex-col gap-2.5">
        {options.map(o => (
          <div key={o.label}>
            <div className="flex items-baseline justify-between text-[11.5px]">
              <span className="text-ink-soft">{o.label}</span>
              <span className="font-semibold text-ink">{o.pct}%</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-accent" style={{ width: o.pct + "%" }} />
            </div>
          </div>
        ))}
      </div>
      <p className="m-0 mt-3 text-[11px] text-ink-mute">14 of 16 voted</p>
    </div>
  );
}

/* ── Travel karma ────────────────────────────────────────────── */
export function KarmaViz() {
  const pct = 0.82;
  const r = 34;
  const circumference = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface-alt p-4">
      <svg viewBox="0 0 88 88" className="h-[88px] w-[88px] flex-shrink-0" aria-hidden="true">
        <circle cx="44" cy="44" r={r} fill="none" stroke="var(--tt-line)" strokeWidth="7" />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke="var(--tt-accent)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference * pct + " " + circumference}
          transform="rotate(-90 44 44)"
        />
        <text
          x="44"
          y="50"
          textAnchor="middle"
          fontSize="19"
          fontWeight="700"
          fill="var(--tt-ink)"
          fontFamily="Clash Display, sans-serif"
        >
          820
        </text>
      </svg>
      <div>
        <p className="m-0 text-[12.5px] font-semibold text-ink">Trusted traveller</p>
        <p className="m-0 mt-1 text-[11.5px] leading-relaxed text-ink-mute">
          21 trips · 100% check-in
          <br />
          Priority on join requests
        </p>
      </div>
    </div>
  );
}

/* ── Encrypted by default ────────────────────────────────────── */
export function EncryptionViz() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="max-w-[230px] rounded-2xl rounded-bl-md border border-line bg-surface-alt px-3.5 py-2.5 text-[12.5px] leading-snug text-ink">
        Landed safe — heading to the villa now
      </div>
      <svg viewBox="0 0 26 26" className="h-5 w-5 flex-shrink-0" aria-hidden="true">
        <path
          d="M8 11V8a5 5 0 0 1 10 0v3"
          fill="none"
          stroke="var(--tt-accent)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <rect x="5" y="11" width="16" height="12" rx="3" fill="var(--tt-accent)" />
      </svg>
      <div className="max-w-[230px] overflow-hidden rounded-2xl rounded-br-md border border-line bg-surface px-3.5 py-2.5 font-mono text-[12px] tracking-tight text-ink-mute">
        8f2a··c41d··9b70··e3
      </div>
    </div>
  );
}
