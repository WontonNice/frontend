// src/components/DashboardLayout.tsx
import type { PropsWithChildren, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Home, Table, Database, Lock, Boxes, Activity, Settings } from "lucide-react";
import LogoutButton from "./LogoutButton";

type LayoutProps = PropsWithChildren<{ title?: string }>;

export default function DashboardLayout({ title = "Dashboard", children }: LayoutProps) {
  return (
    <div className="flex min-h-screen bg-[#0e0e10] text-white">
      {/* Sidebar */}
      <aside className="group relative flex flex-col items-center bg-[#1a1a1d] transition-all duration-300 hover:w-56 w-16 overflow-hidden border-r border-white/10">
        <div className="w-full flex flex-col items-center gap-2 mt-4">
          <div className="text-lg font-semibold mb-4 group-hover:opacity-100 opacity-0 transition-opacity duration-300 whitespace-nowrap">
            WontonNice’s Project
          </div>

          <SideItem icon={<Home size={18} />} label="Overview" />
          <SideItem icon={<Table size={18} />} label="Table Editor" />
          <SideItem icon={<Database size={18} />} label="Database" />
          <SideItem icon={<Lock size={18} />} label="Auth" />
          <SideItem icon={<Boxes size={18} />} label="Storage" />
          <SideItem icon={<Activity size={18} />} label="Realtime" />
        </div>

        <div className="mt-auto mb-4">
          <SideItem icon={<Settings size={18} />} label="Settings" />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col">
        <header className="flex justify-between items-center bg-[#161618] px-6 py-3 border-b border-white/10">
          <h1 className="text-lg font-semibold">{title}</h1>
          <LogoutButton />
        </header>

        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

function SideItem({ icon, label, onClick }: { icon: ReactNode; label: string; onClick?: () => void }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={onClick ?? (() => navigate("/"))}
      className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors hover:bg-white/10"
    >
      <div className="w-8 h-8 grid place-items-center bg-white/5 rounded-md text-white/80">
        {icon}
      </div>
      <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
        {label}
      </span>
    </button>
  );
}
