import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Home, Database, Lock, Boxes, Activity, Settings } from "lucide-react";

function Sidebar() {
  const [open, setOpen] = useState(false); // ← controls width

  return (
    <aside
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      className={[
        "fixed inset-y-0 left-0 z-40",
        "bg-[#0b0d12] border-r border-white/10",
        "overflow-hidden flex flex-col",
        "transition-all duration-300 ease-out",
        open ? "w-64" : "w-16", // ← expand/collapse
      ].join(" ")}
    >
      {/* Logo / project chip */}
      <div className="h-14 flex items-center gap-3 px-3 border-b border-white/10">
        <div className="h-7 w-7 rounded bg-emerald-500/80 grid place-items-center text-xs font-bold">N</div>
        <div className={["transition-opacity duration-200", open ? "opacity-100" : "opacity-0"].join(" ")}>
          <div className="text-sm font-semibold leading-4">WontonNice’s Project</div>
          <div className="text-[10px] text-white/60">main · Production</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 space-y-1">
        <SideLink to="/student-dashboard" icon={<Home size={18} />} label="Project overview" open={open} />
        <SideLink to="#" icon={<Database size={18} />} label="Database" open={open} />
        <SideLink to="#" icon={<Lock size={18} />} label="Authentication" open={open} />
        <SideLink to="#" icon={<Boxes size={18} />} label="Storage" open={open} />
        <SideLink to="#" icon={<Activity size={18} />} label="Realtime" open={open} />
      </nav>

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
  icon: React.ReactNode;
  label: string;
  open: boolean;
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
          {/* green active rail */}
          <span
            className={[
              "absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 rounded bg-emerald-500 transition-opacity",
              isActive ? "opacity-100" : "opacity-0",
            ].join(" ")}
          />
          <span className="shrink-0 h-9 w-9 rounded-md grid place-items-center ring-1 ring-white/10 bg-white/5">
            {icon}
          </span>
          <span
            className={[
              "transition-opacity duration-150 whitespace-nowrap",
              open ? "opacity-100" : "opacity-0",
            ].join(" ")}
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}

export default Sidebar;
