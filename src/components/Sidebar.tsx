import { useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { Home, Database, Lock, Boxes, Activity, Settings } from "lucide-react";

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <aside
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      className={[
        "fixed inset-y-0 left-0 z-40",
        "bg-[#0c0e12] border-r border-white/10",
        "overflow-hidden flex flex-col",
        "transition-all duration-300 ease-out",
        open ? "w-64" : "w-16",
      ].join(" ")}
    >
      {/* Header / project chip */}
      <div className="h-14 flex items-center gap-3 px-3 border-b border-white/10">
        <div className="h-7 w-7 rounded-md bg-white/5 grid place-items-center text-[11px] font-semibold text-white/80">
          N
        </div>
        <div className={["transition-opacity duration-200", open ? "opacity-100" : "opacity-0"].join(" ")}>
          <div className="text-sm font-medium leading-4 text-white/90">WontonNice’s Project</div>
          <div className="text-[10px] text-white/50">main · Production</div>
        </div>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 py-3">
        <Section>
          <SideLink to="/student-dashboard" icon={<Home size={18} />} label="Project overview" open={open} />
          <SideLink to="#" icon={<Database size={18} />} label="Database" open={open} />
          <SideLink to="#" icon={<Lock size={18} />} label="Authentication" open={open} />
          <SideLink to="#" icon={<Boxes size={18} />} label="Storage" open={open} />
          <SideLink to="#" icon={<Activity size={18} />} label="Realtime" open={open} />
        </Section>

        {/* Divider */}
        <div className="mx-3 my-3 h-px bg-white/10" />

        {/* Secondary nav */}
        <Section>
          <SideLink to="#" icon={<Settings size={18} />} label="Project Settings" open={open} />
        </Section>
      </nav>
    </aside>
  );
}

function Section({ children }: { children: ReactNode }) {
  return <div className="px-2 space-y-1">{children}</div>;
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
        [
          "relative flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors",
          isActive
            ? "bg-white/[0.06] text-white"
            : "text-white/70 hover:text-white hover:bg-white/[0.04]",
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          {/* icon box */}
          <span
            className={[
              "grid place-items-center h-9 w-9 rounded-md ring-1",
              isActive ? "bg-white/[0.08] ring-white/15" : "bg-white/[0.04] ring-white/10",
            ].join(" ")}
          >
            <span className="text-inherit opacity-90">{icon}</span>
          </span>

          {/* label (only visible when expanded) */}
          <span
            className={[
              "transition-opacity duration-150 whitespace-nowrap",
              open ? "opacity-100" : "opacity-0",
            ].join(" ")}
          >
            {label}
          </span>

          {/* subtle left indicator */}
          <span
            className={[
              "absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded bg-white/30 transition-opacity",
              isActive ? "opacity-100" : "opacity-0",
            ].join(" ")}
          />
        </>
      )}
    </NavLink>
  );
}
