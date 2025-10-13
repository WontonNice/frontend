// src/components/SATPage.tsx
import { useNavigate } from "react-router-dom";

export default function ExamsPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">SAT — Advanced Questions</h2>
      <p className="text-white/70">Choose a subject below to get started.</p>

      <button
        onClick={() => navigate("/sat/math")}
        className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 transition text-white font-semibold"
      >
        exams
      </button>
    </div>
  );
}
