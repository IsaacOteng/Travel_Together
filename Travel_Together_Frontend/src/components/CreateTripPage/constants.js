import { Mountain, Waves, TreePine, UtensilsCrossed, Zap, Globe, Compass, Navigation } from "lucide-react";

export const TAGS = [
  { label: "Hiking",    Icon: Mountain         },
  { label: "Beach",     Icon: Waves            },
  { label: "Nature",    Icon: TreePine         },
  { label: "Food",      Icon: UtensilsCrossed  },
  { label: "Adventure", Icon: Zap              },
  { label: "Cultural",  Icon: Globe            },
  { label: "Wildlife",  Icon: Compass          },
  { label: "Relaxed",   Icon: Navigation       },
];

export const COVER_SUGGESTIONS = [
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
  "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
  "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80",
];

export const COVERS_OPTIONS = [
  "Transport",
  "Accommodation",
  "Meals",
  "Park / entry fees",
  "Equipment rental",
  "Guided tour",
  "Insurance",
];

export const EMPTY_STOP = { name: "", arrival_time: "", radius: 100, note: "" };