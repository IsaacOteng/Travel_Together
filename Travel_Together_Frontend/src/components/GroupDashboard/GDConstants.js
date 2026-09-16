export const WS_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/^http/, "ws");

/* Monograms use the one accent tint — the ten-colour rotation made a member
   list read as a chart. Map markers keep distinct hues, because there the
   colour is the only thing telling two pins apart. */
export const AVATAR_COLORS = ["bg-accent-soft"];

export const MARKER_COLORS_HEX = [
  "#B8552F", "#3D6B52", "#C69034", "#2F6D8C",
  "#8C4A6B", "#6B7F3D", "#A0562F", "#4A5D8C", "#7A5C9E", "#3F7F6F",
];
