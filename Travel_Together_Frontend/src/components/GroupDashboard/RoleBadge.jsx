import { Crown, Compass, Users } from "lucide-react";

export default function RoleBadge({ role }) {
  const cfg = {
    chief:  { label: "Chief",  Icon: Crown,   cls: "bg-[#FF6B35]/10 text-[#FF6B35]/75 border border-[#FF6B35]/15" },
    scout:  { label: "Scout",  Icon: Compass, cls: "bg-white/[0.06] text-white/45 border border-white/[0.09]"      },
    member: { label: "Member", Icon: Users,   cls: "bg-white/[0.04] text-white/30 border border-white/[0.06]"      },
  };
  const { label, Icon, cls } = cfg[role] ?? cfg.member;
  return (
    <span className={`inline-flex items-center gap-1 ${cls} rounded-full px-2 py-px text-[9px] font-bold tracking-wider uppercase`}>
      <Icon size={8} /> {label}
    </span>
  );
}
