// src/components/ExamResultsPage.tsx
import { useMemo } from "react";
import type { Exam } from "../../types/exams";
import type { DragAnswer as DragMap, TableAnswer } from "./techenhanced/types";
import type { AnswerMap } from "./ExamSharedTypes";

/** Local types (kept minimal to avoid coupling) */
type InteractionType =
  | "single_select"
  | "multi_select"
  | "drag_to_bins"
  | "table_match"
  | "cloze_drag";

type IdLabel = { id: string; label: string };
type RowHdr  = { id: string; header: string };

/** 🔧 Extended so we can score from items (used for ELA B) */
type FlatItemLike = {
  globalId: string;
  sectionId: string;
  sectionTitle: string;
  sectionType: "reading" | "math" | string;
  stemMarkdown?: string;

  // MC
  choices?: string[];
  answerIndex?: number;
  correctIndices?: number[];

  // Drag-to-bins
  bins?: IdLabel[];
  options?: IdLabel[];
  correctBins?: Record<string, string>;

  // Table-match
  tableRows?: RowHdr[];
  tableOptions?: IdLabel[];
  correctCells?: Record<string, string>;

  // Cloze-drag (single blank supported here)
  blanks?: { id: string; correctOptionId: string }[];

  interactionType?: InteractionType | string;
  isIntro?: boolean;
  isEnd?: boolean;
};

type SectionTotals = {
  reading: { correct: number; scored: number };
  math: { correct: number; scored: number };
};

type ResultRow = {
  globalId: string;
  globalNumber: number;
  displayGroup: string;        // "Reading" | "Mathematics"
  sectionType: "reading" | "math";
  kind: InteractionType;
  isScored: boolean;
  isUnanswered: boolean;
  isCorrect: boolean | null;   // null when not scored
  user?: number | number[] | DragMap | TableAnswer;
  correct?: number | number[] | Record<string, string> | undefined;
  choices?: string[];
};

type Props = {
  exam: Exam;
  items: FlatItemLike[];
  answers: AnswerMap;
  /** reading(+) questions loaded from passage YAML; keyed by section.id */
  readingQs: Record<string, any[] | undefined>;
  /** e.g. "top-14" when a global bar is visible */
  stickyTopClass?: string;
};

const groupLabel = (type: string) => {
  if (type === "reading") return "Reading";
  if (type === "math") return "Mathematics";
  if (type === "ela_a") return "Reading";   // show with Reading
  if (type === "ela_b") return "Reading";   // show with Reading
  return type.charAt(0).toUpperCase() + type.slice(1);
};
const numAsc = (x: number, y: number) => x - y;
const isEqualNumArrays = (a?: number[], b?: number[]) =>
  Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]);

function ExamResultsPage({
  exam,
  items,
  answers,
  readingQs,
  stickyTopClass = "top-14",
}: Props) {
  const itemsById = useMemo(() => {
    const map: Record<string, FlatItemLike> = {};
    items.forEach((it) => (map[it.globalId] = it));
    return map;
  }, [items]);

  const results = useMemo(() => {
    const rows: ResultRow[] = [];
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCountLocal = 0;
    let scoredCount = 0;

    const secTotals: SectionTotals = {
      reading: { correct: 0, scored: 0 },
      math: { correct: 0, scored: 0 },
    };

    const getCorrectIndex = (q: any): number | undefined =>
      typeof q?.answerIndex === "number" ? q.answerIndex : undefined;

    const getCorrectIndices = (q: any): number[] | undefined =>
      Array.isArray(q?.correctIndices) ? q.correctIndices.slice().sort(numAsc) : undefined;

    // Build a question list per section:
    // - reading + ela_a from readingQs
    // - ela_b from flattened items (so we can use copied answer keys)
    // - math and any other sections from sec.questions
    let g = 0;
    exam.sections.forEach((sec: any) => {
      const displayGroup = groupLabel(sec.type);
      const sectionType = (sec.type === "math" ? "math" : "reading") as "reading" | "math";

      const qList: any[] =
        (sec.type === "reading" || sec.type === "ela_a")
          ? (readingQs[sec.id] ?? [])
          : (sec.type === "ela_b")
              ? items
                  .filter((it) => it.sectionId === sec.id && !it.isIntro && !it.isEnd)
                  .map((it) => ({
                    id: it.globalId.split(":")[1],
                    type: (it.interactionType as InteractionType) ?? "single_select",
                    // carry answer keys from items if present
                    choices: it.choices,
                    answerIndex: it.answerIndex,
                    correctIndices: it.correctIndices,
                    correctBins: it.correctBins,
                    correctCells: it.correctCells,
                    blanks: it.blanks,
                  }))
              : (sec.questions ?? []);

      (qList as any[]).forEach((q: any) => {
        const globalId = `${sec.id}:${q.id}`;
        const kind: InteractionType = (q?.type ?? itemsById[globalId]?.interactionType ?? "single_select") as InteractionType;
        const choices = (q as any).choices as string[] | undefined;

        const pushRow = (
          row: Omit<ResultRow, "displayGroup" | "sectionType" | "globalNumber">
        ) => {
          rows.push({
            ...row,
            globalNumber: g + 1,
            displayGroup,
            sectionType,
          });
        };

        if (kind === "multi_select") {
          // 🔧 fallback to itemsById if the question object doesn't include correctIndices
          const correct =
            getCorrectIndices(q) ??
            (itemsById[globalId]?.correctIndices
              ? itemsById[globalId]!.correctIndices!.slice().sort(numAsc)
              : undefined);

          const user = (answers[globalId] as number[] | undefined) ?? [];
          const isScored = Array.isArray(correct);
          const isUnanswered = user.length === 0;
          const isCorrect = isScored
            ? (!isUnanswered &&
               isEqualNumArrays(user.slice().sort(numAsc), (correct ?? []).slice().sort(numAsc)))
            : null;

          if (isScored) {
            scoredCount++;
            secTotals[sectionType].scored += 1;
            if (isUnanswered) {
              unansweredCountLocal++;
            } else if (isCorrect) {
              correctCount++;
              secTotals[sectionType].correct += 1;
            } else {
              incorrectCount++;
            }
          } else if (isUnanswered) {
            unansweredCountLocal++;
          }

          pushRow({ globalId, kind, isScored, isUnanswered, isCorrect, user, correct, choices });

        } else if (kind === "drag_to_bins") {
          const key = (q?.correctBins ?? itemsById[globalId]?.correctBins) as Record<string, string> | undefined;
          const user = (answers[globalId] as DragMap) ?? {};
          const hasAny = Object.keys(user).length > 0;
          const isScored = !!key;
          const isUnanswered = !hasAny;
          const isCorrect = isScored
            ? (hasAny &&
               Object.keys(key!).length === Object.keys(user).length &&
               Object.entries(key!).every(([opt, bin]) => user[opt] === bin))
            : null;

          if (isScored) {
            scoredCount++;
            secTotals[sectionType].scored += 1;
            if (isUnanswered) {
              unansweredCountLocal++;
            } else if (isCorrect) {
              correctCount++;
              secTotals[sectionType].correct += 1;
            } else {
              incorrectCount++;
            }
          } else if (isUnanswered) {
            unansweredCountLocal++;
          }

          pushRow({ globalId, kind, isScored, isUnanswered, isCorrect, user, correct: key });

        } else if (kind === "table_match") {
          const key = (q?.correctCells ?? itemsById[globalId]?.correctCells) as Record<string, string> | undefined;
          const user = (answers[globalId] as TableAnswer) ?? {};
          const hasAny = Object.keys(user).length > 0;
          const isScored = !!key;
          const isUnanswered = !hasAny;
          const isCorrect = isScored
            ? (hasAny &&
               Object.keys(key!).length === Object.keys(user).length &&
               Object.entries(key!).every(([rowId, optId]) => user[rowId] === optId))
            : null;

          if (isScored) {
            scoredCount++;
            secTotals[sectionType].scored += 1;
            if (isUnanswered) {
              unansweredCountLocal++;
            } else if (isCorrect) {
              correctCount++;
              secTotals[sectionType].correct += 1;
            } else {
              incorrectCount++;
            }
          } else if (isUnanswered) {
            unansweredCountLocal++;
          }

          pushRow({ globalId, kind, isScored, isUnanswered, isCorrect, user, correct: key });

        } else if (kind === "cloze_drag") {
          // single-blank scoring
          const blankId  = q?.blanks?.[0]?.id ?? itemsById[globalId]?.blanks?.[0]?.id;
          const correct  = q?.blanks?.[0]?.correctOptionId ?? itemsById[globalId]?.blanks?.[0]?.correctOptionId;
          const userObj  = (answers[globalId] as Record<string, string> | undefined) ?? {};
          const hasAny   = userObj && Object.keys(userObj).length > 0;
          const isScored = !!blankId && !!correct;
          const isUnanswered = !hasAny;
          const isCorrect = isScored ? (hasAny && userObj[blankId!] === correct) : null;

          if (isScored) {
            scoredCount++;
            secTotals[sectionType].scored += 1;
            if (isUnanswered) {
              unansweredCountLocal++;
            } else if (isCorrect) {
              correctCount++;
              secTotals[sectionType].correct += 1;
            } else {
              incorrectCount++;
            }
          } else if (isUnanswered) {
            unansweredCountLocal++;
          }

          pushRow({
            globalId,
            kind,
            isScored,
            isUnanswered,
            isCorrect,
            user: userObj,
            correct: { [blankId ?? "blank"]: correct }
          });

        } else {
          // single_select (default)
          const correct =
            getCorrectIndex(q) ??
            (typeof itemsById[globalId]?.answerIndex === "number" ? itemsById[globalId].answerIndex : undefined);
          const user = answers[globalId] as number | undefined;
          const isScored = typeof correct === "number";
          const isUnanswered = user == null;
          const isCorrect = isScored ? (!isUnanswered && user === correct) : null;

          if (isScored) {
            scoredCount++;
            secTotals[sectionType].scored += 1;
            if (isUnanswered) {
              unansweredCountLocal++;
            } else if (isCorrect) {
              correctCount++;
              secTotals[sectionType].correct += 1;
            } else {
              incorrectCount++;
            }
          } else if (isUnanswered) {
            unansweredCountLocal++;
          }

          pushRow({ globalId, kind, isScored, isUnanswered, isCorrect, user, correct, choices });
        }

        g++;
      });
    });

    return {
      rows,
      correctCount,
      incorrectCount,
      unansweredCount: unansweredCountLocal,
      scoredCount,
      sectionTotals: secTotals,
    };
  }, [exam, items, readingQs, answers]);

  const { correctCount, scoredCount, sectionTotals } = results;
  const percent = scoredCount ? Math.round((correctCount / scoredCount) * 100) : 0;

  // PDF generator (moved here)
  const downloadReportPdf = async () => {
    // Try local dep first; fallback to CDN
    let jsPDFMod: any = null;
    try {
      jsPDFMod = await import("jspdf");
    } catch {
      try {
        // @ts-ignore
        jsPDFMod = await import(/* @vite-ignore */ "https://cdn.skypack.dev/jspdf");
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
      for (const line of lines) {
        if (y > doc.internal.pageSize.getHeight() - 56) {
          doc.addPage();
          y = 56;
        }
        if (opts.bold) doc.setFont(undefined, "bold");
        doc.text(line, marginX, y);
        if (opts.bold) doc.setFont(undefined, "normal");
        y += 16;
      }
    };

    // Header
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text(exam.title, marginX, y);
    doc.setFont(undefined, "normal");
    y += 22;
    doc.setFontSize(12);

    // Summary
    addLine(`Overall: ${results.correctCount} correct out of ${results.scoredCount} scored`);
    const r = results.sectionTotals.reading;
    const m = results.sectionTotals.math;
    addLine(`Reading: ${r.correct}/${r.scored}  ·  Math: ${m.correct}/${m.scored}`);
    y += 8;

    // Divider
    doc.setDrawColor(180);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 14;

    // Per-question (only scored)
    const rows = results.rows;
    let currentGroup = "";

    const letter = (i?: number) => (i == null || i < 0 ? "-" : String.fromCharCode(65 + i));

    rows.forEach((row) => {
      if (!row.isScored) return;

      // find presentation item (for labels/choices)
      const item = itemsById[row.globalId];

      // Also read the original question object for labels if item is missing fields
      const [secId] = row.globalId.split(":");
      const sec = exam.sections.find((s) => s.id === secId) as any;
      const isReading = sec?.type === "reading" || sec?.type === "ela_a";
      const q =
        isReading
          ? (readingQs[secId] ?? []).find((qq: any) => `${secId}:${qq.id}` === row.globalId)
          : (sec?.questions ?? []).find((qq: any) => `${secId}:${qq.id}` === row.globalId);

      const secName = row.displayGroup;
      if (secName !== currentGroup) {
        addLine(secName, { bold: true });
        currentGroup = secName;
      }

      const stem = (item?.stemMarkdown || q?.stemMarkdown || q?.promptMarkdown || "")
        .replace(/\s+/g, " ")
        .trim();
      addLine(`Q${row.globalNumber}: ${stem || "(No prompt text)"}`);

      // Build user answer preview
      let answerStr = "—";
      if (row.kind === "single_select") {
        const i = row.user as number | undefined;
        const choices = item?.choices ?? q?.choices ?? [];
        answerStr = typeof i === "number" ? `${letter(i)}${choices[i] ? ` — ${choices[i]}` : ""}` : "—";
      } else if (row.kind === "multi_select") {
        const picks = (row.user as number[] | undefined) ?? [];
        const choices = item?.choices ?? q?.choices ?? [];
        answerStr = picks.length
          ? picks.map((i) => `${letter(i)}${choices[i] ? ` — ${choices[i]}` : ""}`).join("; ")
          : "—";
      } else if (row.kind === "drag_to_bins") {
        const user = (row.user as DragMap) || {};
        const entries = Object.entries(user as Record<string, string | undefined>);
        const optSrc: IdLabel[] = (item?.options ?? q?.options ?? []) as IdLabel[];
        const binSrc: IdLabel[] = (item?.bins ?? q?.bins ?? []) as IdLabel[];

        const optLabel = (id?: string) =>
          id ? (optSrc.find((o: IdLabel) => o.id === id)?.label ?? id) : "—";
        const binLabel = (id?: string) =>
          id ? (binSrc.find((b: IdLabel) => b.id === id)?.label ?? id) : "—";

        const pairs = entries.map(([optId, binId]) => `${optLabel(optId)} → ${binLabel(binId)}`);
        answerStr = pairs.length ? pairs.join("; ") : "—";
      } else if (row.kind === "table_match") {
        const user = (row.user as TableAnswer) || {};
        const entries = Object.entries(user as Record<string, string | undefined>);
        const rowSrc: RowHdr[]   = (item?.tableRows ?? q?.table?.rows ?? []) as RowHdr[];
        const optSrcTM: IdLabel[] = (item?.tableOptions ?? q?.options ?? []) as IdLabel[];

        const rowLabel = (rid?: string) =>
          rid ? (rowSrc.find((r: RowHdr) => r.id === rid)?.header ?? rid) : "—";
        const optLabelTM = (oid?: string) =>
          oid ? (optSrcTM.find((o: IdLabel) => o.id === oid)?.label ?? oid) : "—";

        const pairs = entries.map(([rid, oid]) => `${rowLabel(rid)} → ${optLabelTM(oid)}`);
        answerStr = pairs.length ? pairs.join("; ") : "—";
      }

      const verdict = row.isCorrect ? "Right" : "Wrong";
      addLine(`Your Answer: ${answerStr}`);
      addLine(`Result: ${verdict}`);
      y += 6;
    });

    const file = `${exam.slug}-report.pdf`;
    doc.save(file);
  };

  return (
    <div className="space-y-6">
      {/* Full-bleed status */}
      <div className={`sticky ${stickyTopClass} z-30 full-bleed`}>
        <div className="h-[3px] bg-sky-500 border-t border-gray-300" />
        <div className="w-full bg-[#5e5e5e] text-white text-[13px]">
          <div className="flex items-center gap-2 px-6 py-1">
            <span className="font-semibold">{exam.title.toUpperCase()}</span>
            <span>/</span>
            <span>RESULTS</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-md border border-gray-200 p-8 max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-4xl font-bold">Your Score</h2>
          <div className="mt-3 text-xl">
            <span className="font-semibold">{correctCount}</span> correct out of{" "}
            <span className="font-semibold">{scoredCount}</span> scored questions ·{" "}
            <span className="font-semibold">{percent}%</span>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto text-sm">
            <div className="rounded-md border border-gray-200 p-3">
              <div className="text-gray-600">Reading</div>
              <div className="text-lg font-semibold">
                {sectionTotals.reading.correct} / {sectionTotals.reading.scored}
              </div>
            </div>
            <div className="rounded-md border border-gray-200 p-3">
              <div className="text-gray-600">Math</div>
              <div className="text-lg font-semibold">
                {sectionTotals.math.correct} / {sectionTotals.math.scored}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={downloadReportPdf}
              className="px-5 py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              Download Report (PDF)
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .full-bleed { margin-left: calc(50% - 50vw); margin-right: calc(50% - 50vw); width: 100vw; }
      `}</style>
    </div>
  );
}

export default ExamResultsPage;
export { ExamResultsPage };
