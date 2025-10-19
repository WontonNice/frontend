// src/components/practice/SetTheoryPractice.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/* --------------------------- helpers --------------------------- */

function rng(min: number, max: number): number {
  // inclusive ints
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ✅ accept readonly arrays (fixes readonly tuple complaints)
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

type BuiltQuestion = {
  id: string;
  stem: string;
  choices: number[];
  answerIndex: number;
  explanation: string;
  tag: string; // template label
};

function buildMinOverlap(): BuiltQuestion {
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
  const answerIndex = choices.indexOf(correct);

  return {
    id: `set-min-${Date.now()}`,
    tag: "Min overlap",
    stem: `In a group of ${fmt(N)} people, ${fmt(A)} are in set A and ${fmt(
      B
    )} are in set B. What is the **smallest** possible number in both A and B?`,
    choices,
    answerIndex,
    explanation:
      `By inclusion–exclusion, the smallest possible intersection is ` +
      `max(0, A + B − N). Here A + B − N = ${fmt(A + B - N)}, so the answer is ${fmt(correct)}.`,
  };
}

function buildMaxOverlap(): BuiltQuestion {
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
  const answerIndex = choices.indexOf(correct);

  return {
    id: `set-max-${Date.now()}`,
    tag: "Max overlap",
    stem: `In a group of ${fmt(N)} people, ${fmt(A)} are in set A and ${fmt(
      B
    )} are in set B. What is the **largest** possible number in both A and B?`,
    choices,
    answerIndex,
    explanation:
      `The largest possible intersection is min(A, B) — ` +
      `everyone from the smaller set could be in the overlap. That’s ${fmt(correct)}.`,
  };
}

function buildUnion(): BuiltQuestion {
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
  const answerIndex = choices.indexOf(correct);

  return {
    id: `set-union-${Date.now()}`,
    tag: "Union size",
    stem: `In a group of ${fmt(N)} people, ${fmt(A)} are in set A, ${fmt(
      B
    )} are in set B, and ${fmt(K)} are in both. How many are in **A ∪ B** (at least one of A or B)?`,
    choices,
    answerIndex,
    explanation:
      `Use inclusion–exclusion: |A ∪ B| = A + B − |A ∩ B| = ${fmt(A)} + ${fmt(
        B
      )} − ${fmt(K)} = ${fmt(correct)}.`,
  };
}

function buildExactlyOne(): BuiltQuestion {
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
  const answerIndex = choices.indexOf(correct);

  return {
    id: `set-ex1-${Date.now()}`,
    tag: "Exactly one",
    stem: `In a group of ${fmt(N)} people, ${fmt(A)} are in set A, ${fmt(
      B
    )} are in set B, and ${fmt(K)} are in both. How many are in **exactly one** of A or B?`,
    choices,
    answerIndex,
    explanation:
      `Exactly one = |A \\ B| + |B \\ A| = A + B − 2K = ${fmt(correct)}.`,
  };
}

function buildNeither(): BuiltQuestion {
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
  const answerIndex = choices.indexOf(correct);

  return {
    id: `set-neither-${Date.now()}`,
    tag: "Neither",
    stem: `In a group of ${fmt(N)} people, ${fmt(A)} are in set A, ${fmt(
      B
    )} are in set B, and ${fmt(K)} are in both. How many are in **neither** A nor B?`,
    choices,
    answerIndex,
    explanation:
      `First, |A ∪ B| = A + B − K = ${fmt(union)}. Neither = total − union = ${fmt(
        N
      )} − ${fmt(union)} = ${fmt(correct)}.`,
  };
}

// ✅ readonly list so pick(...) type-checks cleanly
const BUILDERS: ReadonlyArray<() => BuiltQuestion> = [
  buildMinOverlap,
  buildMaxOverlap,
  buildUnion,
  buildExactlyOne,
  buildNeither,
];

/* --------------------------- component ------------------------- */

export default function SetTheoryPractice() {
  const navigate = useNavigate();

  const [q, setQ] = useState<BuiltQuestion>(() => pick(BUILDERS)());
  const [sel, setSel] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const correct = useMemo(() => q.choices[q.answerIndex], [q]);
  const isCorrect = submitted && sel === q.answerIndex;

  const next = () => {
    setQ(pick(BUILDERS)());
    setSel(null);
    setSubmitted(false);
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Set Theory / Venn Diagrams</h1>
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg bg-white/10 hover:bg-white/15 px-3 py-1.5 text-sm"
        >
          Back
        </button>
      </div>

      <div className="rounded-2xl bg-[#121419] ring-1 ring-white/10 p-5">
        <div className="text-xs uppercase tracking-wide text-white/50 mb-2">
          {q.tag}
        </div>
        <p className="text-white/90 mb-4">{q.stem}</p>

        <div className="grid sm:grid-cols-2 gap-2">
          {q.choices.map((c, i) => {
            const active = sel === i;
            const showCorrect = submitted && i === q.answerIndex;
            const showWrong = submitted && active && i !== q.answerIndex;

            return (
              <button
                key={i}
                onClick={() => !submitted && setSel(i)}
                className={[
                  "text-left rounded-lg px-3 py-2 ring-1 transition",
                  active && !submitted
                    ? "ring-emerald-500/60 bg-emerald-500/10"
                    : "ring-white/10 hover:bg-white/5",
                  showCorrect && "ring-emerald-500 bg-emerald-500/15",
                  showWrong && "ring-red-500 bg-red-500/10",
                ].join(" ")}
              >
                {fmt(c)}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => setSubmitted(true)}
            disabled={sel === null || submitted}
            className={`rounded-lg px-4 py-2 font-medium transition ${
              sel === null || submitted
                ? "bg-white/10 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-500"
            }`}
          >
            Check
          </button>

          <button
            onClick={next}
            className="rounded-lg px-4 py-2 bg-white/10 hover:bg-white/15 transition"
          >
            Next
          </button>

          {submitted && (
            <span className={`text-sm ml-2 ${isCorrect ? "text-emerald-400" : "text-red-400"}`}>
              {isCorrect ? "Correct!" : `Answer: ${fmt(correct)}`}
            </span>
          )}
        </div>

        {submitted && (
          <div className="mt-4 rounded-lg bg-black/20 p-3 text-sm text-white/80">
            <div className="font-medium mb-1">Why?</div>
            <p className="leading-relaxed">{q.explanation}</p>
          </div>
        )}
      </div>

      <p className="text-white/50 text-xs mt-4">
        New numbers each time — generated so all quantities are valid and integers.
      </p>
    </div>
  );
}
