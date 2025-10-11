import { useState } from "react";
import { getEffectiveSatMathBank } from "../data/satMathStore";

const LETTERS = ["A", "B", "C", "D", "E"];

export default function SATMathPanel1() {
  // Use ALL topics for “Full Practice”
  const questions = getEffectiveSatMathBank();
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const q = questions[idx];
  const isLast = idx === questions.length - 1;
  const canSubmit = selected !== null;

  const submit = () => {
    if (selected === null) return;
    if (selected === q.correctIndex) setScore((s) => s + 1);
    setShowResult(true);
  };

  const next = () => {
    setShowResult(false);
    setSelected(null);
    if (!isLast) setIdx((i) => i + 1);
  };

  const restart = () => {
    setIdx(0);
    setSelected(null);
    setScore(0);
    setShowResult(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Math — Full Practice</h2>

      {/* Progress */}
      <div className="text-sm text-white/60">
        Question {idx + 1} of {questions.length} · Score {score}/{questions.length}
      </div>

      {/* SHSAT-style container */}
      <div className="rounded-xl bg-white text-[#0e0f13] shadow-xl max-w-5xl mx-auto ring-1 ring-black/10">
        {/* Top bar (like the test header) */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-black/10">
          <div className="text-sm font-medium text-black/60">
            SHSAT PRACTICE — Section: Math
          </div>
          <div className="text-sm text-black/50">Question {idx + 1}</div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Prompt */}
          <div className="text-base leading-relaxed">{q.prompt}</div>

          {/* Choices */}
          <div className="space-y-3">
            {q.choices.map((choice, i) => {
              const isSelected = selected === i;
              const isCorrectChoice = showResult && i === q.correctIndex;
              const isWrongSelected = showResult && isSelected && i !== q.correctIndex;

              return (
                <label
                  key={i}
                  className={[
                    "flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer",
                    "transition",
                    isCorrectChoice ? "border-emerald-500 bg-emerald-50" : "",
                    isWrongSelected ? "border-red-500 bg-red-50" : "",
                    !isCorrectChoice && !isWrongSelected ? "border-black/10 hover:bg-black/5" : "",
                  ].join(" ")}
                >
                  {/* Radio */}
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    checked={isSelected}
                    onChange={() => !showResult && setSelected(i)}
                    className="h-4 w-4"
                  />
                  {/* Letter */}
                  <span className="w-6 text-sm font-semibold text-black/70">
                    {LETTERS[i] || ""}
                  </span>
                  {/* Text (allow simple fractions like 9/14) */}
                  <span className="text-sm">{choice}</span>
                </label>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            {!showResult && (
              <button
                disabled={!canSubmit}
                onClick={submit}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition
                  ${canSubmit ? "bg-[#2563eb] hover:bg-[#1e4fd9] text-white"
                              : "bg-black/10 text-black/40 cursor-not-allowed"}`}
              >
                Submit
              </button>
            )}
            {showResult && !isLast && (
              <button
                onClick={next}
                className="px-5 py-2 rounded-lg bg-[#2563eb] hover:bg-[#1e4fd9] text-white text-sm font-semibold"
              >
                Next
              </button>
            )}
            {showResult && isLast && (
              <button
                onClick={restart}
                className="px-5 py-2 rounded-lg bg-[#2563eb] hover:bg-[#1e4fd9] text-white text-sm font-semibold"
              >
                Restart
              </button>
            )}
          </div>

          {/* Explanation + Source */}
          {showResult && (
            <div className="rounded-lg bg-black/5 border border-black/10 p-4 space-y-1">
              <div className="text-sm">
                <span className="font-semibold">
                  {selected === q.correctIndex ? "Correct." : "Not quite."}
                </span>{" "}
                {q.explanation}
              </div>
              <div className="text-xs text-black/50 italic">Source: {q.source}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
