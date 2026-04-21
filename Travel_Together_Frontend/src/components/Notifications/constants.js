import {
  AlertTriangle, UserCheck, CheckCircle, XCircle,
  MessageCircle, Star, Clock, MapPin, Bell,
} from "lucide-react";

export const TYPE_CFG = {
  sos_alert:         { Icon: AlertTriangle, color: "#ef4444", bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.25)"   },
  join_request:      { Icon: UserCheck,     color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.25)"  },
  join_approved:     { Icon: CheckCircle,   color: "#4ade80", bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.25)"  },
  approved:          { Icon: CheckCircle,   color: "#4ade80", bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.25)"  },
  join_declined:     { Icon: XCircle,       color: "#f87171", bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.25)" },
  chat_message:      { Icon: MessageCircle, color: "#FF6B35", bg: "rgba(255,107,53,0.12)",  border: "rgba(255,107,53,0.25)"  },
  karma_level:       { Icon: Star,          color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.25)"  },
  trip_reminder:     { Icon: Clock,         color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.25)"  },
  trip_ended:        { Icon: CheckCircle,   color: "#a78bfa", bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.25)" },
  proximity_warning: { Icon: MapPin,        color: "#fb923c", bg: "rgba(251,146,60,0.12)",  border: "rgba(251,146,60,0.25)"  },
  review_reminder:   { Icon: Star,          color: "#FF6B35", bg: "rgba(255,107,53,0.12)",  border: "rgba(255,107,53,0.25)"  },
};

export const PANEL_BG = "#09162a";

export const css = `
  @keyframes npDropIn {
    from { opacity: 0; transform: translateY(-10px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0)     scale(1);    }
  }
  @keyframes npSlideUp {
    from { transform: translateY(100%); }
    to   { transform: translateY(0);    }
  }
  @keyframes npFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .np-item { transition: background 150ms; }
  .np-item:hover { background: rgba(255,255,255,0.04) !important; }
  .np-scroll::-webkit-scrollbar { width: 4px; }
  .np-scroll::-webkit-scrollbar-track { background: transparent; }
  .np-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
`;
