import React from "react";
import type { PropsWithChildren } from "react";
import { useNavigate } from "react-router-dom";
import { Home, Table, Database, Lock, Boxes, Activity, Settings } from "lucide-react";
import LogoutButton from "./LogoutButton";

type LayoutProps = PropsWithChildren<{ title: string }>;

export default function DashboardLayout({ title, children }: LayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0f1115] text-white flex">
      {/* Sidebar (collapses; expands on hover) */}
      <aside
        className="
          group
          sticky top-0 h-screen
          w-16 hover:w-64
          transition-[width] duration-300 ease-out
          bg-[#0b0d12] border-r border-white/10
          flex flex-col
          z-20
        "
      >
        {/* Logo / Project Name */}
        <div
          className="
            h-14 flex items-center gap-2 px-3
            border-b border-white/10
          "
        >
          <div className="h-7 w-7 rounded bg-emerald-500/80 flex items-center justify-center text-xs font-bold">
            N
          </div>
          <div className="whitespace-nowrap overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="text-sm font-semibold leading-4">WontonNice's Project</div>
            <div className="text-[10px] text-white/60">Production · NANO</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 space-y-1">
          <SideItem icon={<Home size={18} />} label="Overview" onClick={() => navigate("/student-dashboard")} />
          <SideItem icon={<Table size={18} />} label="Table Editor" />
          <SideItem icon={<Database size={18} />} label="Database" />
          <SideItem icon={<Lock size={18} />} label="Auth" />
          <SideItem icon={<Boxes size={18} />} label="Storage" />
          <SideItem icon={<Activity size={18} />} label="Realtime" />
        </nav>

        {/* Bottom section */}
        <div className="border-t border-white/10 p-3">
          <SideItem icon={<Settings size={18} />} label="Project Settings" />
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-[#0f1218]/80 backdrop-blur">
          <div className="text-lg font-semibold">{title}</div>

          <div className="flex items-center gap-3">
            {/* Example “status pill” (green dot) */}
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300 ring-1 ring-emerald-500/30">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Project Status
            </span>

            <LogoutButton />
          </div>
        </header>

        {/* Content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

/** A single sidebar line item that reveals text when the sidebar expands */
function SideItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        group/item w-full
        flex items-center gap-3
        px-3 py-2 text-sm
        text-white/80 hover:text-white
        hover:bg-white/5
        transition-colors
      "
    >
      <span className="shrink-0 h-9 w-9 rounded-md bg-white/5 grid place-items-center ring-1 ring-white/10">
        {icon}
      </span>

      {/* Label fades in only when sidebar is hovered */}
      <span className="whitespace-nowrap overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {label}
      </span>
    </button>
  );
}
