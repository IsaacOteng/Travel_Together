export const WS_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/^http/, "ws");

/* Monograms use the single brand accent. The old eight-colour rainbow made
   every avatar a different hue, which read as noise rather than identity. */
export const AV_COLORS = ["bg-accent-soft"];
