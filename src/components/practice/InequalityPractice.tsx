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
function flipComp(s: "<" | "\\le" | ">" | "\\ge"): "<" | "\\le" | ">" | "\\ge" {
  if (s === "<") return ">";
  if (s === "\\le") return "\\ge";
  if (s === ">") return "<";
  return "\\le";
}

/* ----------------------------- types ----------------------------- */
type MaybeInf = number;

type Bound = {
  left: MaybeInf;
  right: MaybeInf;
  includeLeft: boolean;   // ignored if left = -Infinity
  includeRight: boolean;  // ignored if right =  Infinity
};

type Built = {
  stemLatex: string;        // inequality LaTeX
  answer: Bound;
  options: Bound[];
  explanationLatex: string; // KaTeX explanation
};

type Mode = "segment" | "ray";

/* --------------------- build: SEGMENT (compound) --------------------- */
function buildSegment(): Built {
  // Choose a “nice” compound inequality  L (≤ / <) (x+m)/n (≤ / <) R with n > 0
  let n = sample([1, 2, 3, 4] as const);
  let L = randint(-4, 1);
  let R = L + randint(3, 6);
  let m = randint(-6, 6);
  let includeLeft = Math.random() < 0.5;
  let includeRight = Math.random() < 0.5;

  // Keep endpoints visible and separated
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

  // Build LaTeX stem
  const num = m === 0 ? "x" : `x ${m > 0 ? "+ " + m : "- " + Math.abs(m)}`;
  const mid = n === 1 ? `${num}` : `\\dfrac{${num}}{${n}}`;
  const symL = includeLeft ? "\\le" : "<";
  const symR = includeRight ? "\\le" : "<";
  const stemLatex = `${L} \\; ${symL} \\; ${mid} \\; ${symR} \\; ${R}`;

  // Explanation
  const explanationLatex =
    `\\textbf{Solve:}\\; ${L}\\,${symL}\\,${mid}\\,${symR}\\,${R} \\quad (n=${n}>0) \\\\`
    + `\\text{Multiply by } ${n}:\\; ${nTimes(L, n)}\\,${symL}\\,${num}\\,${symR}\\,${nTimes(R, n)} \\\\`
    + `\\text{Subtract } ${m}:\\; ${leftX}\\,${symL}\\,x\\,${symR}\\,${rightX} \\quad \\Rightarrow\\;`
    + `x\\in ${includeLeft ? "[" : "("}${leftX},\\,${rightX}${includeRight ? "]" : ")"}.`;

  const correct: Bound = { left: leftX, right: rightX, includeLeft, includeRight };

  // Distractors
  const d1: Bound = { ...correct, includeLeft: !includeLeft };
  const d2: Bound = { ...correct, left: Math.min(correct.right - 1, correct.left + 1) };
  const d3: Bound = { ...correct, right: Math.max(correct.left + 1, correct.right - 1), includeRight: !includeRight };

  const options = shuffle(
    uniqBy(
      [correct, d1, d2, d3],
      (b) => `${b.left}|${b.right}|${b.includeLeft}|${b.includeRight}`
    )
  );

  return { stemLatex, answer: correct, options, explanationLatex };

  function nTimes(v: number, n: number) {
    const prod = v * n;
    return v < 0 ? `${n}(${v})=${prod}` : `${n}\\cdot${v}=${prod}`;
  }
}

/* ----------------------- build: RAY (one-sided) ---------------------- */
function buildRay(): Built {
  // Choose target boundary x0, slope a (±), intercept b so a*x0 + b = k exactly
  const x0 = randint(-6, 6);
  const a = sample([-4, -3, -2, 2, 3, 4] as const);
  const b = randint(-6, 6);

  // Pick the final relation for x (this determines direction + open/closed)
  const finalRel = sample(["\\le", "<", "\\ge", ">"] as const);
  const closed = finalRel === "\\le" || finalRel === "\\ge";

  // What comparator is shown in the stem for ax+b ? k
  const shownComp = a > 0 ? finalRel : flipComp(finalRel);

  const k = a * x0 + b;

  // Randomly place variable side LHS or RHS to add variety like “-3 ≤ 2x-5”
  const varOnRight = Math.random() < 0.5;
  const axb = `${a}x ${b === 0 ? "" : b > 0 ? "+ " + b : "- " + Math.abs(b)}`.trim();

  const stemLatex = varOnRight
    ? `${k} \\; ${shownComp} \\; ${axb}`
    : `${axb} \\; ${shownComp} \\; ${k}`;

  // Solution bound: x (finalRel) x0
  const goLeft = finalRel === "\\le" || finalRel === "<";
  const correct: Bound = goLeft
    ? { left: -Infinity, right: x0, includeLeft: false, includeRight: closed }
    : { left: x0, right: Infinity, includeLeft: closed, includeRight: false };

  // Explanation steps (subtract, divide — flip when a<0)
  const step1 = varOnRight
    ? `${k} \\; ${shownComp} \\; ${a}x ${b >= 0 ? "+ " + b : "- " + Math.abs(b)}`
    : `${a}x ${b >= 0 ? "+ " + b : "- " + Math.abs(b)} \\; ${shownComp} \\; ${k}`;

  const afterSub = varOnRight
    ? `${k - b} \\; ${shownComp} \\; ${a}x`
    : `${a}x \\; ${shownComp} \\; ${k - b}`;

  const afterDiv =
    a > 0
      ? `x \\; ${finalRel} \\; ${x0}`
      : `x \\; ${finalRel} \\; ${x0} \\quad (\\text{flips since } a<0)`;

  const intervalText = goLeft
    ? `${closed ? "(-\\infty," : "(-\\infty,"}\\,${x0}${closed ? "]" : ")"}`
    : `${closed ? "[" : "("}${x0},\\,\\infty${closed ? ")" : ")"}`;

  const explanationLatex =
    `\\textbf{Solve:}\\; ${step1} \\\\`
    + `\\text{Subtract } ${b}:\\; ${afterSub} \\\\`
    + `\\text{Divide by } ${a}:\\; ${afterDiv} \\;\\Rightarrow\\; x\\in ${intervalText}.`;

  // Distractors: wrong direction, wrong open/closed, ±1 endpoint
  const flipDir: Bound = goLeft
    ? { left: x0, right: Infinity, includeLeft: closed, includeRight: false }
    : { left: -Infinity, right: x0, includeLeft: false, includeRight: closed };

  const toggleEnd: Bound = goLeft
    ? { ...correct, includeRight: !closed }
    : { ...correct, includeLeft: !closed };

  const shiftOne: Bound = goLeft
    ? { left: -Infinity, right: x0 + sample([-1, 1] as const), includeLeft: false, includeRight: closed }
    : { left: x0 + sample([-1, 1] as const), right: Infinity, includeLeft: closed, includeRight: false };

  const options = shuffle(
    uniqBy(
      [correct, flipDir, toggleEnd, shiftOne],
      (b) => `${b.left}|${b.right}|${b.includeLeft}|${b.includeRight}`
    )
  );

  return { stemLatex, answer: correct, options, explanationLatex };
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

  // For rays, clamp at visible ends
  const segL = isFinite(bound.left) ? (bound.left as number) : minX;
  const segR = isFinite(bound.right) ? (bound.right as number) : maxX;
  const sxL = map(Math.max(minX, Math.min(maxX, segL)));
  const sxR = map(Math.max(minX, Math.min(maxX, segR)));

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
    <text key={`lbl-${n}`} x={map(n)} y={y + 26} textAnchor="middle" fontSize={12} fill="#111">
      {n}
    </text>
  ));

  const drawLeftDot = isFinite(bound.left);
  const drawRightDot = isFinite(bound.right);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
      {/* spine + arrows */}
      <line x1={x0} y1={y} x2={x1} y2={y} stroke="#111" strokeWidth={2} />
      <polyline points={`${x1 - 10},${y - 6} ${x1},${y} ${x1 - 10},${y + 6}`} fill="#111" />
      <polyline points={`${x0 + 10},${y - 6} ${x0},${y} ${x0 + 10},${y + 6}`} fill="#111" />
      {ticks}
      {labels}

      {/* solution segment or ray */}
      <line
        x1={sxL}
        y1={y}
        x2={sxR}
        y2={y}
        stroke="#2563eb"
        strokeWidth={6}
        strokeLinecap="round"
      />

      {/* endpoints (dots only on finite ends) */}
      {drawLeftDot && (
        <circle
          cx={sxL}
          cy={y}
          r={6}
          fill={bound.includeLeft ? "#2563eb" : "#fff"}
          stroke="#2563eb"
          strokeWidth={2}
        />
      )}
      {drawRightDot && (
        <circle
          cx={sxR}
          cy={y}
          r={6}
          fill={bound.includeRight ? "#2563eb" : "#fff"}
          stroke="#2563eb"
          strokeWidth={2}
        />
      )}
    </svg>
  );
}

/* ------------------------------- Page ------------------------------- */
export default function InequalityNumberLinePractice() {
  const [mode, setMode] = useState<Mode>("segment");
  const [seed, setSeed] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const problem = useMemo(() => {
    void seed;
    return mode === "segment" ? buildSegment() : buildRay();
  }, [seed, mode]);

  const sameBound = (a: Bound, b: Bound) =>
    (a.left === b.left || (!isFinite(a.left) && !isFinite(b.left))) &&
    (a.right === b.right || (!isFinite(a.right) && !isFinite(b.right))) &&
    a.includeLeft === b.includeLeft &&
    a.includeRight === b.includeRight;

  const correctIndex = problem.options.findIndex((o) => sameBound(o, problem.answer));
  const isCorrect = revealed && selected === correctIndex;
  const letters = ["A", "B", "C", "D"];

  const reset = () => {
    setSelected(null);
    setRevealed(false);
    setSeed((s) => s + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold">
            {mode === "segment"
              ? "Compound Inequalities — Number Lines"
              : "One-Sided Inequalities — Number Lines"}
          </h2>
          <p className="text-white/70">Choose the number line that represents the solution set.</p>
        </div>

        {/* Mode switch */}
        <div className="inline-flex rounded-xl overflow-hidden border border-white/15">
          <button
            onClick={() => { setRevealed(false); setMode("segment"); }}
            className={`px-4 py-2 text-sm font-semibold ${
              mode === "segment" ? "bg-white/20 text-white" : "bg-white/5 text-white/80 hover:bg-white/10"
            }`}
          >
            Segment
          </button>
          <button
            onClick={() => { setRevealed(false); setMode("ray"); }}
            className={`px-4 py-2 text-sm font-semibold ${
              mode === "ray" ? "bg-white/20 text-white" : "bg-white/5 text-white/80 hover:bg-white/10"
            }`}
          >
            Ray
          </button>
        </div>
      </div>

      {/* stem with KaTeX */}
      <div className="rounded-xl bg-white text-gray-900 border border-gray-200 shadow-sm p-4">
        <MathText
          className="text-lg"
          text={`Which number line below shows the solution to the inequality $${problem.stemLatex}$?`}
        />
      </div>

      {/* choices */}
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

      {/* feedback */}
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
