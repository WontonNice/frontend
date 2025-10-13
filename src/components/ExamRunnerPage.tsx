// src/components/ExamRunnerPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getExamBySlug } from "../data/exams";
import ReactMarkdown from "react-markdown";

type AnswerMap = Record<string, number | undefined>; // key = question globalId, value = choice index

export default function ExamRunnerPage() {
  const { slug } = useParams<{ slug: string }>();
  const exam = slug ? getExamBySlug(slug) : undefined;

  // Flatten all questions into a linear list for easy navigation
  const items = useMemo(() => {
    if (!exam) return [];
    const out: {
      globalId: string;
      sectionId: string;
      sectionTitle: string;
      qIndexInSection: number;
      qTotalInSection: number;
      promptMarkdown?: string;
      image?: string;
      choices?: string[];
    }[] = [];

    exam.sections.forEach((sec) => {
      sec.questions.forEach((q, i) => {
        out.push({
          globalId: `${sec.id}:${q.id}`,
          sectionId: sec.id,
          sectionTitle: sec.title,
          qIndexInSection: i,
          qTotalInSection: sec.questions.length,
          promptMarkdown: q.promptMarkdown,
          image: q.image,
          choices: q.choices,
        });
      });
    });
    return out;
  }, [exam]);

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({}); // selections per question

  useEffect(() => {
    // reset index if exam changes
    setIdx(0);
    setAnswers({});
  }, [slug]);

  // keyboard arrows
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, items.length]);

  if (!exam) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-red-600">Exam not found</h1>
        <p className="text-gray-600 mt-2">Check the URL or go back to the exams list.</p>
      </div>
    );
  }

  const current = items[idx];
  const total = items.length;
  const progress = total ? Math.round(((idx + 1) / total) * 100) : 0;

  function goPrev() {
    setIdx((i) => Math.max(0, i - 1));
  }
  function goNext() {
    setIdx((i) => Math.min(total - 1, i + 1));
  }

  function selectChoice(choiceIndex: number) {
    setAnswers((prev) => ({ ...prev, [current.globalId]: choiceIndex }));
  }

  return (
    <div className="space-y-6">
      {/* Header / Title */}
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{exam.title}</h1>
        {exam.description && <p className="text-gray-600">{exam.description}</p>}
      </header>

      {/* Progress bar + controls */}
      <div className="rounded-lg border border-gray-200 p-3 flex items-center gap-4">
        <div className="flex-1">
          <div className="text-sm text-gray-600 mb-1">
            Question {idx + 1} of {total} · {current?.sectionTitle}
          </div>
          <div className="h-2 w-full bg-gray-100 rounded">
            <div
              className="h-2 rounded bg-blue-600 transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Left / Right blue arrows */}
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            disabled={idx === 0}
            className={`rounded-md px-3 py-2 text-white font-medium ${
              idx === 0 ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500"
            }`}
            aria-label="Previous question"
          >
            ←
          </button>
          <button
            onClick={goNext}
            disabled={idx === total - 1}
            className={`rounded-md px-3 py-2 text-white font-medium ${
              idx === total - 1 ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500"
            }`}
            aria-label="Next question"
          >
            →
          </button>
        </div>
      </div>

      {/* Question “paper” */}
      {current && (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          {/* per-section breadcrumb */}
          <div className="text-sm text-gray-500">
            {current.sectionTitle} · Question {current.qIndexInSection + 1} / {current.qTotalInSection}
          </div>

          {/* prompt */}
          {current.promptMarkdown && (
            <div className="prose max-w-none">
              <ReactMarkdown>{current.promptMarkdown}</ReactMarkdown>
            </div>
          )}

          {/* image */}
          {current.image && (
            <img
              src={current.image}
              alt={`${exam.title}`}
              className="max-w-full rounded-lg border border-gray-200"
            />
          )}

          {/* choices */}
          {current.choices && (
            <ol className="grid sm:grid-cols-2 gap-2 list-decimal list-inside">
              {current.choices.map((choice, i) => {
                const selected = answers[current.globalId] === i;
                return (
                  <li key={i}>
                    <button
                      onClick={() => selectChoice(i)}
                      className={`w-full text-left px-3 py-2 rounded-lg border transition ${
                        selected
                          ? "bg-blue-50 border-blue-400"
                          : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {choice}
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      )}

      {/* Bottom nav (optional duplicate) */}
      <div className="flex items-center justify-between">
        <button
          onClick={goPrev}
          disabled={idx === 0}
          className={`rounded-md px-4 py-2 text-white font-medium ${
            idx === 0 ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500"
          }`}
        >
          ← Previous
        </button>
        <div className="text-sm text-gray-500">Use ← and → keys to navigate</div>
        <button
          onClick={goNext}
          disabled={idx === total - 1}
          className={`rounded-md px-4 py-2 text-white font-medium ${
            idx === total - 1 ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500"
          }`}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
