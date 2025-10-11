// src/components/SATMathPanel1.tsx
import { useState } from "react";
import { getEffectiveSatMathBank } from "../data/satMathStore";


export default function SATMathPanel1() {
  const questions = getEffectiveSatMathBank(); // easy swap later for filters/shuffling
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const q = questions[idx];
  const isLast = idx === questions.length - 1;
  const canSubmit = selected !== null;

  const submit = () => {
    if (selected === null) return;
    const correct = selected === q.correctIndex;
    if (correct) setScore((s) => s + 1);
    setShowResult(true);
  };

  const next = () => {
    setShowResult(false);
    setSelected(null);
    if (!isLast) {
      setIdx((i) => i + 1);
    }
  };

  const finish = () => {
    setShowResult(false);
    // Option A: show final summary inline
    // Option B: navigate somewhere else — for now we just freeze on summary.
    // Do nothing here; summary is shown below when finished.
  };

  const restart = () => {
    setIdx(0);
    setSelected(null);
    setScore(0);
    setShowResult(false);
  };

  const finished = showResult && isLast;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Math — Full Practice</h2>

      {/* Progress */}
      <div className="text-sm text-white/60">
        Question {idx + 1} of {questions.length} · Score {score}/{questions.length}
      </div>

      {/* Question card */}
      <div className="rounded-2xl bg-[#111318] ring-1 ring-white/10 p-6 space-y-4">
        <div className="text-base">{q.prompt}</div>

        <div className="space-y-2">
          {q.choices.map((choice, i) => {
            const isSelected = selected === i;
            const isCorrectChoice = showResult && i === q.correctIndex;
            const isWrongSelected = showResult && isSelected && i !== q.correctIndex;

            return (
              <button
                key={i}
                onClick={() => !showResult && setSelected(i)}
                className={[
                  "w-full text-left rounded-xl px-4 py-3 ring-1 transition",
                  isSelected ? "ring-emerald-400 bg-white/5" : "ring-white/10 hover:ring-white/20",
                  isCorrectChoice ? "bg-emerald-600/20 ring-emerald-400" : "",
                  isWrongSelected ? "bg-red-600/20 ring-red-400" : ""
                ].join(" ")}
              >
                <span className="text-sm">{choice}</span>
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="pt-2 flex items-center gap-3">
          {!showResult && (
            <button
              disabled={!canSubmit}
              onClick={submit}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition
                ${canSubmit ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-white/10 text-white/50 cursor-not-allowed"}`}
            >
              Submit
            </button>
          )}

          {showResult && !isLast && (
            <button
              onClick={next}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition"
            >
              Next
            </button>
          )}

          {showResult && isLast && (
            <button
              onClick={finish}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition"
            >
              Finish
            </button>
          )}
        </div>

        {/* Explanation */}
        {showResult && (
          <div className="mt-4 rounded-xl bg-[#0e1014] ring-1 ring-white/10 p-4">
            <div className="text-sm">
              <span className="font-semibold">
                {selected === q.correctIndex ? "Correct!" : "Not quite."}
              </span>{" "}
              <span className="text-white/70">{q.explanation}</span>
            </div>
          </div>
        )}
      </div>

      {/* Summary (shows right after finishing last question) */}
      {finished && (
        <div className="rounded-2xl bg-[#111318] ring-1 ring-white/10 p-6 space-y-3">
          <div className="text-lg font-semibold">Session Summary</div>
          <div className="text-white/70">You scored {score} out of {questions.length}.</div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={restart}
              className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-semibold"
            >
              Restart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
