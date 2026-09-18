import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard, Users, Map, ShieldAlert, BarChart2,
  LogOut, Menu, X, ChevronRight, Wallet, ExternalLink,
} from "lucide-react";
import { AdminThemeProvider, AdminThemeToggle } from "./AdminTheme.jsx";
import { officialLogo } from "../../assets/logos";

import Overview        from "./Overview";
import UsersPage       from "./UsersPage";
import TripsPage       from "./TripsPage";
import SafetyPage      from "./SafetyPage";
import LeaderboardPage from "./LeaderboardPage";
import PaymentsPage    from "./PaymentsPage";

const NAV = [
  { id: "overview",    label: "Overview",    Icon: LayoutDashboard, desc: "Platform stats"   },
  { id: "users",       label: "Users",       Icon: Users,           desc: "Manage accounts"  },
  { id: "trips",       label: "Trips",       Icon: Map,             desc: "All trips"        },
  { id: "payments",    label: "Payments",    Icon: Wallet,          desc: "Escrow & payouts" },
  { id: "safety",      label: "Safety",      Icon: ShieldAlert,     desc: "SOS & incidents"  },
  { id: "leaderboard", label: "Leaderboard", Icon: BarChart2,       desc: "Karma rankings"   },
];

const PAGE = {
  overview: Overview, users: UsersPage, trips: TripsPage,
  payments: PaymentsPage, safety: SafetyPage, leaderboard: LeaderboardPage,
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [active,   setActive]   = useState("overview");
  const [sideOpen, setSideOpen] = useState(false);

  if (!user)          return <Navigate to="/signup"   replace />;
  if (!user.is_staff) return <Navigate to="/discover" replace />;

  const ActivePage = PAGE[active] ?? Overview;
  const activeMeta = NAV.find(n => n.id === active);
  const closeSide  = () => setSideOpen(false);

  return (
    <AdminThemeProvider className="flex min-h-screen bg-ground font-sans text-ink">
      {sideOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            style={{ animation: "ttFadeIn .2s ease both" }}
            onClick={closeSide}
          />
          <Sidebar
            active={active}
            setActive={id => { setActive(id); closeSide(); }}
            user={user}
            logout={logout}
          />
        </div>
      )}

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 shrink-0 flex-col md:flex">
        <Sidebar active={active} setActive={setActive} user={user} logout={logout} />
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col md:ml-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-ground/90 px-4 backdrop-blur-md md:px-8">
          <button
            aria-label={sideOpen ? "Close navigation" : "Open navigation"}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink-soft transition-colors hover:border-accent hover:text-accent md:hidden"
            onClick={() => setSideOpen(s => !s)}
          >
            {sideOpen ? <X size={17} /> : <Menu size={17} />}
          </button>

          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[13.5px] text-ink-mute">
            <span className="hidden sm:block">Admin</span>
            <ChevronRight size={14} className="hidden shrink-0 sm:block" />
            <span className="truncate font-semibold text-ink">{activeMeta?.label}</span>
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2.5">
            <a
              href="/discover"
              title="Open the public site"
              className="hidden h-9 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-[13px] font-medium text-ink-soft no-underline transition-colors hover:border-accent hover:text-accent sm:flex"
            >
              View site <ExternalLink size={13} />
            </a>
            <AdminThemeToggle />
            <Avatar user={user} size={34} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div key={active} style={{ animation: "ttFadeUp .3s ease both" }}>
            <ActivePage />
          </div>
        </main>
      </div>
    </AdminThemeProvider>
  );
}

function Avatar({ user, size = 32 }) {
  const initial =
    user.first_name?.[0]?.toUpperCase() ??
    user.username?.[0]?.toUpperCase() ??
    user.email?.[0]?.toUpperCase() ??
    "A";
  return user.avatar_url ? (
    <img
      src={user.avatar_url}
      alt=""
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className="flex shrink-0 select-none items-center justify-center rounded-full bg-accent-soft font-semibold text-accent"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </span>
  );
}

function Sidebar({ active, setActive, user, logout }) {
  return (
    <div className="relative z-50 flex h-full w-64 flex-col border-r border-line bg-surface">
      <div className="flex items-center gap-2.5 border-b border-line px-5 py-5">
        <img
          src={officialLogo}
          alt=""
          className="h-8 w-8 shrink-0"
          onError={e => { e.target.style.display = "none"; }}
        />
        <div className="min-w-0">
          <p className="m-0 truncate font-display text-[15px] font-semibold leading-tight text-ink">
            Travel Together
          </p>
          <p className="m-0 mt-0.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-accent">
            Admin
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="m-0 mb-2.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-mute">
          Navigation
        </p>
        <div className="flex flex-col gap-0.5">
          {NAV.map(({ id, label, Icon, desc }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => setActive(id)}
                aria-current={isActive ? "page" : undefined}
                className={`group flex w-full cursor-pointer items-center gap-3 rounded-xl border-none px-3 py-2.5 text-left transition-colors ${
                  isActive
                    ? "bg-accent-soft text-accent"
                    : "bg-transparent text-ink-soft hover:bg-surface-alt hover:text-ink"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    isActive ? "bg-accent text-accent-ink" : "bg-surface-alt text-ink-mute group-hover:text-ink"
                  }`}
                >
                  <Icon size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[13.5px] font-semibold leading-tight ${isActive ? "text-accent" : ""}`}>
                    {label}
                  </span>
                  <span className="mt-0.5 block truncate text-[11.5px] text-ink-mute">{desc}</span>
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-line px-3 py-4">
        <div className="mb-1 flex items-center gap-3 rounded-xl bg-surface-alt px-3 py-2.5">
          <Avatar user={user} size={30} />
          <div className="min-w-0">
            <p className="m-0 truncate text-[13px] font-semibold text-ink">
              {user.first_name || user.username || "Admin"}
            </p>
            <p className="m-0 truncate text-[11.5px] text-ink-mute">{user.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full cursor-pointer items-center gap-3 rounded-xl border-none bg-transparent px-3 py-2.5 text-[13px] text-ink-mute transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <LogOut size={14} className="shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  );
}
