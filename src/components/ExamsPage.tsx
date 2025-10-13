// src/components/ExamsPage.tsx
import { useNavigate, useParams } from "react-router-dom";
import { listExams, getExamBySlug } from "../data/exams";
import ReactMarkdown from "react-markdown";

export default function ExamsPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug?: string }>();

  // If there's a slug, show that exam page
  if (slug) {
    const exam = getExamBySlug(slug);

    if (!exam) {
      return (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-red-400">Exam Not Found</h2>
          <button
            onClick={() => navigate("/exams")}
            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition text-white font-medium"
          >
            ← Back to Exams
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <button
          onClick={() => navigate("/exams")}
          className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition text-white font-medium"
        >
          ← Back to Exams
        </button>

        <h1 className="text-3xl font-bold text-white">{exam.title}</h1>
        {exam.description && (
          <p className="text-white/70">{exam.description}</p>
        )}

        {exam.sections.map((section) => (
          <div
            key={section.id}
            className="rounded-xl border border-gray-700 p-6 space-y-4 bg-gray-800"
          >
            <h2 className="text-2xl font-semibold text-white">
              {section.title}
            </h2>

            {section.type === "reading" && section.passageMarkdown && (
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown>{section.passageMarkdown}</ReactMarkdown>
              </div>
            )}

            {section.questions.map((q) => (
              <div
                key={q.id}
                className="space-y-3 border-t border-gray-700 pt-4"
              >
                {q.promptMarkdown && (
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown>{q.promptMarkdown}</ReactMarkdown>
                  </div>
                )}
                {q.image && (
                  <img
                    src={q.image}
                    alt={`${exam.title} - ${q.id}`}
                    className="max-w-full rounded-lg"
                  />
                )}
                {q.choices && (
                  <ol className="grid sm:grid-cols-2 gap-2 list-decimal list-inside">
                    {q.choices.map((choice, i) => (
                      <li
                        key={i}
                        className="px-3 py-2 rounded-lg bg-gray-900/50 text-white/90"
                      >
                        {choice}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Otherwise, show the list of all exams
  const exams = listExams();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">SHSAT — Practice Exams</h2>
      <p className="text-white/70">Choose an exam to get started.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.map((exam) => (
          <div
            key={exam.slug}
            className="p-6 rounded-xl bg-gray-800 border border-gray-700 shadow-md hover:shadow-lg transition"
          >
            <h3 className="text-xl font-semibold mb-2 text-white">
              {exam.title}
            </h3>
            {exam.description && (
              <p className="text-white/60 mb-4">{exam.description}</p>
            )}
            <button
              onClick={() => navigate(`/exam/${exam.slug}`)}
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
//a