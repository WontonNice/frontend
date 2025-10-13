import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

export default function ExamFullscreenLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* top-right back button */}
      <div className="sticky top-0 z-10 flex justify-end px-6 py-4 bg-white/90 backdrop-blur border-b">
        <button
          onClick={() => navigate("/exams")}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 shadow-sm"
        >
          ← Back to Exams
        </button>
      </div>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-6">
        {children}
      </main>
    </div>
  );
}