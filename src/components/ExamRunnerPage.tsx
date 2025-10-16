// src/components/ExamRunnerPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getExamBySlug } from "../data/exams";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";

/** Results page (new, extracted) */
import ExamResultsPage from "./ExamResultsPage";

/** Tech-enhanced interactions */
import DragToBins from "./techenhanced/DragToBins";
import TableMatch from "./techenhanced/TableMatch";
import type { DragAnswer as DragMap, TableAnswer } from "./techenhanced/types";

/** Typed numeric comparator */
const numAsc = (x: number, y: number) => x - y;

/** Stores selected value per question (keyed by globalId) */
type AnswerValue = number | number[] | DragMap | TableAnswer | undefined;
type AnswerMap = Record<string, AnswerValue>;
type ReviewTab = "all" | "unanswered" | "bookmarked";
type Tool = "pointer" | "eliminate" | "notepad";

/** ---------- Frontmatter helpers ---------- */
type InteractionType =
  | "single_select"
  | "multi_select"
  | "drag_to_bins"
  | "table_match"
  | "cloze_drag";

type SkillType = "global" | "function" | "detail" | "inference";

type MdFrontmatter = {
  title?: string;
  source?: string;
  questions?: Array<{
    id: string;

    type?: InteractionType;
    skillType?: SkillType;

    stemMarkdown?: string;
    image?: string;

    /** Single-select */
    choices?: string[];
    answerIndex?: number;

    /** Multi-select */
    selectCount?: number;
    correctIndices?: number[];

    /** Drag to bins */
    bins?: { id: string; label: string }[];
    options?: { id: string; label: string }[];
    correctBins?: Record<string, string>;

    /** Table match */
    table?: {
      columns: { key: string; header: string }[];
      rows: { id: string; header: string }[];
    };
    correctCells?: Record<string, string>;

    /** Cloze drag */
    blanks?: { id: string; correctOptionId: string }[];

    explanationMarkdown?: string;
  }>;
};

function splitFrontmatter(md: string): { fm: string | null; body: string } {
  if (!md.startsWith("---")) return { fm: null, body: md };
  const rest = md.slice(3);
  const match = rest.match(/\r?\n---\r?\n/);
  if (!match) return { fm: null, body: md };
  const end = match.index!;
  const fm = rest.slice(0, end).trim();
  const body = rest.slice(end + match[0].length).replace(/^\s+/, "");
  return { fm, body };
}

async function parseYaml(yamlText: string | null): Promise<MdFrontmatter> {
  if (!yamlText) return {};
  try {
    const mod = await import(/* @vite-ignore */ "js-yaml");
    const data = mod.load(yamlText) as any;
    return (data ?? {}) as MdFrontmatter;
  } catch (e) {
    console.error("YAML parse error:", e);
    return {};
  }
}

/** ---------- Flattened "item" used by the runner ---------- */
type FlatItem = {
  globalId: string;
  sectionId: string;
  sectionTitle: string;
  sectionType: "reading" | "math" | string;

  sectionPassageMarkdown?: string;
  sectionPassageImages?: string[];
  sectionPassageUrl?: string;

  stemMarkdown?: string;
  image?: string;

  /** Choice interactions */
  choices?: string[];

  /** Drag-to-bins interactions */
  bins?: { id: string; label: string }[];
  options?: { id: string; label: string }[];
  correctBins?: Record<string, string>;

  /** Table-match interactions */
  tableColumns?: { key: string; header: string }[];
  tableRows?: { id: string; header: string }[];
  tableOptions?: { id: string; label: string }[];
  correctCells?: Record<string, string>;

  /** Interaction + skill on each item */
  interactionType?: InteractionType;
  skillType?: SkillType;

  selectCount?: number;
  explanationMarkdown?: string;

  globalIndex: number;
  isEnd?: boolean;
  isMathIntro?: boolean;
};

type ResultRow = {
  globalId: string;
  globalNumber: number;
  displayGroup: string;        // "Reading" or "Mathematics"
  sectionType: "reading" | "math";
  kind: InteractionType;
  isScored: boolean;
  isUnanswered: boolean;
  isCorrect: boolean | null;   // null when not scored
  user?: number | number[] | DragMap | TableAnswer;
  correct?: number | number[] | Record<string, string> | undefined;
  choices?: string[];
};

const groupLabel = (type: string) => {
  if (type === "reading") return "Reading";
  if (type === "math") return "Mathematics";
  return type.charAt(0).toUpperCase() + type.slice(1);
};

/** Icons */
const BookmarkFilled = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden fill="#2563EB">
    <path d="M6 2h12a2 2 0 0 1 2 2v18l-8-4-8 4V4a2 2 0 0 1 2-2z" />
  </svg>
);
const BookmarkOutline = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="#2563EB" strokeWidth="2">
    <path d="M6 2h12a2 2 0 0 1 2 2v18l-8-4-8 4V4a2 2 0 0 1 2-2z" />
  </svg>
);
const ListIcon = (props: any) => (
  <svg viewBox="0 0 24 24" {...props}><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
);
const PointerIcon = (props: any) => (
  <svg viewBox="0 0 24 24" {...props}><path d="M3 2l18 9-7 2 2 7-5-6-8-12z" fill="currentColor"/></svg>
);
const XIcon = (props: any) => (
  <svg viewBox="0 0 24 24" {...props}><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
);
const NoteIcon = (props: any) => (
  <svg viewBox="0 0 24 24" {...props}><path d="M4 4h10l6 6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M14 4v6h6" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
);
const BackArrowIcon = (props: any) => (
  <svg viewBox="0 0 24 24" {...props}><path d="M10 19l-7-7 7-7M3 12h18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
);

export default function ExamRunnerPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const exam = slug ? getExamBySlug(slug) : undefined;

  /** Cache reading MD bodies and questions by section.id */
  const [readingBodies, setReadingBodies] = useState<Record<string, string>>({});
  const [readingQs, setReadingQs] = useState<Record<string, MdFrontmatter["questions"]>>({});

  /** Load all reading sections’ MD on exam change */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!exam) return;
      const bodies: Record<string, string> = {};
      const qsMap: Record<string, MdFrontmatter["questions"]> = {};

      const tasks = exam.sections
        .filter((s: any) => s.type === "reading" && s.passageMd)
        .map(async (s: any) => {
          try {
            const url: string = s.passageMd.startsWith("/") ? s.passageMd : `/exams/readingpassages/${s.passageMd}`;
            const txt = await fetch(url).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))));
            const { fm, body } = splitFrontmatter(txt);
            const meta = await parseYaml(fm);
            bodies[s.id] = body;
            if (Array.isArray(meta.questions)) qsMap[s.id] = meta.questions as any[];
          } catch {
            bodies[s.id] = "";
            qsMap[s.id] = [];
          }
        });

      await Promise.all(tasks);
      if (!cancelled) {
        setReadingBodies(bodies);
        setReadingQs(qsMap);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [exam?.slug]);

  // ===== Flatten ALL questions and inject a Math intro page =====
  const { items, mathIntroIndex } = useMemo(() => {
    if (!exam) return { items: [] as FlatItem[], mathIntroIndex: -1 };

    const out: FlatItem[] = [];
    let globalIndex = 0;
    let insertedMathIntro = false;
    let mathIntroIdx = -1;

    exam.sections.forEach((sec: any) => {
      if (sec.type === "math" && !insertedMathIntro) {
        mathIntroIdx = out.length;
        out.push({
          globalId: "__MATH_INTRO__",
          sectionId: "__MATH__",
          sectionTitle: "Mathematics",
          sectionType: "math",
          globalIndex,
          isMathIntro: true,
        });
        insertedMathIntro = true;
      }

      const sectionQuestions =
        sec.type === "reading"
          ? (readingQs[sec.id] ?? [])
          : (sec.questions ?? []);

      (sectionQuestions as any[]).forEach((q: any) => {
        out.push({
          globalId: `${sec.id}:${q.id}`,
          sectionId: sec.id,
          sectionTitle: sec.title,
          sectionType: sec.type,
          sectionPassageMarkdown:
            sec.type === "reading"
              ? readingBodies[sec.id] ?? ""
              : (sec as any).passageMarkdown,
          sectionPassageImages: (sec as any).passageImages,
          sectionPassageUrl: sec.passageMd ?? (sec as any).passageUrl,
          stemMarkdown: q.stemMarkdown ?? q.promptMarkdown,
          image: q.image,

          // choice
          choices: q.choices,

          // drag_to_bins
          bins: q.bins,
          options: q.options,
          correctBins: q.correctBins,

          // table_match
          tableColumns: q.table?.columns,
          tableRows: q.table?.rows,
          tableOptions: q.options, // reuse the same pool
          correctCells: q.correctCells,

          interactionType: q.type ?? "single_select",
          skillType: q.skillType,
          selectCount: q.selectCount,
          explanationMarkdown: q.explanationMarkdown,

          globalIndex: globalIndex++,
        });
      });
    });

    out.push({
      globalId: "__END__",
      sectionId: "__END__",
      sectionTitle: "End",
      sectionType: "end",
      globalIndex,
      isEnd: true,
    });

    return { items: out, mathIntroIndex: mathIntroIdx };
  }, [exam, readingBodies, readingQs]);

  const questionItems = items.filter((i) => !i.isEnd && !i.isMathIntro);
  const lastIndex = Math.max(0, items.length - 1);

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewTab, setReviewTab] = useState<ReviewTab>("all");
  const reviewWrapRef = useRef<HTMLDivElement>(null);
  const [fetchedPassage, setFetchedPassage] = useState<string | undefined>(undefined);

  // ===== Math intro markdown =====
  const [mathIntroMd, setMathIntroMd] = useState<string | undefined>(undefined);
  useEffect(() => {
    fetch("/exams/mathpage.md")
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((txt) => setMathIntroMd(txt))
      .catch(() => setMathIntroMd(undefined));
  }, []);

  // ===== Bookmark state =====
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const bmStorageKey = slug ? `bm:${slug}` : null;
  useEffect(() => {
    if (!bmStorageKey) return;
    try {
      const raw = localStorage.getItem(bmStorageKey);
      setBookmarks(raw ? new Set(JSON.parse(raw)) : new Set());
    } catch {
      setBookmarks(new Set());
    }
  }, [bmStorageKey]);
  const saveBookmarks = (next: Set<string>) => {
    if (!bmStorageKey) return;
    try { localStorage.setItem(bmStorageKey, JSON.stringify(Array.from(next))); } catch {}
  };
  const toggleBookmark = () => {
    const cur = items[idx];
    if (!cur || cur.isEnd || cur.isMathIntro) return;
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(cur.globalId)) next.delete(cur.globalId);
      else next.add(cur.globalId);
      saveBookmarks(next);
      return next;
    });
  };

  // ===== Tools =====
  const [tool, setTool] = useState<Tool>("pointer");
  const eliminatorActive = tool === "eliminate";
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesText, setNotesText] = useState("");
  const notesKey = slug ? `notes:${slug}` : null;
  useEffect(() => {
    if (!notesKey) return;
    const t = localStorage.getItem(notesKey) || "";
    setNotesText(t);
  }, [notesKey]);
  useEffect(() => {
    if (!notesKey) return;
    try { localStorage.setItem(notesKey, notesText); } catch {}
  }, [notesKey, notesText]);
  useEffect(() => {
    setNotesOpen(tool === "notepad");
  }, [tool]);

  // ===== Eliminated choices per question (for choice interactions) =====
  const [elims, setElims] = useState<Record<string, number[]>>({});
  const isEliminated = (gid: string, i: number) => (elims[gid] || []).includes(i);
  const toggleElim = (gid: string, i: number) => {
    setElims((prev) => {
      const cur = new Set(prev[gid] || []);
      cur.has(i) ? cur.delete(i) : cur.add(i);
      return { ...prev, [gid]: Array.from(cur) };
    });
  };

  // ===== Submission / Results state =====
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<{
    rows: ResultRow[];
    correctCount: number;
    incorrectCount: number;
    unansweredCount: number;
    scoredCount: number;
    sectionTotals: {
      reading: { correct: number; scored: number };
      math: { correct: number; scored: number };
    };
  } | null>(null);
  const stickyTopClass = submitted && results ? "top-14" : "top-0";

  // Toggle the global layout top bar: hide during exam, show on results
  useEffect(() => {
    const bar = document.getElementById("exam-topbar");
    if (!bar) return;
    const shouldShow = submitted && !!results;
    bar.classList.toggle("hidden", !shouldShow);
    return () => bar.classList.remove("hidden");
  }, [submitted, results]);

  useEffect(() => {
    setIdx(0);
    setAnswers({});
    setReviewOpen(false);
    setReviewTab("all");
    setSubmitted(false);
    setResults(null);
    setTool("pointer");
    setElims({});
  }, [slug]);

  // Click outside to close review
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!reviewWrapRef.current) return;
      if (!reviewWrapRef.current.contains(e.target as Node)) setReviewOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // ===== Current item + passage selection =====
  const current = items[idx];

  // Prefer preloaded body for reading; else fall back to fetch (legacy)
  useEffect(() => {
    setFetchedPassage(undefined);
    if (!current || current.isEnd || current.isMathIntro) return;
    const sec = exam?.sections.find((s: any) => s.id === current.sectionId) as any;
    if (sec?.type === "reading") {
      const body = readingBodies[current.sectionId];
      if (body != null) {
        setFetchedPassage(body);
        return;
      }
    }
    // legacy/fallback
    let url = current.sectionPassageUrl;
    if (!url) return;
    if (!url.startsWith("/")) url = `/exams/readingpassages/${url}`;
    fetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((txt) => {
        const { body } = splitFrontmatter(txt);
        setFetchedPassage(body || txt);
      })
      .catch(() => setFetchedPassage(undefined));
  }, [current?.sectionId, current?.sectionPassageUrl, current?.isEnd, current?.isMathIntro, exam?.sections, readingBodies]);

  if (!exam) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-red-600">Exam not found</h1>
        <p className="text-gray-600 mt-2">Check the URL or choose from the exams list.</p>
      </div>
    );
  }

  // Prefer fetched/preloaded content for reading
  const effectivePassage =
    !current?.isEnd && !current?.isMathIntro && current?.sectionType !== "math"
      ? fetchedPassage ??
        (exam.sections.find((s) => s.id === current.sectionId) as any)?.passageMarkdown
      : undefined;

  // Normalize passage images
  const effectivePassageImages = (() => {
    if (current?.isEnd || current?.isMathIntro || current?.sectionType === "math") return undefined;
    const sec = exam.sections.find((s: any) => s.id === current?.sectionId) as any;
    const raw = sec?.passageImages;
    const list = Array.isArray(raw)
      ? raw.filter((s: unknown) => typeof s === "string" && s.trim().length > 0)
      : [];
    return list.length ? list : undefined;
  })();

  // ===== Progress (GLOBAL) =====
  const questionCount = questionItems.length;
  const questionOrdinal = Math.min(
    current?.isEnd
      ? questionCount
      : current?.isMathIntro
      ? Math.max(1, items.findIndex((it) => !it.isMathIntro && !it.isEnd) + 1)
      : (current?.globalIndex ?? 0) + 1,
    questionCount
  );
  const progressPct = questionCount ? Math.round((questionOrdinal / questionCount) * 100) : 0;

  const goPrev = () => setIdx((i) => Math.max(0, i - 1));
  const goNext = () => setIdx((i) => Math.min(lastIndex, i + 1));
  const jumpTo = (i: number) => {
    setIdx(i);
    setReviewOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const selectChoice = (choiceIndex: number) => {
    if (!current || current.isEnd || current.isMathIntro) return;
    setAnswers((prev) => ({ ...prev, [current.globalId]: choiceIndex }));
  };

  // ===== Helpers =====
  const isAnsweredGid = (gid: string) => {
    const v = answers[gid];
    if (typeof v === "number") return true;
    if (Array.isArray(v)) return v.length > 0;
    if (v && typeof v === "object") return Object.keys(v as Record<string, unknown>).length > 0;
    return false;
  };
  const unansweredCount = questionItems.filter((q) => !isAnsweredGid(q.globalId)).length;
  const bookmarkedCount = questionItems.filter((q) => bookmarks.has(q.globalId)).length;

  const filteredItems = useMemo(() => {
    switch (reviewTab) {
      case "unanswered":
        return questionItems.filter((q) => !isAnsweredGid(q.globalId));
      case "bookmarked":
        return questionItems.filter((q) => bookmarks.has(q.globalId));
      default:
        return questionItems;
    }
  }, [questionItems, reviewTab, answers, bookmarks]);

  const groupedByDisplayGroup = useMemo(() => {
    const groups: Record<string, FlatItem[]> = {};
    filteredItems.forEach((q) => {
      const key = groupLabel(q.sectionType);
      if (!groups[key]) groups[key] = [];
      groups[key].push(q);
    });
    return groups;
  }, [filteredItems]);

  // ===== Scoring helpers =====
  const getCorrectIndex = (q: any): number | undefined =>
    typeof q?.answerIndex === "number" ? q.answerIndex : undefined;

  const getCorrectIndices = (q: any): number[] | undefined =>
    Array.isArray(q?.correctIndices) ? q.correctIndices.slice().sort(numAsc) : undefined;

  const equalNumberArrays = (a?: number[], b?: number[]) =>
    Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]);

  // ===== Submit & Score =====
  const computeResults = () => {
    const rows: ResultRow[] = [];
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCountLocal = 0;
    let scoredCount = 0;

    let secStats = {
      reading: { correct: 0, scored: 0 },
      math: { correct: 0, scored: 0 },
    };

    let g = 0;
    exam?.sections.forEach((sec: any) => {
      const displayGroup = groupLabel(sec.type);
      const sectionType = (sec.type === "math" ? "math" : "reading") as "reading" | "math";
      const sectionQuestions =
        sec.type === "reading" ? (readingQs[sec.id] ?? []) : (sec.questions ?? []);

      (sectionQuestions as any[]).forEach((q: any) => {
        const globalId = `${sec.id}:${q.id}`;
        const kind: InteractionType = q?.type ?? "single_select";
        const choices = (q as any).choices as string[] | undefined;

        const pushRow = (
          row: Omit<ResultRow, "displayGroup" | "sectionType" | "globalNumber">
        ) => {
          const full: ResultRow = {
            ...row,                    // carries globalId (only once)
            globalNumber: g + 1,
            displayGroup,
            sectionType,
          };
          rows.push(full);
        };

        if (kind === "multi_select") {
          const correct = getCorrectIndices(q);
          const user = (answers[globalId] as number[] | undefined) ?? [];
          const isScored = Array.isArray(correct);
          const isUnanswered = user.length === 0;
          const isCorrect = isScored
            ? (!isUnanswered && equalNumberArrays(user.slice().sort(numAsc), (correct ?? []).slice().sort(numAsc)))
            : null;

          if (isScored) {
            scoredCount++;
            secStats[sectionType].scored += 1;
            if (isUnanswered) {
              unansweredCountLocal++;
            } else if (isCorrect) {
              correctCount++;
              secStats[sectionType].correct += 1;
            } else {
              incorrectCount++;
            }
          } else if (isUnanswered) {
            unansweredCountLocal++;
          }

          pushRow({ globalId, kind, isScored, isUnanswered, isCorrect, user, correct, choices });

        } else if (kind === "drag_to_bins") {
          const key = q?.correctBins as Record<string, string> | undefined;
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
            secStats[sectionType].scored += 1;
            if (isUnanswered) {
              unansweredCountLocal++;
            } else if (isCorrect) {
              correctCount++;
              secStats[sectionType].correct += 1;
            } else {
              incorrectCount++;
            }
          } else if (isUnanswered) {
            unansweredCountLocal++;
          }

          pushRow({ globalId, kind, isScored, isUnanswered, isCorrect, user, correct: key });

        } else if (kind === "table_match") {
          const key = q?.correctCells as Record<string, string> | undefined;
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
            secStats[sectionType].scored += 1;
            if (isUnanswered) {
              unansweredCountLocal++;
            } else if (isCorrect) {
              correctCount++;
              secStats[sectionType].correct += 1;
            } else {
              incorrectCount++;
            }
          } else if (isUnanswered) {
            unansweredCountLocal++;
          }

          pushRow({ globalId, kind, isScored, isUnanswered, isCorrect, user, correct: key });

        } else {
          // single_select
          const correct = getCorrectIndex(q);
          const user = answers[globalId] as number | undefined;
          const isScored = typeof correct === "number";
          const isUnanswered = user == null;
          const isCorrect = isScored ? (!isUnanswered && user === correct) : null;

          if (isScored) {
            scoredCount++;
            secStats[sectionType].scored += 1;
            if (isUnanswered) {
              unansweredCountLocal++;
            } else if (isCorrect) {
              correctCount++;
              secStats[sectionType].correct += 1;
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

    setResults({
      rows,
      correctCount,
      incorrectCount,
      unansweredCount: unansweredCountLocal,
      scoredCount,
      sectionTotals: secStats,
    });
  };

  const onSubmit = () => {
    computeResults();
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ===== Choice renderer (single + multi) =====
  const renderChoices = (it: FlatItem) => {
    if (!Array.isArray(it.choices)) {
      return <p className="text-gray-500">No choices for this item.</p>;
    }

    if (it.interactionType === "multi_select") {
      return (
        <ul className="space-y-3">
          {it.selectCount ? (
            <div className="text-xs text-gray-600 mb-1">
              Select {it.selectCount} answer{it.selectCount > 1 ? "s" : ""}.
            </div>
          ) : null}
          {it.choices.map((choice, i) => {
            const currentAns = (answers[it.globalId] as number[] | undefined) ?? [];
            const checked = currentAns.includes(i);
            const eliminated = isEliminated(it.globalId, i);
            return (
              <li key={i}>
                <label className="flex items-start gap-3 cursor-pointer relative">
                  <input
                    type="checkbox"
                    className="h-4 w-4 mt-1"
                    checked={checked}
                    disabled={eliminatorActive}
                    onChange={() => {
                      if (eliminatorActive) {
                        toggleElim(it.globalId, i);
                      } else {
                        setAnswers((prev) => {
                          const set = new Set((prev[it.globalId] as number[] | undefined) ?? []);
                          if (checked) {
                            set.delete(i);
                          } else {
                            if (it.selectCount && set.size >= it.selectCount) return prev; // cap
                            set.add(i);
                          }
                          return {
                            ...prev,
                            [it.globalId]: Array.from(set).sort(numAsc),
                          };
                        });
                      }
                    }}
                  />
                  <span className={`flex-1 choice-line ${eliminated ? "eliminated" : ""}`}>{choice}</span>
                </label>
              </li>
            );
          })}
        </ul>
      );
    }

    // default: single_select
    return (
      <ul className="space-y-3">
        {it.choices.map((choice, i) => {
          const selected = answers[it.globalId] === i;
          const eliminated = isEliminated(it.globalId, i);
          return (
            <li key={i}>
              <label className="flex items-start gap-3 cursor-pointer relative">
                <input
                  type="radio"
                  name={it.globalId}
                  className="h-4 w-4 mt-1"
                  checked={!!selected}
                  disabled={eliminatorActive}
                  onChange={() => {
                    if (eliminatorActive) {
                      toggleElim(it.globalId, i);
                    } else {
                      selectChoice(i);
                    }
                  }}
                />
                <span className={`flex-1 choice-line ${eliminated ? "eliminated" : ""}`}>{choice}</span>
              </label>
            </li>
          );
        })}
      </ul>
    );
  };

  // ===== PDF Export =====
  const downloadReportPdf = async () => {
    if (!results) return;

    // Try to import jspdf from local deps; fallback to CDN if needed
    let jsPDFMod: any = null;
    try {
      jsPDFMod = await import("jspdf");
    } catch {
      try {
        // Vite will not pre-bundle this; allow runtime fetch
        // @ts-ignore
        jsPDFMod = await import(/* @vite-ignore */ "https://cdn.skypack.dev/jspdf");
      } catch (e) {
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

    // Per-question
    const rows = results.rows; // already in exam order
    let currentGroup = "";

    rows.forEach((row) => {
      if (!row.isScored) return; // include only scored questions per spec
      const item = items.find((x) => x.globalId === row.globalId);
      const secName = row.displayGroup;

      if (secName !== currentGroup) {
        addLine(secName, { bold: true });
        currentGroup = secName;
      }

      // Stem
      const stem = (item?.stemMarkdown || "").replace(/\s+/g, " ").trim();
      addLine(`Q${row.globalNumber}: ${stem || "(No prompt text)"}`);

      // User answer by kind
      let answerStr = "";
      if (row.kind === "single_select") {
        const i = row.user as number | undefined;
        const label = typeof i === "number" ? `${String.fromCharCode(65 + i)}${item?.choices?.[i] ? ` — ${item.choices[i]}` : ""}` : "—";
        answerStr = label;
      } else if (row.kind === "multi_select") {
        const picks = (row.user as number[] | undefined) ?? [];
        if (picks.length) {
          answerStr = picks
            .map((i) => `${String.fromCharCode(65 + i)}${item?.choices?.[i] ? ` — ${item.choices[i]}` : ""}`)
            .join("; ");
        } else {
          answerStr = "—";
        }
      } else if (row.kind === "drag_to_bins") {
        const user = (row.user as DragMap) || {};
        const entries = Object.entries(user as Record<string, string | undefined>);

        const optLabel = (id?: string) =>
          id ? (item?.options?.find((o) => o.id === id)?.label ?? id) : "—";
        const binLabel = (id?: string) =>
          id ? (item?.bins?.find((b) => b.id === id)?.label ?? id) : "—";

        const pairs = entries.map(([optId, binId]) => `${optLabel(optId)} → ${binLabel(binId)}`);
        answerStr = pairs.length ? pairs.join("; ") : "—";

      } else if (row.kind === "table_match") {
        const user = (row.user as TableAnswer) || {};
        const entries = Object.entries(user as Record<string, string | undefined>);

        const rowLabel = (rid?: string) =>
          rid ? (item?.tableRows?.find((r) => r.id === rid)?.header ?? rid) : "—";
        const optLabel = (oid?: string) =>
          oid ? (item?.tableOptions?.find((o) => o.id === oid)?.label ?? oid) : "—";

        const pairs = entries.map(([rid, oid]) => `${rowLabel(rid)} → ${optLabel(oid)}`);
        answerStr = pairs.length ? pairs.join("; ") : "—";

      } else {
        answerStr = "—";
      }

      // Right/Wrong
      const verdict = row.isCorrect ? "Right" : "Wrong";
      addLine(`Your Answer: ${answerStr}`);
      addLine(`Result: ${verdict}`);
      y += 6;
    });

    doc.save(`${exam.slug}-report.pdf`);
  };

  // ===== Results page =====
  if (submitted && results) {
    return (
      <ExamResultsPage
        examTitle={exam.title}
        results={{
          correctCount: results.correctCount,
          scoredCount: results.scoredCount,
          sectionTotals: results.sectionTotals,
        }}
        onDownloadPdf={downloadReportPdf}
        stickyTopClass={stickyTopClass}
      />
    );
  }

  // ===== Normal exam UI =====
  return (
    <div className="space-y-4">
      {/* ======= Toolbar + Status (full-bleed) ======= */}
      <div className={`sticky ${stickyTopClass} z-30 full-bleed`}>
        <div className="w-full flex items-center gap-2 bg-white border-b border-gray-300 px-4 py-1 shadow-sm">
          {/* Joined Prev/Next */}
          <div className="inline-flex overflow-hidden rounded-md">
            <button
              onClick={goPrev}
              disabled={idx === 0}
              className={`px-3 py-1.5 text-white text-sm font-medium border-r ${
                idx === 0 ? "bg-blue-300 cursor-not-allowed border-blue-300" : "bg-blue-600 hover:bg-blue-500 border-blue-700"
              }`}
              title="Previous"
            >
              ←
            </button>
            <button
              onClick={goNext}
              disabled={idx === lastIndex}
              className={`px-3 py-1.5 text-white text-sm font-medium ${
                idx === lastIndex ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500"
              }`}
              title="Next"
            >
              →
            </button>
          </div>

          {/* Review */}
          <div className="relative" ref={reviewWrapRef}>
            <button
              onClick={() => setReviewOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded border border-gray-400 bg-gradient-to-b from-white to-gray-100 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
              title="Review Questions"
            >
              <ListIcon className="h-4 w-4 text-gray-700" />
              Review
            </button>

            {reviewOpen && (
              <div className="absolute left-0 mt-2 w-[360px] rounded-md border border-gray-300 bg-white shadow-lg z-40">
                <div className="absolute -top-1 left-6 h-2 w-2 rotate-45 bg-white border-l border-t border-gray-300" />
                <div className="p-3 text-sm">
                  {/* Tabs */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <button
                      onClick={() => setReviewTab("all")}
                      className={`flex flex-col items-center rounded border px-2 py-2 ${reviewTab === "all" ? "bg-white border-gray-800" : "bg-gray-50 border-gray-300 hover:bg-gray-100"}`}
                    >
                      <span className="text-[11px] text-gray-600">All Questions</span>
                      <span className="mt-1 text-base font-semibold">{questionItems.length}</span>
                    </button>
                    <button
                      onClick={() => setReviewTab("unanswered")}
                      className={`flex flex-col items-center rounded border px-2 py-2 ${reviewTab === "unanswered" ? "bg-white border-gray-800" : "bg-gray-50 border-gray-300 hover:bg-gray-100"}`}
                    >
                      <span className="text-[11px] text-gray-600">Not Answered</span>
                      <span className="mt-1 text-base font-semibold">{unansweredCount}</span>
                    </button>
                    <button
                      onClick={() => setReviewTab("bookmarked")}
                      className={`flex flex-col items-center rounded border px-2 py-2 ${reviewTab === "bookmarked" ? "bg-white border-gray-800" : "bg-gray-50 border-gray-300 hover:bg-gray-100"}`}
                    >
                      <span className="text-[11px] text-gray-600">Bookmarks</span>
                      <span className="mt-1 text-base font-semibold">{bookmarkedCount}</span>
                    </button>
                  </div>

                  {/* Filtered list */}
                  <div className="max-h-72 overflow-auto rounded border border-gray-200">
                    {Object.entries(groupedByDisplayGroup).map(([group, qs]) => {
                      const isMath = group.toLowerCase() === "mathematics";
                      return (
                        <div key={group}>
                          <button
                            className={`w-full text-left px-3 py-2 text-[12px] font-semibold ${isMath ? "bg-gray-100 hover:bg-gray-200" : "bg-gray-50 hover:bg-gray-100"} border-b border-gray-200`}
                            onClick={() => {
                              if (isMath && mathIntroIndex >= 0) jumpTo(mathIntroIndex);
                            }}
                            title={isMath ? "Open Mathematics notes" : undefined}
                          >
                            {group}
                            {isMath && mathIntroIndex >= 0 && <span className="ml-2 text-xs text-blue-600">(section page)</span>}
                          </button>

                          {qs.map((q) => {
                            const i = items.findIndex((x) => x.globalId === q.globalId);
                            const active = i === idx;
                            const answered = isAnsweredGid(q.globalId);
                            const bookmarked = bookmarks.has(q.globalId);
                            return (
                              <button
                                key={q.globalId}
                                onClick={() => jumpTo(i)}
                                className={`w-full text-left px-3 py-2 flex items-center gap-2 border-b border-gray-200 ${
                                  active ? "bg-gray-700 text-white" : "hover:bg-gray-50"
                                }`}
                                title={`${group} · Question ${q.globalIndex + 1}`}
                              >
                                <span className={`h-2 w-2 rounded-full ${answered ? "bg-green-500" : "bg-orange-500"}`} />
                                <span className="flex-1">Question {q.globalIndex + 1}</span>
                                {bookmarked && <BookmarkFilled className="h-3.5 w-3.5" />}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                    {filteredItems.length === 0 && (
                      <div className="px-3 py-6 text-center text-gray-500 text-sm">
                        No questions to show here.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bookmark toggle */}
          <button
            onClick={toggleBookmark}
            disabled={current?.isEnd || current?.isMathIntro}
            className={`inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-sm font-medium ${
              bookmarks.has(current?.globalId ?? "")
                ? "border-blue-600 bg-blue-50 hover:bg-blue-100"
                : "border-gray-400 bg-gradient-to-b from-white to-gray-100 hover:bg-gray-50"
            } ${current?.isEnd || current?.isMathIntro ? "opacity-50 cursor-not-allowed" : ""}`}
            title="Bookmark Question for Review"
          >
            {bookmarks.has(current?.globalId ?? "") ? <BookmarkFilled /> : <BookmarkOutline />}
            Bookmark
          </button>

          {/* Tool buttons */}
          <div className="flex items-center gap-1.5 ml-1">
            <button
              className={`h-8 w-8 rounded border ${tool === "pointer" ? "bg-gray-700 text-white border-gray-800" : "border-gray-400 bg-gradient-to-b from-white to-gray-100 hover:bg-gray-50"}`}
              title="Pointer"
              onClick={() => setTool("pointer")}
            >
              <PointerIcon className="h-4 w-4 mx-auto" />
            </button>
            <button
              className={`h-8 w-8 rounded border ${tool === "eliminate" ? "bg-gray-700 text-white border-gray-800" : "border-gray-400 bg-gradient-to-b from-white to-gray-100 hover:bg-gray-50"}`}
              title="Answer Eliminator"
              onClick={() => setTool(tool === "eliminate" ? "pointer" : "eliminate")}
            >
              <XIcon className="h-4 w-4 mx-auto" />
            </button>
            <button
              className={`h-8 w-8 rounded border ${tool === "notepad" ? "bg-gray-700 text-white border-gray-800" : "border-gray-400 bg-gradient-to-b from-white to-gray-100 hover:bg-gray-50"}`}
              title="Open Notepad"
              onClick={() => setTool(tool === "notepad" ? "pointer" : "notepad")}
            >
              <NoteIcon className="h-4 w-4 mx-auto" />
            </button>
          </div>

          <div className="flex-1" />

          <button
            onClick={() => navigate("/exams")}
            className="inline-flex items-center gap-1.5 rounded border border-gray-400 bg-gradient-to-b from-white to-gray-100 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
            title="Back to Exams"
          >
            <BackArrowIcon className="h-4 w-4" />
            Back to Exams
          </button>
        </div>

        {/* Cyan hairline + Dark status bar */}
        <div className="h-[3px] bg-sky-500 border-t border-gray-300" />
        <div className="w-full bg-[#5e5e5e] text-white text-[13px]">
          <div className="flex items-center gap-2 px-6 py-1">
            <span className="font-semibold">{exam.title.toUpperCase()}</span>
            <span>/</span>
            <span>
              {current?.isEnd
                ? "END OF EXAM"
                : current?.isMathIntro
                ? "MATHEMATICS"
                : groupLabel(current?.sectionType ?? "")}
            </span>

            {!current?.isMathIntro && (
              <>
                <span>/</span>
                <span>
                  {current?.isEnd
                    ? `${questionCount} OF ${questionCount}`
                    : `${questionOrdinal} OF ${questionCount}`}
                </span>
              </>
            )}

            <span>/</span>
            <div className="w-40 h-1.5 bg-[#3f3f3f] rounded">
              <div className="h-1.5 rounded bg-[#a0a0a0]" style={{ width: `${progressPct}%` }} />
            </div>
            <span>{progressPct}%</span>
          </div>
        </div>
      </div>

      {/* ======= Main Sheet ======= */}
      {current?.isMathIntro ? (
        <div className="rounded-2xl bg-white shadow-md border border-gray-200 p-8">
          <div className="max-w-5xl mx-auto">
            <div className="prose md:prose-lg max-w-none">
              {mathIntroMd ? (
                <ReactMarkdown rehypePlugins={[rehypeRaw]}>{mathIntroMd}</ReactMarkdown>
              ) : (
                <p className="text-gray-600">Loading Mathematics notes…</p>
              )}
            </div>
          </div>
        </div>
      ) : !current?.isEnd ? (
        current?.sectionType === "math" ? (
          <div className="rounded-2xl bg-white shadow-md border border-gray-200 p-6">
            <div className="rounded-lg border border-gray-200 shadow-sm p-4">
              {current?.stemMarkdown ? (
                <div className="prose max-w-none mb-3">
                  <ReactMarkdown>{current.stemMarkdown}</ReactMarkdown>
                </div>
              ) : null}

              {current?.image && (
                <img
                  src={current.image}
                  alt="question"
                  className="mt-4 max-w-full rounded border border-gray-200"
                />
              )}

              {/* Choices (single + multi) */}
              {renderChoices(current)}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white shadow-md border border-gray-200 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: passage */}
              <div className="rounded-lg border border-gray-200 shadow-sm p-4">
                <div className="h-[520px] overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
                  <div className="border rounded-md p-6 bg-white">
                    {effectivePassage ? (
                      <div className="prose md:prose-lg max-w-none passage">
                        <ReactMarkdown>{effectivePassage}</ReactMarkdown>
                      </div>
                    ) : current?.image || current?.stemMarkdown ? (
                      <>
                        {current.stemMarkdown && (
                          <div className="prose md:prose-lg max-w-none passage">
                            <ReactMarkdown>{current.stemMarkdown}</ReactMarkdown>
                          </div>
                        )}
                        {current.image && (
                          <img
                            src={current.image}
                            alt="question"
                            className="mt-4 max-w-full rounded border border-gray-200"
                          />
                        )}
                      </>
                    ) : (
                      <p className="text-gray-500">No passage for this item.</p>
                    )}

                    {effectivePassageImages?.length ? (
                      <div className="mt-4 space-y-3">
                        {effectivePassageImages.map((src: string, i: number) => (
                          <img
                            key={i}
                            src={src}
                            alt={`passage-figure-${i + 1}`}
                            className="max-w-full rounded border border-gray-200"
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Right: question */}
              <div className="rounded-lg border border-gray-200 shadow-sm p-4">
                {current?.stemMarkdown ? (
                  <div className="prose max-w-none mb-3">
                    <ReactMarkdown>{current.stemMarkdown}</ReactMarkdown>
                  </div>
                ) : null}

                {/* Interaction renderer */}
                {current.interactionType === "drag_to_bins" ? (
                  <DragToBins
                    bins={current.bins ?? []}
                    options={current.options ?? []}
                    value={(answers[current.globalId] as DragMap) ?? {}}
                    onChange={(next) => setAnswers((prev) => ({ ...prev, [current.globalId]: next }))}
                  />
                ) : current.interactionType === "table_match" ? (
                  <TableMatch
                    globalId={current.globalId}
                    table={{
                      columns: current.tableColumns ?? [{ key: "desc", header: "Best Description" }],
                      rows: current.tableRows ?? [],
                    }}
                    options={current.tableOptions ?? []}
                    value={Object.fromEntries(
                      Object.entries((answers[current.globalId] as TableAnswer) ?? {}).filter(
                        (entry): entry is [string, string] => typeof entry[1] === "string"
                      )
                    )}
                    onChange={(next) => setAnswers((prev) => ({ ...prev, [current.globalId]: next }))}
                  />
                ) : current.interactionType === "cloze_drag" ? (
                  <div className="text-sm text-orange-600">
                    This question type (cloze drag) isn’t supported yet in the runner.
                  </div>
                ) : (
                  renderChoices(current)
                )}
              </div>
            </div>
          </div>
        )
      ) : (
        // ---------- End-of-Exam page ----------
        <div className="rounded-2xl bg-white shadow-md border border-gray-200 p-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-white bg-slate-600 rounded-md py-3 text-lg font-semibold">
                Congratulations, you have finished!
              </div>
              <h2 className="text-4xl font-bold my-6">End of Section</h2>
              <p className="text-gray-600">
                Use the <strong>Review</strong> button above, or the list below, to go back and review your answers.
                When you are done, use the <strong>Submit Final Answers</strong> button below to submit your answers.
              </p>

              <button
                onClick={onSubmit}
                className="mt-6 inline-block bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-md"
              >
                Submit Final Answers
              </button>
            </div>

            {/* Legend */}
            <div className="mt-8 rounded border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-6 text-sm">
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-orange-500 inline-block" />
                  Unanswered questions are marked with a dot.
                </span>
                <span className="inline-flex items-center gap-2">
                  <BookmarkFilled />
                  Bookmarked questions are marked with a bookmark symbol.
                </span>
              </div>
            </div>

            {/* ALL questions — capped at 3 columns */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-3">
              {questionItems.map((q) => {
                const i = items.findIndex((x) => x.globalId === q.globalId);
                const answered = isAnsweredGid(q.globalId);
                const bookmarked = bookmarks.has(q.globalId);
                return (
                  <button
                    key={q.globalId}
                    onClick={() => jumpTo(i)}
                    className="relative text-left px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 border border-gray-300"
                    title={`${groupLabel(q.sectionType)} · Question ${q.globalIndex + 1}`}
                  >
                    {!answered && (
                      <span className="absolute left-2 top-1.5 h-3 w-3 rounded-full bg-orange-500" />
                    )}
                    <span className="pl-5">Question {q.globalIndex + 1}</span>
                    {bookmarked && (
                      <span className="absolute right-2 top-1.5">
                        <BookmarkFilled />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Floating Notepad */}
      {notesOpen && (
        <div className="fixed bottom-4 right-4 w-[380px] bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden z-40">
          <div className="flex items-center justify-between bg-gray-100 px-3 py-2 border-b">
            <div className="flex items-center gap-2 font-medium text-gray-700">
              <NoteIcon className="h-4 w-4" /> Notepad
            </div>
            <button className="text-sm text-gray-600 hover:text-gray-900" onClick={() => setTool("pointer")}>
              Close
            </button>
          </div>
          <textarea
            className="w-full h-56 p-3 outline-none"
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            placeholder="Type your notes here…"
          />
        </div>
      )}

      {/* ===== Helpers & styles ===== */}
      <style>{`
        /* Full-bleed header/status even inside a centered layout */
        .full-bleed { margin-left: calc(50% - 50vw); margin-right: calc(50% - 50vw); width: 100vw; }

        .passage h1, .passage h2, .passage h3 { text-align: center; margin-bottom: 0.25rem; }
        .passage h1 + p, .passage h2 + p, .passage h3 + p { text-align: center; margin-top: 0.25rem; margin-bottom: 1rem; }
        .passage em { display: block; text-align: center; color: #6b7280; font-style: italic; }
        .passage ol { counter-reset: item; list-style: none; padding-left: 0; margin-left: 0; }
        .passage ol > li { counter-increment: item; position: relative; padding-left: 2.25rem; margin: 0.75rem 0; }
        .passage ol > li::before {
          content: counter(item);
          position: absolute; left: 0; top: 0.1rem; width: 1.5rem; height: 1.5rem;
          border-radius: 9999px; background: #111827; color: #fff; font-weight: 700; font-size: 0.875rem;
          display: inline-flex; align-items: center; justify-content: center;
        }

        /* Choice line + Eliminator decoration */
        .choice-line { position: relative; display: inline-block; }
        .choice-line.eliminated { color: #9ca3af; }
        .choice-line.eliminated::after {
          content: "";
          position: absolute;
          left: -4px; right: -4px; top: 50%;
          border-top: 2px solid #ef4444;
          transform: rotate(-6deg);
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
