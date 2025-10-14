// Minimal white layout (no sidebar/topbar)
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

export default function ExamFullscreenLayout({ children }: { children: ReactNode }) {

  return (
    <div className="min-h-screen bg-[#f7f7f7] text-gray-900">
      {/* top-right back button */}

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-6">
        {children}
      </main>
    </div>
  );
}
