// src/components/practice/ConsecutiveIntegersProduct.tsx
import { useMemo, useState } from "react";
import MathText from "../MathText";

/* ---------------- helpers ---------------- */
function randint(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomOdd(min: number, max: number) {
  let v = randint(min, max);
  if (v % 2 === 0) v += v === max ? -1 : 1;
  return v;
}

/* ------------- build one problem ------------- */
type Built = {
  S: number;           // sum of consecutive integers (odd)
  a: number;           // smaller integer
  b: number;           // larger integer = a + 1
  prod: number;        // (a + 1) * (b - 2)
  stemLatex: string;   // KaTeX stem
  explLatex: string;   // KaTeX explanation
};

function build(): Built {
  // Random odd sum in a friendly range
  const S = randomOdd(-29, 29); // includes negatives / positives
  const a = (S - 1) / 2;        // smaller integer
  const b = a + 1;              // larger integer
  const prod = (a + 1) * (b - 2); // (+1) to smaller, (−2) to larger

  // KaTeX stem
  const stemLatex =
    `The sum of two consecutive integers is $${S}$. ` +
    `If $1$ is added to the smaller integer and $2$ is subtracted from the larger integer, ` +
    `what is the \\textbf{product} of the two resulting integers?\\\\[2pt]` +
    `\\text{Enter your answer in the space.}`;

  // KaTeX explanation (algebraic, then numeric)
  const explLatex =
    `\\textbf{Let the integers be } n \\text{ and } n+1.\\quad n+(n+1)=${S}\\Rightarrow 2n+1=${S} \\Rightarrow n=\\dfrac{${S}-1}{2}=${a}.\\\\` +
    `\\text{New numbers: } (n+1)\\text{ and }(n+1-2)=(n-1).\\;\\text{Product}= (n+1)(n-1)=n^2-1.\\\\` +
    `n=${a}\\;\\Rightarrow\\; n^2-1=${a}^2-1=${a * a - 1} \\;=\\; \\boxed{${prod}}.`;

  return { S, a, b, prod, stemLatex, explLatex };
}

/* -------------------- page -------------------- */
export default function ConsecutiveIntegersProduct() {
  const [seed, setSeed] = useState(0);
  const [answer, setAnswer] = useState<string>("");
  const [revealed, setRevealed] = useState(false);

  const p = useMemo(() => {
    void seed;
    return build();
  }, [seed]);

  const numericAnswer = (() => {
    const t = answer.trim();
    if (!t) return null;
    // allow " -12 " etc.
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  })();

  const correct = revealed && numericAnswer === p.prod;

  const onCheck = () => setRevealed(true);
  const onNext = () => {
    setAnswer("");
    setRevealed(false);
    setSeed((s) => s + 1);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Consecutive Integers — Product</h2>
      <p className="text-white/70">
        Solve and enter a single integer. New problems generate automatically.
      </p>

      {/* Stem */}
      <div className="rounded-xl bg-white text-gray-900 border border-gray-200 shadow-sm p-4">
        <MathText className="text-lg" text={p.stemLatex} />
      </div>

      {/* Input */}
      <div className="rounded-xl bg-white text-gray-900 border border-gray-200 shadow-sm p-4 flex items-center gap-3">
        <input
          type="text"
          inputMode="numeric"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="w-36 rounded-lg border border-gray-300 px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Answer"
          disabled={revealed}
        />
        <button
          onClick={onCheck}
          disabled={revealed || numericAnswer === null}
          className={`px-5 py-2.5 rounded-xl font-semibold shadow-sm ${
            revealed || numericAnswer === null
              ? "bg-indigo-300 text-white/80 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-500 text-white"
          }`}
        >
          Check Answer
        </button>
        <button
          onClick={onNext}
          disabled={!revealed}
          className={`px-5 py-2.5 rounded-xl font-semibold shadow-sm ${
            revealed
              ? "bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-300"
              : "bg-gray-200 text-gray-500 cursor-not-allowed"
          }`}
        >
          Next Question
        </button>
      </div>

      {/* Feedback */}
      {revealed && (
        <div
          className={`rounded-xl p-4 border shadow-sm ${
            correct
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="font-semibold mb-1">
            {correct ? "Correct!" : `Not quite. The correct answer is ${p.prod}.`}
          </div>
          <MathText text={p.explLatex} />
        </div>
      )}
    </div>
  );
}
