const map = { common: "bg-white/30", rare: "bg-blue-400", epic: "bg-purple-400", legendary: "bg-yellow-400" };

export default function RarityDot({ rarity }) {
  return <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${map[rarity]}`} />;
}
