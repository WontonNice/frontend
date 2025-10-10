import DashboardLayout from "./DashboardLayout";

export default function TeacherDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <DashboardLayout title="WontonNice's Project">
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard title="Database" subtitle="REST Requests" value="—" />
        <StatCard title="Auth" subtitle="Auth Requests" value="—" />
        <StatCard title="Storage" subtitle="Storage Requests" value="—" />
        <StatCard title="Realtime" subtitle="Realtime Requests" value="—" />
      </div>

      <div className="mt-6 text-white/80">
        Welcome, <span className="font-semibold">{user?.username}</span>! (Teacher)
      </div>
    </DashboardLayout>
  );
}

function StatCard({ title, subtitle, value }: { title: string; subtitle: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0f1218] p-4">
      <div className="text-base font-semibold">{title}</div>
      <div className="mt-1 text-sm text-white/60">{subtitle}</div>
      <div className="mt-6 text-2xl font-bold">{value}</div>
    </div>
  );
}
