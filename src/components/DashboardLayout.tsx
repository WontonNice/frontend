// src/components/DashboardLayout.tsx
import { useState, type PropsWithChildren, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useRef, useEffect } from "react";
import {
  Home,
  Database,
  Lock,
  Boxes,
  Activity,
  Settings,
} from "lucide-react";
import LogoutButton from "./LogoutButton";

type LayoutProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
}>;

export default function DashboardLayout({
  title = "WontonNice’s Project",
  subtitle,
  children,
}: LayoutProps) {
  return (
    <div className="min-h-screen bg-[#0f1115] text-white antialiased flex">
      <Sidebar />

      <div className="flex-1 pl-16 transition-all duration-300">
        <TopBar />
        <Hero title={title} subtitle={subtitle} />
        <main className="mx-auto max-w-7xl px-6 pb-10">{children}</main>
      </div>
    </div>
  );
}

/* ---------- Sidebar ---------- */
function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <aside
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/10 bg-[#0b0d12] transition-all duration-300 ease-out ${
        open ? "w-64" : "w-16"
      }`}
    >
      {/* Header / Project badge */}
      <div className="flex items-center gap-3 border-b border-white/10 px-3 h-14">
        <div className="grid h-7 w-7 place-items-center rounded bg-emerald-500/80 text-xs font-bold">
          N
        </div>
        <div
          className={`transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="text-sm font-semibold leading-4">
            WontonNice’s Project
          </div>
          <div className="text-[10px] text-white/60">main · Production</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 space-y-1">
        <SideLink to="/student-dashboard" icon={<Home size={18} />} label="Project overview" open={open} />
        <SideLink to="#" icon={<Database size={18} />} label="Database" open={open} />
        <SideLink to="#" icon={<Lock size={18} />} label="Authentication" open={open} />
        <SideLink to="#" icon={<Boxes size={18} />} label="Storage" open={open} />
        <SideLink to="#" icon={<Activity size={18} />} label="Realtime" open={open} />
      </nav>

      {/* Footer */}
      <div className="mt-auto border-t border-white/10 p-3">
        <SideLink to="#" icon={<Settings size={18} />} label="Project Settings" open={open} />
      </div>
    </aside>
  );
}

function SideLink({
  to,
  icon,
  label,
  open,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  open: boolean;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
          isActive
            ? "bg-white/10 text-white"
            : "text-white/70 hover:text-white hover:bg-white/5"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {/* Active rail */}
          <span
            className={`absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 rounded bg-emerald-500 transition-opacity ${
              isActive ? "opacity-100" : "opacity-0"
            }`}
          />
          {/* Icon */}
          <span className="grid h-9 w-9 place-items-center rounded-md ring-1 ring-white/10 bg-white/5">
            {icon}
          </span>
          {/* Label */}
          <span
            className={`whitespace-nowrap transition-opacity duration-150 ${
              open ? "opacity-100" : "opacity-0"
            }`}
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}

/* ---------- Top bar ---------- */
/* ---------- Top bar ---------- */
function TopBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <header className="sticky top-0 z-20 h-14 bg-[#0f1218]/90 backdrop-blur border-b border-white/10">
      <div className="mx-auto max-w-7xl h-full px-6 flex items-center justify-between">
        <div className="text-sm text-white/60">Last 60 minutes</div>

        <div className="flex items-center gap-3 relative" ref={menuRef}>
          {/* Project status pill */}
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300 ring-1 ring-emerald-500/30">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Project Status
          </span>

          {/* Profile avatar */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="relative h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white text-sm font-semibold flex items-center justify-center hover:opacity-90"
          >
            {user?.username?.[0]?.toUpperCase() || "?"}
          </button>

          {/* Dropdown menu */}
          {menuOpen && (
            <div className="absolute right-0 top-10 w-64 bg-[#1a1c22] border border-white/10 rounded-xl shadow-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10">
                <div className="text-sm font-semibold text-white">{user?.username || "User"}</div>
                <div className="text-xs text-white/50">{user?.email || "user@example.com"}</div>
              </div>

              <ul className="py-1 text-sm text-white/80">
                <li className="px-4 py-2 hover:bg-white/5 cursor-pointer">Account preferences</li>
                <li className="px-4 py-2 hover:bg-white/5 cursor-pointer">Feature previews</li>
                <li className="px-4 py-2 hover:bg-white/5 cursor-pointer">Command menu</li>
              </ul>

              <div className="border-t border-white/10 py-1">
                <div className="px-4 py-2 text-xs text-white/50 uppercase tracking-wide">Theme</div>
                <ul className="text-sm text-white/80">
                  <li className="px-4 py-2 hover:bg-white/5 cursor-pointer">Dark</li>
                  <li className="px-4 py-2 hover:bg-white/5 cursor-pointer">Light</li>
                  <li className="px-4 py-2 hover:bg-white/5 cursor-pointer">Classic Dark</li>
                  <li className="px-4 py-2 hover:bg-white/5 cursor-pointer">System</li>
                </ul>
              </div>

              <div className="border-t border-white/10 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 cursor-pointer">
                <LogoutButton />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ---------- Hero ---------- */
function Hero({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b border-white/10">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              {title}
            </h1>
            {subtitle && <p className="mt-2 text-white/60">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-3">
            <InfoPill label="Tables" value="1" />
            <InfoPill label="Functions" value="0" />
            <InfoPill label="Replicas" value="0" />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#121419] ring-1 ring-white/10 px-3 py-2 text-center">
      <div className="text-xs text-white/60">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
