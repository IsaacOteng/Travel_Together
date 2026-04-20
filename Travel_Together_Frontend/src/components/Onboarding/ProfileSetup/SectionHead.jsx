/* ══════════════════════════════════════════════════
   SECTION HEADING  — matches tt-heading exactly
   gradient icon badge (28×28, radius-lg) + Georgia serif title
══════════════════════════════════════════════════ */
export const SectionHead = ({ icon, title, sub }) => (
  <div className="mb-5">
    <div className="flex items-center gap-2 mb-1">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
        style={{ background: "linear-gradient(135deg,#FF6B35,#ff8c5a)" }}
      >
        {icon}
      </div>
      <h1 className="text-xl font-light text-[#1E3A5F] tracking-tight" style={{ fontFamily: "Georgia,serif" }}>
        {title}
      </h1>
    </div>
    {sub && (
      <p className="text-[11px] text-gray-400 leading-snug ml-9">{sub}</p>
    )}
  </div>
);