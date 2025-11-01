import { useMemo, useState } from "react";

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
  // inequality shown to the student (LaTeX-ish string)
  stemLatex: string;
  // the *true* interval for x
  answer: Bound;
  // 3 distractors + 1 correct (shuffled)
  options: Bound[];
  // explanation text
  explanation: string;
};

/* --------------------- build a single problem --------------------- */
/** Build L <=/</ (x+m)/n <=/< R with n>0, integer endpoints for x */
function build(): Built {
  // Pick nice, contained endpoints for x so they fit the fixed number line [-10, 10]
  // Choose n ∈ {1,2,3,4}, L<R smallish, and m to keep x-bounds inside [-8,8]
  let n = sample([1, 2, 3, 4] as const);
  let L = randint(-4, 1);
  let R = L + randint(3, 6);
  let m = randint(-6, 6);
  let includeLeft = Math.random() < 0.5;
  let includeRight = Math.random() < 0.5;

  // Ensure x-bounds inside [-8,8]; if not, re-pick a couple of times
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

  // Format the center expression (x+m)/n
  const num =
    m === 0 ? "x" : `x ${m > 0 ? "+ " + m : "- " + Math.abs(m)}`;
  const mid =
    n === 1 ? `${num}` : `\\dfrac{${num}}{${n}}`;
  const symL = includeLeft ? "\\le" : "<";
  const symR = includeRight ? "\\le" : "<";
  const stemLatex = `${L} \\; ${symL} \\; ${mid} \\; ${symR} \\; ${R}`;

  // Explanation (multiply by n>0, then subtract m)
  const expl =
    `Multiply by ${n} (positive, so inequalities keep direction): ` +
    `${n}·${L} ${symL} ${num} ${symR} ${n}·${R}. ` +
    `Then subtract ${m}: ` +
    `${n * L - m} ${symL} x ${symR} ${n * R - m}. ` +
    `So the solution is ${includeLeft ? "[" : "("}${leftX}, ${rightX}${
      includeRight ? "]" : ")"
    } on the number line.`;

  const correct: Bound = {
    left: leftX,
    right: rightX,
    includeLeft,
    includeRight,
  };

  // Make 3 plausible distractors:
  const d1: Bound = { ...correct, includeLeft: !includeLeft };
  const d2: Bound = {
    ...correct,
    left: Math.min(correct.right - 1, correct.left + 1),
  };
  const d3: Bound = {
    ...correct,
    right: Math.max(correct.left + 1, correct.right - 1),
    includeRight: !includeRight,
  };

  const options = shuffle(
    uniqBy<Bound>([correct, d1, d2, d3], (b) =>
      `${b.left}|${b.right}|${b.includeLeft}|${b.includeRight}`
    )
  );

  return { stemLatex, answer: correct, options, explanation: expl };
}

/* --------------------------- SVG renderer -------------------------- */

function NumberLine({
  bound,
  width = 480,
  height = 56,
}: {
  bound: Bound;
  width?: number;
  height?: number;
}) {
  const PAD = 28; // horizontal padding
  const y = height / 2;
  const minX = -10;
  const maxX = 10;
  const scale = (width - 2 * PAD) / (maxX - minX);
  const map = (v: number) => PAD + (v - minX) * scale;

  const tickYs = { small: y - 8, big: y - 12 };
  const x0 = map(minX);
  const x1 = map(maxX);

  // Segment geometry
  const segL = Math.max(minX, Math.min(maxX, bound.left));
  const segR = Math.max(minX, Math.min(maxX, bound.right));
  const sxL = map(segL);
  const sxR = map(segR);

  const circleR = 6;

  const ticks = [];
  for (let t = minX; t <= maxX; t++) {
    const X = map(t);
    const isMajor = t % 5 === 0;
    ticks.push(
      <line
        key={`t-${t}`}
        x1={X}
        x2={X}
        y1={isMajor ? tickYs.big : tickYs.small}
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
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      role="img"
      aria-label={`Number line from -10 to 10 with solution segment`}
    >
      {/* base line */}
      <line x1={x0} y1={y} x2={x1} y2={y} stroke="#111" strokeWidth={2} />
      {/* arrowheads */}
      <polyline points={`${x1 - 10},${y - 6} ${x1},${y} ${x1 - 10},${y + 6}`} fill="#111" />
      <polyline points={`${x0 + 10},${y - 6} ${x0},${y} ${x0 + 10},${y + 6}`} fill="#111" />

      {/* ticks & labels */}
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
      {/* left */}
      <circle
        cx={sxL}
        cy={y}
        r={circleR}
        fill={bound.includeLeft ? "#2563eb" : "#fff"}
        stroke="#2563eb"
        strokeWidth={2}
      />
      {/* right */}
      <circle
        cx={sxR}
        cy={y}
        r={circleR}
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
  const [picked, setPicked] = useState<number | null>(null);

  // regenerate a fresh problem each time "seed" changes
  const problem = useMemo(() => {
    // touch Math.random with the seed so development reloads vary;
    // in production you’ll just get fresh randomness anyway
    void seed;
    return build();
  }, [seed]);

  const correctIndex = problem.options.findIndex(
    (o) =>
      o.left === problem.answer.left &&
      o.right === problem.answer.right &&
      o.includeLeft === problem.answer.includeLeft &&
      o.includeRight === problem.answer.includeRight
  );

  const letters = ["A", "B", "C", "D"];

  const isAnswered = picked !== null;
  const isCorrect = isAnswered && picked === correctIndex;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Compound Inequalities — Number Lines</h2>
      <p className="text-white/70">
        Choose the number line that represents the solution set.
      </p>

      {/* stem */}
      <div className="rounded-xl bg-white text-gray-900 border border-gray-200 shadow-sm p-4">
        <div className="text-lg">
          Which number line below shows the solution to the inequality{" "}
          <span className="font-mono bg-gray-100 px-1 rounded">
            {problem.stemLatex.replaceAll("\\le", "≤")}
          </span>
          ?
        </div>
      </div>

      {/* choices */}
      <div className="space-y-3">
        {problem.options.map((opt, i) => {
          const active = picked === i;
          const correct = i === correctIndex;
          const classes = [
            "w-full flex items-center gap-3 rounded-xl border bg-white text-gray-900 shadow-sm p-3",
            isAnswered
              ? correct
                ? "border-emerald-500 ring-2 ring-emerald-300"
                : active
                ? "border-rose-500 ring-2 ring-rose-300"
                : "border-gray-200"
              : active
              ? "border-blue-500 ring-2 ring-blue-300"
              : "border-gray-200 hover:border-gray-300",
          ].join(" ");

          return (
            <button
              key={i}
              disabled={isAnswered}
              className={classes}
              onClick={() => setPicked(i)}
            >
              <div className="w-8 h-8 rounded-full grid place-items-center font-semibold bg-gray-100">
                {letters[i]}
              </div>
              <div className="flex-1">
                <NumberLine bound={opt} />
              </div>
            </button>
          );
        })}
      </div>

      {/* feedback */}
      {isAnswered && (
        <div className={`rounded-xl p-4 border shadow-sm ${
          isCorrect ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          {isCorrect ? "Correct!" : "Not quite."}{" "}
          <span className="text-gray-700 block mt-1">
            {problem.explanation}
          </span>
        </div>
      )}

      <div className="pt-2">
        <button
          onClick={() => {
            setPicked(null);
            setSeed((s) => s + 1);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2"
        >
          Next Problem
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
