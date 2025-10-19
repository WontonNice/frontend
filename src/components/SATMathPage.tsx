// src/components/SATMathPage.tsx
import { useNavigate } from "react-router-dom";

function PanelCard({
  title,
  description,
  onStart,
  disabled = false,
}: {
  title: string;
  description: string;
  onStart?: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl bg-[#111318] ring-1 ring-white/10 p-5 flex flex-col gap-3
                  ${disabled ? "opacity-60" : "transition-transform duration-200 hover:-translate-y-0.5 hover:ring-white/20"}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        {!disabled && (
          <button
            onClick={onStart}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition text-white text-sm font-semibold"
          >
            Start
          </button>
        )}
      </div>
      <p className="text-sm text-white/70">{description}</p>
    </div>
  );
}

export default function SATMathPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Math</h2>
      <p className="text-white/70">Pick a panel to begin practicing.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* ✅ Working panel */}
        <PanelCard
          title="Full Practice"
          description="all sat questions relevant to shsat"
          onStart={() => navigate("/study/math/panel-1")}
        />
        <PanelCard
          title="Endless Practice"
          description="An unlimited amount of practice for any selected topic"
          onStart={() => navigate("/study/math/panel-2")}
        />

        {/* Future panels (placeholders for now) */}
        <PanelCard title="Ratio Practice" description="ratios, proportions, and rates" disabled />
      </div>
    </div>
  );
}
