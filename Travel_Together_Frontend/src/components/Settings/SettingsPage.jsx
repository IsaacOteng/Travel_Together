import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { authApi, usersApi } from "../../services/api.js";
import AppNav from "../shared/AppNav.jsx";
import MobileBottomNav from "../shared/MobileBottomNav.jsx";
import ThemeToggle from "../shared/ThemeToggle.jsx";
import { ArrowLeft, ShieldAlert, Wallet, User, UserCheck } from "lucide-react";
import { SafetySection, PayoutsSection, AccountSection } from "./SettingsContent.jsx";
import AddContactModal from "./AddContactModal.jsx";
import DeleteModal from "./DeleteModal.jsx";
import SignOutModal from "./SignOutModal.jsx";
import { displayName } from "../../utils/name.js";

/* The old left column listed Emergency Contacts / Security / Account as three
   plain <div>s with no handler — it looked like navigation and did nothing,
   while the content sat in one long scroll. These now actually switch. */
const SECTIONS = [
  { id: "safety",  icon: ShieldAlert, label: "Safety",  sub: "Emergency contacts" },
  { id: "payouts", icon: Wallet,      label: "Payouts", sub: "Where you get paid" },
  { id: "account", icon: User,        label: "Account", sub: "Email and sign-out" },
];

export default function SettingsPage() {
  const navigate  = useNavigate();
  const { user, logout } = useAuth();
  const [winW,     setWinW]     = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  const [contacts, setContacts] = useState([]);
  const [modal,    setModal]    = useState(null);
  const [section,  setSection]  = useState("safety");
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
      if (import.meta.env.DEV) console.error("Failed to add emergency contact:", err?.response?.data ?? err);
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
    try { await authApi.logout(); } catch { /* the local session is cleared regardless */ }
    logout();
  };

  const handleDeleted = () => {
    closeModal();
    try { authApi.logout(); } catch { /* same */ }
    logout();
  };

  const name      = displayName(user);
  const initials  = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const userEmail = user?.email || "";

  const Modals = (
    <>
      {modal === "add_contact" && <AddContactModal onClose={closeModal} onAdd={handleAddContact} />}
      {modal === "delete"      && <DeleteModal     onClose={closeModal} onDeleted={handleDeleted} />}
      {modal === "signout"     && <SignOutModal    onClose={closeModal} onConfirm={handleSignOut} />}
    </>
  );

  const panel =
    section === "payouts" ? <PayoutsSection />
    : section === "account" ? <AccountSection userEmail={userEmail} openModal={openModal} />
    : <SafetySection contacts={contacts} openModal={openModal} onRemoveContact={handleRemoveContact} />;

  const nav = (
    <nav className="scrollbar-none flex gap-2 overflow-x-auto lg:flex-col lg:gap-1 lg:overflow-visible" role="tablist">
      {SECTIONS.map(s => {
        const active = section === s.id;
        return (
          <button
            key={s.id}
            role="tab"
            aria-selected={active}
            onClick={() => setSection(s.id)}
            className={`flex shrink-0 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors lg:w-full lg:border-transparent lg:bg-transparent ${
              active
                ? "border-accent bg-accent text-accent-ink lg:bg-accent-soft lg:text-accent"
                : "border-line bg-surface text-ink-soft hover:border-accent hover:text-accent lg:hover:bg-surface-alt"
            }`}
          >
            <s.icon size={17} className="shrink-0" />
            <span className="min-w-0">
              <span className="block whitespace-nowrap text-[14px] font-semibold">{s.label}</span>
              <span className={`hidden text-[12.5px] lg:block ${active ? "text-accent/70" : "text-ink-mute"}`}>
                {s.sub}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );

  const identity = (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
      {user?.avatar_url
        ? <img src={user.avatar_url} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
        : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[14px] font-semibold text-accent">{initials}</span>
      }
      <div className="min-w-0 flex-1">
        <p className="m-0 truncate text-[14px] font-semibold text-ink">{name}</p>
        <p className="m-0 truncate text-[12.5px] text-ink-mute">@{user?.username}</p>
      </div>
      {user?.is_verified && (
        <span title="Verified traveller" className="shrink-0 text-moss"><UserCheck size={16} /></span>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-ground font-sans">
      {Modals}

      {mobile ? (
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-ground/95 px-4 backdrop-blur-md">
          <button onClick={() => navigate(-1)} aria-label="Go back"
            className="flex cursor-pointer border-none bg-transparent p-0 text-ink-soft">
            <ArrowLeft size={20} />
          </button>
          <span className="font-display text-[16px] font-semibold text-ink">Settings</span>
          <ThemeToggle />
        </header>
      ) : (
        <AppNav />
      )}

      <div className={mobile ? "px-4 pb-28 pt-5" : "tt-shell block py-9"}>
        <header className="mb-7">
          <h1 className="m-0 font-display text-[clamp(26px,3.2vw,36px)] font-semibold leading-tight text-ink">
            Settings
          </h1>
          <p className="m-0 mt-2 text-[15px] text-ink-soft">
            Safety contacts, payouts and your account.
          </p>
        </header>

        <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:gap-10">
          <aside className="flex w-full shrink-0 flex-col gap-4 lg:sticky lg:top-24 lg:w-62.5">
            {nav}
            <div className="hidden lg:block">{identity}</div>
          </aside>

          <main className="min-w-0 flex-1" key={section} style={{ animation: "ttFadeUp .3s ease both" }}>
            {panel}
          </main>
        </div>
      </div>

      {mobile && <MobileBottomNav />}
    </div>
  );
}
