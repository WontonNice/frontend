// src/components/DashboardLayout.tsx
import type { PropsWithChildren, ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { Home, Database, Lock, Boxes, Activity, Settings } from "lucide-react";
import LogoutButton from "./LogoutButton";

type LayoutProps = PropsWithChildren<{ title?: string; subtitle?: string }>;

export default function DashboardLayout({
  title = "WontonNice’s Project",
  subtitle,
  children,
}: LayoutProps) {
  return (
    <div className="min-h-screen bg-[#0f1115] text-white antialiased">
      {/* Fixed sidebar overlays on hover; page reserves only 64px */}
      <Sidebar />
      <div className="pl-16"> {/* reserve collapsed width only */}
        <TopBar />
        <Hero title={title} subtitle={subtitle} />
        <main className="mx-auto max-w-7xl px-6 pb-10">{children}</main>
      </div>
    </div>
  );
}

/* ---------- Sidebar: fixed, expands on hover, overlays content ---------- */
function Sidebar() {
  return (
    <aside
      className="
        group
        fixed inset-y-0 left-0 z-40
        w-16 hover:w-64
        overflow-hidden
        transition-[width] duration-300 ease-out
        bg-[#0b0d12] border-r border-white/10
        flex flex-col
      "
    >
      {/* Logo / project chip */}
      <div className="h-14 flex items-center gap-3 px-3 border-b border-white/10">
        <div className="h-7 w-7 rounded bg-emerald-500/80 grid place-items-center text-xs font-bold">
          N
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="text-sm font-semibold leading-4">WontonNice’s Project</div>
          <div className="text-[10px] text-white/60">main · Production</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 space-y-1">
        <SideLink to="/student-dashboard" icon={<Home size={18} />} label="Project overview" />
        <SideLink to="#" icon={<Database size={18} />} label="Database" />
        <SideLink to="#" icon={<Lock size={18} />} label="Authentication" />
        <SideLink to="#" icon={<Boxes size={18} />} label="Storage" />
        <SideLink to="#" icon={<Activity size={18} />} label="Realtime" />
      </nav>

      {/* Bottom section */}
      <div className="mt-auto border-t border-white/10 p-3">
        <SideLink to="#" icon={<Settings size={18} />} label="Project Settings" />
      </div>
    </aside>
  );
}

/* One sidebar item: active highlight + label reveal on hover */
function SideLink({
  to,
  icon,
  label,
}: {
  to: string;
  icon: ReactNode;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "relative w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
          isActive ? "text-white bg-white/10" : "text-white/75 hover:text-white hover:bg-white/5",
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          {/* green rail when active */}
          <span
            className={[
              "absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 rounded bg-emerald-500 transition-opacity",
              isActive ? "opacity-100" : "opacity-0 group-hover:opacity-50",
            ].join(" ")}
          />
          <span className="shrink-0 h-9 w-9 rounded-md grid place-items-center ring-1 ring-white/10 bg-white/5">
            {icon}
          </span>
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap">
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}

/* ---------- Top bar & hero ---------- */
function TopBar() {
  return (
    <header className="sticky top-0 z-20 h-14 bg-[#0f1218]/90 backdrop-blur border-b border-white/10">
      <div className="mx-auto max-w-7xl h-full px-6 flex items-center justify-between">
        <div className="text-sm text-white/60">Last 60 minutes</div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300 ring-1 ring-emerald-500/30">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Project Status
          </span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}

function Hero({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b border-white/10">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-2 text-white/60">{subtitle}</p>}
          </div>
          <div className="hidden md:flex items-center gap-3">
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
