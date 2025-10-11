// src/components/LiveActivitiesPage.tsx
import { useNavigate } from "react-router-dom";

function PanelCard({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl bg-[#111318] ring-1 ring-white/10 p-5 transition hover:-translate-y-0.5 hover:ring-white/20 w-full"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className="text-xs px-2 py-1 rounded bg-emerald-600/20 text-emerald-300 ring-1 ring-emerald-500/30">
          Beta
        </span>
      </div>
      <p className="text-sm text-white/70 mt-2">{description}</p>
    </button>
  );
}

export default function LiveActivitiesPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Live Activities</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* ✅ Join Session panel */}
        <PanelCard
          title="Join Session"
          description="Enter a shared space—see everyone’s mouse pointer live."
          onClick={() => navigate("/live-activities/session")}
        />

        {/* (you can add more panels later) */}
      </div>
    </div>
  );
}
