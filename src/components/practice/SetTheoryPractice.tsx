// src/components/practice/SetTheoryPractice.tsx
import PracticeEngine, { type PracticeQuestion } from "./engine/PracticeEngine";

/* --------------------------- helpers --------------------------- */

function rng(min: number, max: number): number {
  // inclusive ints
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ✅ accept readonly arrays
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ✅ return strongly typed array
function unique<T>(xs: readonly T[]): T[] {
  return Array.from(new Set(xs));
}

// ✅ do not mutate input
function shuffle<T>(xs: readonly T[]): T[] {
  const a = xs.slice(); // copy to mutable
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fmt(n: number) {
  return n.toLocaleString();
}

/* --------------------- core random instance -------------------- */
/**
 * Create a consistent random scenario for two sets A, B within total N.
 * Also returns a feasible overlap K (random within allowed range).
 */
function randomABN() {
  const N = rng(200, 1200); // adjust ranges as you like
  const A = rng(Math.floor(0.3 * N), Math.floor(0.9 * N));
  const B = rng(Math.floor(0.2 * N), Math.floor(0.85 * N));
  const minK = Math.max(0, A + B - N);
  const maxK = Math.min(A, B);
  const K = rng(minK, maxK);
  return { N, A, B, K, minK, maxK };
}

/* ---------------------- question templates --------------------- */

function buildMinOverlap(): PracticeQuestion {
  const { N, A, B, minK } = randomABN();
  const correct = minK;

  const bads = unique<number>([
    Math.max(0, minK - rng(1, 3)),
    Math.min(A, B), // confused with max overlap
    Math.max(0, A + B - (N + rng(1, 5))), // off-by-a-few total
    rng(0, Math.min(A, B)),
  ]).filter((x) => x !== correct);

  let pool = unique<number>([correct, ...bads]);
  while (pool.length < 5) pool = unique<number>([...pool, rng(0, Math.min(A, B))]);
  const choices = shuffle(pool).slice(0, 5);
  const correctIndex = choices.indexOf(correct);

  return {
    id: `set-min-${Date.now()}`,
    tag: "Min overlap",
    stem: `In a group of ${fmt(N)} people, ${fmt(A)} are in set A and ${fmt(
      B
    )} are in set B. What is the **smallest** possible number in both A and B?`,
    choices,
    correctIndex,
    explanation:
      `By inclusion–exclusion, the smallest possible intersection is ` +
      `\\(\\max(0, A + B - N)\\). Here \\(A + B - N = ${fmt(A + B - N)}\\), so the answer is \\(${fmt(
        correct
      )}\\).`,
  };
}

function buildMaxOverlap(): PracticeQuestion {
  const { N, A, B } = randomABN();
  const correct = Math.min(A, B);

  const bads = unique<number>([
    Math.max(0, A + B - N), // min overlap
    Math.max(0, correct - rng(1, 5)),
    rng(0, Math.min(A, B)),
  ]).filter((x) => x !== correct);

  let pool = unique<number>([correct, ...bads]);
  while (pool.length < 5) pool = unique<number>([...pool, rng(0, Math.min(A, B))]);
  const choices = shuffle(pool).slice(0, 5);
  const correctIndex = choices.indexOf(correct);

  return {
    id: `set-max-${Date.now()}`,
    tag: "Max overlap",
    stem: `In a group of ${fmt(N)} people, ${fmt(A)} are in set A and ${fmt(
      B
    )} are in set B. What is the **largest** possible number in both A and B?`,
    choices,
    correctIndex,
    explanation:
      `The largest possible intersection is \\(\\min(A, B)\\) — ` +
      `everyone from the smaller set could be in the overlap. That’s \\(${fmt(correct)}\\).`,
  };
}

function buildUnion(): PracticeQuestion {
  const { N, A, B, K } = randomABN();
  const correct = A + B - K;

  const bads = unique<number>([
    A + B, // forgot to subtract overlap
    A + B - 2 * K, // exactly one
    N - (A + B - K), // neither
  ]).filter((x) => x !== correct && x >= 0 && x <= N);

  let pool = unique<number>([correct, ...bads]);
  while (pool.length < 5)
    pool = unique<number>([...pool, rng(Math.max(A, B), Math.min(N, A + B))]);
  const choices = shuffle(pool).slice(0, 5);
  const correctIndex = choices.indexOf(correct);

  return {
    id: `set-union-${Date.now()}`,
    tag: "Union size",
    stem: `In a group of ${fmt(N)} people, ${fmt(A)} are in set A, ${fmt(
      B
    )} are in set B, and ${fmt(K)} are in both. How many are in **A ∪ B** (at least one of A or B)?`,
    choices,
    correctIndex,
    explanation:
      `Use inclusion–exclusion: \\(|A ∪ B| = A + B − |A ∩ B| = ${fmt(A)} + ${fmt(
        B
      )} − ${fmt(K)} = ${fmt(correct)}\\).`,
  };
}

function buildExactlyOne(): PracticeQuestion {
  const { N, A, B, K } = randomABN();
  const correct = A + B - 2 * K;

  const bads = unique<number>([
    A + B - K, // union
    N - (A + B - K), // neither
    Math.abs(A - B), // common wrong idea
  ]).filter((x) => x !== correct && x >= 0 && x <= N);

  let pool = unique<number>([correct, ...bads]);
  while (pool.length < 5) pool = unique<number>([...pool, rng(0, Math.min(N, A + B))]);
  const choices = shuffle(pool).slice(0, 5);
  const correctIndex = choices.indexOf(correct);

  return {
    id: `set-ex1-${Date.now()}`,
    tag: "Exactly one",
    stem: `In a group of ${fmt(N)} people, ${fmt(A)} are in set A, ${fmt(
      B
    )} are in set B, and ${fmt(K)} are in both. How many are in **exactly one** of A or B?`,
    choices,
    correctIndex,
    explanation:
      `Exactly one = \\(|A \\setminus B| + |B \\setminus A| = A + B − 2K = ${fmt(correct)}\\).`,
  };
}

function buildNeither(): PracticeQuestion {
  const { N, A, B, K } = randomABN();
  const union = A + B - K;
  const correct = N - union;

  const bads = unique<number>([
    union,
    A + B, // common mistake
    Math.max(0, A + B - N), // min overlap
  ]).filter((x) => x !== correct && x >= 0 && x <= N);

  let pool = unique<number>([correct, ...bads]);
  while (pool.length < 5) pool = unique<number>([...pool, rng(0, N)]);
  const choices = shuffle(pool).slice(0, 5);
  const correctIndex = choices.indexOf(correct);

  return {
    id: `set-neither-${Date.now()}`,
    tag: "Neither",
    stem: `In a group of ${fmt(N)} people, ${fmt(A)} are in set A, ${fmt(
      B
    )} are in set B, and ${fmt(K)} are in both. How many are in **neither** A nor B?`,
    choices,
    correctIndex,
    explanation:
      `First, \\(|A ∪ B| = A + B − K = ${fmt(union)}\\). Neither = total − union = \\(${fmt(
        N
      )} − ${fmt(union)} = ${fmt(correct)}\\).`,
  };
}

/* ----- NEW: “pets survey” → find total surveyed from bullet facts ----- */
function buildPetsSurvey(): PracticeQuestion {
  // Keep numbers friendly like the screenshot
  const cats = rng(12, 32);
  const dogs = rng(15, 36);
  const both = rng(1, Math.min(10, cats, dogs));
  const neither = rng(0, 15);

  const correct = cats + dogs - both + neither;

  // plausible mistakes
  const distractors = unique<number>([
    cats + dogs + neither,               // forgot to subtract both
    cats + dogs - both,                  // forgot people with neither
    cats + dogs + both + neither,        // added the overlap
    Math.max(0, cats + dogs - 2 * both + neither), // counted "exactly one + neither"
    correct + rng(-3, 3),                // small arithmetic slip
  ]).filter((x) => x > 0 && x !== correct);

  let pool = unique<number>([correct, ...distractors]);
  while (pool.length < 4) pool.push(correct + rng(4, 12));
  const choices = shuffle(pool).slice(0, 4);
  const correctIndex = choices.indexOf(correct);

  const stem =
    `A survey asked students what pets they have. Based on the results, the following statements are all true:\n\n` +
    `- ${fmt(cats)} students have cats.\n` +
    `- ${fmt(dogs)} students have dogs.\n` +
    `- ${fmt(both)} students have both dogs and cats.\n` +
    `- ${fmt(neither)} students have no dogs or cats.\n\n` +
    `How many students were surveyed?`;

  const explanation =
    `Cats only + dogs only + both + neither = total.\n\n` +
    `Cats only = cats − both, dogs only = dogs − both.\n\n` +
    `Total = (cats − both) + (dogs − both) + both + neither = cats + dogs − both + neither = ${fmt(correct)}.`;

  return {
    id: `set-pets-${Date.now()}`,
    tag: "Pets survey (total)",
    stem,
    choices,
    correctIndex,
    explanation,
  };
}

// ✅ readonly list so pick(...) type-checks cleanly
const BUILDERS: ReadonlyArray<() => PracticeQuestion> = [
  buildMinOverlap,
  buildMaxOverlap,
  buildUnion,
  buildExactlyOne,
  buildNeither,
  buildPetsSurvey, // ← added
];

/* --------------------------- component ------------------------- */

export default function SetTheoryPractice() {
  return (
    <PracticeEngine
      title="Set Theory / Venn Diagrams"
      instruction="Fresh numbers each time. Use inclusion–exclusion and bounds for intersections."
      streakKey="settheory"
      build={() => pick(BUILDERS)()}
      choiceFormatter={(c) => (typeof c === "number" ? fmt(c) : String(c))}
    />
  );
}
