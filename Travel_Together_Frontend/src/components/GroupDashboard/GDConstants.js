export const WS_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/^http/, "ws");

export const AVATAR_COLORS = [
  "bg-[#FF6B35]", "bg-[#4ade80]", "bg-[#a855f7]",
  "bg-[#0ea5e9]", "bg-[#f43f5e]", "bg-[#fbbf24]",
  "bg-[#14b8a6]", "bg-[#ec4899]", "bg-[#6366f1]", "bg-[#84cc16]",
];

export const MARKER_COLORS_HEX = [
  "#FF6B35","#4ade80","#a855f7","#0ea5e9",
  "#f43f5e","#fbbf24","#14b8a6","#ec4899","#6366f1","#84cc16",
];
