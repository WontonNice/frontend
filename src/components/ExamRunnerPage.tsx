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
    sectionType: "reading" | "math" | string;
    sectionPassageMarkdown?: string;
    sectionPassageImages?: string[];
    qIndexInSection: number;
    qTotalInSection: number;
    stemMarkdown?: string;
    image?: string;
    choices?: string[];
  }[] = [];

  exam.sections.forEach((sec) => {
    sec.questions.forEach((q, i) => {
      out.push({
        globalId: `${sec.id}:${q.id}`,
        sectionId: sec.id,
        sectionTitle: sec.title,
        sectionType: sec.type,
        // ✅ make sure these two lines are here
        sectionPassageMarkdown: sec.passageMarkdown,
        sectionPassageImages: sec.passageImages,

        qIndexInSection: i,
        qTotalInSection: sec.questions.length,
        stemMarkdown: (q as any).stemMarkdown ?? (q as any).promptMarkdown,
        image: q.image,
        choices: q.choices,
      });
    });
  });

  return out;
}, [exam]);

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const reviewWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIdx(0);
    setAnswers({});
    setReviewOpen(false);
  }, [slug]);

  // Keyboard nav + close review on ESC
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
  const sectionForCurrent = exam.sections.find((s) => s.id === current?.sectionId);
const effectivePassage =
  current?.sectionPassageMarkdown ?? sectionForCurrent?.passageMarkdown;
const effectivePassageImages =
  current?.sectionPassageImages ?? sectionForCurrent?.passageImages;
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
      {/* ======= FULL-WIDTH Compact Toolbar + Status Bar ======= */}
      <div className="sticky top-14 z-30">
        {/* Toolbar (full-width) */}
        <div className="w-full flex items-center gap-2 bg-white border-b border-gray-300 px-4 py-1.5 shadow-sm">
          {/* Joined blue arrows */}
          <div className="inline-flex overflow-hidden rounded-md">
            <button
              onClick={goPrev}
              disabled={idx === 0}
              className={`px-3 py-1.5 text-white text-sm font-medium border-r ${
                idx === 0
                  ? "bg-blue-300 cursor-not-allowed border-blue-300"
                  : "bg-blue-600 hover:bg-blue-500 border-blue-700"
              }`}
              title="Previous Question"
            >
              ←
            </button>
            <button
              onClick={goNext}
              disabled={idx === total - 1}
              className={`px-3 py-1.5 text-white text-sm font-medium ${
                idx === total - 1
                  ? "bg-blue-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-500"
              }`}
              title="Next Question"
            >
              →
            </button>
          </div>

          {/* Review (with dropdown) */}
          <div className="relative" ref={reviewWrapRef}>
            <button
              onClick={() => setReviewOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded border border-gray-400 bg-gradient-to-b from-white to-gray-100 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
              title="Review Questions"
            >
              {/* List icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-gray-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              Review
            </button>

            {reviewOpen && (
              <div className="absolute left-0 mt-2 w-[520px] rounded-md border border-gray-300 bg-white shadow-lg z-40">
                {/* caret */}
                <div className="absolute -top-1 left-6 h-2 w-2 rotate-45 bg-white border-l border-t border-gray-300" />
                <div className="p-3 text-sm">
                  <div className="mb-2 flex justify-between">
                    <span className="font-semibold">Navigate Questions</span>
                    <span className="text-gray-500">
                      {idx + 1}/{total} — answered{" "}
                      {Object.values(answers).filter((v) => typeof v === "number").length}
                    </span>
                  </div>
                  <div className="grid grid-cols-10 gap-2 max-h-64 overflow-auto">
                    {items.map((q, i) => {
                      const answered = typeof answers[q.globalId] === "number";
                      const active = i === idx;
                      return (
                        <button
                          key={q.globalId}
                          onClick={() => jumpTo(i)}
                          className={`h-7 w-7 rounded border text-xs font-medium ${
                            active
                              ? "border-blue-500 ring-2 ring-blue-300"
                              : answered
                              ? "bg-green-50 border-green-300 text-green-700"
                              : "bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100"
                          }`}
                          title={`${q.sectionTitle} · Q${q.qIndexInSection + 1}`}
                        >
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>
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

          {/* Bookmark (visual) */}
          <button
            className="inline-flex items-center gap-1.5 rounded border border-gray-400 bg-gradient-to-b from-white to-gray-100 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
            title="Bookmark Question for Review"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-gray-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 4h12v16l-6-3-6 3V4z" />
            </svg>
            Bookmark
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Mini control icons (visual only) */}
          <div className="flex items-center gap-1.5">
            <button
              className="h-7 w-7 rounded border border-gray-400 bg-gradient-to-b from-white to-gray-100 text-sm hover:bg-gray-50"
              title="Pointer Tool"
            >
              ·
            </button>
            <button
              className="h-7 w-7 rounded border border-gray-400 bg-gradient-to-b from-white to-gray-100 text-sm hover:bg-gray-50"
              title="Stop"
            >
              ▢
            </button>
            <button
              className="h-7 w-7 rounded border border-gray-400 bg-gradient-to-b from-white to-gray-100 text-sm hover:bg-gray-50"
              title="Close"
            >
              ✕
            </button>
            <button
              className="h-7 w-7 rounded border border-gray-400 bg-gradient-to-b from-white to-gray-100 text-sm hover:bg-gray-50"
              title="Fullscreen"
            >
              ⤢
            </button>
          </div>
        </div>

        {/* Cyan hairline + Dark status bar (full-width) */}
        <div className="h-[3px] bg-sky-500 border-t border-gray-300" />
        <div className="w-full bg-[#5e5e5e] text-white text-[13px]">
          <div className="flex items-center gap-2 px-6 py-1">
            <span className="font-semibold">{exam.title.toUpperCase()}</span>
            <span>/</span>
            <span>SECTION {current?.sectionTitle ?? "-"}</span>
            <span>/</span>
            <span>{idx + 1} OF {total}</span>
            <span>/</span>
            <span>{progressPct}%</span>
            <div className="flex-1" />
            <div className="w-40 h-1.5 bg-[#3f3f3f] rounded">
              <div className="h-1.5 rounded bg-[#a0a0a0]" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ======= Main “Sheet” (two columns) ======= */}
      <div className="rounded-2xl bg-white shadow-md border border-gray-200 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

    {/* Left: shared section passage (scrollable) */}
<div className="rounded-lg border border-gray-200 shadow-sm p-4">
  <div className="h-[520px] overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
    <div className="border rounded-md p-6 bg-white">
      {effectivePassage ? (
        <div className="prose max-w-none">
          <ReactMarkdown>{effectivePassage}</ReactMarkdown>
        </div>
      ) : current.image || current.stemMarkdown ? (
        <>
          {current.stemMarkdown && (
            <div className="prose max-w-none">
              <ReactMarkdown>{current.stemMarkdown}</ReactMarkdown>
            </div>
          )}
          {current.image && (
            <img
              src={current.image}
              alt="question"
              className="mt-4 max-w-full rounded border border-gray-200"
            />
          )}
        </>
      ) : (
        <p className="text-gray-500">No passage for this item.</p>
      )}

      {effectivePassageImages?.length ? (
        <div className="mt-4 space-y-3">
          {effectivePassageImages.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`passage-figure-${i + 1}`}
              className="max-w-full rounded border border-gray-200"
            />
          ))}
        </div>
      ) : null}
    </div>
  </div>
</div>

          {/* Right: question stem + choices */}
          <div className="rounded-lg border border-gray-200 shadow-sm p-4">
            {current.stemMarkdown ? (
              <div className="prose max-w-none mb-4">
                <ReactMarkdown>{current.stemMarkdown}</ReactMarkdown>
              </div>
            ) : null}

            {current.choices ? (
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
