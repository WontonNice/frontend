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
function countMultiplesInRange(k: number, L: number, R: number) {
  return Math.floor(R / k) - Math.floor((L - 1) / k);
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

/* ===================== MC template type ===================== */
type BuiltMC = {
  stemText: string;       // KaTeX-ready
  choices: string[];      // KaTeX strings
  answerIndex: number;
  explText: string;       // KaTeX-ready
};

/* ===================== AVERAGE (multiple choice) ===================== */
function buildAverage(): BuiltMC {
  const oddCounts = [3, 5, 7, 9, 11] as const;
  const n = oddCounts[randint(0, oddCounts.length - 1)]; // odd count
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

  return { stemText, choices, answerIndex, explText };
}

/* ===================== NEITHER (2 nor 3) — multiple choice ===================== */
function buildNeither2or3(): BuiltMC {
  // choose an inclusive range with at least 1 multiple of 6 (to mirror the exemplar wording)
  let L = 0, R = 0, c6 = 0;
  do {
    L = randint(1, 40);
    R = L + randint(14, 30); // 15–31 numbers
    c6 = countMultiplesInRange(6, L, R);
  } while (c6 < 1);

  const total = R - L + 1;
  const c2 = countMultiplesInRange(2, L, R);
  const c3 = countMultiplesInRange(3, L, R);
  const neither = total - (c2 + c3 - c6); // inclusion–exclusion

  const stemText =
    `In the set of consecutive integers from ${L} to ${R}, inclusive, there are ${c6} integers ` +
    `that are multiples of both $2$ and $3$. How many integers in this set are multiples of ` +
    `**neither** $2$ nor $3$?`;

  // plausible distractors (common mistakes)
  const d1 = total - c2;                // removed only multiples of 2
  const d2 = total - c3;                // removed only multiples of 3
  const d3 = total - (c2 + c3);         // double-counted removal (forgot +c6)
  const d4 = Math.max(0, neither - 1);  // off-by-one
  const d5 = neither + 1;

  const all = shuffle(Array.from(new Set([neither, d1, d2, d3, d4, d5])));
  const choices = all.slice(0, 4).map((v) => `$${v}$`);
  if (!choices.map((c) => c.replace(/\$|\\,/g, "")).includes(String(neither))) {
    choices[0] = `$${neither}$`;
  }
  const answerIndex = choices.findIndex((c) => c === `$${neither}$`);

  const explText =
    `There are $N=${total}$ integers in the range. Use inclusion–exclusion for multiples of $2$ or $3$: \\n\\n` +
    `$\\#(2)=${c2},\\ \\#(3)=${c3},\\ \\#(2\\cap 3)=\\#(6)=${c6}$. \\;` +
    `So $\\#(2\\cup 3)=${c2}+${c3}-${c6}=${c2 + c3 - c6}$. \\n\\n` +
    `Therefore “neither $2$ nor $3$” is $N-\\#(2\\cup 3)=${total}-(${c2 + c3 - c6})=${neither}$.`;

  return { stemText, choices, answerIndex, explText };
}

/* --------------- streak storage (separate per mode) --------------- */
const STREAK_KEYS = {
  prod: "streak:consecutive-product:best",
  avg: "streak:consecutive-avg:best",
  nei: "streak:consecutive-neither:best",
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
type Mode = "product" | "average" | "neither";

export default function ConsecutiveIntegersPractice() {
  const [mode, setMode] = useState<Mode>("product");

  // Seeds to force regeneration per mode
  const [seedProd, setSeedProd] = useState(0);
  const [seedAvg, setSeedAvg] = useState(0);
  const [seedNei, setSeedNei] = useState(0);

  // Product state (free response)
  const [answer, setAnswer] = useState<string>("");
  const p = useMemo(() => {
    void seedProd;
    return buildProduct();
  }, [seedProd]);

  // MC states (shared UI)
  const [sel, setSel] = useState<number | null>(null);
  const qAvg = useMemo(() => {
    void seedAvg;
    return buildAverage();
  }, [seedAvg]);
  const qNei = useMemo(() => {
    void seedNei;
    return buildNeither2or3();
  }, [seedNei]);
  const q: BuiltMC | null = mode === "average" ? qAvg : mode === "neither" ? qNei : null;

  // Reveal & streaks (separate per mode)
  const [revealed, setRevealed] = useState(false);

  const [currentProd, setCurrentProd] = useState(0);
  const [bestProd, setBestProd] = useState(0);

  const [currentAvg, setCurrentAvg] = useState(0);
  const [bestAvg, setBestAvg] = useState(0);

  const [currentNei, setCurrentNei] = useState(0);
  const [bestNei, setBestNei] = useState(0);

  useEffect(() => {
    setBestProd(loadBest("prod"));
    setBestAvg(loadBest("avg"));
    setBestNei(loadBest("nei"));
  }, []);

  // Derived correctness per mode
  const numericAnswer: number | null = (() => {
    const t = answer.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  })();
  const isCorrect =
    mode === "product"
      ? numericAnswer === p.prod
      : sel != null && q != null && sel === q.answerIndex;

  // Keyboard: Enter to check (both UIs)
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
    } else if (mode === "average") {
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
    } else {
      if (isCorrect) {
        const next = currentNei + 1;
        setCurrentNei(next);
        if (next > bestNei) {
          setBestNei(next);
          saveBest("nei", next);
        }
      } else {
        setCurrentNei(0);
      }
    }

    setRevealed(true);
  };

  const onNext = () => {
    setRevealed(false);
    if (mode === "product") {
      setAnswer("");
      setSeedProd((s) => s + 1);
    } else if (mode === "average") {
      setSel(null);
      setSeedAvg((s) => s + 1);
    } else {
      setSel(null);
      setSeedNei((s) => s + 1);
    }
  };

  const shownCurrent = mode === "product" ? currentProd : mode === "average" ? currentAvg : currentNei;
  const shownBest = mode === "product" ? bestProd : mode === "average" ? bestAvg : bestNei;

  return (
    <div className="space-y-4">
      {/* Header + Streak badge */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold">
            {mode === "product"
              ? "Consecutive Integers — Product"
              : mode === "average"
              ? "Consecutive Integers — Averages"
              : "Consecutive Integers — Neither 2 nor 3"}
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
        <button
          onClick={() => {
            setRevealed(false);
            setMode("neither");
          }}
          className={`px-4 py-2 text-sm font-semibold ${
            mode === "neither"
              ? "bg-white/20 text-white"
              : "bg-white/5 text-white/80 hover:bg-white/10"
          }`}
        >
          Neither 2 nor 3
        </button>
      </div>

      {/* ======= STEM ======= */}
      <div className="rounded-xl bg-white text-gray-900 border border-gray-200 shadow-sm p-4">
        {mode === "product" ? (
          <MathText className="text-lg" text={p.stemText} />
        ) : q ? (
          <MathText className="text-lg" text={q.stemText} />
        ) : null}
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
        q && (
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
        )
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
              : q
              ? `Not quite. The correct choice is ${String.fromCharCode(65 + q.answerIndex)}.`
              : "Not quite."}
          </div>
          <MathText text={mode === "product" ? p.explText : q ? q.explText : ""} />
        </div>
      )}
    </div>
  );
}
