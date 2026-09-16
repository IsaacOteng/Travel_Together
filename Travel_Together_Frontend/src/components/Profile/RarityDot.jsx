const map = {
  common:    "bg-ink-mute",
  rare:      "bg-moss",
  epic:      "bg-accent",
  legendary: "bg-sun",
};

export default function RarityDot({ rarity }) {
  return <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${map[rarity] ?? map.common}`} />;
}
