import { Star } from "lucide-react";

const styles = {
  Explorer:  "bg-green-400/15  border-green-400/30  text-green-400",
  Navigator: "bg-blue-400/15   border-blue-400/30   text-blue-400",
  Legend:    "bg-yellow-400/15 border-yellow-400/30 text-yellow-400",
};

export default function LevelBadge({ level }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold tracking-wide ${styles[level] ?? styles.Explorer}`}>
      <Star size={10} fill="currentColor" /> {level}
    </span>
  );
}
