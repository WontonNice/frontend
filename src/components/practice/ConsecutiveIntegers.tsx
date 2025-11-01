// src/components/practice/ConsecutiveIntegersProduct.tsx
import { useEffect, useMemo, useState } from "react";
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
  S: number;
  a: number;
  b: number;
  prod: number;
  stemText: string; // plain text + inline math ($...$)
  explText: string; // prose + inline math ($...$)
};

function build(): Built {
  const S = randomOdd(-29, 29);
  const a = (S - 1) / 2;
  const b = a + 1;
  const prod = (a + 1) * (b - 2);

  // ✅ No TeX macros outside math; use **bold** and newlines for layout
  const stemText =
    `The sum of two consecutive integers is $${S}$. ` +
    `If $1$ is added to the smaller integer and $2$ is subtracted from the larger integer, ` +
    `what is the **product** of the two resulting integers?\n\n` +
    `Enter your answer in the space.`;

  // ✅ Put math in $...$; keep prose outside
  const explText =
    `Let the integers be $n$ and $n+1$. Then $n+(n+1)=${S}$, so $2n+1=${S}$ and $n=${a}$. \n\n` +
    `After the changes, the numbers are $(n+1)$ and $(n-1)$, so the product is $(n+1)(n-1)=n^2-1$. \n\n` +
    `Substitute $n=${a}$: $n^2-1=${a*a}-1=${a*a-1}=\\boxed{${prod}}$.`;

  return { S, a, b, prod, stemText, explText };
}

/* ---------------- streak storage ---------------- */
const STREAK_KEY = "streak:consecutive-product:best";
const loadBest = () => {
  try { return Math.max(0, parseInt(localStorage.getItem(STREAK_KEY) || "0", 10)); }
  catch { return 0; }
};
const saveBest = (best: number) => { try { localStorage.setItem(STREAK_KEY, String(best)); } catch {} };

/* -------------------- page -------------------- */
export default function ConsecutiveIntegersProduct() {
  const [seed, setSeed] = useState(0);
  const [answer, setAnswer] = useState<string>("");
  const [revealed, setRevealed] = useState(false);

  // streak
  const [current, setCurrent] = useState(0);
  const [best, setBest] = useState(0);
  useEffect(() => setBest(loadBest()), []);

  const p = useMemo(() => {
    void seed;
    return build();
  }, [seed]);

  const numericAnswer = (() => {
    const t = answer.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  })();

  const isCorrect = numericAnswer === p.prod;

  const onCheck = () => {
    if (revealed) return;
    if (isCorrect) {
      const next = current + 1;
      setCurrent(next);
      if (next > best) {
        setBest(next);
        saveBest(next);
      }
    } else {
      setCurrent(0);
    }
    setRevealed(true);
  };

  const onNext = () => {
    setAnswer("");
    setRevealed(false);
    setSeed((s) => s + 1);
  };

  // allow Enter to check
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !revealed) onCheck();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, isCorrect, current, best]);

  return (
    <div className="space-y-4">
      {/* Header + Streak badge */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Consecutive Integers — Product</h2>
          <p className="text-white/70">
            Solve and enter a single integer. New problems generate automatically.
          </p>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white w-44">
          <div className="grid grid-cols-2 gap-3 items-center">
            <div className="text-xs text-white/70">Current</div>
            <div className="text-xs text-white/70 border-l border-white/10 pl-3">Best</div>
            <div className="text-2xl font-semibold leading-none">{current}</div>
            <div className="text-2xl font-semibold leading-none pl-3 border-l border-transparent">{best}</div>
          </div>
        </div>
      </div>

      {/* Stem */}
      <div className="rounded-xl bg-white text-gray-900 border border-gray-200 shadow-sm p-4">
        <MathText className="text-lg" text={p.stemText} />
      </div>

      {/* Input + Buttons */}
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
            isCorrect
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="font-semibold mb-1">
            {isCorrect ? "Correct!" : `Not quite. The correct answer is ${p.prod}.`}
          </div>
          <MathText text={p.explText} />
        </div>
      )}
    </div>
  );
}
