// src/components/Exams/ExamResultsPage.tsx
import { useMemo } from "react";
import type { Exam } from "../../types/exams";
import type { AnswerMap } from "./ExamSharedTypes";
import { scoreExam, scoreQuestion } from "./scoring";
import { percent as toPercent } from "./format";

/**
 * Updated Results page
 * - Uses shared scoring helpers for ALL sections, including rev/edit A (ela_a) and rev/edit B (ela_b).
 * - Avoids TS2367 by widening the local section type for comparisons in this file.
 */

type InteractionType =
  | "single_select"
  | "multi_select"
  | "drag_to_bins"
  | "table_match"
  | "cloze_drag";

type Props = {
  exam: Exam;
  /** flattened items from Runner (has sectionId, globalId, interactionType, answer keys, etc.) */
  items: Array<any>;
  /** user answers keyed by globalId like "sectionId:questionId" */
  answers: AnswerMap;
  /** reading questions parsed from passage YAML, keyed by section.id */
  readingQs: Record<string, any[] | undefined>;
  /** e.g. "top-14" if a global app bar is showing */
  stickyTopClass?: string;
};

type ResultRow = {
  globalId: string;
  kind: InteractionType;
  isScored: boolean;
  isUnanswered: boolean;
  isCorrect: boolean | null;
  user?: number | number[] | Record<string, string | undefined>;
  correct?: number | number[] | Record<string, string>;
  displayGroup: string; // Reading / Math
  sectionType: "reading" | "math";
  globalNumber: number; // 1-based index across the whole test
};

/** Locally widen the section type so we can compare against 'ela_a'/'ela_b' without TS2367 */
type SectionKindAny = "reading" | "math" | "ela_a" | "ela_b" | (string & {});

export default function ExamResultsPage({
  exam,
  items,
  answers,
  readingQs,
  stickyTopClass = "top-14",
}: Props) {
  // Quick lookup for item metadata by globalId
  const itemsById = useMemo(() => {
    const map: Record<string, any> = {};
    items.forEach((it) => (map[it.globalId] = it));
    return map;
  }, [items]);

  // ---- Build detailed rows (per-question verdicts) using shared scorer ----
  const results = useMemo(() => {
    const rows: ResultRow[] = [];
    let correctCount = 0;
    let scoredCount = 0;
    let unansweredCountLocal = 0;

    // roll-up by broad group
    const sectionTotals = {
      reading: { correct: 0, scored: 0 },
      math: { correct: 0, scored: 0 },
    };

    let g = 0; // global counter

    for (const sec of exam.sections) {
      const secTypeAny = sec.type as SectionKindAny;

      // Map ela_a and ela_b into the Reading display bucket
      const displayGroup = secTypeAny === "math" ? "Math" : "Reading";
      const sectionType = (secTypeAny === "math" ? "math" : "reading") as "math" | "reading";

      // Source of question objects varies by section family
      const qList: any[] =
        secTypeAny === "reading" || secTypeAny === "ela_a"
          ? (readingQs[sec.id] ?? [])
          : secTypeAny === "ela_b"
          ? items
              .filter((it) => it.sectionId === sec.id && !it.isIntro && !it.isEnd)
              .map((it) => ({
                id: it.globalId.split(":")[1],
                type: (it.interactionType as InteractionType) ?? "single_select",
                // carry answer keys from items if present
                answerIndex: it.answerIndex,
                correctIndex: it.correctIndex,
                correctIndices: it.correctIndices,
                correctBins: it.correctBins,
                correctCells: it.correctCells,
                blanks: it.blanks,
                points: (it as any).points,
              }))
          : (sec.questions ?? []);

      for (const q of qList) {
        g++;
        const globalId = `${sec.id}:${q.id}`;
        const itemMeta = itemsById[globalId] ?? {};

        const kind: InteractionType = (q?.type ?? itemMeta?.interactionType ?? "single_select") as InteractionType;

        // Build a lightweight question-like object for the scorer with fallbacks to item metadata
        const blanks = (q as any)?.blanks ?? itemMeta?.blanks;
        const correctBlanks =
          (q as any)?.correctBlanks ??
          (blanks && blanks[0]?.id && blanks[0]?.correctOptionId
            ? { [blanks[0].id]: blanks[0].correctOptionId }
            : undefined);

        const qLike = {
          id: globalId,
          kind,
          answerIndex: (q as any)?.answerIndex ?? itemMeta?.answerIndex,
          correctIndex: (q as any)?.correctIndex ?? itemMeta?.correctIndex,
          correctIndices: (q as any)?.correctIndices ?? itemMeta?.correctIndices,
          correctBins: (q as any)?.correctBins ?? itemMeta?.correctBins,
          correctCells: (q as any)?.correctCells ?? itemMeta?.correctCells,
          correctBlanks,
          points: (q as any)?.points ?? itemMeta?.points,
          sectionType: secTypeAny as any,
        };

        const userVal = answers[globalId];
        const scored = scoreQuestion(qLike as any, userVal as any);

        const isScored = scored.correct !== null;
        const isUnanswered =
          userVal == null ||
          (Array.isArray(userVal) && userVal.length === 0) ||
          (typeof userVal === "object" && Object.keys(userVal as Record<string, any>).length === 0);

        if (isScored) {
          scoredCount++;
          sectionTotals[sectionType].scored += 1;
          if (isUnanswered) {
            unansweredCountLocal++;
          } else if (scored.correct === true) {
            correctCount++;
            sectionTotals[sectionType].correct += 1;
          }
        } else if (isUnanswered) {
          unansweredCountLocal++;
        }

        rows.push({
          globalId,
          kind,
          isScored,
          isUnanswered,
          isCorrect: scored.correct,
          user:
            Array.isArray(userVal) || typeof userVal === "number"
              ? (userVal as any)
              : typeof userVal === "object"
              ? (userVal as any)
              : undefined,
          correct:
            (kind === "single_select"
              ? (qLike as any).correctIndex ?? (qLike as any).answerIndex
              : kind === "multi_select"
              ? (qLike as any).correctIndices
              : kind === "drag_to_bins"
              ? (qLike as any).correctBins
              : kind === "table_match"
              ? (qLike as any).correctCells
              : kind === "cloze_drag"
              ? (qLike as any).correctBlanks
              : undefined) as any,
          displayGroup,
          sectionType,
          globalNumber: g,
        });
      }
    }

    return {
      rows,
      correctCount,
      unansweredCount: unansweredCountLocal,
      scoredCount,
      sectionTotals,
    };
  }, [exam, items, readingQs, answers, itemsById]);

  // ---- Topline aggregate (points & percent) from shared scorer for ALL sections ----
  const _scoreAgg = useMemo(() => {
    const allQuestions: any[] = [];
    for (const sec of exam.sections) {
      const secTypeAny = sec.type as SectionKindAny;
      const secId = sec.id;

      const qList =
        secTypeAny === "reading" || secTypeAny === "ela_a"
          ? (readingQs[sec.id] ?? [])
          : secTypeAny === "ela_b"
          ? items
              .filter((it) => it.sectionId === secId && !it.isIntro && !it.isEnd)
              .map((it) => ({
                id: it.globalId.split(":")[1],
                kind: it.interactionType,
                answerIndex: it.answerIndex,
                correctIndex: it.correctIndex,
                correctIndices: it.correctIndices,
                correctBins: it.correctBins,
                correctCells: it.correctCells,
                correctBlanks:
                  it.blanks && it.blanks[0]?.id && it.blanks[0]?.correctOptionId
                    ? { [it.blanks[0].id]: it.blanks[0].correctOptionId }
                    : undefined,
                points: (it as any).points,
              }))
          : (sec.questions ?? []);

      for (const q of qList as any[]) {
        const gid = `${sec.id}:${q.id}`;
        const itemMeta = (itemsById as any)[gid] ?? {};
        const blanks = (q as any)?.blanks ?? itemMeta?.blanks;
        const correctBlanks =
          (q as any)?.correctBlanks ??
          (blanks && blanks[0]?.id && blanks[0]?.correctOptionId
            ? { [blanks[0].id]: blanks[0].correctOptionId }
            : undefined);

        allQuestions.push({
          id: gid,
          kind: (q?.type ?? itemMeta?.interactionType ?? (q as any)?.kind) as string | undefined,
          answerIndex: (q as any)?.answerIndex ?? itemMeta?.answerIndex,
          correctIndex: (q as any)?.correctIndex ?? itemMeta?.correctIndex,
          correctIndices: (q as any)?.correctIndices ?? itemMeta?.correctIndices,
          correctBins: (q as any)?.correctBins ?? itemMeta?.correctBins,
          correctCells: (q as any)?.correctCells ?? itemMeta?.correctCells,
          correctBlanks,
          points: (q as any)?.points ?? itemMeta?.points,
          sectionType: secTypeAny as any,
        });
      }
    }
    return scoreExam(allQuestions, answers, (qid) => {
      const sectionId = qid.split(":")[0];
      const sec = exam.sections.find((s) => s.id === sectionId);
      return { id: sectionId, type: (sec?.type as any) };
    });
  }, [exam, items, readingQs, answers, itemsById]);

  // Reading vs Math tiles (treat ela_a / ela_b as Reading in display)
  const readingTotals = useMemo(() => {
    const r = { correct: 0, scored: 0 };
    for (const sec of _scoreAgg.sections ?? []) {
      if (sec.sectionType === "reading" || sec.sectionType === "ela_a" || sec.sectionType === "ela_b") {
        r.correct += sec.correctCount;
        r.scored += sec.totalScored;
      }
    }
    return r;
  }, [_scoreAgg.sections]);

  const mathTotals = useMemo(() => {
    const m = { correct: 0, scored: 0 };
    for (const sec of _scoreAgg.sections ?? []) {
      if (sec.sectionType === "math") {
        m.correct += sec.correctCount;
        m.scored += sec.totalScored;
      }
    }
    return m;
  }, [_scoreAgg.sections]);

  const percent = toPercent(_scoreAgg.pointsEarned, _scoreAgg.pointsPossible);

  // ---- PDF: compact score report
  const downloadReportPdf = async () => {
    let jsPDFMod: any = null;
    try {
      jsPDFMod = await import("jspdf");
    } catch {
      try {
        // @ts-ignore
        jsPDFMod = await import(/* @vite-ignore */ "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js");
      } catch {
        alert("Could not load PDF generator. Please install 'jspdf' (npm i jspdf).");
        return;
      }
    }
    const { jsPDF } = jsPDFMod;
    const doc = new jsPDF({ unit: "pt", format: "letter" });

    const marginX = 48;
    const pageWidth = doc.internal.pageSize.getWidth();
    const usableWidth = pageWidth - marginX * 2;
    let y = 56;

    const addLine = (text: string, opts: { bold?: boolean } = {}) => {
      const lines = doc.splitTextToSize(text, usableWidth);
      doc.setFont("helvetica", opts.bold ? "bold" : "normal");
      for (const line of lines) {
        doc.text(line, marginX, y);
        y += 18;
      }
    };

    addLine(exam.title, { bold: true });
    addLine(`Overall: ${_scoreAgg.correctCount} correct out of ${_scoreAgg.totalScored} scored · ${percent}`);
    addLine(`Reading: ${readingTotals.correct}/${readingTotals.scored}  ·  Math: ${mathTotals.correct}/${mathTotals.scored}`);

    y += 10;
    addLine("Per-question (scored only):", { bold: true });
    for (const row of results.rows) {
      if (!row.isScored) continue;
      const verdict = row.isCorrect ? "Right" : "Wrong";
      addLine(`#${row.globalNumber}  [${row.displayGroup}]  ${verdict}`);
    }

    doc.save(`${exam.slug}-report.pdf`);
  };

  // ---- UI ----
  return (
    <div className="space-y-6">
      {/* ======= Top bar summary ======= */}
      <div className={`sticky ${stickyTopClass} z-30 full-bleed`}>
        <div className="w-full bg-white border-b border-gray-300 px-4 py-2 shadow-sm">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="text-lg font-semibold">{exam.title}</div>
            <div className="text-sm">
              {_scoreAgg.correctCount}/{_scoreAgg.totalScored} scored · {percent}
            </div>
          </div>
        </div>
      </div>

      {/* ======= Main ======= */}
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-4xl font-bold">Your Score</h2>
          <div className="mt-3 text-xl">
            <span className="font-semibold">{_scoreAgg.correctCount}</span> correct out of{" "}
            <span className="font-semibold">{_scoreAgg.totalScored}</span> scored questions ·{" "}
            <span className="font-semibold">{percent}</span>
          </div>

        {/* Tiles: Reading / Math (ela_a / ela_b rolled into Reading) */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto text-sm">
            <div className="rounded-md border p-3 bg-gray-50">
              <div className="text-gray-600">Reading</div>
              <div className="text-lg font-semibold">
                {readingTotals.correct} / {readingTotals.scored}
              </div>
            </div>
            <div className="rounded-md border p-3 bg-gray-50">
              <div className="text-gray-600">Math</div>
              <div className="text-lg font-semibold">
                {mathTotals.correct} / {mathTotals.scored}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={downloadReportPdf}
              className="inline-flex items-center gap-2 rounded-md bg-slate-700 hover:bg-slate-800 text-white px-4 py-2"
            >
              Download PDF Report
            </button>
          </div>
        </div>

        {/* Results table */}
        <div className="rounded-2xl bg-white shadow-md border border-gray-200">
          <div className="p-4 border-b font-semibold">Question Results</div>
          <div className="p-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">Section</th>
                  <th className="py-2 pr-4">Kind</th>
                  <th className="py-2 pr-4">Scored</th>
                  <th className="py-2 pr-4">Correct</th>
                </tr>
              </thead>
              <tbody>
                {results.rows.map((row) => (
                  <tr key={row.globalId} className="border-t">
                    <td className="py-2 pr-4">{row.globalNumber}</td>
                    <td className="py-2 pr-4">{row.displayGroup}</td>
                    <td className="py-2 pr-4">{row.kind}</td>
                    <td className="py-2 pr-4">{row.isScored ? "Yes" : "—"}</td>
                    <td className="py-2 pr-4">
                      {row.isScored ? (row.isCorrect ? "Right" : "Wrong") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        .full-bleed { margin-left: calc(50% - 50vw); margin-right: calc(50% - 50vw); width: 100vw; }
      `}</style>
    </div>
  );
}

export { ExamResultsPage };