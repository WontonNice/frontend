// src/domain/exams/lib/scoring.ts
 export type AnswerValue =
   | number
   | string
   | Array<number | string>
   | Record<string, string | number | undefined>;
export type AnswerMap = Record<string, AnswerValue | undefined>;

export type QuestionLike = {
  id: string;
  kind?: string;               // "single_select" | "multi_select" | "drag_to_bins" | "table_match" | "cloze_drag" | ...
  // Common fields occasionally seen in your codebase:
  answerIndex?: number;        // single-select
  correctIndex?: number;       // alt single-select
  correctIndices?: number[];   // multi-select
  correctBins?: Record<string, string>;   // optionId -> binId
  correctCells?: Record<string, string>;  // rowId   -> optionId
  correctBlanks?: Record<string, string>; // blankId -> tokenId/optionId
  points?: number;             // optional weighting
  sectionType?: "reading" | "math" | string;
};

export type ScoreDetail =
  | { type: "single_select"; user?: number | null; correct?: number | null }
  | { type: "multi_select"; user: number[]; correct: number[] }
  | { type: "drag_to_bins"; user: Record<string,string|undefined>; correct: Record<string,string> }
  | { type: "table_match";  user: Record<string,string|undefined>; correct: Record<string,string> }
  | { type: "cloze_drag";   user: Record<string,string|undefined>; correct: Record<string,string> }
  | { type: "unknown";      note: string };

export type ItemScore = {
  questionId: string;
  correct: boolean | null;     // null => unscored (no key)
  pointsEarned: number;
  maxPoints: number;
  detail: ScoreDetail;
};

export type SectionScore = {
  sectionId?: string;
  sectionType?: string;
  items: ItemScore[];
  correctCount: number;
  totalScored: number; // items with an answer key
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

// ---- helpers

const numAsc = (a: number, b: number) => a - b;

const eqArrayNums = (a: number[] = [], b: number[] = []) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
};

// ---- per-interaction scoring

export function scoreSingleSelect(q: QuestionLike, user: unknown): ItemScore {
  const max = q.points ?? 1;
  const key = typeof q.correctIndex === "number" ? q.correctIndex
            : typeof q.answerIndex  === "number" ? q.answerIndex
            : undefined;
  const userIdx = typeof user === "number" ? user : null;
  const canScore = typeof key === "number";
  const isCorrect = canScore ? userIdx === key : null;
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
  const key = Array.isArray(q.correctIndices) ? q.correctIndices.slice().sort(numAsc) : undefined;
  const userArr = Array.isArray(user) ? (user as number[]).slice().sort(numAsc) : [];
  const canScore = Array.isArray(key);
  const isCorrect = canScore ? eqArrayNums(userArr, key!) : null;
  return {
    questionId: q.id,
    correct: isCorrect,
    pointsEarned: isCorrect ? max : 0,
    maxPoints: max,
    detail: { type: "multi_select", user: userArr, correct: key ?? [] },
  };
}

export function scoreDragToBins(q: QuestionLike, user: unknown): ItemScore {
  const max = q.points ?? 1;
  const key = q.correctBins ?? {};
  const userMap = (user && typeof user === "object") ? (user as Record<string,string|undefined>) : {};
  const allKeys = new Set([...Object.keys(key), ...Object.keys(userMap)]);
  let ok = true;
  for (const k of allKeys) {
    if ((userMap[k] ?? null) !== (key[k] ?? null)) { ok = false; break; }
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
  const key = q.correctCells ?? {};
  const userMap = (user && typeof user === "object") ? (user as Record<string,string|undefined>) : {};
  const rowIds = new Set([...Object.keys(key), ...Object.keys(userMap)]);
  let ok = true;
  for (const r of rowIds) {
    if ((userMap[r] ?? null) !== (key[r] ?? null)) { ok = false; break; }
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
  const key = q.correctBlanks ?? {};
  const userMap = (user && typeof user === "object") ? (user as Record<string,string|undefined>) : {};
  const blanks = new Set([...Object.keys(key), ...Object.keys(userMap)]);
  let ok = true;
  for (const b of blanks) {
    if ((userMap[b] ?? null) !== (key[b] ?? null)) { ok = false; break; }
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

// ---- router function

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

// ---- exam-level aggregation

export function scoreExam(
  questions: QuestionLike[],
  answers: AnswerMap,
  sectionOf?: (qId: string) => { id?: string; type?: string } | undefined
): ExamScore {
  const items = questions.map(q => scoreQuestion(q, answers[q.id]));
  const correctCount = items.filter(i => i.correct === true).length;
  const totalScored = items.filter(i => i.correct !== null).length;
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
