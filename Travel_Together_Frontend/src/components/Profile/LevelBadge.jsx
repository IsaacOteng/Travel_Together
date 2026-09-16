import { Star } from "lucide-react";

/* Three tones rather than one colour per level — the level still reads, but a
   profile badge shouldn't introduce a fourth hue to the palette. */
const styles = {
  Explorer:  "bg-moss/15 text-moss",
  Navigator: "bg-accent-soft text-accent",
  Legend:    "bg-sun/15 text-sun",
};

export default function LevelBadge({ level }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${styles[level] ?? styles.Explorer}`}>
      <Star size={10} fill="currentColor" /> {level}
    </span>
  );
}
