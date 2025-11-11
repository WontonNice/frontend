import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";

import { ExamResultsPage } from "./Exams/ExamResultsPage";
import "./Exams/ExamRunnerPage.css"; // reuse existing styles (poem bubbles, nav, etc.)

/** Tech-enhanced interactions used in reading */
import DragToBins from "./Exams/techenhanced/DragToBins";
import TableMatch from "./Exams/techenhanced/TableMatch";
import ClozeDrag from "./Exams/techenhanced/ClozeDrag";
import type { DragAnswer as DragMap, TableAnswer, ClozeAnswer } from "./Exams/techenhanced/types";

/** Tools */
import { useEliminator } from "./Exams/Tools/AnswerEliminator";
import ExamToolButtons from "./Exams/Tools/ToolButtons";
import GlobalNotepad from "./Exams/Tools/GlobalNotepad";
import type { Tool } from "./Exams/Tools/types";

/** Shared answer map type */
import type { AnswerMap } from "./Exams/ExamSharedTypes";

/* ----------------------------- Types ----------------------------- */

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

  /** NEW: images defined in MD front-matter */
  coverImage?: string;   // optional “cover page” image (stored for other code)
  passageImage?: string; // the single image to display with the passage

  questions?: Array<{
    id: string;

    type?: InteractionType;
    skillType?: SkillType;

    stemMarkdown?: string;
    image?: string;

    /** Single-select */
    choices?: any[] | string[];
    answerIndex?: number;
    correctIndex?: number;
    correctId?: string | number;

    /** Multi-select */
    selectCount?: number;
    correctIndices?: number[];
    correctIds?: Array<string | number>;

    /** Drag to bins */
    bins?: { id: string; label: string }[];
    options?: { id: string; label: string }[];
    correctBins?: Record<string, string | number>;

    /** Table match */
    table?: {
      columns: { key: string; header: string }[];
      rows: { id: string; header: string }[];
    };
    correctCells?: Record<string, string | number>;

    /** Cloze drag */
    blanks?: { id: string; correctOptionId: string | number }[];

    explanationMarkdown?: string;
  }>;
};

type FlatItem = {
  globalId: string;
  sectionId: string;
  sectionTitle: string;
  sectionType: "reading" | "ela_a";

  sectionPassageMarkdown?: string;
  sectionPassageUrl?: string;

  stemMarkdown?: string;
  image?: string;

  choices?: any[] | string[];

  answerIndex?: number;
  correctIndex?: number;
  correctIndices?: number[];
  correctId?: string | number;
  correctIds?: Array<string | number>;

  bins?: { id: string; label: string }[];
  options?: { id: string; label: string }[];
  correctBins?: Record<string, string | number>;

  tableColumns?: { key: string; header: string }[];
  tableRows?: { id: string; header: string }[];
  tableOptions?: { id: string; label: string }[];
  correctCells?: Record<string, string | number>;

  blanks?: { id: string; correctOptionId: string | number }[];

  interactionType?: InteractionType;
  skillType?: SkillType;

  selectCount?: number;
  explanationMarkdown?: string;

  globalIndex: number;
  isEnd?: boolean;
};

/* ----------------------- Small utility helpers ----------------------- */

function splitFrontmatter(md: string): { fm: string | null; body: string } {
  // Strip UTF-8 BOM and any leading whitespace/newlines
  const src = md.replace(/^\uFEFF/, "").replace(/^\s+/, "");
  if (!src.startsWith("---")) return { fm: null, body: src };

  const rest = src.slice(3);
  // allow closing fence followed by newline OR end-of-file
  const m = rest.match(/\r?\n---(?:\r?\n|$)/);
  if (!m) return { fm: null, body: src };

  const end = m.index ?? 0;
  const fm = rest.slice(0, end).trim();
  const body = rest.slice(end + m[0].length).replace(/^\s+/, "");
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

const groupLabel = (type: string) => {
  if (type === "reading") return "Reading";
  if (type === "ela_a") return "ELA REV/EDIT A";
  return type.charAt(0).toUpperCase() + type.slice(1);
};

/* ------------ Poem viewer (numbers every N lines) ------------- */
function PoemViewer({
  title,
  author,
  body,
  every = 5,
}: {
  title?: string;
  author?: string;
  body: string;   // poem text with blank lines between stanzas
  every?: number; // show a number every N lines
}) {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  let count = 0;
  return (
    <div className="poem-wrap">
      {title && <h2 className="poem-title">{title}</h2>}
      {author && <div className="poem-author">by {author}</div>}
      <ol className="poem-list">
        {lines.map((ln, i) => {
          const blank = ln.trim() === "";
          if (blank) return <li key={i} className="poem-gap" aria-hidden="true" />;
          count += 1;
          const milestone = count % every === 0;
          return (
            <li
              key={i}
              className={`poem-line${milestone ? " poem-line--milestone" : ""}`}
              data-line={count}
            >
              {ln}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Detect poem marker / structure:
 *  - Optional marker: <!-- poem:every=5 -->
 *  - Or:
 *      ### Title
 *      by Author
 *      <poem lines...>
 */
function tryParsePoem(md: string): {
  ok: boolean; title?: string; author?: string; body: string; every: number;
} {
  let m = md;
  let every = 5;

  const marker = m.match(/^\s*<!--\s*poem(?::\s*every=(\d+))?\s*-->\s*/i);
  if (marker) {
    if (marker[1]) every = parseInt(marker[1], 10) || 5;
    m = m.slice(marker[0].length);
  }

  // If we see "1. " paragraph numbering (for prose), don't treat as poem
  if (!marker && /\n?\s*\d+\.\s/.test(m)) return { ok: false, body: md, every };

  const lines = m.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i++;

  const head = lines[i]?.match(/^\s{0,3}#{1,3}\s+(.*)$/);
  if (!head && !marker) return { ok: false, body: md, every };
  const title = head ? head[1].trim() : undefined;
  if (head) i++;

  while (i < lines.length && lines[i].trim() === "") i++;
  let author: string | undefined;
  const by = lines[i]?.match(/^\s*by\s+(.+)\s*$/i);
  if (by) { author = by[1].trim(); i++; }

  const body = lines.slice(i).join("\n").trim();

  if (!marker) {
    const nonEmpty = body.split("\n").filter(l => l.trim() !== "");
    if (nonEmpty.length < 6) return { ok: false, body: md, every };
    const shortish = nonEmpty.filter(l => l.length <= 60).length / nonEmpty.length >= 0.7;
    if (!shortish) return { ok: false, body: md, every };
  }

  return { ok: true, title, author, body, every };
}

function renderPassageWithPoemSupport(md: string) {
  const p = tryParsePoem(md);
  if (p.ok) {
    return (
      <div className="prose md:prose-lg max-w-none passage">
        <PoemViewer title={p.title} author={p.author} body={p.body} every={p.every} />
      </div>
    );
  }
  return (
    <div className="prose md:prose-lg max-w-none passage">
      <ReactMarkdown rehypePlugins={[rehypeRaw]}>{md}</ReactMarkdown>
    </div>
  );
}

/* ------------------------- Icon components ------------------------- */

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

/* =========================== Runner =========================== */

export default function ReadingRunnerPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const mdParam = params.get("md") || undefined; // e.g. /exams/readingpassages/Merry-Autumn.md
  const SECTION_ID = "reading-1";

  // Loaded from the MD file
  const [passageBody, setPassageBody] = useState<string>("");
  const [questions, setQuestions] = useState<MdFrontmatter["questions"]>([]);
  const [title, setTitle] = useState<string>("Reading Practice");

  /** NEW: single passage image rendered with the passage; cover stored for other code */
  const [passageImage, setPassageImage] = useState<string | undefined>(undefined);
  const [coverImage, setCoverImage] = useState<string | undefined>(undefined);

  // Flattened items
  const items: FlatItem[] = useMemo(() => {
    const out: FlatItem[] = [];
    let globalIndex = 0;
    (questions ?? []).forEach((q) => {
      out.push({
        globalId: `${SECTION_ID}:${q.id}`,
        sectionId: SECTION_ID,
        sectionTitle: "Reading Passage",
        sectionType: "reading",
        sectionPassageMarkdown: passageBody,

        stemMarkdown: q.stemMarkdown,
        image: q.image,
        choices: q.choices,

        answerIndex: q.answerIndex,
        correctIndex: q.correctIndex,
        correctIndices: q.correctIndices,
        correctId: q.correctId,
        correctIds: q.correctIds,

        bins: q.bins,
        options: q.options,
        correctBins: q.correctBins,

        tableColumns: q.table?.columns,
        tableRows: q.table?.rows,
        tableOptions: q.options,
        correctCells: q.correctCells,

        blanks: q.blanks,

        interactionType: q.type ?? "single_select",
        skillType: q.skillType,
        selectCount: q.selectCount,
        explanationMarkdown: q.explanationMarkdown,

        globalIndex: globalIndex++,
      });
    });

    out.push({
      globalId: "__END__",
      sectionId: "__END__",
      sectionTitle: "End",
      sectionType: "reading",
      globalIndex,
      isEnd: true,
    });

    return out;
  }, [questions, passageBody]);

  const readingQsMap = useMemo(
    () => ({ [SECTION_ID]: questions ?? [] }),
    [questions]
  );

  const questionItems = items.filter((i) => !i.isEnd);
  const lastIndex = Math.max(0, items.length - 1);

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewTab, setReviewTab] = useState<"all" | "unanswered" | "bookmarked">("all");
  const reviewWrapRef = useRef<HTMLDivElement>(null);

  // ===== Bookmark state =====
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const bmStorageKey = mdParam ? `bm:reading:${mdParam}` : null;
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
    if (!cur || cur.isEnd) return;
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

  // Reset on change
  useEffect(() => {
    setIdx(0);
    setAnswers({});
    setReviewOpen(false);
    setReviewTab("all");
    setTool("pointer");
    resetElims();
  }, [mdParam, resetElims]);

  // Click outside to close review
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!reviewWrapRef.current) return;
      if (!reviewWrapRef.current.contains(e.target as Node)) setReviewOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // ===== Load MD file =====
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!mdParam) return;

      // Support absolute "/exams/..." or relative "OfficialSHSATReadingPassages/..."
      const url = mdParam.startsWith("/") ? mdParam : `/exams/readingpassages/${mdParam}`;

      const resolveImg = (img?: string) => {
        if (!img) return undefined;
        const trimmed = img.trim();
        if (!trimmed) return undefined;
        if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")) return trimmed;
        // resolve relative to the MD file directory
        const idx = url.lastIndexOf("/");
        const base = idx >= 0 ? url.slice(0, idx + 1) : "/";
        return base + trimmed;
      };

      try {
        const txt = await fetch(url).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))));
        const { fm, body } = splitFrontmatter(txt);
        const meta = await parseYaml(fm);
        if (cancelled) return;

        setPassageBody(body || "");
        setQuestions(Array.isArray(meta.questions) ? (meta.questions as any[]) : []);
        setTitle(meta.title || "Reading Practice");

        // NEW: grab images from MD
        setPassageImage(resolveImg(meta.passageImage));
        setCoverImage(resolveImg(meta.coverImage));
      } catch (e) {
        if (!cancelled) {
          setPassageBody("");
          setQuestions([]);
          setTitle("Reading Practice");
          setPassageImage(undefined);
          setCoverImage(undefined);
          console.error("Failed to load passage:", e);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [mdParam]);

  // ===== Current item + status =====
  const current = items[idx];

  const questionCount = questionItems.length;
  const questionOrdinal = Math.min(current?.isEnd ? questionCount : (current?.globalIndex ?? 0) + 1, questionCount);
  const progressPct = questionCount ? Math.round((questionOrdinal / questionCount) * 100) : 0;

  const isAnsweredGid = (gid: string) => {
    const v = answers[gid];
    if (typeof v === "number") return true;
    if (typeof v === "string") return v.trim().length > 0;
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

  const onSubmit = () => {
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const [submitted, setSubmitted] = useState(false);
  const stickyTopClass = submitted ? "top-14" : "top-0";

  // ===== Choice helpers =====
  const renderChoiceText = (choice: any): string => {
    if (typeof choice === "string") return choice;
    return (
      (choice?.label ??
        choice?.text ??
        choice?.value ??
        (choice?.id != null ? String(choice.id) : "")) ?? ""
    ).toString();
  };

  const renderStemBlock = (it: FlatItem) => {
    if (!it?.stemMarkdown) return null;
    return (
      <div className="prose max-w-none mb-3 question-stem">
        <ReactMarkdown rehypePlugins={[rehypeRaw]}>{it.stemMarkdown}</ReactMarkdown>
      </div>
    );
  };

  const renderChoices = (it: FlatItem) => {
    if (!Array.isArray(it.choices)) {
      return <p className="text-gray-500">No choices for this item.</p>;
    }

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
                          if (it.selectCount && set.size >= it.selectCount) return prev; // cap
                          set.add(i);
                        }
                        return { ...prev, [it.globalId]: Array.from(set).sort((a, b) => a - b) };
                      });
                    }}
                  />
                  <span className="choice-text flex-1 prose prose-sm max-w-none">
                    <ReactMarkdown rehypePlugins={[rehypeRaw]} components={{ p: ({ children }) => <span>{children}</span> }}>
                      {renderChoiceText(choice)}
                    </ReactMarkdown>
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
                  <ReactMarkdown rehypePlugins={[rehypeRaw]} components={{ p: ({ children }) => <span>{children}</span> }}>
                    {renderChoiceText(choice)}
                  </ReactMarkdown>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    );
  };

  // ===== Results =====
  if (submitted) {
    const fauxExam = {
      slug: `reading:${mdParam || "unknown"}`,
      title,
      sections: [{ id: SECTION_ID, title: "Reading Passage", type: "reading", passageMd: mdParam }],
    } as any;

    return (
      <ExamResultsPage
        exam={fauxExam}
        items={items}
        answers={answers}
        readingQs={readingQsMap as Record<string, any[] | undefined>}
        stickyTopClass={stickyTopClass}
      />
    );
  }

  if (!mdParam) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-red-600">Missing passage</h1>
        <p className="text-gray-600 mt-2">
          Launch this page with a <code>?md=</code> query, e.g.{" "}
          <code>/reading-runner?md=/exams/readingpassages/Merry-Autumn.md</code>
        </p>
      </div>
    );
  }

  const currentIsEnd = current?.isEnd;

  return (
    <div className="space-y-4">
      {/* ======= Toolbar + Status ======= */}
      <div className={`sticky ${stickyTopClass} z-30 full-bleed`}>
        <div className="w-full flex items-center gap-2 bg-white border-b border-gray-300 px-4 py-1 shadow-sm">
          {/* Prev/Next pair */}
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
                    <button
                      className="w-full text-left px-3 py-2 text-[12px] font-semibold bg-gray-100 border-b border-gray-200"
                      disabled
                    >
                      {groupLabel("reading")}
                    </button>

                    {filteredItems.map((q) => {
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
                          title={`Question ${q.globalIndex + 1}`}
                        >
                          <span className={`h-2 w-2 rounded-full ${answered ? "bg-green-500" : "bg-orange-500"}`} />
                          <span className="flex-1">Question {q.globalIndex + 1}</span>
                          {bookmarked && <BookmarkFilled className="h-3.5 w-3.5" />}
                        </button>
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
            disabled={currentIsEnd}
            className={`inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-sm font-medium ${
              bookmarks.has(current?.globalId ?? "")
                ? "border-blue-600 bg-blue-50 hover:bg-blue-100"
                : "border-gray-400 bg-gradient-to-b from-white to-gray-100 hover:bg-gray-50"
            } ${currentIsEnd ? "opacity-50 cursor-not-allowed" : ""}`}
            title="Bookmark Question for Review"
          >
            {bookmarks.has(current?.globalId ?? "") ? <BookmarkFilled /> : <BookmarkOutline />}
            Bookmark
          </button>

          {/* Tools */}
          <ExamToolButtons tool={tool} setTool={setTool} />

          <div className="flex-1" />

          <button
            onClick={() => navigate("/study/reading")}
            className="inline-flex items-center gap-1.5 rounded border border-gray-400 bg-gradient-to-b from-white to-gray-100 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
            title="Back to Reading"
          >
            <BackArrowIcon className="h-4 w-4" />
            Back to Reading
          </button>
        </div>

        {/* Cyan hairline + Dark status bar */}
        <div className="h-[3px] bg-sky-500 border-t border-gray-300" />
        <div className="w-full bg-[#5e5e5e] text-white text-[13px]">
          <div className="flex items-center gap-2 px-6 py-1">
            <span className="font-semibold">{title.toUpperCase()}</span>
            <span>/</span>
            <span>Reading</span>
            <span>/</span>
            <span>
              {currentIsEnd ? `${questionCount} OF ${questionCount}` : `${questionOrdinal} OF ${questionCount}`}
            </span>
            <span>/</span>
            <div className="w-40 h-1.5 bg-[#3f3f3f] rounded">
              <div className="h-1.5 rounded bg-[#a0a0a0]" style={{ width: `${progressPct}%` }} />
            </div>
            <span>{progressPct}%</span>
          </div>
        </div>
      </div>

      {/* ======= Main Sheet ======= */}
      {!currentIsEnd ? (
        <div className="rounded-2xl bg-white shadow-md border border-gray-200 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: PASSAGE */}
            <div className="rounded-lg border border-gray-200 shadow-sm p-4">
              <div className="h-[520px] overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
                <div className="border rounded-md p-6 bg-white">
                  {/* NEW: single passage image from MD front-matter */}
                  {passageImage && (
                    <div className="mb-4">
                      <img
                        src={passageImage}
                        alt=""
                        className="max-w-full h-auto rounded-md border border-gray-200 mx-auto"
                      />
                    </div>
                  )}

                  {passageBody ? (
                    renderPassageWithPoemSupport(passageBody)
                  ) : (
                    <p className="text-gray-500">No passage loaded.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right: QUESTION */}
            <div className="rounded-lg border border-gray-200 shadow-sm p-4">
              {/* Stem */}
              {current?.stemMarkdown ? renderStemBlock(current) : null}

              {/* Optional image */}
              {current?.image && (
                <img
                  src={current.image}
                  alt="question"
                  className="mt-4 max-w-full rounded border border-gray-200"
                />
              )}

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
                <ClozeDrag
                  blankId={current.blanks?.[0]?.id ?? "blank"}
                  options={(current.options ?? []) as { id: string; label: string }[]}
                  textAfter={current.stemMarkdown ?? ""}
                  value={((answers[current.globalId] as ClozeAnswer) ?? {}) as ClozeAnswer}
                  onChange={(next) => setAnswers((prev) => ({ ...prev, [current.globalId]: next }))}
                />
              ) : (
                renderChoices(current)
              )}
            </div>
          </div>
        </div>
      ) : (
        // End-of-Section page
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

            {/* All questions */}
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
        storageKey={mdParam ? `notes:reading:${mdParam}` : null}
        onClose={() => setTool("pointer")}
      />
    </div>
  );
}
