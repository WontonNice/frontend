// src/domain/exams/lib/scoring.ts
// Shared scoring utilities for Runner/Results.
// Self-contained (no app-specific imports) and tolerant to numeric/string answers.

//// Value shapes ///////////////////////////////////////////////////////////////

type Scalar = string | number;
type ArrayValue = Array<Scalar>;
type MapValue = Record<string, Scalar | undefined>;

export type AnswerValue = Scalar | ArrayValue | MapValue;
export type AnswerMap = Record<string, AnswerValue | undefined>;

//// Question shape we can score ///////////////////////////////////////////////

export type QuestionLike = {
  id: string;                     // globalId recommended (e.g., "secId:qId")
  kind?: string;                  // "single_select" | "multi_select" | "drag_to_bins" | "table_match" | "cloze_drag" | ...
  // Single-select:
  answerIndex?: number;           // alt key name (legacy)
  correctIndex?: number;          // canonical single-select key
  // Multi-select:
  correctIndices?: Array<number | string>;
  // Map-shaped interactions:
  correctBins?: Record<string, Scalar>;   // optionId -> binId
  correctCells?: Record<string, Scalar>;  // rowId   -> optionId
  correctBlanks?: Record<string, Scalar>; // blankId -> tokenId/optionId
  // Optional weighting:
  points?: number;
  // Optional grouping info for aggregation:
  sectionType?: string;           // e.g., "reading" | "ela_a" | "ela_b" | "math"
};

//// Score types ////////////////////////////////////////////////////////////////

export type ScoreDetail =
  | { type: "single_select"; user?: number | null; correct?: number | null }
  | { type: "multi_select";  user: number[]; correct: number[] }
  | { type: "drag_to_bins";  user: MapValue; correct: Record<string, Scalar> }
  | { type: "table_match";   user: MapValue; correct: Record<string, Scalar> }
  | { type: "cloze_drag";    user: MapValue; correct: Record<string, Scalar> }
  | { type: "unknown";       note: string };

export type ItemScore = {
  questionId: string;
  correct: boolean | null;  // null => unscored (no key)
  pointsEarned: number;
  maxPoints: number;
  detail: ScoreDetail;
};

export type SectionScore = {
  sectionId?: string;
  sectionType?: string;
  items: ItemScore[];
  correctCount: number;
  totalScored: number; // items with a key
  pointsEarned: number;
  pointsPossible: number;
};

export type ExamScore = {
  items: ItemScore[];
  sections?: SectionScore[];
  correctCount: number;
  totalScored: number;
  pointsEarned: number;
  pointsPossible: number;
};

//// Helpers ///////////////////////////////////////////////////////////////////

const toNum = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const numAsc = (a: number, b: number) => a - b;

const eqArrayNums = (a: number[] = [], b: number[] = []) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
};

const norm = (v: unknown) => (v == null ? "" : String(v));

//// Per-interaction scoring ////////////////////////////////////////////////////

export function scoreSingleSelect(q: QuestionLike, user: unknown): ItemScore {
  const max = q.points ?? 1;
  const key =
    typeof q.correctIndex === "number" ? q.correctIndex :
    typeof q.answerIndex  === "number" ? q.answerIndex  :
    undefined;

  const userIdx = toNum(user);
  const canScore = typeof key === "number";
  const isCorrect = canScore ? (userIdx != null && userIdx === key) : null;

  return {
    questionId: q.id,
    correct: isCorrect,
    pointsEarned: isCorrect ? max : 0,
    maxPoints: max,
    detail: { type: "single_select", user: userIdx, correct: key ?? null },
  };
}

export function scoreMultiSelect(q: QuestionLike, user: unknown): ItemScore {
  const max = q.points ?? 1;

  const keyNums: number[] = Array.isArray(q.correctIndices)
    ? q.correctIndices
        .map(toNum)
        .filter((n): n is number => n != null)
        .slice()
        .sort(numAsc)
    : [];

  const userNums: number[] = Array.isArray(user)
    ? (user as Array<number | string>)
        .map(toNum)
        .filter((n): n is number => n != null)
        .slice()
        .sort(numAsc)
    : [];

  const canScore = keyNums.length > 0;
  const isCorrect = canScore ? eqArrayNums(userNums, keyNums) : null;

  return {
    questionId: q.id,
    correct: isCorrect,
    pointsEarned: isCorrect ? max : 0,
    maxPoints: max,
    detail: { type: "multi_select", user: userNums, correct: keyNums },
  };
}

export function scoreDragToBins(q: QuestionLike, user: unknown): ItemScore {
  const max = q.points ?? 1;
  const key: Record<string, Scalar> = q.correctBins ?? {};
  const userMap: MapValue =
    user && typeof user === "object" ? (user as MapValue) : {};

  const allKeys = new Set([...Object.keys(key), ...Object.keys(userMap)]);
  let ok = true;
  for (const k of allKeys) {
    if (norm(userMap[k]) !== norm(key[k])) { ok = false; break; }
  }
  const isCorrect = Object.keys(key).length ? ok : null;

  return {
    questionId: q.id,
    correct: isCorrect,
    pointsEarned: isCorrect ? max : 0,
    maxPoints: max,
    detail: { type: "drag_to_bins", user: userMap, correct: key },
  };
}

export function scoreTableMatch(q: QuestionLike, user: unknown): ItemScore {
  const max = q.points ?? 1;
  const key: Record<string, Scalar> = q.correctCells ?? {};
  const userMap: MapValue =
    user && typeof user === "object" ? (user as MapValue) : {};

  const rowIds = new Set([...Object.keys(key), ...Object.keys(userMap)]);
  let ok = true;
  for (const r of rowIds) {
    if (norm(userMap[r]) !== norm(key[r])) { ok = false; break; }
  }
  const isCorrect = Object.keys(key).length ? ok : null;

  return {
    questionId: q.id,
    correct: isCorrect,
    pointsEarned: isCorrect ? max : 0,
    maxPoints: max,
    detail: { type: "table_match", user: userMap, correct: key },
  };
}

export function scoreClozeDrag(q: QuestionLike, user: unknown): ItemScore {
  const max = q.points ?? 1;
  const key: Record<string, Scalar> = q.correctBlanks ?? {};
  const userMap: MapValue =
    user && typeof user === "object" ? (user as MapValue) : {};

  const blanks = new Set([...Object.keys(key), ...Object.keys(userMap)]);
  let ok = true;
  for (const b of blanks) {
    if (norm(userMap[b]) !== norm(key[b])) { ok = false; break; }
  }
  const isCorrect = Object.keys(key).length ? ok : null;

  return {
    questionId: q.id,
    correct: isCorrect,
    pointsEarned: isCorrect ? max : 0,
    maxPoints: max,
    detail: { type: "cloze_drag", user: userMap, correct: key },
  };
}

//// Router ////////////////////////////////////////////////////////////////////

export function scoreQuestion(q: QuestionLike, user: unknown): ItemScore {
  const kind = q.kind ??
    (typeof q.correctIndex === "number" || typeof q.answerIndex === "number" ? "single_select" :
     Array.isArray(q.correctIndices) ? "multi_select" :
     q.correctBins ? "drag_to_bins" :
     q.correctCells ? "table_match" :
     q.correctBlanks ? "cloze_drag" : "unknown");

  switch (kind) {
    case "single_select": return scoreSingleSelect(q, user);
    case "multi_select":  return scoreMultiSelect(q, user);
    case "drag_to_bins":  return scoreDragToBins(q, user);
    case "table_match":   return scoreTableMatch(q, user);
    case "cloze_drag":    return scoreClozeDrag(q, user);
    default:
      return {
        questionId: q.id,
        correct: null,
        pointsEarned: 0,
        maxPoints: q.points ?? 0,
        detail: { type: "unknown", note: "No key found for this item." },
      };
  }
}

//// Exam-level aggregation /////////////////////////////////////////////////////

export function scoreExam(
  questions: QuestionLike[],
  answers: AnswerMap,
  sectionOf?: (qId: string) => { id?: string; type?: string } | undefined
): ExamScore {
  const items = questions.map((q) => scoreQuestion(q, answers[q.id]));
  const correctCount = items.filter((i) => i.correct === true).length;
  const totalScored = items.filter((i) => i.correct !== null).length;
  const pointsEarned = items.reduce((s, i) => s + i.pointsEarned, 0);
  const pointsPossible = items.reduce((s, i) => s + i.maxPoints, 0);

  // Optional: aggregate by section if a lookup is provided
  const sectionBuckets = new Map<string, SectionScore>();
  if (sectionOf) {
    for (const it of items) {
      const sec = sectionOf(it.questionId) ?? {};
      const key = (sec.id ?? sec.type ?? "unknown") as string;
      if (!sectionBuckets.has(key)) {
        sectionBuckets.set(key, {
          sectionId: sec.id,
          sectionType: sec.type,
          items: [],
          correctCount: 0,
          totalScored: 0,
          pointsEarned: 0,
          pointsPossible: 0,
        });
      }
      const agg = sectionBuckets.get(key)!;
      agg.items.push(it);
      if (it.correct === true) agg.correctCount += 1;
      if (it.correct !== null) agg.totalScored += 1;
      agg.pointsEarned += it.pointsEarned;
      agg.pointsPossible += it.maxPoints;
    }
  }

  return {
    items,
    sections: sectionBuckets.size ? Array.from(sectionBuckets.values()) : undefined,
    correctCount,
    totalScored,
    pointsEarned,
    pointsPossible,
  };
}