import { Globe } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#0d1b2a] border-t border-white/[0.06] pt-14 pb-8">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <img src="/src/assets/official_logo_nobg.png" alt="logo" className="w-8 h-8"
                onError={e => { e.target.style.display = "none"; }} />
              <span className="text-[15px] font-bold text-white tracking-tight">Travel Together</span>
            </div>
            <p className="text-[13px] text-white/35 leading-relaxed max-w-[240px]">
              The safe way to explore Ghana with verified travel groups.
            </p>
            <div className="flex gap-2 mt-5">
              {["T","I","K"].map((s, i) => (
                <div key={i} className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-[10px] font-bold text-white/40">
                  {s}
                </div>
              ))}
            </div>
          </div>

          {[
            { heading: "Product", links: ["Features","How it works","Destinations","Community"] },
            { heading: "Safety",  links: ["SOS System","Verified Travellers","Privacy","Trust & Safety"] },
            { heading: "Company", links: ["About","Blog","Careers","Contact"] },
          ].map(col => (
            <div key={col.heading}>
              <p className="text-[10px] font-bold tracking-[.15em] uppercase text-white/30 mb-4">{col.heading}</p>
              <div className="flex flex-col gap-2.5">
                {col.links.map(l => (
                  <a key={l} href="#" className="text-[13px] text-white/45 hover:text-white transition-colors">{l}</a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <p className="text-[12px] text-white/25">© {new Date().getFullYear()} Travel Together, Inc. All rights reserved.</p>
          <div className="flex items-center gap-1.5 text-[12px] text-white/25">
            <Globe size={12} />
            <span>Ghana · English</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
