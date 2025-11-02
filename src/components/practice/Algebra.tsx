// src/components/practice/DistributeSolvePractice.tsx
import { useEffect, useMemo, useState } from "react";
import MathText from "../MathText";

/* ---------------- helpers ---------------- */
type Rat = { num: number; den: number; show: "frac" | "decimal" };

function randint(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function ratDisplay(r: Rat): string {
  if (r.show === "decimal") {
    const v = r.num / r.den;
    return String(v).replace(/\.0$/, "");
  }
  const sign = r.num < 0 ? "-" : "";
  const n = Math.abs(r.num);
  const d = r.den;
  if (d === 1) return sign + String(n);
  return `${sign}\\frac{${n}}{${d}}`;
}

/* ---------------- instance builder ---------------- */
type Built = {
  A: number;
  m: Rat;
  B: number;
  c: number;
  L: number;
  X: number;

  mTex: string;
  stemTop: string;
  step1: string;

  tiles: number[];
  expl: string;
};

function build(): Built {
  const mChoices: Rat[] = [
    { num: -1, den: 2, show: Math.random() < 0.5 ? "decimal" : "frac" },
    { num: -1, den: 1, show: "frac" },
    { num: -3, den: 2, show: "frac" },
    { num: 1, den: 2, show: Math.random() < 0.5 ? "decimal" : "frac" },
    { num: 1, den: 1, show: "frac" },
    { num: 2, den: 1, show: "frac" },
    { num: -2, den: 1, show: "frac" },
  ];
  const m: Rat = mChoices[randint(0, mChoices.length - 1)];

  const den: number = m.den;
  const B: number = den * randint(1, 8) * (Math.random() < 0.5 ? 1 : -1);
  let X: number = den * randint(-8, 8);
  if (X === 0) X = den * (Math.random() < 0.5 ? 3 : -3);

  const mNum: number = m.num;
  const mDen: number = m.den;
  const A: number = (mNum * (X + B)) / mDen; // integer by construction
  const c: number = (mNum * B) / mDen;
  const L: number = A - c;

  const tilesSet: Set<number> = new Set<number>([c, L, X]);
  const distractors: number[] = [
    A,
    B,
    -B,
    -A,
    c + A,
    L + den,
    L - den,
    X + den,
    X - den,
    Math.trunc(L * 2),
    Math.trunc(X * 2),
  ];
  distractors.forEach((v) => {
    if (Number.isFinite(v)) tilesSet.add(v);
  });
  const tiles: number[] = shuffle(Array.from(tilesSet)).slice(0, 8);

  const mTex: string = ratDisplay(m);

  const stemTop: string =
    `Complete the steps to show one way to solve the equation ` +
    `$${A} = ${mTex}\\,(x + ${B})$ for $x$.\\n\\n` +
    `Move the correct answer to each box. Each answer may be used more than once. ` +
    `Not all answers will be used.`;

  const step1: string = `$${A} = ${mTex}\\,(x + ${B})$`;

  const expl: string =
    `Distribute: $${A} = ${mTex}\\,(x + ${B}) = ${mTex}\\,x + (${mTex})\\cdot(${B}) = ${mTex}\\,x + ${c}$.\\n\\n` +
    `Add $${-c}$ to both sides: $${A} - (${c}) = ${mTex}\\,x$, so $${L} = ${mTex}\\,x$.\\n\\n` +
    `Divide both sides by $${mTex}$: $\\dfrac{${L}}{${mTex}} = x$, hence $x = ${X}$.`;

  return { A, m, B, c, L, X, mTex, stemTop, step1, tiles, expl };
}

/* ---------------- streak storage ---------------- */
const STREAK_KEY = "streak:distribute-solve:best";
function loadBest(): number {
  try {
    return Math.max(0, parseInt(localStorage.getItem(STREAK_KEY) || "0", 10));
  } catch {
    return 0;
  }
}
function saveBest(best: number): void {
  try {
    localStorage.setItem(STREAK_KEY, String(best));
  } catch {}
}

/* ---------------- Tile & Blank UI ---------------- */
function Chip({
  value,
  onPick,
}: {
  value: number;
  onPick: (v: number) => void;
}) {
  return (
    <button
      className="px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-300 hover:bg-indigo-200 active:bg-indigo-300"
      onClick={() => onPick(value)}
    >
      {value}
    </button>
  );
}

function Blank({
  label,
  value,
  active,
  onActivate,
  onClear,
}: {
  label: string;
  value: number | null;
  active: boolean;
  onActivate: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onActivate}
        className={`min-w-[72px] h-9 rounded-lg border px-2 text-center text-base ${
          active
            ? "border-indigo-500 ring-2 ring-indigo-200 bg-indigo-50"
            : "border-gray-300 bg-white hover:bg-gray-50"
        }`}
        title={label}
      >
        {value === null ? "—" : value}
      </button>
      {value !== null && (
        <button
          className="text-sm text-gray-600 hover:text-gray-900"
          onClick={onClear}
          aria-label="Clear"
        >
          ×
        </button>
      )}
    </div>
  );
}

/* ---------------------------- Page ---------------------------- */
export default function DistributeSolvePractice() {
  const [seed, setSeed] = useState<number>(0);
  const P: Built = useMemo(() => {
    void seed;
    return build();
  }, [seed]);

  const [slot, setSlot] = useState<0 | 1 | 2 | null>(null);
  const [vals, setVals] = useState<[number | null, number | null, number | null]>([
    null,
    null,
    null,
  ]);
  const [revealed, setRevealed] = useState<boolean>(false);

  const [current, setCurrent] = useState<number>(0);
  const [best, setBest] = useState<number>(0);
  useEffect(() => {
    setBest(loadBest());
  }, []);

  const filled: boolean = vals.every((v) => v !== null);
  const correct: boolean =
    (vals[0] ?? NaN) === P.c &&
    (vals[1] ?? NaN) === P.L &&
    (vals[2] ?? NaN) === P.X;

  const onPick = (v: number): void => {
    if (slot === null || revealed) return;
    setVals((prev) => {
      const next = [...prev] as typeof prev;
      next[slot] = v;
      return next;
    });
  };

  const onCheck = (): void => {
    if (revealed || !filled) return;
    if (correct) {
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

  const onNext = (): void => {
    setSeed((s) => s + 1);
    setVals([null, null, null]);
    setSlot(null);
    setRevealed(false);
  };

  useEffect(() => {
    const handler = (e: any) => {
      if (e && e.key === "Enter" && !revealed) onCheck();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [revealed, filled, correct, current, best]);

  return (
    <div className="space-y-4">
      {/* Header + streak */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Distribute & Solve — Infinite Practice</h2>
          <p className="text-white/70">
            Fill the blanks to show one valid solution path. Answers can be reused; not all tiles
            are needed.
          </p>
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white w-44">
          <div className="grid grid-cols-2 gap-3 items-center">
            <div className="text-xs text-white/70">Current</div>
            <div className="text-xs text-white/70 border-l border-white/10 pl-3">Best</div>
            <div className="text-2xl font-semibold leading-none">{current}</div>
            <div className="text-2xl font-semibold leading-none pl-3 border-l border-transparent">
              {best}
            </div>
          </div>
        </div>
      </div>

      {/* Stem */}
      <div className="rounded-xl bg-white text-gray-900 border border-gray-200 shadow-sm p-4">
        <MathText className="text-base" text={P.stemTop} />
      </div>

      {/* Tile bank */}
      <div className="rounded-xl bg-white text-gray-900 border border-gray-200 shadow-sm p-4">
        <div className="flex flex-wrap gap-2">
          {P.tiles.map((t, i) => (
            <Chip key={i} value={t} onPick={onPick} />
          ))}
        </div>
      </div>

      {/* Steps */}
      <div className="rounded-xl bg-white text-gray-900 border border-gray-200 shadow-sm p-4 space-y-4">
        <MathText text={P.step1} />

        <div className="flex items-center gap-3">
          <MathText text={`$${P.A} = ${P.mTex}\\,x + $`} />
          <Blank
            label="Distribute constant"
            value={vals[0]}
            active={slot === 0}
            onActivate={() => setSlot(0)}
            onClear={() =>
              setVals((v) => {
                const n = [...v] as typeof v;
                n[0] = null;
                return n;
              })
            }
          />
        </div>

        <div className="flex items-center gap-3">
          <Blank
            label="Move constant to the left"
            value={vals[1]}
            active={slot === 1}
            onActivate={() => setSlot(1)}
            onClear={() =>
              setVals((v) => {
                const n = [...v] as typeof v;
                n[1] = null;
                return n;
              })
            }
          />
          <MathText text={`$= ${P.mTex}\\,x$`} />
        </div>

        <div className="flex items-center gap-3">
          <Blank
            label="Solve for x"
            value={vals[2]}
            active={slot === 2}
            onActivate={() => setSlot(2)}
            onClear={() =>
              setVals((v) => {
                const n = [...v] as typeof v;
                n[2] = null;
                return n;
              })
            }
          />
          <MathText text="$= x$" />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={onCheck}
          disabled={revealed || !filled}
          className={`px-5 py-2.5 rounded-xl font-semibold shadow-sm ${
            revealed || !filled
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
            {correct ? "Nice work!" : "Not quite. Here’s one valid solution path:"}
          </div>
          <MathText text={P.expl} />
          {!correct && (
            <div className="mt-2 text-sm text-gray-700">
              Correct blanks: <strong>{P.c}</strong>, <strong>{P.L}</strong>,{" "}
              <strong>{P.X}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
