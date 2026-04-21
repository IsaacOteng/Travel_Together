import { LogOut, Trash2, Mail } from "lucide-react";
import { SectionCard, SettingRow } from "./atoms.jsx";
import EmergencyContactCard from "./EmergencyContactCard.jsx";

export default function SettingsContent({ contacts, openModal, onRemoveContact, userEmail }) {
  return (
    <div className="flex flex-col gap-5">

      <SectionCard title="Emergency Contacts">
        <div className="px-4 pt-3 pb-1">
          <p className="text-[12px] text-white/45 leading-relaxed">
            These contacts are notified when an SOS alert is triggered with your GPS location.
          </p>
        </div>
        <div className="divide-y divide-white/[0.05]">
          {contacts.map(c => (
            <EmergencyContactCard key={c.id} contact={c} onRemove={onRemoveContact} />
          ))}
          {contacts.length === 0 && (
            <p className="px-4 py-3 text-[12px] text-white/30 italic">No emergency contacts added yet.</p>
          )}
        </div>
        {contacts.length < 3 && (
          <div className="px-4 pb-4 pt-2">
            <button onClick={() => openModal("add_contact")}
              className="w-full py-2.5 rounded-xl border border-dashed border-[#FF6B35]/30 bg-[#FF6B35]/[0.05] text-[#FF6B35]/70 text-[12px] font-semibold cursor-pointer hover:bg-[#FF6B35]/10 hover:text-[#FF6B35] transition-all flex items-center justify-center gap-2">
              <span className="text-lg leading-none">+</span> Add Emergency Contact
            </button>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Security">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "#a855f715", border: "1px solid #a855f725" }}>
            <Mail size={15} color="#a855f7" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-white/85">Email Address</div>
            <div className="text-[11px] text-white/50 mt-0.5 font-mono truncate">{userEmail || "—"}</div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Account">
        <SettingRow icon={LogOut} iconColor="#f43f5e" label="Sign Out"
          sub="Sign out of this device" danger onClick={() => openModal("signout")} />
        <SettingRow icon={Trash2} iconColor="#f43f5e" label="Delete Account"
          sub="Permanently delete your account and all data" danger onClick={() => openModal("delete")} />
      </SectionCard>

      <div className="text-center py-4">
        <p className="text-[11px] text-white/20">Travel Together v1.0.0</p>
      </div>

    </div>
  );
}
