// src/components/practice/CombinatoricsPractice.tsx
import PracticeEngine, { type PracticeQuestion } from "./engine/PracticeEngine";

/* --------------------------- helpers --------------------------- */

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function uniq<T>(xs: readonly T[]): T[] {
  return Array.from(new Set(xs));
}
function shuffle<T>(xs: readonly T[]): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function fmt(n: number) {
  return n.toLocaleString();
}

/* factorial/perm/comb kept in safe ranges (n ≤ ~26) so number fits JS */
function fact(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}
function nPr(n: number, r: number): number {
  let p = 1;
  for (let i = 0; i < r; i++) p *= (n - i);
  return p;
}
function nCr(n: number, r: number): number {
  if (r < 0 || r > n) return 0;
  r = Math.min(r, n - r);
  let num = 1, den = 1;
  for (let i = 1; i <= r; i++) {
    num *= (n - r + i);
    den *= i;
  }
  return Math.round(num / den);
}

/* ------------------------- builders ---------------------------- */

/** NEW: choose-2-from-n pairs (cookies example) */
function buildPairsFromN(): PracticeQuestion {
  // 25% of the time reproduce the screenshot: 6 cookies, choose 2
  const forceSample = Math.random() < 0.10;
  const n = forceSample ? 6 : randInt(5, 16);
  const items = forceSample ? "cookies" : pick(["cookies", "stickers", "marbles", "cards", "books", "flowers"]);
  const who = pick(["Aiden", "Maya", "Jordan", "Sofia", "Liam", "Ava"]);

  const correct = nCr(n, 2);

  const choices = shuffle(
    uniq<number>([
      correct,
      nPr(n, 2),                 // used permutations
      nCr(n, 2) * 2,             // double-counted order
      nCr(n, 3),                 // wrong r
      Math.max(0, (n * (n - 1)) / 2 - 1), // off-by-one
    ])
  ).slice(0, 4);

  return {
    id: `COMBO-PAIRS-${Date.now()}`,
    tag: "Choose 2 from n",
    stem:
      `There are ${n} different ${items}. ${who} will choose 2 of these ${items}. ` +
      `How many different pairs of 2 ${items} can be chosen?`,
    choices,
    correctIndex: choices.indexOf(correct),
    explanation:
      `Order doesn’t matter, so use combinations: \\(\\binom{n}{2} = \\dfrac{n(n-1)}{2}\\).\n\n` +
      `With \\(n=${n}\\): \\(\\binom{${n}}{2} = \\dfrac{${n}(${n}-1)}{2} = ${fmt(correct)}\\).`,
  };
}

/** Pizza template (sizes × choose toppings). Matches the familiar case when S=3, n=7, k=2. */
function buildPizzaTwoToppings(): PracticeQuestion {
  const forceSample = Math.random() < 0.25;
  const S = forceSample ? 3 : randInt(2, 5);                  // sizes
  const n = forceSample ? 7 : randInt(6, 12);                 // toppings
  const k = forceSample ? 2 : randInt(2, Math.min(4, n - 1)); // exactly k toppings
  const correct = S * nCr(n, k);

  const distractors = uniq<number>([
    nCr(n, k),                 // forgot sizes
    S * nPr(n, k),             // permutations instead of combinations
    S * nCr(n, Math.max(1, k - 1)),
    S * nCr(n, Math.min(n, k + 1)),
  ]).filter(x => x !== correct);

  const choices = shuffle([correct, ...distractors]).slice(0, 4);
  const correctIndex = choices.indexOf(correct);

  return {
    id: `COMBO-PIZZA-${Date.now()}`,
    tag: "Sizes × toppings",
    stem:
      `A pizza shop offers ${S} sizes and ${n} different toppings.\n` +
      `If a pizza must have exactly ${k} different toppings, how many different pizzas can be created?`,
    choices,
    correctIndex,
    explanation:
      `Choose toppings and multiply by size options:\n\n` +
      `\\(\\text{# pizzas}= ${S}\\cdot\\binom{${n}}{${k}} = ${S}\\cdot${nCr(n, k)} = ${fmt(correct)}\\).`,
  };
}

/** Committee with a captain */
function buildCommitteeWithCaptain(): PracticeQuestion {
  const n = randInt(8, 16);
  const k = randInt(3, Math.min(6, n - 1));
  const correct = nCr(n, k) * k;

  const choices = shuffle(uniq<number>([
    correct,
    nCr(n, k),            // forgot captain
    nPr(n, k),            // permutations of team
    nCr(n, k - 1) * (k - 1),
  ])).slice(0, 4);

  return {
    id: `COMBO-COMMITTEE-${Date.now()}`,
    tag: "Committee + captain",
    stem:
      `From ${n} students, how many ways to form a committee of ${k} with one captain chosen from the committee?`,
    choices,
    correctIndex: choices.indexOf(correct),
    explanation:
      `First choose the committee: \\(\\binom{${n}}{${k}}\\). Then choose the captain from the \\(${k}\\) members.\n\n` +
      `Total: \\(\\binom{${n}}{${k}}\\cdot${k} = ${fmt(correct)}\\).`,
  };
}

/** Seated together */
function buildSeatedTogether(): PracticeQuestion {
  const n = randInt(5, 8);
  const correct = fact(n - 1) * 2; // treat AB as one block then ×2 for internal order

  const choices = shuffle(uniq<number>([
    correct,
    fact(n),                 // ignored "together"
    fact(n - 2) * 2,         // used (n-2)!
    Math.max(0, fact(n) - correct), // "not together" instead
  ])).slice(0, 4);

  return {
    id: `COMBO-TOGETHER-${Date.now()}`,
    tag: "Seated together",
    stem:
      `${n} distinct people sit in a row. In how many ways can they sit if two specific people must sit next to each other?`,
    choices,
    correctIndex: choices.indexOf(correct),
    explanation:
      `Treat the pair as one unit \\((n-1)!\\) and multiply by \\(2\\) for their internal order.\n\n` +
      `So \\((n-1)!\\cdot2 = (${n}-1)!\\cdot2 = ${fmt(correct)}\\).`,
  };
}

/** Letters with repeats (multiset permutations) */
function buildWordWithRepeats(): PracticeQuestion {
  const parts = shuffle([3, 2, 2, 1, 1]).slice(0, randInt(3, 4));
  const n = parts.reduce((a, b) => a + b, 0);
  const denom = parts.reduce((a, b) => a * fact(b), 1);
  const correct = fact(n) / denom;

  const choices = shuffle(uniq<number>([
    correct,
    fact(n),                          // forgot repeats
    fact(n) / (denom / fact(parts[0])), // missed one repeat factor
    fact(n - 1) / denom,              // off by one
  ])).slice(0, 4);

  const partText = parts.map((c) => `${c}`).join(", ");
  return {
    id: `COMBO-REPEATS-${Date.now()}`,
    tag: "Letters with repeats",
    stem:
      `A word has ${n} letters with repetition counts ${partText} (for example, those counts among its letters).\n` +
      `How many distinct permutations of the letters are there?`,
    choices,
    correctIndex: choices.indexOf(correct),
    explanation:
      `Use the multiset formula: \\(\\dfrac{${n}!}{${parts.map(c => `${c}!`).join("\\,")}} = ${fmt(correct)}\\).`,
  };
}

/** LLL–DDD plates */
function buildLicensePlates(): PracticeQuestion {
  const withRepeat = Math.random() < 0.5;
  const letters = 26, digits = 10;
  const correct = withRepeat
    ? Math.pow(letters, 3) * Math.pow(digits, 3)
    : nPr(letters, 3) * nPr(digits, 3);

  const choices = shuffle(uniq<number>([
    correct,
    Math.pow(letters, 3) * nPr(digits, 3),
    nPr(letters, 3) * Math.pow(digits, 3),
    Math.pow(letters, 3) * Math.pow(digits, 2),
  ])).slice(0, 4);

  return {
    id: `COMBO-PLATE-${Date.now()}`,
    tag: withRepeat ? "LLL–DDD (repetition allowed)" : "LLL–DDD (no repetition)",
    stem:
      `A license plate has 3 letters followed by 3 digits. ` +
      `${withRepeat ? "Characters may repeat." : "No character repeats."} ` +
      `How many plates are possible?`,
    choices,
    correctIndex: choices.indexOf(correct),
    explanation: withRepeat
      ? `Multiplication principle: \\(26^3\\cdot10^3=${fmt(correct)}\\).`
      : `Use permutations: \\(^{26}\\!P_3\\cdot^{10}\\!P_3 = (${26}\\cdot${25}\\cdot${24})(${10}\\cdot${9}\\cdot${8}) = ${fmt(correct)}\\).`,
  };
}

/* --------------------------- component ------------------------- */

const BUILDERS: ReadonlyArray<() => PracticeQuestion> = [
  buildPairsFromN,
  buildPizzaTwoToppings,
  buildCommitteeWithCaptain,
  buildSeatedTogether,
  buildWordWithRepeats,
  buildLicensePlates,
];

export default function CombinatoricsPractice() {
  return (
    <PracticeEngine
      title="Combinatorics — Infinite Practice"
      streakKey="combinatorics"
      instruction="Counting, permutations & combinations. New numbers every time."
      build={() => pick(BUILDERS)()}
      choiceFormatter={(c) =>
        typeof c === "number" ? `\\(${fmt(c)}\\)` : String(c)
      }
    />
  );
}