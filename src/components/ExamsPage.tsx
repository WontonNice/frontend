// src/components/ExamsPage.tsx
import { useNavigate } from "react-router-dom";

export default function ExamsPage() {
  const navigate = useNavigate();

  const exams = [
    { title: "Exam 1", route: "/exam/1" },
    { title: "Exam 2", route: "/exam/2" },
    { title: "Exam 3", route: "/exam/3" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">SAT — Advanced Questions</h2>
      <p className="text-white/70">Choose an exam below to get started.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.map((exam, index) => (
          <div
            key={index}
            className="p-6 rounded-xl bg-gray-800 border border-gray-700 shadow-md hover:shadow-lg transition"
          >
            <h3 className="text-xl font-semibold mb-4 text-white">
              {exam.title}
            </h3>
            <button
              onClick={() => navigate(exam.route)}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition text-white font-medium"
            >
              Start
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
