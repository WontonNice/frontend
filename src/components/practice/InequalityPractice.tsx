// src/components/practice/InequalityNumberLinePractice.tsx
import React, { useMemo, useRef, useState } from "react";
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
type Bound = {
  left: number; // finite (segment mode only)
  right: number;
  includeLeft: boolean;
  includeRight: boolean;
};
type BuiltSegment = {
  stemLatex: string;
  answer: Bound;
  options: Bound[];
  explanationLatex: string;
};

type Ray = { x0: number; dir: "left" | "right"; closed: boolean };
type BuiltRay = {
  stemLatex: string;
  answer: Ray;
  explanationLatex: string;
};

type Mode = "segment" | "ray";

/* --------------------- build: SEGMENT (compound) --------------------- */
function buildSegment(): BuiltSegment {
  // L (≤ / <) (x+m)/n (≤ / <) R, with n > 0
  let n = sample([1, 2, 3, 4] as const);
  let L = randint(-4, 1);
  let R = L + randint(3, 6);
  let m = randint(-6, 6);
  let includeLeft = Math.random() < 0.5;
  let includeRight = Math.random() < 0.5;

  // keep within view and non-degenerate
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

  const num = m === 0 ? "x" : `x ${m > 0 ? "+ " + m : "- " + Math.abs(m)}`;
  const mid = n === 1 ? `${num}` : `\\dfrac{${num}}{${n}}`;
  const symL = includeLeft ? "\\le" : "<";
  const symR = includeRight ? "\\le" : "<";
  const stemLatex = `${L} \\; ${symL} \\; ${mid} \\; ${symR} \\; ${R}`;

  // Pretty explanation with markdown + KaTeX only inside $...$
  const explanationLatex =
    `**Solve:** $${L}\\,${symL}\\,${mid}\\,${symR}\\,${R}$\n\n` +
    `Multiply by $${n}$: $${nProd(L, n)}\\,${symL}\\,${num}\\,${symR}\\,${nProd(R, n)}$\n\n` +
    `Subtract $${m}$: $${leftX}\\,${symL}\\,x\\,${symR}\\,${rightX}$. Therefore $x\\in ${includeLeft ? "[" : "("}${leftX},\\,${rightX}${includeRight ? "]" : ")"}$.`;

  const correct: Bound = { left: leftX, right: rightX, includeLeft, includeRight };

  // distractors
  const d1: Bound = { ...correct, includeLeft: !includeLeft };
  const d2: Bound = { ...correct, left: Math.min(correct.right - 1, correct.left + 1) };
  const d3: Bound = { ...correct, right: Math.max(correct.left + 1, correct.right - 1), includeRight: !includeRight };

  const options = shuffle(
    uniqBy([correct, d1, d2, d3], (b) => `${b.left}|${b.right}|${b.includeLeft}|${b.includeRight}`)
  );

  return { stemLatex, answer: correct, options, explanationLatex };

  function nProd(v: number, n: number) {
    const prod = v * n;
    return v < 0 ? `${n}(${v})=${prod}` : `${n}\\cdot${v}=${prod}`;
  }
}

/* ----------------------- build: RAY (one-sided) ---------------------- */
function buildRay(): BuiltRay {
  const x0 = randint(-6, 6);
  const a = sample([-4, -3, -2, 2, 3, 4] as const);
  const b = randint(-6, 6);

  // final relation for x: this determines direction + closed/open
  const finalRel = sample(["\\le", "<", "\\ge", ">"] as const);
  const closed = finalRel === "\\le" || finalRel === "\\ge";

  // Randomly place variable side LHS or RHS to add variety
  const varOnRight = Math.random() < 0.5;
  const axb = `${a}x${b === 0 ? "" : b > 0 ? " + " + b : " - " + Math.abs(b)}`;
  const k = a * x0 + b;

  // We must choose the comparator shown so that solving yields x (finalRel) x0
  // ax+b ? k:    if a>0 then ?=finalRel, else flip
  // k ? ax+b:    after division by a>0 we get (…) ? x, so ?=flip(finalRel); if a<0 we flip again, so ?=finalRel
  const shownComp = !varOnRight
    ? a > 0
      ? finalRel
      : flipComp(finalRel)
    : a > 0
    ? flipComp(finalRel)
    : finalRel;

  const stemLatex = varOnRight ? `${k} \\; ${shownComp} \\; ${axb}` : `${axb} \\; ${shownComp} \\; ${k}`;
  const dir: Ray["dir"] = finalRel === "\\le" || finalRel === "<" ? "left" : "right";

  // Pretty explanation (markdown + KaTeX)
  const step1 = varOnRight ? `${k} \\; ${shownComp} \\; ${axb}` : `${axb} \\; ${shownComp} \\; ${k}`;
  const afterSub = varOnRight ? `${k - b} \\; ${shownComp} \\; ${a}x` : `${a}x \\; ${shownComp} \\; ${k - b}`;
  const intervalText =
    dir === "left"
      ? `(-\\infty,\\,${x0}${closed ? "]" : ")"}`
      : `${closed ? "[" : "("}${x0},\\,\\infty)`;

  const explanationLatex =
    `**Solve:** $${step1}$\n\n` +
    `Subtract $${b}$: $${afterSub}$\n\n` +
    `Divide by $${a}$: $x \\; ${finalRel} \\; ${x0}$${a < 0 ? " (direction flips)" : ""}.\n\n` +
    `So $x\\in ${intervalText}$.`;

  return { stemLatex, answer: { x0, dir, closed }, explanationLatex };
}

/* --------------------------- STATIC number line -------------------------- */
function StaticNumberLine({
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

  const segL = bound.left;
  const segR = bound.right;
  const sxL = map(Math.max(minX, Math.min(maxX, segL)));
  const sxR = map(Math.max(minX, Math.min(maxX, segR)));

  const ticks: React.ReactNode[] = [];
  for (let t = minX; t <= maxX; t++) {
    const X = map(t);
    const major = t % 5 === 0;
    ticks.push(
      <line key={`t-${t}`} x1={X} x2={X} y1={major ? y - 12 : y - 8} y2={y + 12} stroke="#111" strokeWidth={1.2} />
    );
  }
  const labels = [-10, -5, 0, 5, 10].map((n) => (
    <text key={`lbl-${n}`} x={map(n)} y={y + 26} textAnchor="middle" fontSize={12} fill="#111">
      {n}
    </text>
  ));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
      <line x1={x0} y1={y} x2={x1} y2={y} stroke="#111" strokeWidth={2} />
      <polyline points={`${x1 - 10},${y - 6} ${x1},${y} ${x1 - 10},${y + 6}`} fill="#111" />
      <polyline points={`${x0 + 10},${y - 6} ${x0},${y} ${x0 + 10},${y + 6}`} fill="#111" />
      {ticks}
      {labels}
      <line x1={sxL} y1={y} x2={sxR} y2={y} stroke="#2563eb" strokeWidth={6} strokeLinecap="round" />
      <circle cx={sxL} cy={y} r={6} fill={bound.includeLeft ? "#2563eb" : "#fff"} stroke="#2563eb" strokeWidth={2} />
      <circle cx={sxR} cy={y} r={6} fill={bound.includeRight ? "#2563eb" : "#fff"} stroke="#2563eb" strokeWidth={2} />
    </svg>
  );
}

/* -------------------------- Ray picker (icons) -------------------------- */
function RayIcon({
  dir,
  closed,
  size = 68,
}: {
  dir: "left" | "right";
  closed: boolean;
  size?: number;
}) {
  const w = size;
  const h = size * 0.7;
  const y = h / 2;

  const start = dir === "left" ? w * 0.8 : w * 0.2;
  const end = dir === "left" ? w * 0.2 : w * 0.8;
  const dotX = dir === "left" ? w * 0.7 : w * 0.3;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h}>
      <line x1={start} y1={y} x2={end} y2={y} stroke="#111" strokeWidth={6} strokeLinecap="round" />
      {dir === "right" ? (
        <polyline points={`${end - 10},${y - 8} ${end},${y} ${end - 10},${y + 8}`} fill="#111" />
      ) : (
        <polyline points={`${end + 10},${y - 8} ${end},${y} ${end + 10},${y + 8}`} fill="#111" />
      )}
      <circle cx={dotX} cy={y} r={8} fill={closed ? "#111" : "#fff"} stroke="#111" strokeWidth={3} />
    </svg>
  );
}

function RayPicker({
  selected,
  onPick,
  onClear,
}: {
  selected: { dir: "left" | "right"; closed: boolean } | null;
  onPick: (v: { dir: "left" | "right"; closed: boolean }) => void;
  onClear: () => void;
}) {
  const options: Array<{ dir: "left" | "right"; closed: boolean }> = [
    { dir: "left", closed: true },
    { dir: "left", closed: false },
    { dir: "right", closed: false },
    { dir: "right", closed: true },
  ];

  return (
    <div className="flex items-start gap-4">
      <div className="grid grid-cols-2 rounded-xl overflow-hidden bg-white shadow-sm border border-gray-200">
        {options.map((o, i) => (
          <button
            key={i}
            onClick={() => onPick(o)}
            className="p-2 hover:bg-gray-50 active:bg-gray-100"
            title={`${o.dir} / ${o.closed ? "closed" : "open"}`}
          >
            <RayIcon dir={o.dir} closed={o.closed} />
          </button>
        ))}
      </div>

      {selected && (
        <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-3 flex flex-col items-center gap-2">
          <RayIcon dir={selected.dir} closed={selected.closed} size={90} />
          <button
            onClick={onClear}
            className="px-4 py-1.5 rounded-lg border border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

/* -------------------- Draggable number line (mouse events) ------------ */
function DraggableNumberLine({
  value,
  dir,
  closed,
  onChange,
  highlight,
  width = 680,
  height = 110,
}: {
  value: number | null;
  dir: "left" | "right";
  closed: boolean;
  onChange: (x: number) => void;
  highlight: boolean;
  width?: number;
  height?: number;
}) {
  const PAD = 36;
  const minTick = -10;
  const maxTick = 10;
  const y = height / 2 + 4;
  const toPx = (v: number) => PAD + ((v - minTick) * (width - 2 * PAD)) / (maxTick - minTick);
  const toVal = (px: number) => {
    const raw = minTick + ((px - PAD) * (maxTick - minTick)) / (width - 2 * PAD);
    return Math.round(Math.max(minTick, Math.min(maxTick, raw)));
  };

  const svgRef = useRef<SVGSVGElement | null>(null);
  const draggingRef = useRef(false);

  const move = (clientX: number) => {
    if (!draggingRef.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = toVal(clientX - rect.left);
    onChange(x);
  };

  const onMouseDown = (ev: React.MouseEvent<SVGSVGElement>) => {
    draggingRef.current = true;
    move(ev.clientX);
    const onMoveWin = (e: MouseEvent) => move(e.clientX);
    const onUpWin = () => {
      draggingRef.current = false;
      window.removeEventListener("mousemove", onMoveWin);
      window.removeEventListener("mouseup", onUpWin);
    };
    window.addEventListener("mousemove", onMoveWin);
    window.addEventListener("mouseup", onUpWin);
  };

  const onClick = (ev: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = toVal(ev.clientX - rect.left);
    onChange(x);
  };

  const ticks: React.ReactNode[] = [];
  for (let t = minTick; t <= maxTick; t++) {
    const X = toPx(t);
    const major = t % 5 === 0;
    ticks.push(
      <g key={t}>
        <line x1={X} x2={X} y1={major ? y - 26 : y - 18} y2={y + 14} stroke="#111" strokeWidth={1.2} />
        {major && (
          <text x={X} y={y - 34} textAnchor="middle" fontSize={12} fill="#111">
            {t}
          </text>
        )}
      </g>
    );
  }

  const hasRay = value !== null;
  const px = value !== null ? toPx(value) : toPx(0);
  const segL = dir === "left" ? toPx(minTick) : px;
  const segR = dir === "right" ? toPx(maxTick) : px;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      onMouseDown={onMouseDown}
      onClick={onClick}
      style={{ cursor: "pointer", userSelect: "none" }}
    >
      <line x1={toPx(minTick)} y1={y} x2={toPx(maxTick)} y2={y} stroke="#111" strokeWidth={2} />
      <polyline points={`${toPx(maxTick) - 10},${y - 6} ${toPx(maxTick)},${y} ${toPx(maxTick) - 10},${y + 6}`} fill="#111" />
      <polyline points={`${toPx(minTick) + 10},${y - 6} ${toPx(minTick)},${y} ${toPx(minTick) + 10},${y + 6}`} fill="#111" />
      {ticks}

      {hasRay && (
        <>
          <line x1={segL} y1={y} x2={segR} y2={y} stroke="#111" strokeWidth={8} strokeLinecap="round" />
          {highlight && <circle cx={px} cy={y} r={24} fill="rgba(0,0,0,0.08)" />}
          <circle cx={px} cy={y} r={8} fill={closed ? "#111" : "#fff"} stroke="#111" strokeWidth={3} />
          {dir === "right" ? (
            <polyline points={`${segR - 12},${y - 9} ${segR},${y} ${segR - 12},${y + 9}`} fill="#111" />
          ) : (
            <polyline points={`${segL + 12},${y - 9} ${segL},${y} ${segL + 12},${y + 9}`} fill="#111" />
          )}
        </>
      )}
    </svg>
  );
}

/* ------------------------------- Page ------------------------------- */
export default function InequalityNumberLinePractice() {
  const [mode, setMode] = useState<Mode>("segment");

  /* SEGMENT (MCQ) */
  const [seedSeg, setSeedSeg] = useState(0);
  const seg = useMemo(() => {
    void seedSeg;
    return buildSegment();
  }, [seedSeg]);

  const [selIdx, setSelIdx] = useState<number | null>(null);
  const [revealedSeg, setRevealedSeg] = useState(false);

  const sameBound = (a: Bound, b: Bound) =>
    a.left === b.left && a.right === b.right && a.includeLeft === b.includeLeft && a.includeRight === b.includeRight;

  const correctIndex = seg.options.findIndex((o) => sameBound(o, seg.answer));

  /* RAY (DRAG GRAPHER) */
  const [seedRay, setSeedRay] = useState(0);
  const ray = useMemo(() => {
    void seedRay;
    return buildRay();
  }, [seedRay]);

  const [choice, setChoice] = useState<{ dir: "left" | "right"; closed: boolean } | null>(null);
  const [xPlaced, setXPlaced] = useState<number | null>(null);
  const [halo, setHalo] = useState(false);
  const [revealedRay, setRevealedRay] = useState(false);

  const rayCorrect =
    revealedRay &&
    choice &&
    xPlaced !== null &&
    choice.dir === ray.answer.dir &&
    choice.closed === ray.answer.closed &&
    xPlaced === ray.answer.x0;

  const canCheckRay = choice !== null && xPlaced !== null && !revealedRay;

  return (
    <div className="space-y-4">
      {/* Header + mode switch */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold">
            {mode === "segment" ? "Compound Inequalities — Number Lines" : "One-Sided Inequalities — Graph a Ray"}
          </h2>
          <p className="text-white/70">
            {mode === "segment"
              ? "Choose the number line that represents the solution set."
              : "Select a ray, then drag (or click) the endpoint to the correct tick."}
          </p>
        </div>

        <div className="inline-flex rounded-xl overflow-hidden border border-white/15">
          <button
            onClick={() => setMode("segment")}
            className={`px-4 py-2 text-sm font-semibold ${
              mode === "segment" ? "bg-white/20 text-white" : "bg-white/5 text-white/80 hover:bg-white/10"
            }`}
          >
            Segment
          </button>
          <button
            onClick={() => setMode("ray")}
            className={`px-4 py-2 text-sm font-semibold ${
              mode === "ray" ? "bg-white/20 text-white" : "bg-white/5 text-white/80 hover:bg-white/10"
            }`}
          >
            Ray (Drag)
          </button>
        </div>
      </div>

      {mode === "segment" ? (
        <>
          {/* stem */}
          <div className="rounded-xl bg-white text-gray-900 border border-gray-200 shadow-sm p-4">
            <MathText
              className="text-lg"
              text={`Which number line below shows the solution to the inequality $${seg.stemLatex}$?`}
            />
          </div>

          {/* choices */}
          <div className="space-y-3">
            {seg.options.map((opt, i) => {
              const chosen = selIdx === i;
              const correct = i === correctIndex;

              const ringClass = revealedSeg
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
                    onChange={() => setSelIdx(i)}
                    disabled={revealedSeg}
                  />
                  <div
                    className={`h-5 w-5 rounded-full border-2 grid place-items-center ${
                      chosen ? "border-indigo-600" : "border-gray-400"
                    }`}
                  >
                    <div className={`h-2.5 w-2.5 rounded-full ${chosen ? "bg-indigo-600" : "bg-transparent"}`} />
                  </div>

                  <div className="flex-1">
                    <StaticNumberLine bound={opt} />
                  </div>
                  <div className="w-8 h-8 rounded-full grid place-items-center font-semibold text-gray-700 bg-gray-100">
                    {String.fromCharCode(65 + i)}
                  </div>
                </label>
              );
            })}
          </div>

          {/* actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => setRevealedSeg(true)}
              disabled={selIdx === null || revealedSeg}
              className={`px-5 py-2.5 rounded-xl font-semibold shadow-sm ${
                selIdx === null || revealedSeg
                  ? "bg-indigo-300 cursor-not-allowed text-white/80"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white"
              }`}
            >
              Check Answer
            </button>
            <button
              onClick={() => {
                setRevealedSeg(false);
                setSelIdx(null);
                setSeedSeg((s) => s + 1);
              }}
              disabled={!revealedSeg}
              className={`px-5 py-2.5 rounded-xl font-semibold shadow-sm ${
                revealedSeg
                  ? "bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-300"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            >
              Next Question
            </button>
          </div>

          {/* feedback */}
          {revealedSeg && (
            <div
              className={`rounded-xl p-4 border shadow-sm ${
                selIdx === correctIndex ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              <div className="font-semibold mb-1">
                {selIdx === correctIndex ? "Correct!" : "Not quite."}
              </div>
              <MathText text={seg.explanationLatex} />
            </div>
          )}
        </>
      ) : (
        <>
          {/* stem */}
          <div className="rounded-xl bg-white text-gray-900 border border-gray-200 shadow-sm p-4">
            <MathText className="text-lg" text={`Graph the solution set for the inequality $${ray.stemLatex}$.`} />
            <div className="text-gray-700 mt-2">Select a ray. Then drag or click to place the endpoint.</div>
          </div>

          {/* number line */}
          <div className="rounded-xl bg-white text-gray-900 border border-gray-200 shadow-sm p-4">
            <DraggableNumberLine
              value={xPlaced}
              dir={choice?.dir ?? "right"}
              closed={choice?.closed ?? true}
              onChange={(x) => {
                if (!choice) return; // ignore until a ray type is chosen
                setHalo(true);
                setXPlaced(x);
              }}
              highlight={halo}
            />
          </div>

          {/* picker */}
          <RayPicker
            selected={choice}
            onPick={(v) => {
              setChoice(v);
              setHalo(false);
            }}
            onClear={() => {
              setChoice(null);
              setXPlaced(null);
              setHalo(false);
            }}
          />

          {/* actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => setRevealedRay(true)}
              disabled={!canCheckRay}
              className={`px-5 py-2.5 rounded-xl font-semibold shadow-sm ${
                !canCheckRay ? "bg-indigo-300 cursor-not-allowed text-white/80" : "bg-indigo-600 hover:bg-indigo-500 text-white"
              }`}
            >
              Check Answer
            </button>
            <button
              onClick={() => {
                setChoice(null);
                setXPlaced(null);
                setHalo(false);
                setRevealedRay(false);
                setSeedRay((s) => s + 1);
              }}
              disabled={!revealedRay}
              className={`px-5 py-2.5 rounded-xl font-semibold shadow-sm ${
                revealedRay ? "bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-300" : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            >
              Next Question
            </button>
          </div>

          {/* feedback */}
          {revealedRay && (
            <div
              className={`rounded-xl p-4 border shadow-sm ${
                rayCorrect ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              <div className="font-semibold mb-1">
                {rayCorrect ? "Correct!" : "Not quite. Here’s one way to solve it:"}
              </div>
              <MathText text={ray.explanationLatex} />
              {!rayCorrect && (
                <div className="mt-2 text-sm text-gray-700">
                  Correct graph: endpoint at <strong>{ray.answer.x0}</strong>,{" "}
                  <strong>{ray.answer.closed ? "closed" : "open"}</strong> dot, ray to the{" "}
                  <strong>{ray.answer.dir}</strong>.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
