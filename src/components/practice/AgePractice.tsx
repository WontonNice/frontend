// src/components/Study/AgePractice.tsx
import { useMemo, useState } from "react";
import MathText from "../MathText";
import { useStreak } from "../../hooks/useStreak";
import StreakBadge from "../ui/StreakBadge";

/* ------------------------- utilities ------------------------- */
type Fraction = { p: number; q: number };
type PairRB = { a: Fraction; b: { r: number; s: number } };

const FRACTION_PAIRS: readonly PairRB[] = [
  { a: { p: 1, q: 4 }, b: { r: 1, s: 3 } },
  { a: { p: 1, q: 3 }, b: { r: 1, s: 2 } },
  { a: { p: 2, q: 5 }, b: { r: 1, s: 2 } },
  { a: { p: 1, q: 5 }, b: { r: 1, s: 4 } },
  { a: { p: 3, q: 8 }, b: { r: 1, s: 2 } },
];

const NAMES: readonly [string, string][] = [
  ["Tien", "Jordan"],
  ["Ava", "Noah"],
  ["Mia", "Liam"],
  ["Olivia", "Ethan"],
  ["Nicole", "Carmen"],
  ["Zoe", "Caleb"],
  ["Seung", "Jackson"],
];

function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randint(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ----------------------- question shape ---------------------- */
type BuiltQuestion = {
  id: string;
  prompt: string;                  // Markdown/KaTeX via <MathText/>
  choices: Array<number | string>; // numeric or symbolic
  answer: number | string;
  explanation: string;
};

/* ------------- Template A: fraction now & in k years ---------- */
function buildAgeFractionChange(): BuiltQuestion {
  const pair = rand(FRACTION_PAIRS);
  const { p, q } = pair.a;
  const { r, s } = pair.b;

  let t = randint(1, 8);
  let J = (s - r) * t * q; // B today
  let tries = 0;
  while ((J < 8 || J > 70) && tries < 12) {
    t = randint(1, 10);
    J = (s - r) * t * q;
    tries++;
  }
  const T = p * (s - r) * t;       // A today (for explanation)
  const k = (r * q - p * s) * t;   // years in the future

  const [Aname, Bname] = rand(NAMES);

  const prompt =
    `Today, ${Aname}’s age is $\\tfrac{${p}}{${q}}$ of ${Bname}’s age. ` +
    `In ${k} year${k === 1 ? "" : "s"}, ${Aname}’s age will be ` +
    `$\\tfrac{${r}}{${s}}$ of ${Bname}’s age. ` +
    `How old is ${Bname} today?`;

  const answer = J;

  const deltas = shuffle([-6, -4, -2, +2, +4, +6, +8]);
  const raw = new Set<number>([answer]);
  for (const d of deltas) {
    const v = answer + d;
    if (v >= 5 && v <= 90) raw.add(v);
    if (raw.size >= 4) break;
  }
  const choices = shuffle(Array.from(raw).slice(0, 4));

  const explanation =
    `Let ${Bname} be $J$ and ${Aname} be $T$. We pick integers so ` +
    `$T=\\tfrac{${p}}{${q}}J$ and $\\dfrac{T+${k}}{J+${k}}=\\tfrac{${r}}{${s}}$. ` +
    `Here $J=${J}$ and $T=${T}$, so ${Bname} is **${J}** years old.`;

  return {
    id: `AGE-FRAC-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    prompt,
    choices,
    answer,
    explanation,
  };
}

/* -------- Template B: “a times now”, then future & years-ago ------- */
function buildTimesFutureThenAgo(): BuiltQuestion {
  const [olderName, youngerName] = rand(NAMES);
  const a = rand([2, 3, 4]);
  const k = randint(1, 4);
  const F = randint(14, 22); // younger’s age in k years

  const Y = F - k;           // younger now
  let X = a * Y;             // older now

  let tAgo = randint(3, 8);
  let tries = 0;
  while ((X - tAgo < 5 || X > 90) && tries < 10) {
    tAgo = randint(2, 9);
    X = a * (F - k);
    tries++;
  }

  const prompt =
    `${olderName}’s age now is ${a} times ${youngerName}’s age. ` +
    `If ${youngerName} will be ${F} in ${k} year${k === 1 ? "" : "s"}, ` +
    `how old was ${olderName} ${tAgo} year${tAgo === 1 ? "" : "s"} ago?`;

  const answer = X - tAgo;

  const opts = new Set<number>([answer]);
  const candidates = shuffle([
    X,
    a * F,
    a * (F - k) + tAgo,
    a * (F - k) - (tAgo - 2),
    a * (F - k) - (tAgo + 2),
    answer + 5,
    answer - 5,
  ]);
  for (const v of candidates) {
    if (v > 0 && v <= 95) opts.add(v);
    if (opts.size >= 4) break;
  }
  const choices = shuffle(Array.from(opts).slice(0, 4));

  const explanation =
    `Let ${youngerName} now be $y$ and ${olderName} now be $x$. ` +
    `Given $x=${a}y$ and ${youngerName} will be ${F} in ${k} years, ` +
    `we have $y=${F}-${k}=${Y}$, so $x=${a}\\cdot${Y}=${X}$. ` +
    `Answer asks for $x-${tAgo}=${X}-${tAgo}=${answer}$.`;

  return {
    id: `AGE-TIMES-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    prompt,
    choices,
    answer,
    explanation,
  };
}

/* ---------------- Template C: inequality translation ---------------- */
function buildAgeInequality(): BuiltQuestion {
  const [olderName, youngerName] = rand(NAMES);
  const N = randint(2, 8);
  const r = "r";
  const v = "v";

  const prompt =
    `${olderName} is at least ${N} year${N === 1 ? "" : "s"} older than ${youngerName}. ` +
    `Which inequality shows the relationship between ${olderName}’s age ($${r}$) ` +
    `and ${youngerName}’s age ($${v}$)?`;

  const correct = `${r} - ${v} ≥ ${N}`;
  const choices = shuffle([
    correct,
    `${r} - ${v} ≤ ${N}`,
    `${N} - ${v} ≤ ${r}`,
    `${N} - ${r} ≤ ${v}`,
  ]);

  const explanation =
    `“At least ${N} years older” means ${r} is **greater than or equal to** ${v} by ${N}: ` +
    `$${r} - ${v} \\ge ${N}$.`;

  return {
    id: `AGE-INEQ-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    prompt,
    choices,
    answer: correct,
    explanation,
  };
}

/* -------- Template D: symbolic y with older/younger + time shift -------- */
function formatYPlus(n: number): string {
  if (n === 0) return "y";
  return n > 0 ? `y + ${n}` : `y - ${Math.abs(n)}`;
}

function buildAgeSymbolicExpression(): BuiltQuestion {
  const [nameY, other] = rand(NAMES);
  const k = randint(2, 8);
  const t = randint(5, 12);
  const older = Math.random() < 0.7;
  const ago = true; // sample uses “ago”

  const nowExprOffset = older ? +k : -k;
  const finalOffset = nowExprOffset + (ago ? -t : +t);

  const prompt =
    `If ${nameY} is now $y$ years old and ${other} is ${k} years ` +
    `${older ? "older" : "younger"} than ${nameY}, ` +
    `what ${ago ? "was" : "will be"} ${other}’s age ${t} years ${ago ? "ago" : "from now"}?`;

  const correct = formatYPlus(finalOffset);

  const d1 = formatYPlus(nowExprOffset);
  const d2 = formatYPlus(nowExprOffset + (ago ? +t : -t));
  const d3 = formatYPlus(older ? -(k + (ago ? t : -t)) : +(k + (ago ? -t : t)));
  const d4 = `3y ${ago ? "-" : "+"} ${t}`;
  const uniq = Array.from(new Set([correct, d1, d2, d3, d4]));
  const choices = shuffle(uniq).slice(0, 4);

  const explanation =
    `${other} is ${older ? "older" : "younger"} by ${k}, so ${other} is ` +
    `$${formatYPlus(nowExprOffset)}$ now. Shifting ${ago ? "back" : "forward"} ` +
    `by ${t} years gives $${correct}$.`;

  return {
    id: `AGE-SYM-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    prompt,
    choices,
    answer: correct,
    explanation,
  };
}

/* ------------------------------ Page component ------------------------------ */
export default function AgePractice() {
  const makeQ = (): BuiltQuestion => {
    const pick = Math.random();
    if (pick < 0.25) return buildAgeFractionChange();
    if (pick < 0.5) return buildTimesFutureThenAgo();
    if (pick < 0.75) return buildAgeInequality();
    return buildAgeSymbolicExpression();
  };

  const [q, setQ] = useState<BuiltQuestion>(() => makeQ());
  const [picked, setPicked] = useState<number | string | null>(null);
  const [result, setResult] = useState<"idle" | "right" | "wrong">("idle");

  // 🔥 Streak tracking (persists under key "age")
  const { current, best, record /*, clearAll*/ } = useStreak("age");

  const header = useMemo(() => "Age Problems — Infinite Practice", []);

  const check = () => {
    if (picked == null || result !== "idle") return;
    const correct = picked === q.answer;
    setResult(correct ? "right" : "wrong");
    record(correct); // update streak exactly once per question
  };

  const next = () => {
    setQ(makeQ());
    setPicked(null);
    setResult("idle");
  };

  return (
    <div className="min-h-[calc(100vh-var(--topbar-height,56px))] bg-[#0f1115] text-white">
      <div className="mx-auto max-w-3xl p-6">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{header}</h1>
          <StreakBadge current={current} best={best} />
        </div>
        <p className="text-sm text-white/70 mb-6">
          Fresh problems generated each time. Numeric and symbolic answers supported.
        </p>

        <div className="rounded-xl bg-[#141821] ring-1 ring-white/10 p-6 space-y-5">
          <div className="text-lg leading-7">
            <MathText text={q.prompt} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {q.choices.map((c, i) => {
              const isSel = picked === c;
              const isRight = result !== "idle" && c === q.answer;
              const isWrong = result === "wrong" && isSel && c !== q.answer;
              const label = typeof c === "number" ? `${c} years old` : String(c);

              return (
                <button
                  key={i}
                  onClick={() => setPicked(c)}
                  className={[
                    "rounded-lg px-4 py-3 text-left transition ring-1",
                    isSel
                      ? "bg-emerald-500/10 ring-emerald-400"
                      : "bg-[#0f131b] ring-white/10 hover:ring-white/20",
                    isRight ? "bg-emerald-600/20 ring-emerald-400" : "",
                    isWrong ? "bg-red-600/10 ring-red-400" : "",
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={check}
              disabled={picked == null || result !== "idle"}
              className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
            >
              Check
            </button>
            <button
              onClick={next}
              className="px-4 py-2 rounded-md bg-slate-700 hover:bg-slate-600"
            >
              Next problem
            </button>
            {/* Dev helper:
            <button onClick={clearAll} className="text-xs text-white/50 underline">
              Reset streak
            </button> */}
          </div>

          {result !== "idle" && (
            <div
              className={[
                "rounded-md p-4 text-sm",
                result === "right"
                  ? "bg-emerald-500/10 text-emerald-300"
                  : "bg-red-500/10 text-red-300",
              ].join(" ")}
            >
              {result === "right" ? "Correct!" : "Not quite."} The answer is{" "}
              <strong>
                {typeof q.answer === "number"
                  ? `${q.answer} years old`
                  : String(q.answer)}
              </strong>.{" "}
              <span className="opacity-80">{q.explanation}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
