import { officialLogo } from "../../assets/logos";

const COLUMNS = [
  { heading: "Product", links: ["Features", "How it works", "Destinations", "Community"] },
  { heading: "Safety",  links: ["SOS system", "Verified travellers", "Privacy", "Trust & safety"] },
  { heading: "Company", links: ["About", "Blog", "Careers", "Contact"] },
];

export default function Footer() {
  return (
    <footer className="border-t border-line bg-ground-alt pb-8 pt-16">
      <div className="mx-auto max-w-[1180px] px-6">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2">
            <div className="flex items-center gap-2.5">
              <img
                src={officialLogo}
                alt=""
                className="h-7 w-7"
                onError={e => { e.target.style.display = "none"; }}
              />
              <span className="font-display text-[17px] font-semibold text-ink">
                Travel Together
              </span>
            </div>
            <p className="mt-4 max-w-[250px] text-[14px] leading-[1.7] text-ink-mute">
              The safe way to see Ghana — with people who are going the same way.
            </p>
          </div>

          {COLUMNS.map(col => (
            <div key={col.heading}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-mute">
                {col.heading}
              </p>
              <ul className="mt-5 flex list-none flex-col gap-3 p-0">
                {col.links.map(l => (
                  <li key={l}>
                    <a
                      href="#top"
                      className="text-[14px] text-ink-soft no-underline transition-colors hover:text-accent"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 sm:flex-row">
          <p className="text-[12.5px] text-ink-mute">
            © {new Date().getFullYear()} Travel Together. All rights reserved.
          </p>
          <p className="text-[12.5px] text-ink-mute">Ghana · English</p>
        </div>
      </div>
    </footer>
  );
}
