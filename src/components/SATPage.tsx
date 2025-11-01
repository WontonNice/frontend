// src/components/SATPage.tsx
import { useNavigate } from "react-router-dom";

export default function SATPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">SHSAT Study Hall</h2>
      <p className="text-white/70">Choose a subject below to get started.</p>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => navigate("/study/math")}
          className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 transition text-white font-semibold"
        >
          Math
        </button>

        <button
          onClick={() => navigate("/study/reading")}
          className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition text-white font-semibold"
        >
          English
        </button>
      </div>
    </div>
  );
}
