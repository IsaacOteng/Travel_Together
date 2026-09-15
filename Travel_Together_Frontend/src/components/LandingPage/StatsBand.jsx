import { STATS } from "./constants.js";

/* Deliberately static. Count-up animations on four numbers are the
   single loudest "generated landing page" tell. */
export default function StatsBand() {
  return (
    <section className="border-y border-line bg-ground-alt">
      <div className="mx-auto grid max-w-[1180px] grid-cols-2 gap-y-8 px-6 py-12 md:grid-cols-4 md:divide-x md:divide-line">
        {STATS.map(s => (
          <div key={s.label} className="px-2 text-center md:px-6">
            <div className="font-display text-[34px] font-semibold leading-none text-ink">
              {s.val}
            </div>
            <div className="mt-2 text-[12px] uppercase tracking-[0.13em] text-ink-mute">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
