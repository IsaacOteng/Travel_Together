import { Crown, Compass, Users } from "lucide-react";

export default function RoleBadge({ role }) {
  const cfg = {
    chief:  { label: "Chief",  Icon: Crown,   cls: "bg-accent-soft text-accent" },
    scout:  { label: "Scout",  Icon: Compass, cls: "bg-moss/15 text-moss"       },
    member: { label: "Member", Icon: Users,   cls: "bg-surface-alt text-ink-mute" },
  };
  const { label, Icon, cls } = cfg[role] ?? cfg.member;
  return (
    <span className={`inline-flex items-center gap-1 ${cls} rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]`}>
      <Icon size={9} /> {label}
    </span>
  );
}
