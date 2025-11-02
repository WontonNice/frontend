// src/components/practice/InequalityRayGrapher.tsx
import React, { useMemo, useRef, useState } from "react";
import MathText from "../MathText";

/* ----------------------------- helpers ----------------------------- */
function randint(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function sample<T>(arr: readonly T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function flipComp(s: "<" | "\\le" | ">" | "\\ge"): "<" | "\\le" | ">" | "\\ge" {
  if (s === "<") return ">";
  if (s === "\\le") return "\\ge";
  if (s === ">") return "<";
  return "\\le";
}

/* ------------------------------ types ------------------------------ */
type Ray = {
  x0: number;                 // endpoint (integer tick)
  dir: "left" | "right";      // ray direction
  closed: boolean;            // filled endpoint
};

type Built = {
  stemLatex: string;
  answer: Ray;
  explanationLatex: string;
};

/* --------------------------- problem builder --------------------------- */
function buildRay(): Built {
  const x0 = randint(-6, 6);
  const a = sample([-4, -3, -2, 2, 3, 4] as const);
  const b = randint(-6, 6);
  const finalRel = sample(["\\le", "<", "\\ge", ">"] as const);
  const closed = finalRel === "\\le" || finalRel === "\\ge";
  const k = a * x0 + b;

  const shownComp = a > 0 ? finalRel : flipComp(finalRel);

  const varOnRight = Math.random() < 0.5;
  const axb = `${a}x ${b === 0 ? "" : b > 0 ? "+ " + b : "- " + Math.abs(b)}`.trim();
  const stemLatex = varOnRight ? `${k} \\; ${shownComp} \\; ${axb}` : `${axb} \\; ${shownComp} \\; ${k}`;

  const dir: Ray["dir"] = finalRel === "\\le" || finalRel === "<" ? "left" : "right";

  const step1 = varOnRight
    ? `${k} \\; ${shownComp} \\; ${a}x ${b >= 0 ? "+ " + b : "- " + Math.abs(b)}`
    : `${a}x ${b >= 0 ? "+ " + b : "- " + Math.abs(b)} \\; ${shownComp} \\; ${k}`;

  const afterSub = varOnRight
    ? `${k - b} \\; ${shownComp} \\; ${a}x`
    : `${a}x \\; ${shownComp} \\; ${k - b}`;

  const afterDiv =
    a > 0
      ? `x \\; ${finalRel} \\; ${x0}`
      : `x \\; ${finalRel} \\; ${x0} \\quad (\\text{flip the sign since } a<0)`;

  const intervalText =
    dir === "left"
      ? `${closed ? "(-\\infty," : "(-\\infty,"}\\,${x0}${closed ? "]" : ")"}`
      : `${closed ? "[" : "("}${x0},\\,\\infty${closed ? ")" : ")"}`;

  const explanationLatex =
    `\\textbf{Solve:}\\; ${step1} \\\\`
    + `\\text{Subtract } ${b}:\\; ${afterSub} \\\\`
    + `\\text{Divide by } ${a}:\\; ${afterDiv} \\;\\Rightarrow\\; x\\in ${intervalText}.`;

  return {
    stemLatex,
    answer: { x0, dir, closed },
    explanationLatex,
  };
}

/* ----------------------------- Ray Picker ----------------------------- */
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
      <circle
        cx={dotX}
        cy={y}
        r={8}
        fill={closed ? "#111" : "#fff"}
        stroke="#111"
        strokeWidth={3}
      />
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

/* ------------------------- Draggable Number Line ------------------------- */
function DraggableNumberLine({
  value,
  dir,
  closed,
  onChange,
  highlight,
  width = 680,
  height = 100,
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
  const [dragging, setDragging] = useState(false);

  const startDrag = (ev: React.MouseEvent) => {
    setDragging(true);
    move(ev);
  };
  const move = (ev: React.MouseEvent) => {
    if (!dragging) return;
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = toVal(ev.clientX - rect.left);
    onChange(x);
  };
  const endDrag = () => setDragging(false);

  const ticks: React.ReactElement[] = [];
  for (let t = minTick; t <= maxTick; t++) {
    const X = toPx(t);
    const major = t % 5 === 0;
    ticks.push(
      <g key={t}>
        <line
          x1={X}
          x2={X}
          y1={major ? y - 26 : y - 18}
          y2={y + 14}
          stroke="#111"
          strokeWidth={1.2}
        />
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
      onMouseDown={startDrag}
      onMouseMove={move}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      style={{ cursor: "pointer", touchAction: "none" }}
    >
      <line x1={toPx(minTick)} y1={y} x2={toPx(maxTick)} y2={y} stroke="#111" strokeWidth={2} />
      <polyline points={`${toPx(maxTick) - 10},${y - 6} ${toPx(maxTick)},${y} ${toPx(maxTick) - 10},${y + 6}`} fill="#111" />
      <polyline points={`${toPx(minTick) + 10},${y - 6} ${toPx(minTick)},${y} ${toPx(minTick) + 10},${y + 6}`} fill="#111" />
      {ticks}

      {hasRay && (
        <>
          <line
            x1={segL}
            y1={y}
            x2={segR}
            y2={y}
            stroke="#111"
            strokeWidth={8}
            strokeLinecap="round"
          />
          {highlight && <circle cx={px} cy={y} r={24} fill="rgba(0,0,0,0.08)" />}
          <circle
            cx={px}
            cy={y}
            r={8}
            fill={closed ? "#111" : "#fff"}
            stroke="#111"
            strokeWidth={3}
          />
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
export default function InequalityRayGrapher() {
  const [seed, setSeed] = useState(0);
  const P = useMemo(() => {
    void seed;
    return buildRay();
  }, [seed]);

  const [choice, setChoice] = useState<{ dir: "left" | "right"; closed: boolean } | null>(null);
  const [xPlaced, setXPlaced] = useState<number | null>(null);
  const [dragHalo, setDragHalo] = useState(false);

  const [revealed, setRevealed] = useState(false);

  const correct =
    revealed &&
    choice &&
    xPlaced !== null &&
    choice.dir === P.answer.dir &&
    choice.closed === P.answer.closed &&
    xPlaced === P.answer.x0;

  const canCheck = choice !== null && xPlaced !== null && !revealed;

  const resetAll = () => {
    setChoice(null);
    setXPlaced(null);
    setDragHalo(false);
    setRevealed(false);
    setSeed((s) => s + 1);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Graph the solution set</h2>
      <p className="text-white/70">
        Select a ray. Then, move the endpoint of the ray to the correct position on the number line.
      </p>

      <div className="rounded-xl bg-white text-gray-900 border border-gray-200 shadow-sm p-4">
        <MathText className="text-lg" text={`Graph the solution set for the inequality $${P.stemLatex}$.`} />
      </div>

      <div className="rounded-xl bg-white text-gray-900 border border-gray-200 shadow-sm p-4">
        <DraggableNumberLine
          value={xPlaced}
          dir={choice?.dir ?? "right"}
          closed={choice?.closed ?? true}
          onChange={(x) => {
            if (!choice) return;
            setDragHalo(true);
            setXPlaced(x);
          }}
          highlight={dragHalo}
        />
      </div>

      <RayPicker
        selected={choice}
        onPick={(v) => {
          setChoice(v);
          setDragHalo(false);
        }}
        onClear={() => {
          setChoice(null);
          setDragHalo(false);
        }}
      />

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={() => setRevealed(true)}
          disabled={!canCheck}
          className={`px-5 py-2.5 rounded-xl font-semibold shadow-sm ${
            !canCheck ? "bg-indigo-300 cursor-not-allowed text-white/80" : "bg-indigo-600 hover:bg-indigo-500 text-white"
          }`}
        >
          Check Answer
        </button>
        <button
          onClick={resetAll}
          disabled={!revealed}
          className={`px-5 py-2.5 rounded-xl font-semibold shadow-sm ${
            revealed ? "bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-300" : "bg-gray-200 text-gray-500 cursor-not-allowed"
          }`}
        >
          Next Question
        </button>
      </div>

      {revealed && (
        <div
          className={`rounded-xl p-4 border shadow-sm ${
            correct ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="font-semibold mb-1">
            {correct ? "Correct!" : "Not quite. Here’s one way to solve it:"}
          </div>
          <MathText text={P.explanationLatex} />
          {!correct && (
            <div className="mt-2 text-sm text-gray-700">
              Correct graph: endpoint at <strong>{P.answer.x0}</strong>,{" "}
              <strong>{P.answer.closed ? "closed" : "open"}</strong> dot, ray to the <strong>{P.answer.dir}</strong>.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
