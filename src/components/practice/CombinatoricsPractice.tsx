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

/* small utilities: permutations & combinations (safe ranges) */
function nPr(n: number, r: number): number {
  let p = 1;
  for (let i = 0; i < r; i++) p *= n - i;
  return p;
}
function nCr(n: number, r: number): number {
  if (r < 0 || r > n) return 0;
  r = Math.min(r, n - r);
  let num = 1, den = 1;
  for (let i = 1; i <= r; i++) {
    num *= n - r + i;
    den *= i;
  }
  return Math.round(num / den);
}

/* ------------------------- builders ---------------------------- */

/** EXACT screenshot version: digits {2,3,5,7,8}, 5-digit numbers, no repetition. */
function buildFiveFixed23578(): PracticeQuestion {
  const digits = [2, 3, 5, 7, 8];
  const correct = 5 * 4 * 3 * 2 * 1; // 5! = 120

  const stem =
    `How many **5-digit numbers** can be created using the digits ${digits.join(", ")} ` +
    `without repeating any digits within that 5-digit number?`;

  const choices = shuffle([
    correct,        // 120 (correct)
    3125,           // 5^5 (allowed repetition)
    60,             // 5!/2 (wrongly dividing by 2)
    24,             // 4! (fixed one digit by mistake)
  ]);

  return {
    id: `COMBO-5FIX-${Date.now()}`,
    tag: "5 digits (2,3,5,7,8) — no repeat",
    stem,
    choices,
    correctIndex: choices.indexOf(correct),
    explanation:
      `There are 5 choices for the first digit, then 4, 3, 2, and 1 for the remaining places (no repetition).\n\n` +
      `Total \\(= 5\\times4\\times3\\times2\\times1 = 120\\).`,
  };
}

/** General: 5-digit numbers from a given set (may include 0), no repetition. */
function buildFiveDigitNoRepeat(): PracticeQuestion {
  const forceSample = Math.random() < 0.30;

  let digits: number[];
  if (forceSample) {
    digits = [2, 3, 5, 7, 8];
  } else {
    const includeZero = Math.random() < 0.4;
    const n = randInt(5, 8);
    const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const base = shuffle(pool).slice(0, n - (includeZero ? 1 : 0));
    digits = includeZero ? uniq([0, ...base]).slice(0, n) : base;
    while (digits.length < n) {
      const extra = randInt(1, 9);
      if (!digits.includes(extra)) digits.push(extra);
    }
    digits.sort((a, b) => a - b);
  }

  const n = digits.length;
  const hasZero = digits.includes(0);
  const correct = hasZero ? nPr(n, 5) - nPr(n - 1, 4) : nPr(n, 5);

  const stem =
    `How many **5-digit numbers** can be created using the digits ${digits.join(", ")} ` +
    `without repeating any digits within that 5-digit number?`;

  const distractors = uniq<number>([
    correct,
    nCr(n, 5),
    nPr(n, 5),
    (hasZero ? (n - 1) * Math.pow(n, 4) : Math.pow(n, 5)),
    Math.max(0, correct - 1),
    nPr(Math.max(5, n - 1), 5),
    nPr(n, 4),
  ]).filter((x) => x > 0);

  const choices = shuffle(distractors).slice(0, 4);
  if (!choices.includes(correct)) {
    choices[0] = correct;
    shuffle(choices);
  }

  const correctIndex = choices.indexOf(correct);
  const explanation = hasZero
    ? `First digit cannot be $0$. Choose the first digit in ${n - 1} ways, then the next 4 places from the remaining digits: ` +
      `${n - 1}\\times(${n - 1})\\times(${n - 2})\\times(${n - 3})\\times(${n - 4}) = ${fmt(correct)}. ` +
      `Equivalently, subtract those starting with $0$: $P(${n},5)-P(${n - 1},4)=${fmt(correct)}$.`
    : `No restriction on the first digit. Arrange any 5 distinct digits from the set: ` +
      `${n}\\times(${n - 1})\\times(${n - 2})\\times(${n - 3})\\times(${n - 4}) = ${fmt(correct)}.`;

  return {
    id: `COMBO-5DIG-${Date.now()}`,
    tag: "5-digit numbers (no repetition)",
    stem,
    choices,
    correctIndex,
    explanation,
  };
}

/** Choose-2-from-n pairs (simple combinations by counting). */
function buildPairsFromN(): PracticeQuestion {
  const forceSample = Math.random() < 0.10;
  const n = forceSample ? 6 : randInt(5, 16);
  const items = forceSample
    ? "cookies"
    : pick(["cookies", "stickers", "marbles", "cards", "books", "flowers"]);
  const who = pick(["Aiden", "Maya", "Jordan", "Sofia", "Liam", "Ava"]);

  const correct = nCr(n, 2);

  const choices = shuffle(
    uniq<number>([
      correct,
      nPr(n, 2), // order matters (wrong)
      nCr(n, 2) * 2, // double-counted
      nCr(n, 3), // wrong r
      Math.max(0, (n * (n - 1)) / 2 - 1), // off by one
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
      `Pick the first item in ${n} ways and the second in ${n - 1} ways, ` +
      `but two orders make the same pair, so divide by 2: ${n}\\times(${n}-1)/2 = ${fmt(
        correct
      )}.`,
  };
}

/** Pizza: sizes × exactly 2 toppings — shown with basic counting (no nCr/nPr in stem). */
function buildPizzaTwoToppings(): PracticeQuestion {
  const forceSample = Math.random() < 0.25;
  const S = forceSample ? 3 : randInt(2, 5); // number of sizes
  const n = forceSample ? 7 : randInt(5, 10); // number of toppings
  //const k = 2; // exactly 2 toppings

  // count pairs of toppings without using nCr: n(n-1)/2
  const toppingPairs = (n * (n - 1)) / 2;
  const correct = S * toppingPairs;

  const distractors = uniq<number>([
    correct,
    S * n * (n - 1), // forgot to divide by 2 (treated order as different)
    S * ((n - 1) * (n - 2)) / 2, // used n-1 instead of n
    S * ((n + 1) * n) / 2, // used n+1
    Math.max(1, correct - S), // off by a size-block
  ]).filter((x) => x !== correct);

  const choices = shuffle([correct, ...distractors]).slice(0, 4);
  const correctIndex = choices.indexOf(correct);

  return {
    id: `COMBO-PIZZA2-${Date.now()}`,
    tag: "Sizes × 2 toppings",
    stem:
      `A pizza shop offers ${S} sizes and ${n} different toppings.\n` +
      `If a pizza must have exactly 2 different toppings, how many different pizzas can be created?`,
    choices,
    correctIndex,
    explanation:
      `Choose the toppings first: pick the first topping in ${n} ways and the second in ${n - 1} ways. ` +
      `Since the two orders make the same pair, divide by 2: ${n}\\times(${n}-1)/2 = ${toppingPairs}. ` +
      `Then choose a size (${S} ways). Total: ${S} × ${toppingPairs} = ${fmt(correct)}.`,
  };
}

/* --------------------------- component ------------------------- */

const BUILDERS: ReadonlyArray<() => PracticeQuestion> = [
  buildFiveFixed23578,     // exact screenshot problem
  buildFiveDigitNoRepeat,  // generalized version (may include 0)
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
