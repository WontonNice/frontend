// src/components/ExamRunnerPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getExamBySlug } from "../../data/exams";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { getQuestionsByIds } from "../../data/revEditB-QuestionBank.ts";
import { getMathQuestionsByIds } from "../../data/SHSATMathBank.ts";
import MathText from "../MathText";

/** Results page (extracted) */
import ExamResultsPage from "./ExamResultsPage";
import "./ExamRunnerPage.css";

/** Tech-enhanced interactions */
import DragToBins from "./techenhanced/DragToBins";
import TableMatch from "./techenhanced/TableMatch";
import ClozeDrag from "./techenhanced/ClozeDrag";
import type {
  DragAnswer as DragMap,
  TableAnswer,
  ClozeAnswer,
} from "./techenhanced/types";

/** NEW: separate type systems */
import type { ReadingInteractionType } from "../../types/ReadingTypes";
import type { MathInteractionType } from "../../types/MathTypes";
import type { AnswerMap, SourceType } from "./ExamSharedTypes";

/** Tools */
import { useEliminator } from "./Tools/AnswerEliminator";
import ExamToolButtons from "./Tools/ToolButtons";
import GlobalNotepad from "./Tools/GlobalNotepad";
import type { Tool } from "./Tools/types";

/** Tabs in review popover */
type ReviewTab = "all" | "unanswered" | "bookmarked";

/** ---------- Frontmatter helpers ---------- */
type InteractionType = ReadingInteractionType | MathInteractionType;

type SkillType = "global" | "function" | "detail" | "inference";

type MdFrontmatter = {
  title?: string;
  source?: string;
  questions?: Array<{
    id: string;

    type?: InteractionType;
    skillType?: SkillType;
    sourceType?: SourceType;

    stemMarkdown?: string;
    image?: string;

    /** Single-select */
    choices?: string[];
    answerIndex?: number;

    /** Multi-select */
    selectCount?: number;
    correctIndices?: number[];

    /** Drag to bins (reading) */
    bins?: { id: string; label: string }[];
    options?: { id: string; label: string }[];
    correctBins?: Record<string, string>;

    /** Table match (reading) */
    table?: {
      columns: { key: string; header: string }[];
      rows: { id: string; header: string }[];
    };
    correctCells?: Record<string, string>;

    /** Cloze drag (reading) */
    blanks?: { id: string; correctOptionId: string }[];

    /** Short response (math + reading) */
    correctAnswer?: string | number | Array<string | number>;
    tolerance?: number;
    normalizeText?: boolean;
    placeholder?: string;

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
  sectionType: "reading" | "math" | "ela_a" | "ela_b" | string;

  sectionPassageMarkdown?: string;
  sectionPassageImages?: string[];
  sectionPassageUrl?: string;

  stemMarkdown?: string;
  image?: string;

  /** Choice interactions */
  choices?: string[];

  /** Drag-to-bins interactions (reading) */
  bins?: { id: string; label: string }[];
  options?: { id: string; label: string }[];
  correctBins?: Record<string, string>;

  /** Table-match interactions (reading) */
  tableColumns?: { key: string; header: string }[];
  tableRows?: { id: string; header: string }[];
  tableOptions?: { id: string; label: string }[];
  correctCells?: Record<string, string>;

  /** Cloze-drag interactions (reading) */
  blanks?: { id: string; correctOptionId: string }[];

  /** Short-response interactions (typed) */
  shortResponsePlaceholder?: string;
  correctAnswer?: string | number | Array<string | number>;
  tolerance?: number;
  normalizeText?: boolean;

  /** Interaction + skill on each item */
  interactionType?: InteractionType;
  skillType?: SkillType;
  sourceType?: SourceType;

  selectCount?: number;
  explanationMarkdown?: string;

  globalIndex: number;
  isEnd?: boolean;

  /** Generic section intro pages */
  isIntro?: boolean;
};

const groupLabel = (type: string) => {
  if (type === "reading") return "Reading";
  if (type === "math") return "Mathematics";
  if (type === "ela_a") return "ELA REV/EDIT A";
  if (type === "ela_b") return "ELA REV/EDIT B";
  return type.charAt(0).toUpperCase() + type.slice(1);
};

/** Map section type -> intro page markdown path */
const introMdPathFor = (type: string): string | undefined => {
  if (type === "math") return "/exams/mathpage.md";
  if (type === "reading") return "/exams/readingpage.md";
  if (type === "ela_a") return "/exams/revEditA.md";
  if (type === "ela_b") return "/exams/revEditB.md";
  return undefined;
};

const MD_SECTION_TYPES = new Set(["reading", "ela_a"]);
const isMdType = (t?: string) => (t ? MD_SECTION_TYPES.has(t) : false);

/** Icons used locally (bookmark/review/back) */
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

  /** Section intro markdown cache: type -> md text */
  const [introMd, setIntroMd] = useState<Record<string, string | undefined>>({});

  /** Load all reading sections’ MD on exam change */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!exam) return;
      const bodies: Record<string, string> = {};
      const qsMap: Record<string, MdFrontmatter["questions"]> = {};

      const tasks = exam.sections
        .filter((s: any) => isMdType(s.type) && s.passageMd)
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

  /** Load intro pages (Reading, Math, ELA A, ELA B) for section types present in the exam */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!exam) return;
      const types = Array.from(new Set<string>(exam.sections.map((s: any) => s.type)));
      if (!types.includes("reading")) types.push("reading");
      const entries = await Promise.all(
        types.map(async (t) => {
          const path = introMdPathFor(t);
          if (!path) return [t, undefined] as const;
          try {
            const txt = await fetch(path).then((r) => (r.ok ? r.text() : Promise.reject()));
            return [t, txt] as const;
          } catch {
            return [t, undefined] as const;
          }
        })
      );
      if (!cancelled) setIntroMd(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [exam?.slug]);

  // ===== Flatten ALL questions and inject section intro pages =====
  const { items, introIndexByType } = useMemo(() => {
    if (!exam) return { items: [] as FlatItem[], introIndexByType: {} as Record<string, number> };

    const out: FlatItem[] = [];
    const introIndex: Record<string, number> = {};
    const insertedIntro = new Set<string>();
    let globalIndex = 0;

    exam.sections.forEach((sec: any) => {
      const type: string = sec.type;

      // Insert an intro for each section type once (Reading, Math, ELA A, ELA B)
      if (!insertedIntro.has(type)) {
        introIndex[type] = out.length;
        out.push({
          globalId: `__INTRO__:${type}`,
          sectionId: `__INTRO__:${type}`,
          sectionTitle: groupLabel(type),
          sectionType: type,
          globalIndex, // keep globalIndex aligned to the first question
          isIntro: true,
        });
        insertedIntro.add(type);
      }

      let sectionQuestions: any[] = [];
      if (isMdType(type)) {
        // reading/ELA-A frontmatter
        sectionQuestions = readingQs[sec.id] ?? [];
      } else if (type === "ela_b") {
        sectionQuestions = getQuestionsByIds((sec as any).questionIds ?? []);
      } else if (type === "math") {
        // MATH: prefer IDs from the bank, else fallback to inline
        sectionQuestions = (sec as any).questionIds
          ? getMathQuestionsByIds((sec as any).questionIds)
          : (sec.questions ?? []);
      } else {
        // math (inline)
        sectionQuestions = (sec.questions ?? []);
      }

      (sectionQuestions as any[]).forEach((q: any) => {
        out.push({
          globalId: `${sec.id}:${q.id}`,
          sectionId: sec.id,
          sectionTitle: sec.title,
          sectionType: type,
          sectionPassageMarkdown:
            isMdType(type) ? (readingBodies[sec.id] ?? "") : (sec as any).passageMarkdown,
          sectionPassageImages: (sec as any).passageImages,
          sectionPassageUrl: sec.passageMd ?? (sec as any).passageUrl,
          stemMarkdown: q.stemMarkdown ?? q.promptMarkdown,
          image: q.image,

          // choice
          choices: q.choices,

          // drag_to_bins (reading)
          bins: q.bins,
          options: q.options,
          correctBins: q.correctBins,

          // table_match (reading)
          tableColumns: q.table?.columns,
          tableRows: q.table?.rows,
          tableOptions: q.options,
          correctCells: q.correctCells,

          // cloze_drag (reading)
          blanks: q.blanks,

          // short_response
          shortResponsePlaceholder: q.placeholder ?? q.shortResponsePlaceholder,
          correctAnswer: q.correctAnswer,
          tolerance: q.tolerance,
          normalizeText: q.normalizeText,

          interactionType: q.type ?? "single_select",
          skillType: q.skillType,
          sourceType: q.sourceType ?? (sec as any).sourceType,
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

    return { items: out, introIndexByType: introIndex };
  }, [exam, readingBodies, readingQs]);

  const questionItems = items.filter((i) => !i.isEnd && !i.isIntro);
  const lastIndex = Math.max(0, items.length - 1);

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewTab, setReviewTab] = useState<ReviewTab>("all");
  const reviewWrapRef = useRef<HTMLDivElement>(null);
  const [fetchedPassage, setFetchedPassage] = useState<string | undefined>(undefined);

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
    if (!cur || cur.isEnd || cur.isIntro) return;
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
  const { isEliminated, toggleElim, resetElims } = useEliminator();
  const eliminatorActive = tool === "eliminate";

  // Reset when exam changes
  useEffect(() => {
    resetElims();
    setTool("pointer");
  }, [slug, resetElims]);

  // ===== Submission / Results state =====
  const [submitted, setSubmitted] = useState(false);
  const stickyTopClass = submitted ? "top-14" : "top-0";

  // Toggle the global layout top bar: hide during exam, show on results
  useEffect(() => {
    const bar = document.getElementById("exam-topbar");
    if (!bar) return;
    const shouldShow = submitted;
    bar.classList.toggle("hidden", !shouldShow);
    return () => bar.classList.remove("hidden");
  }, [submitted]);

  useEffect(() => {
    setIdx(0);
    setAnswers({});
    setReviewOpen(false);
    setReviewTab("all");
    setSubmitted(false);
    setTool("pointer");
    resetElims();
  }, [slug, resetElims]);

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
    if (!current || current.isEnd || current.isIntro) return;
    const sec = exam?.sections.find((s: any) => s.id === current.sectionId) as any;
    if (isMdType(sec?.type)) {
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
  }, [current?.sectionId, current?.sectionPassageUrl, current?.isEnd, current?.isIntro, exam?.sections, readingBodies]);

  if (!exam) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-red-600">Exam not found</h1>
        <p className="text-gray-600 mt-2">Check the URL or choose from the exams list.</p>
      </div>
    );
  }

  // Prefer fetched/preloaded content for reading-like sections
  const effectivePassage =
    !current?.isEnd && !current?.isIntro && isMdType(current?.sectionType)
      ? fetchedPassage ??
        (exam.sections.find((s) => s.id === current.sectionId) as any)?.passageMarkdown
      : undefined;

  // Normalize passage images
  const effectivePassageImages = (() => {
    if (current?.isEnd || current?.isIntro || !isMdType(current?.sectionType)) return undefined;
    const sec = exam.sections.find((s: any) => s.id === current?.sectionId) as any;
    const raw = sec?.passageImages;
    const list = Array.isArray(raw)
      ? raw.filter((s: unknown) => typeof s === "string" && s.trim().length > 0)
      : [];
    return list.length ? list : undefined;
  })();

  // Only reading/ela_a use a left passage pane
  const isPassageSection =
    !current?.isEnd && !current?.isIntro && isMdType(current?.sectionType);

  // ===== Progress (GLOBAL) =====
  const questionCount = questionItems.length;
  const questionOrdinal = Math.min(
    current?.isEnd
      ? questionCount
      : current?.isIntro
      ? Math.max(1, items.findIndex((it) => !it.isIntro && !it.isEnd) + 1)
      : (current?.globalIndex ?? 0) + 1,
    questionCount
  );
  const progressPct = questionCount ? Math.round((questionOrdinal / questionCount) * 100) : 0;

  // ===== Helpers =====
  const isAnsweredGid = (gid: string) => {
    const v = answers[gid];
    if (typeof v === "string") return v.trim().length > 0; // short_response
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

  // ===== Submit =====
  const onSubmit = () => {
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ===== Renderers =====
  const renderShortResponse = (it: FlatItem) => {
    const val = (answers[it.globalId] as string) ?? "";
    const moveNext = () => setIdx((i) => Math.min(lastIndex, i + 1));
    return (
      <div className="space-y-2">
        <label className="text-sm text-gray-600">Type your answer:</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="text"
            value={val}
            placeholder={it.shortResponsePlaceholder ?? "Type your answer…"}
            onChange={(e) =>
              setAnswers((prev) => ({ ...prev, [it.globalId]: e.target.value }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") moveNext();
            }}
            className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {val && (
            <button
              type="button"
              onClick={() =>
                setAnswers((prev) => ({ ...prev, [it.globalId]: "" }))
              }
              className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm hover:bg-gray-50"
              title="Clear answer"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderChoices = (it: FlatItem) => {
    if (!Array.isArray(it.choices)) {
      if (it.interactionType === "short_response") return renderShortResponse(it);
      return <p className="text-gray-500">No choices for this item.</p>;
    }
  const isMath = it.sectionType === "math";

    // MULTI
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
              <li key={i} className={`choice-row ${eliminated ? "eliminated" : ""}`}>
                <label
                  className="w-full flex items-start gap-3 cursor-pointer"
                  onClick={(e) => {
                    if (eliminatorActive) {
                      e.preventDefault();
                      toggleElim(it.globalId, i);
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 mt-1"
                    checked={checked}
                    onChange={() => {
                      if (eliminatorActive) return;
                      setAnswers((prev) => {
                        const set = new Set((prev[it.globalId] as number[] | undefined) ?? []);
                        if (checked) set.delete(i);
                        else {
                          if (it.selectCount && set.size >= it.selectCount) return prev;
                          set.add(i);
                        }
                        return { ...prev, [it.globalId]: Array.from(set).sort((a, b) => a - b) };
                      });
                    }}
                  />
                <span className="choice-text flex-1 prose prose-sm max-w-none">
                  {isMath ? (
                    <MathText text={choice} className="inline" />
                  ) : (
                    <ReactMarkdown
                      rehypePlugins={[rehypeRaw]}
                      components={{ p: ({ children }) => <span>{children}</span> }}
                    >
                      {choice}
                    </ReactMarkdown>
                  )}
                </span>
                </label>
              </li>
            );
          })}
        </ul>
      );
    }

    // SINGLE (default)
    return (
      <ul className="space-y-3">
        {it.choices.map((choice, i) => {
          const selected = answers[it.globalId] === i;
          const eliminated = isEliminated(it.globalId, i);

          return (
            <li key={i} className={`choice-row ${eliminated ? "eliminated" : ""}`}>
              <label
                className="w-full flex items-start gap-3 cursor-pointer"
                onClick={(e) => {
                  if (eliminatorActive) {
                    e.preventDefault();
                    toggleElim(it.globalId, i);
                  }
                }}
              >
                <input
                  type="radio"
                  name={it.globalId}
                  className="h-4 w-4 mt-1"
                  checked={!!selected}
                  onChange={() => {
                    if (eliminatorActive) return;
                    setAnswers((prev) => ({ ...prev, [it.globalId]: i }));
                  }}
                />
                <span className="choice-text flex-1 prose prose-sm max-w-none">
                  {isMath ? (
                    <MathText text={choice} className="inline" />
                  ) : (
                    <ReactMarkdown
                      rehypePlugins={[rehypeRaw]}
                      components={{ p: ({ children }) => <span>{children}</span> }}
                    >
                      {choice}
                    </ReactMarkdown>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    );
  };

  // ===== Results page =====
  if (submitted) {
    return (
      <ExamResultsPage
        exam={exam}
        items={items}
        answers={answers}
        readingQs={readingQs as Record<string, any[] | undefined>}
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
          {/* Joined Prev/Next (glossy blue pair) */}
          <div className="nav-pair" role="group" aria-label="Pagination">
            <button
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx === 0}
              className="nav-btn"
              title="Previous"
              aria-label="Previous"
            >
              <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>
            <button
              onClick={() => setIdx((i) => Math.min(lastIndex, i + 1))}
              disabled={idx === lastIndex}
              className="nav-btn"
              title="Next"
              aria-label="Next"
            >
              <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
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
                      const sectionType = qs[0]?.sectionType as string | undefined;
                      const introIdx =
                        sectionType && introIndexByType.hasOwnProperty(sectionType)
                          ? introIndexByType[sectionType]
                          : -1;
                      const hasIntro = introIdx >= 0;

                      return (
                        <div key={group}>
                          <button
                            className={`w-full text-left px-3 py-2 text-[12px] font-semibold ${
                              hasIntro ? "bg-gray-100 hover:bg-gray-200" : "bg-gray-50 hover:bg-gray-100"
                            } border-b border-gray-200`}
                            onClick={() => {
                              if (hasIntro) {
                                setIdx(introIdx);
                                setReviewOpen(false);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }
                            }}
                            title={hasIntro ? `Open ${group} section page` : undefined}
                          >
                            {group}
                            {hasIntro && <span className="ml-2 text-xs text-blue-600">(section page)</span>}
                          </button>

                          {qs.map((q) => {
                            const i = items.findIndex((x) => x.globalId === q.globalId);
                            const active = i === idx;
                            const answered = isAnsweredGid(q.globalId);
                            const bookmarked = bookmarks.has(q.globalId);
                            return (
                              <button
                                key={q.globalId}
                                onClick={() => {
                                  setIdx(i);
                                  setReviewOpen(false);
                                  window.scrollTo({ top: 0, behavior: "smooth" });
                                }}
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
            disabled={current?.isEnd || current?.isIntro}
            className={`inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-sm font-medium ${
              bookmarks.has(current?.globalId ?? "")
                ? "border-blue-600 bg-blue-50 hover:bg-blue-100"
                : "border-gray-400 bg-gradient-to-b from-white to-gray-100 hover:bg-gray-50"
            } ${current?.isEnd || current?.isIntro ? "opacity-50 cursor-not-allowed" : ""}`}
            title="Bookmark Question for Review"
          >
            {bookmarks.has(current?.globalId ?? "") ? <BookmarkFilled /> : <BookmarkOutline />}
            Bookmark
          </button>

          {/* Tools */}
          <ExamToolButtons tool={tool} setTool={setTool} />

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
                : groupLabel(current?.sectionType ?? "")}
            </span>

            {!current?.isIntro && (
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
      {current?.isIntro ? (
        <div className="rounded-2xl bg-white shadow-md border border-gray-200 p-8">
          <div className="max-w-5xl mx-auto">
            <div className="prose md:prose-lg max-w-none">
              {introMd[current.sectionType] ? (
                <ReactMarkdown rehypePlugins={[rehypeRaw]}>{introMd[current.sectionType] as string}</ReactMarkdown>
              ) : (
                <p className="text-gray-600">Loading {groupLabel(current.sectionType)} notes…</p>
              )}
            </div>
          </div>
        </div>
      ) : !current?.isEnd ? (
        current?.sectionType === "math" ? (
          <div className="rounded-2xl bg-white shadow-md border border-gray-200 p-6">
            <div className="rounded-lg border border-gray-200 shadow-sm p-4">
              {current?.stemMarkdown ? (
                <div className="prose max-w-none mb-3 question-stem">
                  <MathText text={current.stemMarkdown} />
                </div>
              ) : null}

              {current?.image && (
                <img
                  src={current.image}
                  alt="question"
                  className="mt-4 max-w-full rounded border border-gray-200"
                />
              )}

              {/* Interaction renderer (math) */}
              {current.interactionType === "short_response" ? (
                renderShortResponse(current)
              ) : (
                renderChoices(current)
              )}
            </div>
          </div>
        ) : isPassageSection ? (
          /* reading / ELA A: with LEFT passage */
          <div className="rounded-2xl bg-white shadow-md border border-gray-200 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: PASSAGE ONLY */}
              <div className="rounded-lg border border-gray-200 shadow-sm p-4">
                <div className="h-[520px] overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
                  <div className="border rounded-md p-6 bg-white">
                    {effectivePassage ? (
                      <div className="prose md:prose-lg max-w-none passage">
                        <ReactMarkdown>{effectivePassage}</ReactMarkdown>
                      </div>
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

              {/* Right: question (reading) */}
              <div className="rounded-lg border border-gray-200 shadow-sm p-4">
                {current?.stemMarkdown ? (
                  <div className="prose max-w-none mb-3 question-stem">
                    <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                      {current.stemMarkdown}
                    </ReactMarkdown>
                  </div>
                ) : null}

                {/* Interaction renderer (reading) */}
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
                  <ClozeDrag
                    blankId={current.blanks?.[0]?.id ?? "blank"}
                    options={(current.options ?? []) as { id: string; label: string }[]}
                    textAfter={current.stemMarkdown ?? ""}
                    value={((answers[current.globalId] as ClozeAnswer) ?? {}) as ClozeAnswer}
                    onChange={(next) =>
                      setAnswers((prev) => ({ ...prev, [current.globalId]: next }))
                    }
                  />
                ) : current.interactionType === "short_response" ? (
                  renderShortResponse(current)
                ) : (
                  renderChoices(current)
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ELA B (and other non-passage types): single column ONLY */
          <div className="rounded-2xl bg-white shadow-md border border-gray-200 p-6">
            <div className="rounded-lg border border-gray-200 shadow-sm p-4">
              {current?.stemMarkdown ? (
                <div className="prose max-w-none mb-3 question-stem">
                  <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                    {current.stemMarkdown}
                  </ReactMarkdown>
                </div>
              ) : null}

              {current?.image && (
                <img
                  src={current.image}
                  alt="question"
                  className="mt-4 max-w-full rounded border border-gray-200"
                />
              )}

              {/* Interaction renderer (non-passage) */}
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
                <ClozeDrag
                  blankId={current.blanks?.[0]?.id ?? "blank"}
                  options={(current.options ?? []) as { id: string; label: string }[]}
                  textAfter={current.stemMarkdown ?? ""}
                  value={((answers[current.globalId] as ClozeAnswer) ?? {}) as ClozeAnswer}
                  onChange={(next) =>
                    setAnswers((prev) => ({ ...prev, [current.globalId]: next }))
                  }
                />
              ) : current.interactionType === "short_response" ? (
                renderShortResponse(current)
              ) : (
                renderChoices(current)
              )}
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
                    onClick={() => {
                      setIdx(i);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
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
      <GlobalNotepad
        active={tool === "notepad"}
        storageKey={slug ? `notes:${slug}` : null}
        onClose={() => setTool("pointer")}
      />
    </div>
  );
}
