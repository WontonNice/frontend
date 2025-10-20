// src/components/Study/AgePractice.tsx
import PracticeEngine from "../practice/engine/PracticeEngine";
import type { PracticeQuestion } from "../practice/engine/PracticeEngine";

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
function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ----------------------- builder output ---------------------- */
type BuiltQuestion = {
  id: string;
  prompt: string;                  // Markdown/KaTeX via <MathText/>
  choices: Array<number | string>; // numeric or symbolic
  answer: number | string;
  explanation: string;
};

/* ------------- Template A: fraction now & in k years ---------- */
/* ------------- Template A: fraction now & in k years (algebraic explain) ---------- */
function buildAgeFractionChange(): BuiltQuestion {
  const pair = rand(FRACTION_PAIRS);
  const { p, q } = pair.a;      // T = (p/q) J
  const { r, s } = pair.b;      // (T+k)/(J+k) = r/s

  // Construct a nice integer instance (unchanged)
  let t = randint(1, 8);
  let J = (s - r) * t * q; // B today
  let tries = 0;
  while ((J < 8 || J > 70) && tries < 12) {
    t = randint(1, 10);
    J = (s - r) * t * q;
    tries++;
  }
  //const T = p * (s - r) * t;       // A today (for explanation)
  const k = (r * q - p * s) * t;   // years in the future

  const [Aname, Bname] = rand(NAMES);

  const prompt =
    `Today, ${Aname}’s age is $\\tfrac{${p}}{${q}}$ of ${Bname}’s age. ` +
    `In ${k} year${k === 1 ? "" : "s"}, ${Aname}’s age will be ` +
    `$\\tfrac{${r}}{${s}}$ of ${Bname}’s age. ` +
    `How old is ${Bname} today?`;

  const answer = J;

  // Make 4 plausible choices
  const deltas = shuffle([-6, -4, -2, +2, +4, +6, +8]);
  const raw = new Set<number>([answer]);
  for (const d of deltas) {
    const v = answer + d;
    if (v >= 5 && v <= 90) raw.add(v);
    if (raw.size >= 4) break;
  }
  const choices = shuffle(Array.from(raw).slice(0, 4));

  // 🔎 Algebraic solution (step-by-step)
  // From T = (p/q)J and (T+k)/(J+k) = r/s:
  //  s( (p/q)J + k ) = r(J + k)
  //  (sp/q - r)J = (r - s)k
  //  (sp - rq)J = (r - s)kq
  //  J = ((s - r)kq)/(rq - sp)
  const explanation =
    `Let ${Bname}’s current age be $J$ and ${Aname}’s be $T$. We are given ` +
    `$T=\\tfrac{${p}}{${q}}J$ and $\\dfrac{T+${k}}{J+${k}}=\\tfrac{${r}}{${s}}$. Substitute ` +
    `$T=\\tfrac{${p}}{${q}}J$ into the second equation and solve:\\\\[4pt]` +
    `$${s}\\Big(\\tfrac{${p}}{${q}}J+${k}\\Big)=${r}(J+${k})$\\\\` +
    `$\\Big(\\tfrac{${s * p}}{${q}}-${r}\\Big)J=(${r}-${s})\\,${k}$\\\\` +
    `${`$(${s * p}-${r * q})J=(${r}-${s})\\,${k}\\,${q}$`}\\\\` +
    `$J=\\dfrac{(${s}-${r})\\,${k}\\,${q}}{${r}\\,${q}-${s}\\,${p}} = ${J}.` +
    `\\;\\;\\text{Therefore, }${Bname}\\text{ is **${J}** years old.}`;

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
  const choices = shuffle(Array.from(opts)).slice(0, 4);

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
  const ago = true; // “years ago” phrasing

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

/* ------------------------- glue to engine ------------------------- */

function toPracticeQuestion(b: BuiltQuestion): PracticeQuestion {
  const correctIndex = b.choices.findIndex((c) => c === b.answer);
  return {
    id: b.id,
    stem: b.prompt,
    choices: b.choices,
    correctIndex,
    explanation: b.explanation,
  };
}

function buildPQ(): PracticeQuestion {
  const r = Math.random();
  const built =
    r < 0.25 ? buildAgeFractionChange()
  : r < 0.50 ? buildTimesFutureThenAgo()
  : r < 0.75 ? buildAgeInequality()
             : buildAgeSymbolicExpression();
  return toPracticeQuestion(built);
}

const choiceFormatter = (c: string | number) =>
  typeof c === "number" ? `$${c}~\\text{ years old}$` : `$${String(c)}$`;

/* ------------------------------ Page ------------------------------ */

export default function AgePractice() {
  return (
    <PracticeEngine
      title="Age Problems — Infinite Practice"
      instruction="Pick the best answer. Watch the time shifts and relationships."
      streakKey="age"
      build={buildPQ}
      // show numbers as “N years old”; symbolic strings render as-is
      choiceFormatter={choiceFormatter}
    />
  );
}
