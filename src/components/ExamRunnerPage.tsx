// src/components/ExamRunnerPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getExamBySlug } from "../data/exams";
import ReactMarkdown from "react-markdown";

/** Stores selected choice index per question (keyed by globalId) */
type AnswerMap = Record<string, number | undefined>;

export default function ExamRunnerPage() {
  const { slug } = useParams<{ slug: string }>();
  const exam = slug ? getExamBySlug(slug) : undefined;

  // Flatten sections -> linear list of questions for navigation
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
  const [reviewOpen, setReviewOpen] = useState(false); // NEW: review dropdown
  const reviewWrapRef = useRef<HTMLDivElement>(null);   // NEW: outside-click

  useEffect(() => {
    setIdx(0);
    setAnswers({});
    setReviewOpen(false);
  }, [slug]);

  // Keyboard navigation + close review on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIdx((i) => Math.min(items.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
      if (e.key === "Escape") setReviewOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items.length]);

  // Click outside to close review
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!reviewWrapRef.current) return;
      if (!reviewWrapRef.current.contains(e.target as Node)) setReviewOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

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
  const jumpTo = (i: number) => {
    setIdx(i);
    setReviewOpen(false);
  };
  const selectChoice = (choiceIndex: number) => {
    if (!current) return;
    setAnswers((prev) => ({ ...prev, [current.globalId]: choiceIndex }));
  };

  return (
    <div className="space-y-4">
      {/* ===== TOP CONTROLS: compact toolstrip + cyan hairline + dark status bar ===== */}
      <div className="sticky top-16 z-30">
        {/* Toolstrip */}
        <div className="mx-auto max-w-4xl rounded-2xl border border-gray-300 bg-white shadow-sm px-3 py-2">
          <div className="flex items-center gap-3">
            {/* Joined blue arrows */}
            <div className="inline-flex overflow-hidden rounded-md">
              <button
                onClick={goPrev}
                disabled={idx === 0}
                className={`px-3 py-2 text-white font-medium border-r ${
                  idx === 0
                    ? "bg-blue-300 cursor-not-allowed border-blue-300"
                    : "bg-blue-600 hover:bg-blue-500 border-blue-700"
                }`}
                aria-label="Previous"
              >
                ←
              </button>
              <button
                onClick={goNext}
                disabled={idx === total - 1}
                className={`px-3 py-2 text-white font-medium ${
                  idx === total - 1
                    ? "bg-blue-300 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-500"
                }`}
                aria-label="Next"
              >
                →
              </button>
            </div>

            {/* ===== Review (with dropdown) ===== */}
            <div className="relative" ref={reviewWrapRef}>
              <button
                onClick={() => setReviewOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-gradient-to-b from-white to-gray-100 px-3 py-2 text-sm shadow-sm hover:bg-gray-50"
              >
                {/* list icon to match screenshot */}
                <span className="inline-block h-4 w-4 relative">
                  <span className="absolute inset-x-0 top-0 h-0.5 bg-gray-700 rounded" />
                  <span className="absolute inset-x-0 top-1.5 h-0.5 bg-gray-700 rounded" />
                  <span className="absolute inset-x-0 top-3 h-0.5 bg-gray-700 rounded" />
                </span>
                Review
              </button>

              {/* Dropdown panel */}
              {reviewOpen && (
                <div className="absolute left-0 mt-2 w-[560px] rounded-lg border border-gray-300 bg-white shadow-xl">
                  {/* caret */}
                  <div className="absolute -top-2 left-8 h-3 w-3 rotate-45 bg-white border-l border-t border-gray-300" />
                  <div className="p-3">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold">
                        Navigate Questions
                      </div>
                      <div className="text-xs text-gray-500">
                        {idx + 1} / {total} answered:{" "}
                        {
                          Object.values(answers).filter(
                            (v) => typeof v === "number"
                          ).length
                        }
                      </div>
                    </div>

                    {/* Grid of question pills */}
                    <div className="max-h-64 overflow-auto">
                      <div className="grid grid-cols-10 gap-2">
                        {items.map((it, i) => {
                          const answered = typeof answers[it.globalId] === "number";
                          const isCurrent = i === idx;
                          return (
                            <button
                              key={it.globalId}
                              onClick={() => jumpTo(i)}
                              className={[
                                "h-8 w-8 rounded-md text-xs font-medium border",
                                "focus:outline-none focus:ring-2 focus:ring-blue-400",
                                answered
                                  ? "bg-green-50 border-green-300 text-green-800"
                                  : "bg-gray-50 border-gray-300 text-gray-700",
                                isCurrent && "ring-2 ring-blue-500",
                              ].join(" ")}
                              title={`${it.sectionTitle} · Q${it.qIndexInSection + 1}`}
                            >
                              {i + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Section legend */}
                    <div className="mt-3 flex items-center gap-3 text-xs text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-3 w-3 rounded bg-green-200 border border-green-300 inline-block" />
                        Answered
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="h-3 w-3 rounded bg-gray-200 border border-gray-300 inline-block" />
                        Unanswered
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bookmark (visual match, no-op for now) */}
            <button className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-gradient-to-b from-white to-gray-100 px-3 py-2 text-sm shadow-sm hover:bg-gray-50">
              <span className="inline-block h-4 w-4">
                {/* simple bookmark glyph */}
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-gray-700" strokeWidth={1.6}>
                  <path d="M7 3h10a1 1 0 0 1 1 1v17l-6-3-6 3V4a1 1 0 0 1 1-1Z"/>
                </svg>
              </span>
              Bookmark
            </button>

            <div className="flex-1" />

            {/* Pointer / Stop / Close / Fullscreen (visual only) */}
            <div className="flex items-center gap-2">
              <button className="rounded-md border border-gray-300 bg-gradient-to-b from-white to-gray-100 px-3 py-2 text-sm shadow-sm hover:bg-gray-50">·</button>
              <button className="rounded-md border border-gray-300 bg-gradient-to-b from-white to-gray-100 px-3 py-2 text-sm shadow-sm hover:bg-gray-50">▢</button>
              <button className="rounded-md border border-gray-300 bg-gradient-to-b from-white to-gray-100 px-3 py-2 text-sm shadow-sm hover:bg-gray-50">✕</button>
              <button className="rounded-md border border-gray-300 bg-gradient-to-b from-white to-gray-100 px-3 py-2 text-sm shadow-sm hover:bg-gray-50">⤢</button>
            </div>
          </div>
        </div>

        {/* Cyan hairline */}
        <div className="h-[3px] bg-sky-500 mt-1" />

        {/* Dark status bar */}
        <div className="bg-[#5e5e5e] text-white">
          <div className="mx-auto max-w-6xl flex items-center gap-3 px-3 py-2 text-[13px]">
            <span className="font-semibold tracking-wide">
              {exam.title.toUpperCase()}
            </span>
            <span className="opacity-80">/</span>
            <span>SECTION {current?.sectionTitle ?? "-"}</span>
            <span className="opacity-80">/</span>
            <span>{idx + 1} OF {total}</span>
            <span className="opacity-80">/</span>
            <span>{progressPct}%</span>

            <div className="flex-1" />

            {/* slim progress bar on right */}
            <div className="w-48 h-2 bg-[#3f3f3f] rounded">
              <div
                className="h-2 rounded bg-[#a0a0a0]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===== MAIN SHEET: two-column layout ===== */}
      <div className="rounded-2xl bg-white shadow-md border border-gray-200 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: scrollable passage / prompt */}
          <div className="rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="h-[520px] overflow-y-auto">
              <div className="border rounded-md p-6 bg-white">
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

          {/* Right: radio choices */}
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

      {/* Bottom hint */}
      <div className="text-center text-sm text-gray-500">Use ← and → keys to navigate</div>
    </div>
  );
}
