// src/components/practice/FactorsMultiplesPractice.tsx
import PracticeEngine, { type PracticeQuestion } from "./engine/PracticeEngine";

/* ------------------------------ helpers ------------------------------ */

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function shuffle<T>(xs: readonly T[]): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function uniq<T>(xs: readonly T[]): T[] {
  return Array.from(new Set(xs));
}
function fmt(n: number) {
  return n.toLocaleString();
}

// Euclid
function gcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b !== 0) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}
function lcm(a: number, b: number): number {
  return Math.abs(a / gcd(a, b) * b);
}
function gcdList(nums: number[]): number {
  return nums.reduce((g, v) => gcd(g, v));
}
function lcmList(nums: number[]): number {
  return nums.reduce((L, v) => lcm(L, v));
}

// factorization (for explanation)
function factorize(n: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  let x = n;
  for (let d = 2; d * d <= x; d++) {
    if (x % d === 0) {
      let e = 0;
      while (x % d === 0) {
        x /= d; e++;
      }
      out.push([d, e]);
    }
  }
  if (x > 1) out.push([x, 1]);
  return out;
}
function factToLatex(f: Array<[number, number]>): string {
  return f.map(([p, e]) => (e === 1 ? `${p}` : `${p}^{${e}}`)).join("\\cdot ");
}

/* ------------------------------ builders ----------------------------- */

/** LCM of three numbers (like 24, 6, 18). */
function buildLCM3(): PracticeQuestion {
  // Build numbers from small prime powers so results are clean (≤ ~300)
  //const primes = [2, 3, 5, 7] as const;
  const makeN = () => {
    const e2 = randInt(0, 3);
    const e3 = randInt(0, 2);
    const e5 = randInt(0, 1);
    const e7 = randInt(0, 1);
    const pow = (p: number, e: number) => (e === 0 ? 1 : p ** e);
    return pow(2, e2) * pow(3, e3) * pow(5, e5) * pow(7, e7);
  };

  let a = makeN(), b = makeN(), c = makeN();
  // keep nontrivial and not huge
  let tries = 0;
  while (
    (a < 2 || b < 2 || c < 2) ||
    a === b && b === c ||
    lcmList([a, b, c]) > 400
  ) {
    a = makeN(); b = makeN(); c = makeN();
    if (++tries > 50) break;
  }

  const correct = lcmList([a, b, c]);

  // distractors: pairwise lcms, 2×max, product/gcd approximation
  const pair1 = lcm(a, b);
  const pair2 = lcm(a, c);
  const pair3 = lcm(b, c);
  const approx = Math.round((a * b * c) / (gcd(a, b) * gcd(b, c))); // intentionally messy
  const plausible = uniq<number>([
    correct,
    pair1, pair2, pair3,
    Math.max(a, b, c) * 2,
    approx,
  ]).filter((x) => x > 0 && x <= 1000);

  const choices = shuffle(plausible).slice(0, 4);
  if (!choices.includes(correct)) { choices[0] = correct; shuffle(choices); }

  const facts = [a, b, c].map(factorize);
  const merged = new Map<number, number>();
  for (const f of facts) {
    for (const [p, e] of f) merged.set(p, Math.max(merged.get(p) ?? 0, e));
  }
  const mergedLatex = Array.from(merged.entries())
    .sort((x, y) => x[0] - y[0])
    .map(([p, e]) => (e === 1 ? `${p}` : `${p}^{${e}}`))
    .join("\\cdot ");

  return {
    id: `FM-LCM3-${Date.now()}`,
    tag: "LCM of 3 numbers",
    stem: `What is the **least common multiple** of ${a}, ${b}, and ${c}?`,
    choices,
    correctIndex: choices.indexOf(correct),
    explanation:
      `Prime-factorize each number:\n\n` +
      `${a}=\\(${factToLatex(factorize(a))}\\),\\; ${b}=\\(${factToLatex(factorize(b))}\\),\\; ${c}=\\(${factToLatex(factorize(c))}\\).\n\n` +
      `Take each prime with the **largest** exponent: \\(${mergedLatex}\\) = **${fmt(correct)}**.`,
  };
}

/** GCF / Greatest common factor of 2 or 3 numbers. */
function buildGCF(): PracticeQuestion {
  const count = pick([2, 3] as const);
  const makeN = () => {
    const base = pick([6, 8, 9, 10, 12, 14, 15, 18, 20, 21, 24, 27, 30]);
    return base * pick([1, 1, 2, 3]);
  };
  const nums = count === 2 ? [makeN(), makeN()] : [makeN(), makeN(), makeN()];
  const correct = gcdList(nums);

  // distractors: lcm, min, product-ish
  const d1 = lcmList(nums);
  const d2 = Math.min(...nums);
  const d3 = correct * pick([2, 3, 4]);
  const plausible = uniq<number>([correct, d1, d2, d3]).filter((x) => x > 0);

  const choices = shuffle(plausible).slice(0, 4);
  if (!choices.includes(correct)) { choices[0] = correct; shuffle(choices); }

  const label = nums.join(", ");

  return {
    id: `FM-GCF-${Date.now()}`,
    tag: "GCF",
    stem: `What is the **greatest common factor** of ${label}?`,
    choices,
    correctIndex: choices.indexOf(correct),
    explanation:
      `Use the Euclidean Algorithm (or factor trees). Repeatedly compute remainders until 0.\n\n` +
      `Result: **${fmt(correct)}**.`,
  };
}

/** Count multiples of m in [A, B] inclusive. */
function buildCountMultiplesInRange(): PracticeQuestion {
  const m = randInt(3, 12);
  let A = randInt(-30, 20);
  let B = A + randInt(15, 45);
  // ensure A <= B
  if (A > B) [A, B] = [B, A];

  const firstK = Math.ceil(A / m);
  const lastK = Math.floor(B / m);
  const correct = Math.max(0, lastK - firstK + 1);

  const d1 = Math.max(0, lastK - firstK);       // off by one
  const d2 = Math.floor(B / m) - Math.floor(A / m); // common mistake
  const d3 = Math.floor((B - A) / m);           // interval-length divide
  const choices = shuffle(uniq<number>([correct, d1, d2, d3])).slice(0, 4);
  if (!choices.includes(correct)) { choices[0] = correct; shuffle(choices); }

  return {
    id: `FM-COUNT-${Date.now()}`,
    tag: "Count multiples in range",
    stem:
      `How many multiples of ${m} are there from ${A} to ${B}, inclusive?`,
    choices,
    correctIndex: choices.indexOf(correct),
    explanation:
      `Multiples are of the form \\(k\\cdot ${m}\\).\n\n` +
      `Smallest \\(k\\) with \\(k\\cdot ${m}\\ge ${A}\\) is \\(\\lceil ${A}/${m} \\rceil = ${firstK}\\).\n` +
      `Largest \\(k\\) with \\(k\\cdot ${m}\\le ${B}\\) is \\(\\lfloor ${B}/${m} \\rfloor = ${lastK}\\).\n\n` +
      `Count = \\(${lastK}-${firstK}+1 = ${fmt(correct)}\\).`,
  };
}

/* ------------------------------- page -------------------------------- */

const BUILDERS: ReadonlyArray<() => PracticeQuestion> = [
  buildLCM3,
  buildGCF,
  buildCountMultiplesInRange,
];

export default function FactorsMultiplesPractice() {
  return (
    <PracticeEngine
      title="Factors & Multiples — Infinite Practice"
      streakKey="factors-multiples"
      instruction="LCM, GCF, and counting multiples. New numbers every time."
      build={() => pick(BUILDERS)()}
      choiceFormatter={(c) => (typeof c === "number" ? `\\(${fmt(c)}\\)` : String(c))}
    />
  );
}
