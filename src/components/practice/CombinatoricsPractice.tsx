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
  const n = 2                // toppings
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

/* --------------------------- component ------------------------- */

const BUILDERS: ReadonlyArray<() => PracticeQuestion> = [
  buildPairsFromN,
  buildPizzaTwoToppings,
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