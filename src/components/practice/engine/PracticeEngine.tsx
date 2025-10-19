// src/components/practice/engine/PracticeEngine.tsx
import { useMemo, useState } from "react";
import MathText from "../../MathText";
import { useStreak } from "../../../hooks/useStreak";
import StreakBadge from "../../ui/StreakBadge";

/** Plain multiple-choice shape the engine consumes */
export type PracticeQuestion = {
  id: string;
  stem: string;                 // Markdown/KaTeX
  choices: (string | number)[]; // will be displayed; format with choiceFormatter
  correctIndex: number;
  explanation?: string;         // Markdown/KaTeX
  tag?: string;                 // small label (e.g., “Union size”)
};

type Props = {
  title: string;
  build: () => PracticeQuestion;
  streakKey: string;
  instruction?: string;
  choiceFormatter?: (c: string | number, i: number, q: PracticeQuestion) => string;
  onNext?: () => void;
};

const LETTERS = ["A","B","C","D","E","F","G","H","I","J"] as const;

export default function PracticeEngine({
  title,
  build,
  streakKey,
  instruction,
  choiceFormatter,
  onNext,
}: Props) {
  const [q, setQ] = useState<PracticeQuestion>(() => build());
  const [sel, setSel] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const { current, best, record, clearAll } = useStreak(streakKey);

  const correct = useMemo(() => q.choices[q.correctIndex], [q]);
  const isCorrect = submitted && sel === q.correctIndex;

  const fmtChoice = (c: string | number, i: number) =>
    choiceFormatter ? choiceFormatter(c, i, q) : String(c);

  const check = () => {
    if (sel == null || submitted) return;
    setSubmitted(true);
    record(sel === q.correctIndex);
  };

  const next = () => {
    setQ(build());
    setSel(null);
    setSubmitted(false);
    onNext?.();
  };

  return (
    <div className="min-h-[calc(100vh-var(--topbar-height,56px))] bg-[#0f1115] text-white">
      <div className="mx-auto max-w-5xl p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{title}</h1>
            {instruction && (
              <p className="text-sm text-white/70 mt-1">{instruction}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <StreakBadge current={current} best={best} />
            <button
              onClick={clearAll}
              className="text-xs text-white/50 hover:text-white/80 underline decoration-dotted"
              title="Reset streak"
              aria-label="Reset streak"
            >
              reset
            </button>
          </div>
        </div>

        {/* White card like the screenshot */}
        <div className="bg-white text-black rounded-xl shadow-[0_6px_24px_rgba(0,0,0,0.15)] p-6 ring-1 ring-black/5">
          {q.tag && (
            <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
              {q.tag}
            </div>
          )}

          {/* Stem */}
          <div className="text-[17px] leading-7 mb-4">
            <MathText text={q.stem} />
          </div>

          {/* Choices */}
          <div className="space-y-3">
            {q.choices.map((c, i) => {
              const active = sel === i;
              const showCorrect = submitted && i === q.correctIndex;
              const showWrong = submitted && active && i !== q.correctIndex;

              return (
                <label
                  key={i}
                  className={[
                    "flex items-center gap-3 rounded-lg p-3 cursor-pointer transition",
                    "ring-1",
                    submitted
                      ? showCorrect
                        ? "ring-emerald-500 bg-emerald-50"
                        : showWrong
                        ? "ring-red-500 bg-red-50"
                        : "ring-gray-200 bg-white"
                      : active
                      ? "ring-indigo-400 bg-indigo-50"
                      : "ring-gray-200 hover:bg-gray-50",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    className="h-4 w-4 accent-indigo-600"
                    checked={sel === i}
                    onChange={() => setSel(i)}
                  />
                  <div className="text-gray-500 w-6">{LETTERS[i]}.</div>
                  <div className="text-[15px]">
                    <MathText text={fmtChoice(c, i)} className="inline" />
                  </div>
                </label>
              );
            })}
          </div>

          {/* Actions */}
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={check}
              disabled={sel == null || submitted}
              className={`rounded-md px-4 py-2 text-white font-medium transition ${
                sel == null || submitted
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-500"
              }`}
            >
              Check Answer
            </button>
            <button
              onClick={next}
              className="rounded-md px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900"
            >
              Next Question
            </button>

            {submitted && (
              <div className={`text-sm ml-2 ${isCorrect ? "text-emerald-600" : "text-red-600"}`}>
                {isCorrect ? (
                  "Correct!"
                ) : (
                  <MathText
                    className="inline"
                    text={`Answer: ${fmtChoice(correct, q.correctIndex)}`}
                  />
                )}
              </div>
            )}
          </div>

          {/* Explanation */}
          {submitted && q.explanation && (
            <div className="mt-4 rounded-md bg-gray-50 p-3 text-sm text-gray-800">
              <MathText text={q.explanation} />
            </div>
          )}
        </div>

        <p className="text-white/50 text-xs mt-4">
          New numbers each time — generated so all quantities are valid and integers.
        </p>
      </div>
    </div>
  );
}
