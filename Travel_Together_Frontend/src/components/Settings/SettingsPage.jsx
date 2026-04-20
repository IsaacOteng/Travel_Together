import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { authApi, usersApi } from "../../services/api.js";
import AppNav from '../shared/AppNav.jsx';
import MobileBottomNav from '../shared/MobileBottomNav.jsx';
import {
  ArrowLeft, ChevronRight, Shield, Phone, User,
  Trash2, LogOut, Eye, EyeOff,
  Check, X, AlertTriangle, Mail,
  UserCheck, CheckCircle,
} from "lucide-react";

/* ─── SMALL ATOMS ─────────────────────────── */
function SettingRow({ icon: Icon, iconColor = "#FF6B35", label, sub, children, onClick, danger = false }) {
  const base = `flex items-center gap-3 px-4 py-3.5 transition-colors duration-100
    ${onClick ? "cursor-pointer hover:bg-white/[0.04]" : ""}
    ${danger ? "hover:bg-red-500/[0.06]" : ""}`;
  return (
    <div className={base} onClick={onClick}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${iconColor}15`, border: `1px solid ${iconColor}25` }}>
        <Icon size={15} color={danger ? "#f43f5e" : iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-[13px] font-semibold ${danger ? "text-red-400" : "text-white/85"}`}>{label}</div>
        {sub && <div className="text-[11px] text-white/35 mt-0.5 leading-snug">{sub}</div>}
      </div>
      {children}
      {onClick && !children && <ChevronRight size={15} className="text-white/25 flex-shrink-0" />}
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="bg-[#0d1b2a] rounded-2xl border border-white/[0.07] overflow-hidden">
      {title && (
        <div className="px-4 pt-4 pb-2">
          <p className="text-[10px] font-bold tracking-[.12em] uppercase text-white/30">{title}</p>
        </div>
      )}
      <div className="divide-y divide-white/[0.05]">{children}</div>
    </div>
  );
}

/* ─── EMERGENCY CONTACT CARD ──────────────── */
function EmergencyContactCard({ contact, onRemove }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-9 h-9 rounded-full bg-[#FF6B35]/20 border border-[#FF6B35]/30 flex items-center justify-center flex-shrink-0">
        <span className="text-[12px] font-bold text-[#FF6B35] font-serif">
          {contact.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-semibold text-white/85 truncate">{contact.name}</span>
          {contact.verified && <CheckCircle size={12} className="text-green-400 flex-shrink-0" />}
        </div>
        <div className="text-[11px] text-white/35">{contact.dial_code} {contact.phone} · {contact.relationship}</div>
      </div>
      <button onClick={() => onRemove(contact.id)}
        className="w-7 h-7 rounded-lg bg-red-500/[0.08] border border-red-500/20 flex items-center justify-center cursor-pointer hover:bg-red-500/15 transition-colors flex-shrink-0">
        <X size={12} className="text-red-400" />
      </button>
    </div>
  );
}

/* ─── ADD CONTACT MODAL ───────────────────── */
function AddContactModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ name: "", phone: "", dial_code: "+233", relationship: "Parent" });
  const valid = form.name.trim() && form.phone.trim();
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-[2000] flex items-center justify-center p-4"
      style={{ animation: "fadeIn .2s ease" }}>
      <div className="bg-[#0d1b2a] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
        style={{ animation: "slideUp .25s ease" }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[16px] font-light text-white font-serif">Add Emergency Contact</h2>
          <button onClick={onClose} className="bg-transparent border-none cursor-pointer text-white/40 hover:text-white/70"><X size={17} /></button>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1.5">Full Name</label>
            <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Contact's name"
              className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3.5 py-2.5 text-[13px] text-white outline-none focus:border-[#FF6B35]/50 transition-colors placeholder-white/20" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1.5">Phone Number</label>
            <div className="flex gap-2">
              <select value={form.dial_code} onChange={e => setForm(p => ({ ...p, dial_code: e.target.value }))}
                className="bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2.5 text-[13px] text-white outline-none focus:border-[#FF6B35]/50 transition-colors cursor-pointer appearance-none flex-shrink-0">
                {["+233","+1","+44","+27","+234","+254"].map(d => (
                  <option key={d} value={d} className="bg-[#0d1b2a]">{d}</option>
                ))}
              </select>
              <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value.replace(/[^0-9\s\-]/g, "") }))}
                placeholder="24 000 0000"
                className="flex-1 bg-white/[0.06] border border-white/10 rounded-xl px-3.5 py-2.5 text-[13px] text-white outline-none focus:border-[#FF6B35]/50 transition-colors placeholder-white/20" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1.5">Relationship</label>
            <select value={form.relationship} onChange={e => setForm(p => ({ ...p, relationship: e.target.value }))}
              className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3.5 py-2.5 text-[13px] text-white outline-none focus:border-[#FF6B35]/50 transition-colors cursor-pointer appearance-none">
              {["Parent","Guardian","Sibling","Friend","Partner","Other"].map(r => (
                <option key={r} value={r} className="bg-[#0d1b2a]">{r}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/15 bg-transparent text-white/50 text-[13px] font-semibold cursor-pointer hover:bg-white/[0.05] transition-colors">
            Cancel
          </button>
          <button disabled={!valid} onClick={() => { onAdd(form); onClose(); }}
            className="flex-1 py-2.5 rounded-xl bg-[#FF6B35] border-none text-white text-[13px] font-bold cursor-pointer hover:bg-[#e55c28] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(255,107,53,0.3)]">
            Add Contact
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── DELETE ACCOUNT MODAL ────────────────── */
function DeleteModal({ onClose, onDeleted }) {
  const [step,    setStep]    = useState(1);
  const [typed,   setTyped]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [checks,  setChecks]  = useState({ trips: false, media: false, data: false });

  const allChecked = Object.values(checks).every(Boolean);
  const confirmed  = typed === "DELETE MY ACCOUNT";

  const handleDelete = async () => {
    if (!confirmed) return;
    setLoading(true);
    setError("");
    try {
      await authApi.deleteAccount();
      onDeleted();
    } catch {
      setError("Failed to delete account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[2000] flex items-center justify-center p-4"
      style={{ animation: "fadeIn .2s ease" }}>
      <div className="bg-[#0d1b2a] border-2 border-red-500/30 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
        style={{ animation: "slideUp .25s ease" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-shrink-0">
            <Trash2 size={17} className="text-red-400" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-red-400">Delete Account</h2>
            <p className="text-[10px] text-white/35">This cannot be undone</p>
          </div>
        </div>

        {/* Step 1 — acknowledge consequences */}
        {step === 1 && (
          <>
            <p className="text-[12px] text-white/50 leading-relaxed mb-4">
              Before continuing, confirm you understand what will happen to your data.
            </p>
            <div className="flex flex-col gap-2.5 mb-5">
              {[
                { key: "trips", label: "My trips will be removed from all groups" },
                { key: "media", label: "My media will be permanently deleted"     },
                { key: "data",  label: "I have downloaded any data I want to keep" },
              ].map(c => (
                <label key={c.key} className="flex items-start gap-2.5 cursor-pointer group">
                  <div onClick={() => setChecks(p => ({ ...p, [c.key]: !p[c.key] }))}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all cursor-pointer
                      ${checks[c.key] ? "bg-red-500 border-red-500" : "border-white/20 bg-transparent group-hover:border-white/40"}`}>
                    {checks[c.key] && <Check size={11} className="text-white" />}
                  </div>
                  <span className="text-[12px] text-white/55 leading-snug">{c.label}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-white/15 bg-transparent text-white/50 text-[13px] font-semibold cursor-pointer hover:bg-white/[0.05] transition-colors">
                Cancel
              </button>
              <button disabled={!allChecked} onClick={() => setStep(2)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 border-none text-white text-[13px] font-bold cursor-pointer hover:bg-red-600 transition-colors disabled:opacity-35 disabled:cursor-not-allowed">
                Continue
              </button>
            </div>
          </>
        )}

        {/* Step 2 — type confirmation */}
        {step === 2 && (
          <>
            <p className="text-[12px] text-white/50 leading-relaxed mb-3">
              Type <span className="text-red-400 font-bold font-mono">DELETE MY ACCOUNT</span> to confirm.
            </p>
            <input value={typed} onChange={e => setTyped(e.target.value)}
              placeholder="Type here..."
              className="w-full bg-white/[0.06] border border-red-500/25 rounded-xl px-3.5 py-2.5 text-[13px] text-white outline-none focus:border-red-500/50 transition-colors mb-4 placeholder-white/20 font-mono" />

            {error && (
              <p className="text-[11px] text-red-400 mb-3 flex items-center gap-1.5">
                <AlertTriangle size={11} /> {error}
              </p>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="flex-1 py-2.5 rounded-xl border border-white/15 bg-transparent text-white/50 text-[13px] font-semibold cursor-pointer hover:bg-white/[0.05] transition-colors">
                Back
              </button>
              <button disabled={!confirmed || loading}
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-500 border-none text-white text-[13px] font-bold cursor-pointer hover:bg-red-600 transition-colors disabled:opacity-35 disabled:cursor-not-allowed">
                {loading ? "Deleting…" : "Delete Account"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── SIGN OUT CONFIRM MODAL ─────────────── */
function SignOutModal({ onClose, onConfirm }) {
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-[2000] flex items-center justify-center p-4"
      style={{ animation: "fadeIn .2s ease" }}>
      <div className="bg-[#0d1b2a] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center"
        style={{ animation: "slideUp .25s ease" }}>
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
          <LogOut size={20} className="text-red-400" />
        </div>
        <h2 className="text-[16px] font-light text-white font-serif mb-1">Sign out?</h2>
        <p className="text-[12px] text-white/40 mb-6">You'll need to log back in to access your account.</p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white/60 text-[13px] font-semibold cursor-pointer hover:bg-white/10 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-500/80 border-none text-white text-[13px] font-bold cursor-pointer hover:bg-red-500 transition-colors">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── SETTINGS CONTENT ────────────────────── */
function SettingsContent({ contacts, openModal, onRemoveContact, userEmail }) {
  return (
    <div className="flex flex-col gap-5">

      {/* ── EMERGENCY CONTACTS ── */}
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

      {/* ── SECURITY ── */}
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

      {/* ── ACCOUNT ── */}
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

/* ─── ROOT ────────────────────────────────── */
export default function SettingsPage() {
  const navigate  = useNavigate();
  const { user, logout } = useAuth();
  const [winW,     setWinW]    = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  const [contacts, setContacts] = useState([]);
  const [modal,    setModal]   = useState(null);
  const mobile = winW < 1024;

  useEffect(() => {
    const h = () => setWinW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  // Fetch emergency contacts on mount
  useEffect(() => {
    usersApi.getContacts().then(({ data }) => {
      const list = data.results ?? data;
      setContacts(list.map(c => ({
        id:           c.id,
        name:         c.name,
        phone:        c.phone,
        dial_code:    c.dial_code    || "+233",
        relationship: c.relationship || "Other",
        priority:     c.priority     ?? 1,
        verified:     c.is_verified  ?? false,
      })));
    }).catch(() => {});
  }, []);

  async function handleAddContact(formData) {
    try {
      const { data } = await usersApi.addContact({
        name:         formData.name,
        phone:        formData.phone,
        dial_code:    formData.dial_code,
        relationship: formData.relationship,
        priority:     contacts.length + 1,
      });
      setContacts(p => [...p, {
        id:           data.id,
        name:         data.name,
        phone:        data.phone,
        dial_code:    data.dial_code    || "+233",
        relationship: data.relationship || "Other",
        priority:     data.priority     ?? p.length + 1,
        verified:     data.is_verified  ?? false,
      }]);
    } catch (err) {
      console.error("Failed to add emergency contact:", err?.response?.data ?? err);
    }
  }

  async function handleRemoveContact(id) {
    setContacts(p => p.filter(x => x.id !== id));
    usersApi.deleteContact(id).catch(() => {});
  }

  const openModal  = key => setModal(key);
  const closeModal = ()  => setModal(null);

  const handleSignOut = async () => {
    closeModal();
    try { await authApi.logout(); } catch {}
    logout();
  };

  const handleDeleted = () => {
    closeModal();
    try { authApi.logout(); } catch {}
    logout();
  };

  const displayName = user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username || "Traveller" : "Traveller";
  const initials    = displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const userEmail   = user?.email || "";

  const globalStyles = `
    @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
    @keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
    ::-webkit-scrollbar{width:4px}
    ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:99px}
  `;

  const Modals = (
    <>
      {modal === "add_contact" && (
        <AddContactModal onClose={closeModal} onAdd={handleAddContact} />
      )}
      {modal === "delete" && (
        <DeleteModal onClose={closeModal} onDeleted={handleDeleted} />
      )}
      {modal === "signout" && (
        <SignOutModal onClose={closeModal} onConfirm={handleSignOut} />
      )}
    </>
  );

  const contentProps = { contacts, openModal, onRemoveContact: handleRemoveContact, userEmail };

  /* ── MOBILE ── */
  if (mobile) {
    return (
      <div className="min-h-screen bg-[#071422] font-sans pb-[90px]">
        <style>{globalStyles}</style>
        {Modals}

        {/* header */}
        <header className="sticky top-0 z-40 h-14 bg-[#071422]/95 backdrop-blur-xl border-b border-white/[0.06] flex items-center px-4 justify-between">
          <button onClick={() => navigate(-1)} className="bg-transparent border-none cursor-pointer text-white/40 flex p-0">
            <ArrowLeft size={20} />
          </button>
          <span className="text-[15px] font-bold text-white">Settings</span>
          <div className="w-5" />
        </header>

        {/* profile hero */}
        <div className="px-5 pt-7 pb-6 flex flex-col items-center gap-3 border-b border-white/[0.06]">
          <div className="w-16 h-16 bg-[#4ade80] rounded-full flex items-center justify-center font-bold text-white text-xl font-serif shadow-[0_0_24px_rgba(74,222,128,0.2)]">
            {initials}
          </div>
          <div className="text-center">
            <div className="text-[17px] font-bold text-white leading-tight">{displayName}</div>
            <div className="text-[12px] text-white/40 mt-0.5">@{user?.username}</div>
            {userEmail && (
              <div className="text-[11px] text-white/30 mt-1 font-mono">{userEmail}</div>
            )}
          </div>
          {user?.is_verified && (
            <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1">
              <UserCheck size={11} className="text-green-400" />
              <span className="text-[11px] text-green-400/90 font-semibold">Verified traveler</span>
            </div>
          )}
        </div>

        {/* content */}
        <div className="px-4 pt-6 pb-4 flex flex-col gap-5">
          <SettingsContent {...contentProps} />
        </div>

        <MobileBottomNav />
      </div>
    );
  }

  /* ── DESKTOP ── */
  const navItems = [
    { id: "contacts", icon: Phone,  label: "Emergency Contacts" },
    { id: "security", icon: Shield, label: "Security"           },
    { id: "account",  icon: User,   label: "Account"            },
  ];

  return (
    <div className="min-h-screen bg-[#071422] font-sans">
      <style>{globalStyles}</style>
      {Modals}
      <AppNav />

      <div className="max-w-[1100px] mx-auto px-6 py-6 flex gap-6">

        {/* LEFT — sticky nav sidebar */}
        <div className="w-[220px] flex-shrink-0 self-start sticky top-[76px]">
          <div className="bg-[#0d1b2a] border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <p className="text-[10px] font-bold tracking-[.12em] uppercase text-white/30">Settings</p>
            </div>
            <div className="pb-2">
              {navItems.map(item => (
                <div key={item.id}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-white/50">
                  <item.icon size={15} />
                  <span className="text-[12px] font-semibold">{item.label}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-white/[0.06] py-2">
              <button onClick={() => openModal("signout")}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left border-none cursor-pointer text-red-400/70 hover:text-red-400 hover:bg-red-500/[0.05] transition-all">
                <LogOut size={15} />
                <span className="text-[12px] font-semibold">Sign Out</span>
              </button>
            </div>
          </div>

          {/* account info card */}
          <div className="mt-4 bg-[#0d1b2a] border border-white/[0.07] rounded-2xl p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-10 h-10 bg-[#4ade80] rounded-full flex items-center justify-center font-bold text-white text-sm font-serif flex-shrink-0">{initials}</div>
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-white truncate">{displayName}</div>
                <div className="text-[10px] text-white/35 truncate">@{user?.username}</div>
              </div>
            </div>
            {user?.is_verified && (
              <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                <UserCheck size={11} className="text-green-400" />
                <span className="text-green-400/80 font-semibold">Verified traveler</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — settings content */}
        <div className="flex-1 min-w-0">
          <div className="mb-5">
            <h1 className="text-[24px] font-light text-white font-serif tracking-tight">Settings & Privacy</h1>
            <p className="text-[13px] text-white/35 mt-1">Manage your privacy, safety contacts, and account.</p>
          </div>
          <SettingsContent {...contentProps} />
        </div>

      </div>
    </div>
  );
}
