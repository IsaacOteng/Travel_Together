import {
  AlertTriangle, UserCheck, CheckCircle, XCircle,
  MessageCircle, Star, Clock, MapPin,
  CreditCard, Wallet, RotateCcw,
} from "lucide-react";

/* Three tones, not fourteen colours. The old config gave every type its own
   hue, so a karma bump looked as loud as an SOS. Tone now carries meaning:
   `alert` needs attention, `good` is a confirmation, `plain` is information.
   `action` is the thing this notification is asking you to do — surfacing it
   is the whole point of the panel. */
export const TYPE_CFG = {
  sos_alert:         { Icon: AlertTriangle, tone: "alert", action: "View group"  },
  join_request:      { Icon: UserCheck,     tone: "alert"                        },
  join_approved:     { Icon: CheckCircle,   tone: "good",  action: "View trip"   },
  approved:          { Icon: CheckCircle,   tone: "good",  action: "View trip"   },
  join_declined:     { Icon: XCircle,       tone: "plain"                        },
  chat_message:      { Icon: MessageCircle, tone: "plain", action: "Open chat"   },
  karma_level:       { Icon: Star,          tone: "good",  action: "View profile"},
  trip_reminder:     { Icon: Clock,         tone: "plain", action: "View trip"   },
  trip_ended:        { Icon: CheckCircle,   tone: "plain", action: "Rate crew"   },
  proximity_warning: { Icon: MapPin,        tone: "alert", action: "View group"  },
  review_reminder:   { Icon: Star,          tone: "plain", action: "Rate crew"   },
  payment_due:       { Icon: CreditCard,    tone: "alert", action: "Pay now"     },
  payment_received:  { Icon: CheckCircle,   tone: "good"                         },
  payment_failed:    { Icon: XCircle,       tone: "alert", action: "Try again"   },
  refund_processed:  { Icon: RotateCcw,     tone: "good"                         },
  payout_released:   { Icon: Wallet,        tone: "good"                         },
  trip_cancelled:    { Icon: XCircle,       tone: "alert", action: "View trip"   },
  report_filed:      { Icon: AlertTriangle, tone: "alert", action: "View group"  },
};

export const TONE_CLS = {
  alert: "bg-accent-soft text-accent",
  good:  "bg-moss/15 text-moss",
  plain: "bg-surface-alt text-ink-mute",
};

export const css = `
  @keyframes npDropIn {
    from { opacity: 0; transform: translateY(-10px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0)     scale(1);    }
  }
  @keyframes npSlideUp {
    from { transform: translateY(100%); }
    to   { transform: translateY(0);    }
  }
  .np-scroll::-webkit-scrollbar { width: 4px; }
  .np-scroll::-webkit-scrollbar-track { background: transparent; }
  .np-scroll::-webkit-scrollbar-thumb { background: var(--tt-line); border-radius: 4px; }
`;
