// src/components/practice/InequalityNumberLinePractice.tsx
import { useMemo, useState } from "react";
import MathText from "../MathText";

/* ----------------------------- helpers ----------------------------- */
function randint(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function sample<T>(arr: readonly T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function shuffle<T>(arr: readonly T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function uniqBy<T>(arr: readonly T[], key: (v: T) => string) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const v of arr) {
    const k = key(v);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(v);
    }
  }
  return out;
}

/* ----------------------------- types ----------------------------- */
type Bound = {
  left: number;
  right: number;
  includeLeft: boolean;
  includeRight: boolean;
};
type Built = {
  stemLatex: string;        // e.g. "-2 \\le \\dfrac{x-3}{2} < 2"
  answer: Bound;
  options: Bound[];
  explanationLatex: string; // KaTeX text for solution
};

/* --------------------- build a single problem --------------------- */
function build(): Built {
  // Choose a “nice” compound inequality  L (≤/ <) (x+m)/n (≤/ <) R
  let n = sample([1, 2, 3, 4] as const);            // positive only to avoid flipping signs
  let L = randint(-4, 1);
  let R = L + randint(3, 6);
  let m = randint(-6, 6);
  let includeLeft = Math.random() < 0.5;
  let includeRight = Math.random() < 0.5;

  // Keep endpoints in visible range and sufficiently apart
  let guard = 0;
  let leftX = n * L - m;
  let rightX = n * R - m;
  while ((leftX < -8 || rightX > 8 || rightX - leftX < 2) && guard < 40) {
    n = sample([1, 2, 3, 4] as const);
    L = randint(-4, 1);
    R = L + randint(3, 6);
    m = randint(-6, 6);
    leftX = n * L - m;
    rightX = n * R - m;
    guard++;
  }

  // Build nice LaTeX stem
  const num = m === 0 ? "x" : `x ${m > 0 ? "+ " + m : "- " + Math.abs(m)}`;
  const mid = n === 1 ? `${num}` : `\\dfrac{${num}}{${n}}`;
  const symL = includeLeft ? "\\le" : "<";
  const symR = includeRight ? "\\le" : "<";
  const stemLatex = `${L} \\; ${symL} \\; ${mid} \\; ${symR} \\; ${R}`;

  // Explanation: multiply through (n>0), then subtract m
  const explanationLatex =
    `\\textbf{Solve:}\\; ${L}\\,${symL}\\,${mid}\\,${symR}\\,${R} \\quad (n=${n}>0) \\\\`
    + `\\text{Multiply by } ${n}:\\; ${nL(L,n)}\\,${symL}\\,${num}\\,${symR}\\,${nR(R,n)} \\\\`
    + `\\text{Subtract } ${m}:\\; ${leftX}\\,${symL}\\,x\\,${symR}\\,${rightX} \\quad \\Rightarrow`
    + `\\quad x\\in ${includeLeft ? "[" : "("}${leftX},\\,${rightX}${includeRight ? "]" : ")"}.`;

  const correct: Bound = { left: leftX, right: rightX, includeLeft, includeRight };

  // Plausible distractors (endpoint open/closed errors, shifted ends)
  const d1: Bound = { ...correct, includeLeft: !includeLeft };
  const d2: Bound = { ...correct, left: Math.min(correct.right - 1, correct.left + 1) };
  const d3: Bound = { ...correct, right: Math.max(correct.left + 1, correct.right - 1), includeRight: !includeRight };

  const options = shuffle(
    uniqBy([correct, d1, d2, d3], (b) => `${b.left}|${b.right}|${b.includeLeft}|${b.includeRight}`)
  );

  return { stemLatex, answer: correct, options, explanationLatex };

  function nL(L: number, n: number) {
    const v = n * L;
    return L < 0 ? `${n}(${L})=${v}` : `${n}\\cdot${L}=${v}`;
  }
  function nR(R: number, n: number) {
    const v = n * R;
    return R < 0 ? `${n}(${R})=${v}` : `${n}\\cdot${R}=${v}`;
  }
}

/* --------------------------- SVG renderer -------------------------- */
function NumberLine({
  bound,
  width = 520,
  height = 60,
}: {
  bound: Bound;
  width?: number;
  height?: number;
}) {
  const PAD = 30;
  const y = height / 2;
  const minX = -10;
  const maxX = 10;
  const scale = (width - 2 * PAD) / (maxX - minX);
  const map = (v: number) => PAD + (v - minX) * scale;
  const x0 = map(minX);
  const x1 = map(maxX);

  // clamp within visible line for drawing segment
  const segL = Math.max(minX, Math.min(maxX, bound.left));
  const segR = Math.max(minX, Math.min(maxX, bound.right));
  const sxL = map(segL);
  const sxR = map(segR);

  const ticks = [];
  for (let t = minX; t <= maxX; t++) {
    const X = map(t);
    const major = t % 5 === 0;
    ticks.push(
      <line
        key={`t-${t}`}
        x1={X}
        x2={X}
        y1={major ? y - 12 : y - 8}
        y2={y + 12}
        stroke="#111"
        strokeWidth={1.2}
      />
    );
  }
  const labels = [-10, -5, 0, 5, 10].map((n) => (
    <text
      key={`lbl-${n}`}
      x={map(n)}
      y={y + 26}
      textAnchor="middle"
      fontSize={12}
      fill="#111"
    >
      {n}
    </text>
  ));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
      {/* spine + arrows */}
      <line x1={x0} y1={y} x2={x1} y2={y} stroke="#111" strokeWidth={2} />
      <polyline points={`${x1 - 10},${y - 6} ${x1},${y} ${x1 - 10},${y + 6}`} fill="#111" />
      <polyline points={`${x0 + 10},${y - 6} ${x0},${y} ${x0 + 10},${y + 6}`} fill="#111" />
      {ticks}
      {labels}

      {/* solution segment */}
      <line
        x1={sxL}
        y1={y}
        x2={sxR}
        y2={y}
        stroke="#2563eb"
        strokeWidth={6}
        strokeLinecap="round"
      />
      {/* endpoints */}
      <circle
        cx={sxL}
        cy={y}
        r={6}
        fill={bound.includeLeft ? "#2563eb" : "#fff"}
        stroke="#2563eb"
        strokeWidth={2}
      />
      <circle
        cx={sxR}
        cy={y}
        r={6}
        fill={bound.includeRight ? "#2563eb" : "#fff"}
        stroke="#2563eb"
        strokeWidth={2}
      />
    </svg>
  );
}

/* ------------------------------- Page ------------------------------- */
export default function InequalityNumberLinePractice() {
  const [seed, setSeed] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const problem = useMemo(() => {
    void seed; // recompute when seed changes
    return build();
  }, [seed]);

  const correctIndex = problem.options.findIndex(
    (o) =>
      o.left === problem.answer.left &&
      o.right === problem.answer.right &&
      o.includeLeft === problem.answer.includeLeft &&
      o.includeRight === problem.answer.includeRight
  );

  const isCorrect = revealed && selected === correctIndex;
  const letters = ["A", "B", "C", "D"];

  const reset = () => {
    setSelected(null);
    setRevealed(false);
    setSeed((s) => s + 1);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Compound Inequalities — Number Lines</h2>
      <p className="text-white/70">Choose the number line that represents the solution set.</p>

      {/* stem with KaTeX */}
      <div className="rounded-xl bg-white text-gray-900 border border-gray-200 shadow-sm p-4">
        <MathText
          className="text-lg"
          text={`Which number line below shows the solution to the inequality $${problem.stemLatex}$?`}
        />
      </div>

      {/* choices (radio + card + SVG line) */}
      <div className="space-y-3">
        {problem.options.map((opt, i) => {
          const chosen = selected === i;
          const correct = i === correctIndex;

          const ringClass = revealed
            ? correct
              ? "border-emerald-500 ring-2 ring-emerald-300"
              : chosen
              ? "border-rose-500 ring-2 ring-rose-300"
              : "border-gray-200"
            : chosen
            ? "border-indigo-500 ring-2 ring-indigo-300"
            : "border-gray-200 hover:border-gray-300";

          return (
            <label
              key={i}
              className={`w-full flex items-center gap-4 rounded-xl bg-white text-gray-900 shadow-sm p-3 border ${ringClass} cursor-pointer`}
            >
              {/* radio */}
              <input
                type="radio"
                name="opt"
                className="peer hidden"
                checked={chosen}
                onChange={() => setSelected(i)}
                disabled={revealed}
              />
              <div
                className={`h-5 w-5 rounded-full border-2 grid place-items-center ${
                  chosen ? "border-indigo-600" : "border-gray-400"
                }`}
              >
                <div
                  className={`h-2.5 w-2.5 rounded-full ${
                    chosen ? "bg-indigo-600" : "bg-transparent"
                  }`}
                />
              </div>

              <div className="flex-1">
                <NumberLine bound={opt} />
              </div>

              {/* (optional) letter tag to match some SAT styles */}
              <div className="w-8 h-8 rounded-full grid place-items-center font-semibold text-gray-700 bg-gray-100">
                {letters[i]}
              </div>
            </label>
          );
        })}
      </div>

      {/* action buttons */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={() => setRevealed(true)}
          disabled={selected === null || revealed}
          className={`px-5 py-2.5 rounded-xl font-semibold shadow-sm ${
            selected === null || revealed
              ? "bg-indigo-300 cursor-not-allowed text-white/80"
              : "bg-indigo-600 hover:bg-indigo-500 text-white"
          }`}
        >
          Check Answer
        </button>
        <button
          onClick={reset}
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

      {/* feedback + KaTeX explanation */}
      {revealed && (
        <div
          className={`rounded-xl p-4 border shadow-sm ${
            isCorrect
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="font-semibold mb-1">
            {isCorrect ? "Correct!" : "Not quite."}
          </div>
          <MathText text={problem.explanationLatex} />
        </div>
      )}
    </div>
  );
}
