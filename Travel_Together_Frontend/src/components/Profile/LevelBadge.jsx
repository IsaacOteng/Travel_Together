import { Star } from "lucide-react";

const styles = {
  Explorer:  "bg-green-400/12  text-green-400",
  Navigator: "bg-blue-400/12   text-blue-400",
  Legend:    "bg-yellow-400/12 text-yellow-400",
};

export default function LevelBadge({ level }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-widest ${styles[level] ?? styles.Explorer}`}>
      <Star size={9} fill="currentColor" /> {level}
    </span>
  );
}
