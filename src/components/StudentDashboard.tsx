// src/components/StudentDashboard.tsx
// ❌ remove: import DashboardLayout from "./DashboardLayout";

export default function StudentDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-[#111318] ring-1 ring-white/10 p-4 transition-transform duration-200 hover:-translate-y-0.5 hover:ring-white/20">
          <div className="text-base font-semibold">Database</div>
          <div className="mt-1 text-sm text-white/60">REST Requests</div>
          <div className="mt-6 text-2xl font-bold">—</div>
        </div>

        <div className="rounded-2xl bg-[#111318] ring-1 ring-white/10 p-4 transition-transform duration-200 hover:-translate-y-0.5 hover:ring-white/20">
          <div className="text-base font-semibold">Auth</div>
          <div className="mt-1 text-sm text-white/60">Auth Requests</div>
          <div className="mt-6 text-2xl font-bold">—</div>
        </div>

        <div className="rounded-2xl bg-[#111318] ring-1 ring-white/10 p-4 transition-transform duration-200 hover:-translate-y-0.5 hover:ring-white/20">
          <div className="text-base font-semibold">Storage</div>
          <div className="mt-1 text-sm text-white/60">Storage Requests</div>
          <div className="mt-6 text-2xl font-bold">—</div>
        </div>

        <div className="rounded-2xl bg-[#111318] ring-1 ring-white/10 p-4 transition-transform duration-200 hover:-translate-y-0.5 hover:ring-white/20">
          <div className="text-base font-semibold">Realtime</div>
          <div className="mt-1 text-sm text-white/60">Realtime Requests</div>
          <div className="mt-6 text-2xl font-bold">—</div>
        </div>
      </div>

      {/* Welcome */}
      <div className="text-white/80">
        Welcome, <span className="font-semibold">{user?.username}</span>! (Student)
      </div>
    </div>
  );
}
