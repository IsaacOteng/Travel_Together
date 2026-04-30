import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard, Users, Map, ShieldAlert, BarChart2,
  LogOut, Menu, X, ChevronRight,
} from "lucide-react";

import Overview       from "./Overview";
import UsersPage      from "./UsersPage";
import TripsPage      from "./TripsPage";
import SafetyPage     from "./SafetyPage";
import LeaderboardPage from "./LeaderboardPage";

const NAV = [
  { id: "overview",    label: "Overview",    Icon: LayoutDashboard, desc: "Platform stats" },
  { id: "users",       label: "Users",       Icon: Users,           desc: "Manage accounts" },
  { id: "trips",       label: "Trips",       Icon: Map,             desc: "All trips"       },
  { id: "safety",      label: "Safety",      Icon: ShieldAlert,     desc: "SOS & incidents" },
  { id: "leaderboard", label: "Leaderboard", Icon: BarChart2,       desc: "Karma rankings"  },
];

const PAGE = { overview: Overview, users: UsersPage, trips: TripsPage, safety: SafetyPage, leaderboard: LeaderboardPage };

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [active,   setActive]   = useState("overview");
  const [sideOpen, setSideOpen] = useState(false);

  if (!user)          return <Navigate to="/signup"   replace />;
  if (!user.is_staff) return <Navigate to="/discover" replace />;

  const ActivePage = PAGE[active] ?? Overview;
  const activeMeta = NAV.find(n => n.id === active);

  const closeSide = () => setSideOpen(false);

  return (
    <div className="min-h-screen bg-[#060f1a] flex text-sm">

      {/* ── Mobile overlay ── */}
      {sideOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeSide} />
          <Sidebar active={active} setActive={id => { setActive(id); closeSide(); }} user={user} logout={logout} />
        </div>
      )}

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-60 flex-col shrink-0 fixed inset-y-0 left-0 z-30">
        <Sidebar active={active} setActive={setActive} user={user} logout={logout} />
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-h-screen md:ml-60">

        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center gap-3 px-4 md:px-8 h-14
          bg-[#060f1a]/80 backdrop-blur border-b border-white/[0.06]">
          <button
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            onClick={() => setSideOpen(s => !s)}
          >
            {sideOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-slate-500">
            <span className="hidden sm:block">Admin</span>
            <ChevronRight size={14} className="hidden sm:block" />
            <span className="text-white font-medium">{activeMeta?.label}</span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-white text-xs font-medium leading-none">{user.first_name || user.username || "Admin"}</span>
              <span className="text-slate-500 text-xs mt-0.5">{user.email}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-[#FF6B35] to-[#e0531f] flex items-center justify-center text-white text-xs font-bold select-none shadow-lg">
              {user.first_name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "A"}
            </div>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <ActivePage />
        </main>
      </div>
    </div>
  );
}

/* ── Sidebar component ─────────────────────────────────────────────────────── */
function Sidebar({ active, setActive, user, logout }) {
  return (
    <div className="relative z-50 w-60 h-full bg-[#0a1929] border-r border-white/[0.06] flex flex-col">

      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-linear-to-br from-[#FF6B35] to-[#e0531f] flex items-center justify-center shrink-0">
            <Map size={14} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">Travel Together</p>
            <p className="text-slate-500 text-[10px] mt-0.5 uppercase tracking-widest">Admin</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-slate-600 text-[10px] font-semibold uppercase tracking-widest px-3 mb-3">Navigation</p>
        {NAV.map(({ id, label, Icon, desc }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150
                ${isActive
                  ? "bg-[#FF6B35]/15 text-[#FF6B35]"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors
                ${isActive ? "bg-[#FF6B35]/20" : "bg-white/[0.04] group-hover:bg-white/[0.08]"}`}>
                <Icon size={16} />
              </div>
              <div className="text-left min-w-0">
                <p className={`font-medium text-xs leading-none ${isActive ? "text-[#FF6B35]" : ""}`}>{label}</p>
                <p className="text-slate-600 text-[10px] mt-0.5 truncate">{desc}</p>
              </div>
              {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#FF6B35] shrink-0" />}
            </button>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="px-3 py-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] mb-1">
          <div className="w-7 h-7 rounded-full bg-linear-to-br from-[#FF6B35] to-[#e0531f] flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user.first_name?.[0]?.toUpperCase() ?? "A"}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium truncate">{user.first_name || user.username || "Admin"}</p>
            <p className="text-slate-500 text-[10px] truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/[0.08] transition-colors"
        >
          <LogOut size={14} />
          <span className="text-xs">Sign out</span>
        </button>
      </div>
    </div>
  );
}
