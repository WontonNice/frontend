// src/components/StudentDashboard.tsx
import Sidebar from "./Sidebar";

export default function StudentDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <div className="flex h-screen bg-[#0f1115] text-white">
      {/* Sidebar (hover-expand, fixed) */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto pl-16 md:pl-20 lg:pl-24 p-6 transition-all duration-300">
        <h1 className="text-2xl font-semibold mb-8">WontonNice’s Project</h1>

        {/* Dashboard cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-[#111318] ring-1 ring-white/10 p-4 transition-transform duration-200 hover:-translate-y-0.5 hover:ring-emerald-500/30">
            <div className="text-base font-semibold">Database</div>
            <div className="mt-1 text-sm text-white/60">REST Requests</div>
            <div className="mt-6 text-2xl font-bold">—</div>
          </div>

          {/* add more cards later if needed */}
        </div>

        {/* Welcome message */}
        <div className="mt-8 text-white/80">
          Welcome, <span className="font-semibold">{user?.username}</span>! (Student)
        </div>
      </div>
    </div>
  );
}
