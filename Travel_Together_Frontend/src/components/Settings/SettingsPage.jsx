import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { authApi, usersApi } from "../../services/api.js";
import AppNav from "../shared/AppNav.jsx";
import MobileBottomNav from "../shared/MobileBottomNav.jsx";
import { ArrowLeft, LogOut, Phone, Shield, User, UserCheck } from "lucide-react";
import SettingsContent from "./SettingsContent.jsx";
import AddContactModal from "./AddContactModal.jsx";
import DeleteModal from "./DeleteModal.jsx";
import SignOutModal from "./SignOutModal.jsx";

const globalStyles = `
  @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
  @keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  ::-webkit-scrollbar{width:4px}
  ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:99px}
`;

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

  const Modals = (
    <>
      {modal === "add_contact" && <AddContactModal onClose={closeModal} onAdd={handleAddContact} />}
      {modal === "delete"      && <DeleteModal     onClose={closeModal} onDeleted={handleDeleted} />}
      {modal === "signout"     && <SignOutModal     onClose={closeModal} onConfirm={handleSignOut} />}
    </>
  );

  const contentProps = { contacts, openModal, onRemoveContact: handleRemoveContact, userEmail };

  if (mobile) {
    return (
      <div className="min-h-screen bg-[#071422] font-sans pb-[90px]">
        <style>{globalStyles}</style>
        {Modals}
        <header className="sticky top-0 z-40 h-14 bg-[#071422]/95 backdrop-blur-xl border-b border-white/[0.06] flex items-center px-4 justify-between">
          <button onClick={() => navigate(-1)} className="bg-transparent border-none cursor-pointer text-white/40 flex p-0">
            <ArrowLeft size={20} />
          </button>
          <span className="text-[15px] font-bold text-white">Settings</span>
          <div className="w-5" />
        </header>
        <div className="px-5 pt-7 pb-6 flex flex-col items-center gap-3 border-b border-white/[0.06]">
          {user?.avatar_url
            ? <img src={user.avatar_url} alt={displayName} className="w-16 h-16 rounded-full object-cover shadow-[0_0_24px_rgba(74,222,128,0.2)]" />
            : <div className="w-16 h-16 bg-[#4ade80] rounded-full flex items-center justify-center font-bold text-white text-xl font-serif shadow-[0_0_24px_rgba(74,222,128,0.2)]">{initials}</div>
          }
          <div className="text-center">
            <div className="text-[17px] font-bold text-white leading-tight">{displayName}</div>
            <div className="text-[12px] text-white/40 mt-0.5">@{user?.username}</div>
            {userEmail && <div className="text-[11px] text-white/30 mt-1 font-mono">{userEmail}</div>}
          </div>
          {user?.is_verified && (
            <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1">
              <UserCheck size={11} className="text-green-400" />
              <span className="text-[11px] text-green-400/90 font-semibold">Verified traveler</span>
            </div>
          )}
        </div>
        <div className="px-4 pt-6 pb-4 flex flex-col gap-5">
          <SettingsContent {...contentProps} />
        </div>
        <MobileBottomNav />
      </div>
    );
  }

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
          <div className="mt-4 bg-[#0d1b2a] border border-white/[0.07] rounded-2xl p-4">
            <div className="flex items-center gap-2.5 mb-3">
              {user?.avatar_url
                ? <img src={user.avatar_url} alt={displayName} className="w-10 h-10 rounded-full object-cover shrink-0" />
                : <div className="w-10 h-10 bg-[#4ade80] rounded-full flex items-center justify-center font-bold text-white text-sm font-serif shrink-0">{initials}</div>
              }
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
