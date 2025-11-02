import PracticeEngine from "../practice/engine/PracticeEngine";
import type { PracticeQuestion } from "../practice/engine/PracticeEngine";

/* ---------------- helpers ---------------- */
type Frac = { n: number; d: number };
type Mixed = { w: number; n: number; d: number };

function randint(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function gcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}
function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}
function addFracs(a: Frac, b: Frac): Frac {
  const D = lcm(a.d, b.d);
  const N = a.n * (D / a.d) + b.n * (D / b.d);
  return { n: N, d: D };
}
function simplify({ n, d }: Frac): Frac {
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}
function toMixed(f: Frac): Mixed {
  const whole = Math.trunc(f.n / f.d);
  const rem = f.n - whole * f.d;
  const simp = simplify({ n: rem, d: f.d });
  return { w: whole, n: simp.n, d: simp.d };
}
function fromMixed(m: Mixed): Frac {
  return { n: m.w * m.d + m.n, d: m.d };
}
function fmtMixed(m: Mixed): string {
  if (m.n === 0) return String(m.w);
  if (m.w === 0) return `\\tfrac{${m.n}}{${m.d}}`;
  return `${m.w}\\tfrac{${m.n}}{${m.d}}`;
}
function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------------- builder ---------------- */
type Built = {
  id: string;
  stem: string;         // KaTeX-ready string (use $...$ or \[...\])
  choices: string[];    // KaTeX-ready strings
  correctIndex: number;
  explanation: string;  // KaTeX-ready string
};

function buildOne(): Built {
  const denomPool = [2, 3, 4, 5, 6, 8, 10, 12];
  const termCount = randint(3, 4);
  const terms: Mixed[] = [];

  for (let i = 0; i < termCount; i++) {
    const d = denomPool[randint(0, denomPool.length - 1)];
    const n = randint(1, d - 1);
    const w = randint(1, 6);
    terms.push({ w, n, d });
  }

  const expr = terms.map(fmtMixed).join(" \\; + \\; ");
  const stem = `\\[ ${expr} \\]What is the value of the expression shown above?`;

  // exact sum
  const totalImproper = terms
    .map(fromMixed)
    .reduce((acc, f) => addFracs(acc, f), { n: 0, d: 1 });
  const sumMixed = toMixed(simplify(totalImproper));
  const correct = fmtMixed(sumMixed);

  // distractors
  const distractors = new Set<string>();

  // unsimplified-ish variant
  const tryUnsimp = (() => {
    const t = toMixed(totalImproper);
    const scale = 2;
    const n2 = Math.max(1, Math.min(t.d * scale - 1, t.n * scale));
    return fmtMixed({ w: t.w, n: n2, d: t.d * scale });
  })();
  distractors.add(tryUnsimp);

  // carry +/- 1
  distractors.add(fmtMixed({ w: sumMixed.w + 1, n: sumMixed.n, d: sumMixed.d }));
  if (sumMixed.w > 0) {
    distractors.add(fmtMixed({ w: sumMixed.w - 1, n: sumMixed.n, d: sumMixed.d }));
  }

  // small numerator tweaks
  if (sumMixed.n > 0) {
    distractors.add(fmtMixed({ w: sumMixed.w, n: Math.max(1, sumMixed.n - 1), d: sumMixed.d }));
    if (sumMixed.n + 1 < sumMixed.d) {
      distractors.add(fmtMixed({ w: sumMixed.w, n: sumMixed.n + 1, d: sumMixed.d }));
    }
  }

  const pool = shuffle(Array.from(distractors)).filter(x => x !== correct);
  const choices = shuffle([correct, ...pool]).slice(0, 4);
  if (!choices.includes(correct)) choices[0] = correct;
  const correctIndex = choices.findIndex(c => c === correct);

  // explanation (common denominator)
  const L = terms.map(t => t.d).reduce((acc, d) => lcm(acc, d), 1);
  const fracSumNumer = terms.map(t => t.n * (L / t.d)).reduce((a, b) => a + b, 0);
  const wholeSum = terms.reduce((a, b) => a + b.w, 0);
  const imprNumer = wholeSum * L + fracSumNumer;

  const explanation =
    `Convert to a common denominator ${L} and add: ` +
    `\\[ ${expr} = \\tfrac{${imprNumer}}{${L}} = ${fmtMixed(sumMixed)}. \\]`;

  return {
    id: `MIXED-SUM-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    stem,
    choices,
    correctIndex,
    explanation,
  };
}

/* ------------- glue to engine ------------- */
function buildPQ(): PracticeQuestion {
  const b = buildOne();
  return {
    id: b.id,
    stem: b.stem,
    choices: b.choices,          // already TeX strings
    correctIndex: b.correctIndex,
    explanation: b.explanation,
  };
}

/* --------------------------- Page --------------------------- */
export default function MixedNumbersSumPractice() {
  return (
    <PracticeEngine
      title="Adding Mixed Numbers — Infinite Practice"
      instruction="Add the mixed numbers and choose the correct simplified result."
      streakKey="mixed-sum"
      build={buildPQ}
    />
  );
}
