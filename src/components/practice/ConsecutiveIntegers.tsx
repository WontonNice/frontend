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
function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ===================== PRODUCT (free response) ===================== */
type BuiltProduct = {
  S: number;
  a: number;          // smaller integer
  prod: number;
  stemText: string;   // KaTeX-ready
  explText: string;   // KaTeX-ready
};

function buildProduct(): BuiltProduct {
  const S = randomOdd(-29, 29);      // sum of consecutive integers (odd)
  const a = (S - 1) / 2;             // smaller integer
  const prod = (a + 1) * (a - 1);    // (n+1)(n-1) = n^2 - 1

  const stemText =
    `The sum of two consecutive integers is $${S}$. ` +
    `If $1$ is added to the smaller integer and $2$ is subtracted from the larger integer, ` +
    `what is the **product** of the two resulting integers?\\n\\n` +
    `Enter your answer in the space.`;

  const explText =
    `Let the integers be $n$ and $n+1$. Then $n+(n+1)=${S}$, so $2n+1=${S}$ and $n=${a}$. \\n\\n` +
    `After the changes, the numbers are $(n+1)$ and $(n-1)$, so the product is $(n+1)(n-1)=n^2-1$. \\n\\n` +
    `Substitute $n=${a}$: $n^2-1=${a * a}-1=${a * a - 1}=\\boxed{${prod}}$.`;

  return { S, a, prod, stemText, explText };
}

/* ===================== AVERAGE (multiple choice) ===================== */
type BuiltAvg = {
  n: number;              // count of consecutive integers (odd)
  halfSpan: number;       // (n-1)/2
  stemText: string;       // KaTeX-ready
  choices: string[];      // KaTeX-wrapped options
  answerIndex: number;
  explText: string;       // KaTeX-ready
};

function buildAverage(): BuiltAvg {
  const n = [3, 5, 7, 9, 11][randint(0, 4)]; // odd count
  const halfSpan = (n - 1) / 2;

  const stemText =
    `The **least** of ${n} consecutive integers is $\\ell$, and the **greatest** is $g$. ` +
    `What is the value of $\\dfrac{\\ell + g}{2}$ in terms of $\\ell$?`;

  const correct = `$\\ell + ${halfSpan}$`;
  const pool = shuffle([
    correct,
    `$2\\ell$`,
    `$3\\ell$`,
    `$\\ell + ${n - 1}$`,
    `$\\ell + ${halfSpan + 1}$`,
  ]);
  const choices = pool.slice(0, 4);
  const answerIndex = choices.findIndex((c) => c === correct);

  const explText =
    `Let the integers be $\\ell,\\ \\ell+1,\\ \\ldots,\\ \\ell+(${n - 1})$. Then $g=\\ell+(${n - 1})$. \\n\\n` +
    `Thus $\\displaystyle \\frac{\\ell+g}{2} = \\frac{\\ell + (\\ell+${n - 1})}{2} ` +
    `= \\frac{2\\ell + ${n - 1}}{2} = \\ell + \\frac{${n - 1}}{2} = \\ell + ${halfSpan}$.`;

  return { n, halfSpan, stemText, choices, answerIndex, explText };
}

/* --------------- streak storage (separate per mode) --------------- */
const STREAK_KEYS = {
  prod: "streak:consecutive-product:best",
  avg: "streak:consecutive-avg:best",
} as const;

function loadBest(key: keyof typeof STREAK_KEYS) {
  try {
    return Math.max(0, parseInt(localStorage.getItem(STREAK_KEYS[key]) || "0", 10));
  } catch {
    return 0;
  }
}
function saveBest(key: keyof typeof STREAK_KEYS, best: number) {
  try {
    localStorage.setItem(STREAK_KEYS[key], String(best));
  } catch {}
}

/* ============================== PAGE ============================== */
type Mode = "product" | "average";

export default function ConsecutiveIntegersProduct() {
  const [mode, setMode] = useState<Mode>("product");

  // Seeds to force regeneration per mode
  const [seedProd, setSeedProd] = useState(0);
  const [seedAvg, setSeedAvg] = useState(0);

  // Product state
  const [answer, setAnswer] = useState<string>("");
  const p = useMemo(() => {
    void seedProd;
    return buildProduct();
  }, [seedProd]);

  // Average state
  const [sel, setSel] = useState<number | null>(null);
  const q = useMemo(() => {
    void seedAvg;
    return buildAverage();
  }, [seedAvg]);

  // Reveal & streaks (separate per mode)
  const [revealed, setRevealed] = useState(false);

  const [currentProd, setCurrentProd] = useState(0);
  const [bestProd, setBestProd] = useState(0);

  const [currentAvg, setCurrentAvg] = useState(0);
  const [bestAvg, setBestAvg] = useState(0);

  useEffect(() => {
    setBestProd(loadBest("prod"));
    setBestAvg(loadBest("avg"));
  }, []);

  // Derived correctness per mode
  const numericAnswer = (() => {
    const t = answer.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  })();
  const isCorrect =
    mode === "product"
      ? numericAnswer === p.prod
      : sel != null && sel === q.answerIndex;

  // Keyboard: Enter to check (both modes)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !revealed) onCheck();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, isCorrect, mode, numericAnswer, sel]);

  const onCheck = () => {
    if (revealed) return;

    if (mode === "product") {
      if (isCorrect) {
        const next = currentProd + 1;
        setCurrentProd(next);
        if (next > bestProd) {
          setBestProd(next);
          saveBest("prod", next);
        }
      } else {
        setCurrentProd(0);
      }
    } else {
      if (isCorrect) {
        const next = currentAvg + 1;
        setCurrentAvg(next);
        if (next > bestAvg) {
          setBestAvg(next);
          saveBest("avg", next);
        }
      } else {
        setCurrentAvg(0);
      }
    }

    setRevealed(true);
  };

  const onNext = () => {
    setRevealed(false);
    if (mode === "product") {
      setAnswer("");
      setSeedProd((s) => s + 1);
    } else {
      setSel(null);
      setSeedAvg((s) => s + 1);
    }
  };

  const shownCurrent = mode === "product" ? currentProd : currentAvg;
  const shownBest = mode === "product" ? bestProd : bestAvg;

  return (
    <div className="space-y-4">
      {/* Header + Streak badge */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold">
            {mode === "product"
              ? "Consecutive Integers — Product"
              : "Consecutive Integers — Averages"}
          </h2>
          <p className="text-white/70">
            {mode === "product"
              ? "Solve and enter a single integer. New problems generate automatically."
              : "Choose the best answer. New problems generate automatically."}
          </p>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white w-44">
          <div className="grid grid-cols-2 gap-3 items-center">
            <div className="text-xs text-white/70">Current</div>
            <div className="text-xs text-white/70 border-l border-white/10 pl-3">Best</div>
            <div className="text-2xl font-semibold leading-none">{shownCurrent}</div>
            <div className="text-2xl font-semibold leading-none pl-3 border-l border-transparent">
              {shownBest}
            </div>
          </div>
        </div>
      </div>

      {/* Mode switch */}
      <div className="inline-flex rounded-xl overflow-hidden border border-white/15">
        <button
          onClick={() => {
            setRevealed(false);
            setMode("product");
          }}
          className={`px-4 py-2 text-sm font-semibold ${
            mode === "product"
              ? "bg-white/20 text-white"
              : "bg-white/5 text-white/80 hover:bg-white/10"
          }`}
        >
          Product
        </button>
        <button
          onClick={() => {
            setRevealed(false);
            setMode("average");
          }}
          className={`px-4 py-2 text-sm font-semibold ${
            mode === "average"
              ? "bg-white/20 text-white"
              : "bg-white/5 text-white/80 hover:bg-white/10"
          }`}
        >
          Averages
        </button>
      </div>

      {/* ======= STEM ======= */}
      <div className="rounded-xl bg-white text-gray-900 border border-gray-200 shadow-sm p-4">
        {mode === "product" ? (
          <MathText className="text-lg" text={p.stemText} />
        ) : (
          <MathText className="text-lg" text={q.stemText} />
        )}
      </div>

      {/* ======= INTERACTION + BUTTONS ======= */}
      {mode === "product" ? (
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
            disabled={revealed || (answer.trim() === "" || numericAnswer === null)}
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
      ) : (
        <div className="rounded-xl bg-white text-gray-900 border border-gray-200 shadow-sm p-4">
          <div className="space-y-2">
            {q.choices.map((ch, i) => (
              <label
                key={i}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer ${
                  sel === i ? "border-indigo-500 bg-indigo-50" : "border-gray-300 hover:bg-gray-50"
                } ${revealed ? "pointer-events-none opacity-90" : ""}`}
              >
                <input
                  type="radio"
                  className="h-4 w-4"
                  checked={sel === i}
                  onChange={() => setSel(i)}
                  disabled={revealed}
                />
                <span className="font-semibold w-6">{String.fromCharCode(65 + i)}.</span>
                <MathText text={ch} />
              </label>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={onCheck}
              disabled={revealed || sel === null}
              className={`px-5 py-2.5 rounded-xl font-semibold shadow-sm ${
                revealed || sel === null
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
        </div>
      )}

      {/* ======= FEEDBACK ======= */}
      {revealed && (
        <div
          className={`rounded-xl p-4 border shadow-sm ${
            isCorrect
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="font-semibold mb-1">
            {isCorrect
              ? "Correct!"
              : mode === "product"
              ? `Not quite. The correct answer is ${p.prod}.`
              : `Not quite. The correct choice is ${String.fromCharCode(65 + q.answerIndex)}.`}
          </div>
          <MathText text={mode === "product" ? p.explText : q.explText} />
        </div>
      )}
    </div>
  );
}
