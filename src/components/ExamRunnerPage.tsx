import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getExamBySlug } from "../data/exams";
import ReactMarkdown from "react-markdown";
import { ChevronLeft, ChevronRight, Bookmark, Eye, Square, X, Maximize2 } from "lucide-react";

/** Stores selected choice index per question */
type AnswerMap = Record<string, number | undefined>;

export default function ExamRunnerPage() {
  const { slug } = useParams<{ slug: string }>();
  const exam = slug ? getExamBySlug(slug) : undefined;

  // Flatten exam -> linear questions for nav
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
  const [answers, setAnswers] = useState<AnswerMap>({});

  useEffect(() => {
    setIdx(0);
    setAnswers({});
  }, [slug]);

  // keyboard arrows
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIdx((i) => Math.min(items.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items.length]);

  if (!exam) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-red-600">Exam not found</h1>
        <p className="text-gray-600 mt-2">Check the URL or choose from the exams list.</p>
      </div>
    );
  }

  const current = items[idx];
  const total = items.length;
  const progressPct = total ? Math.round(((idx + 1) / total) * 100) : 0;

  const goPrev = () => setIdx((i) => Math.max(0, i - 1));
  const goNext = () => setIdx((i) => Math.min(total - 1, i + 1));

  const selectChoice = (choiceIndex: number) => {
    if (!current) return;
    setAnswers((prev) => ({ ...prev, [current.globalId]: choiceIndex }));
  };

  return (
    <div className="space-y-4">
      {/* ======= TOOLSTRIP (blue arrows + actions) ======= */}
      <div className="sticky top-[60px] z-30 bg-white border rounded-lg shadow-sm px-3 py-2">
        <div className="flex items-center gap-3">
          {/* Blue arrows (left / right) */}
          <div className="flex items-center gap-2">
            <button
              onClick={goPrev}
              disabled={idx === 0}
              className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-white font-medium ${
                idx === 0 ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500"
              }`}
              aria-label="Previous"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={goNext}
              disabled={idx === total - 1}
              className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-white font-medium ${
                idx === total - 1 ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500"
              }`}
              aria-label="Next"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Review / Bookmark */}
          <div className="flex items-center gap-2">
            <button className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
              <Eye size={16} /> Review
            </button>
            <button className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
              <Bookmark size={16} /> Bookmark
            </button>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Center icons (pointer / stop / close / fullscreen) */}
          <div className="flex items-center gap-2">
            <button className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50">
              ▪︎
            </button>
            <button className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
              <Square size={16} /> 
            </button>
            <button className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
              <X size={16} />
            </button>
            <button className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
              <Maximize2 size={16} />
            </button>
          </div>
        </div>

        {/* Breadcrumb + slim progress */}
        <div className="mt-3 text-[13px] text-gray-700 flex items-center gap-2">
          <span className="font-medium uppercase tracking-wide">{exam.title}</span>
          <span className="opacity-60">/</span>
          <span>Section {current ? current.sectionTitle : "-"}</span>
          <span className="opacity-60">/</span>
          <span>{idx + 1} of {total}</span>
          <span className="opacity-60">/</span>
          <span>{progressPct}%</span>
        </div>
        <div className="mt-1 h-2 w-full bg-gray-200 rounded">
          <div
            className="h-2 rounded bg-blue-600 transition-[width]"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* ======= MAIN “SHEET” (two columns) ======= */}
      <div className="rounded-2xl bg-white shadow-md border border-gray-200 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Passage (scrollable card) */}
          <div className="rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="h-[520px] overflow-y-auto">
              {/* Mocked inner “paper” look */}
              <div className="border rounded-md p-6 bg-white">
                {/* Example: title could be embedded in prompt/section content if desired */}
                {/* You can render a passageMarkdown for reading sections if present */}
                {current?.promptMarkdown ? (
                  <div className="prose max-w-none">
                    <ReactMarkdown>{current.promptMarkdown}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-gray-500">No passage for this question.</p>
                )}
                {current?.image && (
                  <img
                    src={current.image}
                    alt="question"
                    className="mt-4 max-w-full rounded border border-gray-200"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Right: Choices */}
          <div className="rounded-lg border border-gray-200 shadow-sm p-4">
            {current?.choices ? (
              <ul className="space-y-4">
                {current.choices.map((choice, i) => {
                  const selected = answers[current.globalId] === i;
                  return (
                    <li key={i}>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name={current.globalId}
                          className="h-5 w-5"
                          checked={selected}
                          onChange={() => selectChoice(i)}
                        />
                        <span className="flex-1 rounded-lg px-3 py-2 bg-gray-50 border border-gray-200">
                          {choice}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-gray-500">No choices for this item.</p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom nav hint */}
      <div className="text-center text-sm text-gray-500">
        Use ← and → keys to navigate
      </div>
    </div>
  );
}
