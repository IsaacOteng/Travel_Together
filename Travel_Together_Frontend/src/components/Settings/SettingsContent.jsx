import { LogOut, Trash2, Mail, Plus, ShieldAlert } from "lucide-react";
import { SectionCard, SettingRow } from "./atoms.jsx";
import EmergencyContactCard from "./EmergencyContactCard.jsx";
import PayoutMethodCard from "./PayoutMethodCard.jsx";

/* The page used to be one long scroll with a left nav that didn't navigate —
   three plain <div>s with no handler. Content is now split into real sections
   the nav can actually switch between. */

export function SafetySection({ contacts, openModal, onRemoveContact }) {
  return (
    <div className="flex flex-col gap-5">
      <SectionCard
        title="Emergency contacts"
        description="These people are notified with your GPS location when you trigger an SOS."
      >
        {contacts.length === 0 ? (
          <div className="flex items-start gap-3 px-5 py-5">
            <ShieldAlert size={18} className="mt-0.5 shrink-0 text-accent" />
            <div>
              <p className="m-0 text-[14px] font-semibold text-ink">No contacts yet</p>
              <p className="m-0 mt-1 text-[13px] leading-relaxed text-ink-soft">
                An SOS can still alert your group, but nobody outside the trip
                will be told. Add at least one person.
              </p>
            </div>
          </div>
        ) : (
          contacts.map(c => (
            <EmergencyContactCard key={c.id} contact={c} onRemove={onRemoveContact} />
          ))
        )}
      </SectionCard>

      {contacts.length < 3 && (
        <button
          onClick={() => openModal("add_contact")}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-transparent py-3.5 text-[14px] font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent"
        >
          <Plus size={16} /> Add emergency contact
        </button>
      )}
      <p className="m-0 text-[12.5px] text-ink-mute">
        You can add up to three. They're never shown to other travellers.
      </p>
    </div>
  );
}

export function PayoutsSection() {
  return (
    <div className="flex flex-col gap-5">
      <PayoutMethodCard />
      <p className="m-0 text-[12.5px] leading-relaxed text-ink-mute">
        Only needed if you organise paid trips. Payouts are released after a
        trip completes.
      </p>
    </div>
  );
}

export function AccountSection({ userEmail, openModal }) {
  return (
    <div className="flex flex-col gap-5">
      <SectionCard title="Sign-in">
        <div className="flex items-center gap-3.5 px-5 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Mail size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[14px] font-semibold text-ink">Email address</p>
            <p className="m-0 mt-0.5 truncate text-[13px] text-ink-soft">{userEmail || "—"}</p>
          </div>
        </div>
        <p className="m-0 px-5 pb-4 text-[12.5px] text-ink-mute">
          You sign in with a six-digit code sent to this address. There's no password to change.
        </p>
      </SectionCard>

      <SectionCard title="Account">
        <SettingRow
          icon={LogOut} label="Sign out" sub="Sign out on this device"
          onClick={() => openModal("signout")}
        />
        <SettingRow
          icon={Trash2} label="Delete account"
          sub="Permanently removes your account, trips and messages"
          danger onClick={() => openModal("delete")}
        />
      </SectionCard>

      <p className="m-0 text-center text-[12px] text-ink-mute">Travel Together v1.0.0</p>
    </div>
  );
}
