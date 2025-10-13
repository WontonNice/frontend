import { useParams } from "react-router-dom";
import { getExamBySlug } from "../data/exams";
import ReactMarkdown from "react-markdown";

export default function ExamRunnerPage() {
  const { slug } = useParams<{ slug: string }>();
  const exam = slug ? getExamBySlug(slug) : undefined;

  if (!exam) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-red-600">Exam not found</h1>
        <p className="text-gray-600 mt-2">Check the URL or go back to the exams list.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">{exam.title}</h1>
        {exam.description && <p className="text-gray-600 mt-2">{exam.description}</p>}
      </header>

      {exam.sections.map((section) => (
        <section
          key={section.id}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
        >
          <h2 className="text-2xl font-semibold">{section.title}</h2>

          {section.type === "reading" && section.passageMarkdown && (
            <div className="prose max-w-none">
              <ReactMarkdown>{section.passageMarkdown}</ReactMarkdown>
            </div>
          )}

          {section.questions.map((q) => (
            <div key={q.id} className="space-y-3 border-t border-gray-200 pt-4">
              {q.promptMarkdown && (
                <div className="prose max-w-none">
                  <ReactMarkdown>{q.promptMarkdown}</ReactMarkdown>
                </div>
              )}

              {q.image && (
                <img
                  src={q.image}
                  alt={`${exam.title} - ${q.id}`}
                  className="max-w-full rounded-lg border border-gray-200"
                />
              )}

              {q.choices && (
                <ol className="grid sm:grid-cols-2 gap-2 list-decimal list-inside">
                  {q.choices.map((choice, i) => (
                    <li key={i} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
                      {choice}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
