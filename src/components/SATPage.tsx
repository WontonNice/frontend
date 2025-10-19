// src/components/SATPage.tsx
import { useNavigate } from "react-router-dom";

export default function SATPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">SHSAT Study Hall</h2>
      <p className="text-white/70">Choose a subject below to get started.</p>

      <button
        onClick={() => navigate("/study/math")}
        className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 transition text-white font-semibold"
      >
        Math
      </button>
    </div>
  );
}
