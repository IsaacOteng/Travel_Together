import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard, Users, Map, ShieldAlert, BarChart2, LogOut, Menu, X,
} from "lucide-react";

import Overview    from "./Overview";
import UsersPage   from "./UsersPage";
import TripsPage   from "./TripsPage";
import SafetyPage  from "./SafetyPage";
import LeaderboardPage from "./LeaderboardPage";

const NAV = [
  { id: "overview",     label: "Overview",    Icon: LayoutDashboard },
  { id: "users",        label: "Users",       Icon: Users           },
  { id: "trips",        label: "Trips",       Icon: Map             },
  { id: "safety",       label: "Safety",      Icon: ShieldAlert     },
  { id: "leaderboard",  label: "Leaderboard", Icon: BarChart2       },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [active,  setActive]  = useState("overview");
  const [sideOpen, setSideOpen] = useState(false);

  if (!user) return <Navigate to="/signup" replace />;
  if (!user.is_staff) return <Navigate to="/discover" replace />;

  const Page = {
    overview:    Overview,
    users:       UsersPage,
    trips:       TripsPage,
    safety:      SafetyPage,
    leaderboard: LeaderboardPage,
  }[active] ?? Overview;

  const NavItem = ({ id, label, Icon }) => (
    <button
      onClick={() => { setActive(id); setSideOpen(false); }}
      className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
        ${active === id
          ? "bg-[#FF6B35] text-white"
          : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
    >
      <Icon size={18} />
      {label}
    </button>
  );

  const Sidebar = () => (
    <div className="flex flex-col h-full py-6 px-3 gap-1">
      <div className="px-4 mb-6">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Admin</p>
        <p className="text-white font-bold text-lg">Travel Together</p>
      </div>
      {NAV.map(n => <NavItem key={n.id} {...n} />)}
      <div className="mt-auto">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#071422] flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-[#0b1e30] border-r border-white/5 flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sideOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSideOpen(false)} />
          <aside className="relative z-50 w-56 bg-[#0b1e30] border-r border-white/5">
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-4 px-4 md:px-8 h-14 border-b border-white/5 bg-[#071422] flex-shrink-0">
          <button
            className="md:hidden text-slate-400 hover:text-white"
            onClick={() => setSideOpen(s => !s)}
          >
            {sideOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="text-white font-semibold text-sm">
            {NAV.find(n => n.id === active)?.label}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#FF6B35] flex items-center justify-center text-white text-xs font-bold select-none">
              {user.first_name?.[0] ?? user.email?.[0] ?? "A"}
            </div>
            <span className="text-slate-400 text-xs hidden sm:block">{user.email}</span>
          </div>
        </header>

        {/* Page body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Page />
        </main>
      </div>
    </div>
  );
}
