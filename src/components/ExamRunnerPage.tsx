// src/components/ExamRunnerPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getExamBySlug } from "../data/exams";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";

/** Stores selected choice index per question (keyed by globalId) */
type AnswerMap = Record<string, number | undefined>;
type ReviewTab = "all" | "unanswered" | "bookmarked";
type Tool = "pointer" | "eliminate" | "notepad";

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
  choices?: string[];

  globalIndex: number; // 0-based across entire exam
  isEnd?: boolean;
  isMathIntro?: boolean; // special math transition page
};

type ResultRow = {
  globalId: string;
  globalNumber: number; // 1-based
  displayGroup: string;
  userIndex: number | undefined;
  correctIndex: number | undefined;
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

  // ===== Flatten ALL questions (continuous numbering) and inject a Math intro page =====
  const { items, mathIntroIndex } = useMemo(() => {
    if (!exam) return { items: [] as FlatItem[], mathIntroIndex: -1 };

    const out: FlatItem[] = [];
    let globalIndex = 0;
    let insertedMathIntro = false;
    let mathIntroIdx = -1;

    exam.sections.forEach((sec) => {
      // Insert a math transition page BEFORE the first math question
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

      sec.questions.forEach((q) => {
        out.push({
          globalId: `${sec.id}:${q.id}`,
          sectionId: sec.id,
          sectionTitle: sec.title,
          sectionType: sec.type,
          sectionPassageMarkdown: (sec as any).passageMarkdown,
          sectionPassageImages: (sec as any).passageImages,
          sectionPassageUrl: (sec as any).passageMd ?? (sec as any).passageUrl,
          stemMarkdown: (q as any).stemMarkdown ?? (q as any).promptMarkdown,
          image: (q as any).image,
          choices: (q as any).choices,
          globalIndex: globalIndex++,
        });
      });
    });

    // End marker
    out.push({
      globalId: "__END__",
      sectionId: "__END__",
      sectionTitle: "End",
      sectionType: "end",
      globalIndex,
      isEnd: true,
    });

    return { items: out, mathIntroIndex: mathIntroIdx };
  }, [exam]);

  const questionItems = items.filter((i) => !i.isEnd && !i.isMathIntro);
  const lastIndex = Math.max(0, items.length - 1);

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewTab, setReviewTab] = useState<ReviewTab>("all");
  const reviewWrapRef = useRef<HTMLDivElement>(null);

  // fetched passage content (if section provides `passageMd`)
  const [fetchedPassage, setFetchedPassage] = useState<string | undefined>(undefined);

  // ===== Math intro markdown (from public/exams/mathpage.md) =====
  const [mathIntroMd, setMathIntroMd] = useState<string | undefined>(undefined);
  useEffect(() => {
    fetch("/exams/mathpage.md")
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((txt) => setMathIntroMd(txt))
      .catch(() => setMathIntroMd(undefined));
  }, []);

  // ===== Bookmark state (persist per exam) =====
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
    localStorage.setItem(bmStorageKey, JSON.stringify(Array.from(next)));
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
    localStorage.setItem(notesKey, notesText);
  }, [notesKey, notesText]);
  useEffect(() => {
    setNotesOpen(tool === "notepad");
  }, [tool]);

  // ===== Eliminated choices per question =====
  const [elims, setElims] = useState<Record<string, number[]>>({});
  const isEliminated = (gid: string, i: number) => new Set(elims[gid] || []).has(i);
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
  } | null>(null);
  const stickyTopClass = submitted && results ? "top-14" : "top-0";

  // Toggle the global layout top bar: hide during exam, show on results
   useEffect(() => {
   const bar = document.getElementById("exam-topbar");
   if (!bar) return;
   const shouldShow = submitted && !!results;
   bar.classList.toggle("hidden", !shouldShow);
   // ensure it’s restored if this component unmounts
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

  // ===== fetch external passage if section provides a `passageMd`/`passageUrl` =====
  const current = items[idx];
  useEffect(() => {
    setFetchedPassage(undefined);
    if (!current || current.isEnd || current.isMathIntro) return;

    let url = current.sectionPassageUrl;
    if (!url) return;

    if (!url.startsWith("/")) {
      url = `/exams/readingpassages/${url}`;
    }

    fetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((txt) => setFetchedPassage(txt))
      .catch(() => setFetchedPassage(undefined));
  }, [current?.sectionId, current?.sectionPassageUrl, current?.isEnd, current?.isMathIntro]);

  if (!exam) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-red-600">Exam not found</h1>
        <p className="text-gray-600 mt-2">Check the URL or choose from the exams list.</p>
      </div>
    );
  }

  // Prefer fetched content...
  const effectivePassage =
    !current?.isEnd && !current?.isMathIntro && current?.sectionType !== "math"
      ? fetchedPassage ??
        (exam.sections.find((s) => s.id === current.sectionId) as any)?.passageMarkdown
      : undefined;

  const effectivePassageImages =
    !current?.isEnd && !current?.isMathIntro && current?.sectionType !== "math"
      ? (exam.sections.find((s) => s.id === current.sectionId) as any)?.passageImages
      : undefined;

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

  // ===== Review helpers =====
  const isAnswered = (gid: string) => typeof answers[gid] === "number";
  const unansweredCount = questionItems.filter((q) => !isAnswered(q.globalId)).length;
  const bookmarkedCount = questionItems.filter((q) => bookmarks.has(q.globalId)).length;

  const filteredItems = useMemo(() => {
    switch (reviewTab) {
      case "unanswered":
        return questionItems.filter((q) => !isAnswered(q.globalId));
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

  // ===== Submit & Score =====
  const letter = (i?: number) => (i == null || i < 0 ? "-" : String.fromCharCode(65 + i));
  const getCorrectIndex = (q: any): number | undefined => {
    const v = (q as any)?.answerIndex;
    return typeof v === "number" ? v : undefined;
  };

  const computeResults = () => {
    const rows: ResultRow[] = [];
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;
    let scoredCount = 0;

    let g = 0;
    exam?.sections.forEach((sec) => {
      const displayGroup = groupLabel(sec.type);
      sec.questions.forEach((q) => {
        const globalId = `${sec.id}:${q.id}`;
        const userIndex = answers[globalId];
        const correctIndex = getCorrectIndex(q);
        const choices = (q as any).choices as string[] | undefined;

        if (correctIndex != null) {
          scoredCount++;
          if (userIndex == null) unansweredCount++;
          else if (userIndex === correctIndex) correctCount++;
          else incorrectCount++;
        } else if (userIndex == null) {
          unansweredCount++;
        }

        rows.push({
          globalId,
          globalNumber: g + 1,
          displayGroup,
          userIndex,
          correctIndex,
          choices,
        });
        g++;
      });
    });

    setResults({ rows, correctCount, incorrectCount, unansweredCount, scoredCount });
  };

  const onSubmit = () => {
    computeResults();
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ===== Results page =====
  if (submitted && results) {
    const { correctCount, incorrectCount, unansweredCount, scoredCount, rows } = results;
    const percent = scoredCount ? Math.round((correctCount / scoredCount) * 100) : 0;
    const wrongRows = rows.filter(
      (r) => r.correctIndex != null && r.userIndex != null && r.userIndex !== r.correctIndex
    );

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
            <div className="mt-1 text-gray-600 text-sm">
              Incorrect: {incorrectCount} &nbsp;·&nbsp; Unanswered: {unansweredCount}
            </div>

            <div className="mt-5 flex gap-2 justify-center">
              <button
                onClick={() => {
                  const firstWrong = wrongRows[0];
                  if (!firstWrong) return;
                  const i = items.findIndex((x) => x.globalId === firstWrong.globalId);
                  setSubmitted(false);
                  jumpTo(i);
                }}
                disabled={wrongRows.length === 0}
                className={`px-4 py-2 rounded-md text-white ${
                  wrongRows.length ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-300 cursor-not-allowed"
                }`}
              >
                Review Incorrect Questions
              </button>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setIdx(0);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="px-4 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50"
              >
                Back to Exam
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-2">Questions you got wrong</h3>
            {wrongRows.length === 0 ? (
              <p className="text-gray-600">Nice! You didn’t miss any scored questions.</p>
            ) : (
              <div className="divide-y divide-gray-200">
                {wrongRows.map((r) => {
                  const i = items.findIndex((x) => x.globalId === r.globalId);
                  return (
                    <div key={r.globalId} className="py-3 flex items-center gap-3">
                      <button
                        onClick={() => {
                          setSubmitted(false);
                          jumpTo(i);
                        }}
                        className="shrink-0 px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 border border-gray-300"
                        title="Jump to this question"
                      >
                        Q{r.globalNumber} · {r.displayGroup}
                      </button>
                      <div className="text-sm">
                        <div>
                          Your answer: <span className="font-semibold">{letter(r.userIndex)}</span>
                          {r.choices && r.userIndex != null ? ` — ${r.choices[r.userIndex]}` : ""}
                        </div>
                        <div>
                          Correct answer: <span className="font-semibold">{letter(r.correctIndex)}</span>
                          {r.choices && r.correctIndex != null ? ` — ${r.choices[r.correctIndex]}` : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ===== Normal exam UI (includes Math intro and End-of-Exam screen) =====
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
                            const answered = isAnswered(q.globalId);
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

          {/* Tool buttons — now placed RIGHT NEXT to Bookmark */}
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

          {/* Spacer then Back to Exams on the far right of same bar */}
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

              {current?.choices ? (
                <ul className="space-y-3 mt-4">
                  {current.choices.map((choice, i) => {
                    const selected = answers[current.globalId] === i;
                    const eliminated = isEliminated(current.globalId, i);
                    return (
                      <li key={i}>
                        <label className="flex items-start gap-3 cursor-pointer relative">
                          <input
                            type="radio"
                            name={current.globalId}
                            className="h-4 w-4 mt-1"
                            checked={selected}
                            onChange={() => {
                              if (eliminatorActive) {
                                toggleElim(current.globalId, i);
                              } else {
                                selectChoice(i);
                              }
                            }}
                          />
                          <span className={`flex-1 choice-line ${eliminated ? "eliminated" : ""}`}>
                            {choice}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-gray-500">No choices for this item.</p>
              )}
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

                {current?.choices ? (
                  <ul className="space-y-3">
                    {current.choices.map((choice, i) => {
                      const selected = answers[current.globalId] === i;
                      const eliminated = isEliminated(current.globalId, i);
                      return (
                        <li key={i}>
                          <label className="flex items-start gap-3 cursor-pointer relative">
                            <input
                              type="radio"
                              name={current.globalId}
                              className="h-4 w-4 mt-1"
                              checked={selected}
                              onChange={() => {
                                if (eliminatorActive) {
                                  toggleElim(current.globalId, i);
                                } else {
                                  selectChoice(i);
                                }
                              }}
                            />
                            <span className={`flex-1 choice-line ${eliminated ? "eliminated" : ""}`}>
                              {choice}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-gray-500">No choices for this item.</p>
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
                const answered = typeof answers[q.globalId] === "number";
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
