// src/components/ExamRunnerPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getExamBySlug } from "../data/exams";
import ReactMarkdown from "react-markdown";

/** Stores selected choice index per question (keyed by globalId) */
type AnswerMap = Record<string, number | undefined>;
type ReviewTab = "all" | "unanswered" | "bookmarked";

type FlatItem = {
  globalId: string;
  sectionId: string;
  sectionTitle: string;
  sectionType: "reading" | "math" | string;
  // Passage sources
  sectionPassageMarkdown?: string;
  sectionPassageImages?: string[];
  sectionPassageUrl?: string;
  // Question props
  qIndexInSection: number; // 0-based index within the section
  qTotalInSection: number;
  stemMarkdown?: string;
  image?: string;
  choices?: string[];
  // Special end marker
  isEnd?: boolean;
};

type ResultRow = {
  globalId: string;
  indexInAll: number; // 0-based in flattened list (questions only)
  sectionTitle: string;
  qNumberInSection: number; // 1-based
  userIndex: number | undefined;
  correctIndex: number | undefined;
  choices?: string[];
};

export default function ExamRunnerPage() {
  const { slug } = useParams<{ slug: string }>();
  const exam = slug ? getExamBySlug(slug) : undefined;

  // ===== Flatten all questions, then append ONE end-of-exam marker at the very end =====
  const items = useMemo<FlatItem[]>(() => {
    if (!exam) return [];
    const out: FlatItem[] = [];

    exam.sections.forEach((sec) => {
      sec.questions.forEach((q, i) => {
        out.push({
          globalId: `${sec.id}:${q.id}`,
          sectionId: sec.id,
          sectionTitle: sec.title,
          sectionType: sec.type,
          sectionPassageMarkdown: (sec as any).passageMarkdown,
          sectionPassageImages: (sec as any).passageImages,
          sectionPassageUrl: (sec as any).passageMd ?? (sec as any).passageUrl,
          qIndexInSection: i,
          qTotalInSection: sec.questions.length,
          stemMarkdown: (q as any).stemMarkdown ?? (q as any).promptMarkdown,
          image: (q as any).image,
          choices: (q as any).choices,
        });
      });
    });

    // Append one end-of-exam marker
    out.push({
      globalId: "__END__",
      sectionId: "__END__",
      sectionTitle: "End",
      sectionType: "end",
      qIndexInSection: 0,
      qTotalInSection: 0,
      isEnd: true,
    });

    return out;
  }, [exam]);

  const questionItems = items.filter((it) => !it.isEnd);
  const lastIndex = Math.max(0, items.length - 1); // includes the end marker index

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewTab, setReviewTab] = useState<ReviewTab>("all");
  const reviewWrapRef = useRef<HTMLDivElement>(null);

  // fetched passage content (if section provides `passageMd`)
  const [fetchedPassage, setFetchedPassage] = useState<string | undefined>(undefined);

  // ===== Bookmark state (persist per exam) =====
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const bmStorageKey = slug ? `bm:${slug}` : null;
  useEffect(() => {
    if (!bmStorageKey) return;
    try {
      const raw = localStorage.getItem(bmStorageKey);
      if (raw) setBookmarks(new Set(JSON.parse(raw)));
      else setBookmarks(new Set());
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
    if (!cur || cur.isEnd) return;
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(cur.globalId)) next.delete(cur.globalId);
      else next.add(cur.globalId);
      saveBookmarks(next);
      return next;
    });
  };

  // ===== Highlighter state (persist to localStorage) =====
  const passageRef = useRef<HTMLDivElement>(null); // inner content container
  const [savedHtml, setSavedHtml] = useState<string | null>(null);
  const [hlOpen, setHlOpen] = useState(false);
  const [hlPos, setHlPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const selectionRangeRef = useRef<Range | null>(null);

  // ===== Submission / Results state =====
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<{
    rows: ResultRow[];
    correctCount: number;
    incorrectCount: number;
    unansweredCount: number;
    scoredCount: number; // questions with a known correct answer
  } | null>(null);

  useEffect(() => {
    setIdx(0);
    setAnswers({});
    setReviewOpen(false);
    setReviewTab("all");
    setSubmitted(false);
    setResults(null);
  }, [slug]);

  // Keyboard nav + close review on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIdx((i) => Math.min(lastIndex, i + 1));
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
      if (e.key === "Escape") setReviewOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lastIndex]);

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
    if (!current || current.isEnd) return;

    let url = current.sectionPassageUrl;
    if (!url) return;

    if (!url.startsWith("/")) {
      url = `/exams/readingpassages/${url}`;
    }

    fetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((txt) => setFetchedPassage(txt))
      .catch(() => setFetchedPassage(undefined));
  }, [current?.sectionId, current?.sectionPassageUrl, current?.isEnd]);

  if (!exam) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-red-600">Exam not found</h1>
        <p className="text-gray-600 mt-2">Check the URL or choose from the exams list.</p>
      </div>
    );
  }

  const sectionForCurrent =
    !current?.isEnd && exam.sections.find((s) => s.id === current?.sectionId);

  // Prefer fetched content (from .md), then fall back to inline JSON passage
  const effectivePassage =
    !current?.isEnd
      ? fetchedPassage ?? current?.sectionPassageMarkdown ?? (sectionForCurrent as any)?.passageMarkdown
      : undefined;

  const effectivePassageImages =
    !current?.isEnd
      ? current?.sectionPassageImages ?? (sectionForCurrent as any)?.passageImages
      : undefined;

  // Progress (exclude END page)
  const questionCount = questionItems.length;
  const questionOrdinal = Math.min(idx + 1, questionCount);
  const progressPct = questionCount ? Math.round((questionOrdinal / questionCount) * 100) : 0;

  const goPrev = () => setIdx((i) => Math.max(0, i - 1));
  const goNext = () => setIdx((i) => Math.min(lastIndex, i + 1));
  const jumpTo = (i: number) => {
    setIdx(i);
    setReviewOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const selectChoice = (choiceIndex: number) => {
    if (!current || current.isEnd) return;
    setAnswers((prev) => ({ ...prev, [current.globalId]: choiceIndex }));
  };

  // ===== Load saved highlights for this exam/section =====
  const hlStorageKey = slug && !current?.isEnd && current?.sectionId ? `hl:${slug}:${current.sectionId}` : null;
  useEffect(() => {
    if (!hlStorageKey) {
      setSavedHtml(null);
      return;
    }
    const html = localStorage.getItem(hlStorageKey);
    setSavedHtml(html);
  }, [hlStorageKey]);

  // ===== Selection handlers: fixed-position palette (only on question pages) =====
  useEffect(() => {
    if (!current || current.isEnd) return; // no highlighter on END / results page
    const el = passageRef.current;
    if (!el) return;

    const isInside = (node: Node | null) => {
      if (!node) return false;
      let cur: Node | null = node;
      while (cur) {
        if (cur === el) return true;
        cur = (cur as any).parentNode || (cur as any).host || null;
      }
      return false;
    };

    const getSafeRect = (range: Range): DOMRect => {
      const rect = range.getBoundingClientRect();
      if (rect && (rect.width > 0 || rect.height > 0)) return rect;

      const marker = document.createElement("span");
      marker.style.display = "inline-block";
      marker.style.width = "1px";
      marker.style.height = "1em";
      marker.style.verticalAlign = "text-bottom";
      const clone = range.cloneRange();
      clone.collapse(false);
      clone.insertNode(marker);
      const safe = marker.getBoundingClientRect();
      const parent = marker.parentNode!;
      parent.removeChild(marker);
      return safe;
    };

    let lastShown = false;

    const openIfValidSelection = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        setHlOpen(false);
        selectionRangeRef.current = null;
        lastShown = false;
        return;
      }

      const range = sel.getRangeAt(0);

      if (
        range.collapsed ||
        String(sel).trim() === "" ||
        !isInside(sel.anchorNode) ||
        !isInside(sel.focusNode)
      ) {
        setHlOpen(false);
        selectionRangeRef.current = null;
        lastShown = false;
        return;
      }

      selectionRangeRef.current = range.cloneRange();

      const rect = getSafeRect(range);
      const x = Math.max(8, Math.min(rect.left + rect.width / 2, window.innerWidth - 8));
      const y = Math.max(8, rect.top - 8);
      setHlPos({ x, y });
      setHlOpen(true);
      lastShown = true;
    };

    const onMouseUp = () => requestAnimationFrame(openIfValidSelection);
    const onKeyUp = () => requestAnimationFrame(openIfValidSelection);
    const onSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        if (lastShown) setHlOpen(false);
        selectionRangeRef.current = null;
        lastShown = false;
      }
    };
    const onScroll = () => {
      if (lastShown) setHlOpen(false);
    };
    const onDocMouseDown = (e: MouseEvent) => {
      const palette = document.querySelector("[data-hl-palette]");
      const t = e.target as Node | null;
      if (palette && t && (palette === t || palette.contains(t))) return;
      if (!t || !isInside(t)) setHlOpen(false);
    };

    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("selectionchange", onSelectionChange);
    document.addEventListener("mousedown", onDocMouseDown);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("selectionchange", onSelectionChange);
      document.removeEventListener("mousedown", onDocMouseDown);
      window.removeEventListener("scroll", onScroll);
    };
  }, [slug, current?.sectionId, current?.isEnd]);

  // ===== Apply / remove highlight helpers =====
  function saveHtml() {
    if (!hlStorageKey || !passageRef.current) return;
    const html = passageRef.current.innerHTML;
    localStorage.setItem(hlStorageKey, html);
    setSavedHtml(html);
  }
  function wrapSelection(color: "blue" | "pink") {
    const range = selectionRangeRef.current;
    if (!range || !passageRef.current) return;
    try {
      const mark = document.createElement("mark");
      mark.setAttribute("data-hl", color);
      mark.className = `hl hl-${color}`;
      range.surroundContents(mark);
    } catch {
      const contents = range.cloneContents();
      const walker = document.createTreeWalker(contents, NodeFilter.SHOW_TEXT);
      const pieces: { text: string }[] = [];
      while (walker.nextNode()) pieces.push({ text: walker.currentNode!.textContent || "" });
      if (pieces.length) {
        const span = document.createElement("span");
        pieces.forEach((p, i) => {
          const m = document.createElement("mark");
          m.setAttribute("data-hl", color);
          m.className = `hl hl-${color}`;
          m.textContent = p.text;
          span.appendChild(m);
          if (i < pieces.length - 1) span.appendChild(document.createTextNode(""));
        });
        range.deleteContents();
        range.insertNode(span);
      }
    }
    setHlOpen(false);
    saveHtml();
  }
  function eraseSelection() {
    const range = selectionRangeRef.current;
    if (!range || !passageRef.current) return;
    const toUnwrap: HTMLElement[] = [];
    const ancestor = range.commonAncestorContainer;
    const container: Element =
      ancestor.nodeType === 1 ? (ancestor as Element) : (ancestor.parentElement!);
    container.querySelectorAll("mark.hl").forEach((m) => {
      const r = document.createRange();
      r.selectNodeContents(m);
      const overlaps = !(
        range.compareBoundaryPoints(Range.END_TO_START, r) <= 0 ||
        range.compareBoundaryPoints(Range.START_TO_END, r) >= 0
      );
      if (overlaps) toUnwrap.push(m as HTMLElement);
    });
    toUnwrap.forEach((m) => {
      const parent = m.parentNode!;
      while (m.firstChild) parent.insertBefore(m.firstChild, m);
      parent.removeChild(m);
    });
    setHlOpen(false);
    saveHtml();
  }

  // ===== Helpers for review panel =====
  const isAnswered = (gid: string) => typeof answers[gid] === "number";
  const unansweredCount = questionItems.filter((q) => !isAnswered(q.globalId)).length;
  const bookmarkedCount = questionItems.filter((q) => bookmarks.has(q.globalId)).length;

  const filteredItems = useMemo(() => {
    const base = questionItems;
    switch (reviewTab) {
      case "unanswered":
        return base.filter((q) => !isAnswered(q.globalId));
      case "bookmarked":
        return base.filter((q) => bookmarks.has(q.globalId));
      default:
        return base;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionItems, reviewTab, answers, bookmarks]);

  // group by section for the list view
  const groupedBySection = useMemo(() => {
    const groups: Record<string, FlatItem[]> = {};
    filteredItems.forEach((q) => {
      if (!groups[q.sectionId]) groups[q.sectionId] = [];
      groups[q.sectionId].push(q);
    });
    return groups;
  }, [filteredItems]);

  // ===== Submit & Score =====
  const letter = (i?: number) => (i == null || i < 0 ? "-" : String.fromCharCode(65 + i));
    const getCorrectIndex = (q: any): number | undefined => {
    const v = (q as any)?.answerIndex;
    return typeof v === "number" ? v : undefined; // expects 0-based index
    };

  const computeResults = () => {
    const rows: ResultRow[] = [];
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;
    let scoredCount = 0;

    // Walk the original exam structure to access raw questions
    let indexInAll = 0;
    exam?.sections.forEach((sec) => {
      sec.questions.forEach((q, i) => {
        const globalId = `${sec.id}:${q.id}`;
        const userIndex = answers[globalId];
        const correctIndex = getCorrectIndex(q);
        const choices = (q as any).choices as string[] | undefined;

        if (correctIndex != null) {
          scoredCount++;
          if (userIndex == null) {
            unansweredCount++;
          } else if (userIndex === correctIndex) {
            correctCount++;
          } else {
            incorrectCount++;
          }
        } else {
          // If we can't score it (no key), count as unanswered in UX but not in scoredCount
          if (userIndex == null) unansweredCount++;
        }

        rows.push({
          globalId,
          indexInAll,
          sectionTitle: sec.title,
          qNumberInSection: i + 1,
          userIndex,
          correctIndex,
          choices,
        });
        indexInAll++;
      });
    });

    setResults({ rows, correctCount, incorrectCount, unansweredCount, scoredCount });
  };

  const onSubmit = () => {
    computeResults();
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ===== Render =====
  // Results page
  if (submitted && results) {
    const { correctCount, incorrectCount, unansweredCount, scoredCount, rows } = results;
    const percent = scoredCount ? Math.round((correctCount / scoredCount) * 100) : 0;
    const wrongRows = rows.filter((r) => r.correctIndex != null && r.userIndex != null && r.userIndex !== r.correctIndex);

    return (
      <div className="space-y-6">
        {/* Header/status */}
        <div className="sticky top-14 z-30">
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
              <span className="font-semibold">{scoredCount}</span> scored questions
              {" · "}
              <span className="font-semibold">{percent}%</span>
            </div>
            <div className="mt-1 text-gray-600 text-sm">
              Incorrect: {incorrectCount} &nbsp;·&nbsp; Unanswered: {unansweredCount}
            </div>

            <div className="mt-5 flex gap-2 justify-center">
              <button
                onClick={() => {
                  // Jump to first wrong if exists
                  const firstWrong = wrongRows[0];
                  if (!firstWrong) return;
                  const i = items.findIndex((x) => x.globalId === firstWrong.globalId);
                  setSubmitted(false);
                  jumpTo(i);
                }}
                disabled={wrongRows.length === 0}
                className={`px-4 py-2 rounded-md text-white ${wrongRows.length ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-300 cursor-not-allowed"}`}
                title={wrongRows.length ? "Go to first incorrect question" : "No incorrect questions"}
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

          {/* Legend */}
          <div className="rounded border border-gray-200 bg-gray-50 p-4 mb-4 text-sm">
            <div className="flex items-center gap-6">
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-orange-500 inline-block" />
                Unanswered
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500 inline-block" />
                Incorrect
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-green-500 inline-block" />
                Correct
              </span>
            </div>
          </div>

          {/* Wrong questions list */}
          <div>
            <h3 className="text-xl font-semibold mb-2">Questions you got wrong</h3>
            {wrongRows.length === 0 ? (
              <p className="text-gray-600">Nice! You didn’t miss any scored questions.</p>
            ) : (
              <div className="divide-y divide-gray-200">
                {wrongRows.map((r) => {
                  const i = items.findIndex((x) => x.globalId === r.globalId);
                  const your = letter(r.userIndex);
                  const correct = letter(r.correctIndex);
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
                        {r.sectionTitle}: Q{r.qNumberInSection}
                      </button>
                      <div className="text-sm">
                        <div>
                          Your answer: <span className="font-semibold">{your}</span>
                          {r.choices && r.userIndex != null ? ` — ${r.choices[r.userIndex]}` : ""}
                        </div>
                        <div>
                          Correct answer: <span className="font-semibold">{correct}</span>
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

  // ===== Normal exam UI (includes End-of-Exam screen before submit) =====
  return (
    <div className="space-y-4">
      {/* ======= FULL-WIDTH Compact Toolbar + Status Bar ======= */}
      <div className="sticky top-14 z-30">
        {/* Toolbar (full-width) */}
        <div className="w-full flex items-center gap-2 bg-white border-b border-gray-300 px-4 py-1.5 shadow-sm">
          {/* Joined blue arrows */}
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

          {/* Review (with dropdown) */}
          <div className="relative" ref={reviewWrapRef}>
            <button
              onClick={() => setReviewOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded border border-gray-400 bg-gradient-to-b from-white to-gray-100 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
              title="Review Questions"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-gray-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
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
                      className={`flex flex-col items-center rounded border px-2 py-2 ${
                        reviewTab === "all"
                          ? "bg-white border-gray-800"
                          : "bg-gray-50 border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      <span className="text-[11px] text-gray-600">All Questions</span>
                      <span className="mt-1 text-base font-semibold">{questionCount}</span>
                    </button>
                    <button
                      onClick={() => setReviewTab("unanswered")}
                      className={`flex flex-col items-center rounded border px-2 py-2 ${
                        reviewTab === "unanswered"
                          ? "bg-white border-gray-800"
                          : "bg-gray-50 border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      <span className="text-[11px] text-gray-600">Not Answered</span>
                      <span className="mt-1 text-base font-semibold">{unansweredCount}</span>
                    </button>
                    <button
                      onClick={() => setReviewTab("bookmarked")}
                      className={`flex flex-col items-center rounded border px-2 py-2 ${
                        reviewTab === "bookmarked"
                          ? "bg-white border-gray-800"
                          : "bg-gray-50 border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      <span className="text-[11px] text-gray-600">Bookmarks</span>
                      <span className="mt-1 text-base font-semibold">{bookmarkedCount}</span>
                    </button>
                  </div>

                  {/* Filtered list grouped by section */}
                  <div className="max-h-72 overflow-auto rounded border border-gray-200">
                    {Object.entries(groupedBySection).map(([secId, qs]) => {
                      const secTitle =
                        exam.sections.find((s) => s.id === secId)?.title ?? "Section";
                      return (
                        <div key={secId}>
                          <div className="px-3 py-2 text-[12px] font-semibold bg-gray-50 border-b border-gray-200">
                            {secTitle}
                          </div>
                          {qs.map((q) => {
                            const i = items.findIndex((x) => x.globalId === q.globalId);
                            const answered = isAnswered(q.globalId);
                            const bookmarked = bookmarks.has(q.globalId);
                            return (
                              <button
                                key={q.globalId}
                                onClick={() => jumpTo(i)}
                                className={`w-full text-left px-3 py-2 flex items-center gap-2 border-b border-gray-200 hover:bg-gray-50 ${
                                  i === idx ? "bg-blue-50" : ""
                                }`}
                                title={`${q.sectionTitle} · Question ${q.qIndexInSection + 1}`}
                              >
                                <span
                                  className={`h-2.5 w-2.5 rounded-full ${
                                    answered ? "bg-green-500" : "bg-orange-500"
                                  }`}
                                />
                                <span className="flex-1">
                                  Question {q.qIndexInSection + 1}
                                </span>
                                {bookmarked && <span className="text-blue-600" aria-hidden>🔖</span>}
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

          {/* Bookmark (toggle) */}
          <button
            onClick={toggleBookmark}
            disabled={current?.isEnd}
            className={`inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-sm font-medium ${
              !current?.isEnd && bookmarks.has(current?.globalId ?? "")
                ? "border-blue-600 bg-blue-50 hover:bg-blue-100"
                : "border-gray-400 bg-gradient-to-b from-white to-gray-100 hover:bg-gray-50"
            } ${current?.isEnd ? "opacity-50 cursor-not-allowed" : ""}`}
            title={
              current?.isEnd
                ? "No question to bookmark"
                : bookmarks.has(current?.globalId ?? "")
                ? "Remove bookmark"
                : "Bookmark Question for Review"
            }
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 ${
                !current?.isEnd && bookmarks.has(current?.globalId ?? "")
                  ? "text-blue-700"
                  : "text-gray-700"
              }`}
              fill={!current?.isEnd && bookmarks.has(current?.globalId ?? "") ? "currentColor" : "none"}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 4h12v16l-6-3-6 3V4z" />
            </svg>
            Bookmark
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Mini control icons (visual only) */}
          <div className="flex items-center gap-1.5">
            <button className="h-7 w-7 rounded border border-gray-400 bg-gradient-to-b from-white to-gray-100 text-sm hover:bg-gray-50" title="Pointer Tool">
              ·
            </button>
            <button className="h-7 w-7 rounded border border-gray-400 bg-gradient-to-b from-white to-gray-100 text-sm hover:bg-gray-50" title="Stop">
              ▢
            </button>
            <button className="h-7 w-7 rounded border border-gray-400 bg-gradient-to-b from-white to-gray-100 text-sm hover:bg-gray-50" title="Close">
              ✕
            </button>
            <button className="h-7 w-7 rounded border border-gray-400 bg-gradient-to-b from-white to-gray-100 text-sm hover:bg-gray-50" title="Fullscreen">
              ⤢
            </button>
          </div>
        </div>

        {/* Cyan hairline + Dark status bar (full-width) */}
        <div className="h-[3px] bg-sky-500 border-t border-gray-300" />
        <div className="w-full bg-[#5e5e5e] text-white text-[13px]">
          <div className="flex items-center gap-2 px-6 py-1">
            <span className="font-semibold">{exam.title.toUpperCase()}</span>
            <span>/</span>
            <span>
              {current?.isEnd ? "END OF EXAM" : `SECTION ${current?.sectionTitle ?? "-"}`}
            </span>
            <span>/</span>
            <span>
              {current?.isEnd ? `${questionCount} OF ${questionCount}` : `${questionOrdinal} OF ${questionCount}`}
            </span>
            <span>/</span>
            <span>{progressPct}%</span>
            <div className="flex-1" />
            <div className="w-40 h-1.5 bg-[#3f3f3f] rounded">
              <div className="h-1.5 rounded bg-[#a0a0a0]" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ======= Main Sheet ======= */}
      {!current?.isEnd ? (
        <div className="rounded-2xl bg-white shadow-md border border-gray-200 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: passage */}
            <div className="rounded-lg border border-gray-200 shadow-sm p-4">
              <div className="h-[520px] overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
                <div className="border rounded-md p-6 bg-white">
                  {effectivePassage ? (
                    <div className="prose md:prose-lg max-w-none passage">
                      {savedHtml ? (
                        <div ref={passageRef} dangerouslySetInnerHTML={{ __html: savedHtml }} />
                      ) : (
                        <div ref={passageRef}>
                          <ReactMarkdown>{effectivePassage}</ReactMarkdown>
                        </div>
                      )}
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
                <div className="prose max-w-none mb-4">
                  <ReactMarkdown>{current.stemMarkdown}</ReactMarkdown>
                </div>
              ) : null}

              {current?.choices ? (
                <ul className="space-y-4">
                  {current.choices.map((choice, i) => {
                    const selected = answers[current.globalId] === i;
                    return (
                      <li key={i}>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name={current.globalId}
                            className="h-5 w-5"
                            checked={selected}
                            onChange={() => selectChoice(i)}
                          />
                          <span className="flex-1 rounded-lg px-3 py-2 bg-gray-50 border border-gray-200">
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
      ) : (
        /* ======= End-of-Exam page ======= */
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
                  <span className="text-blue-600">🔖</span>
                  Bookmarked questions are marked with a bookmark symbol.
                </span>
              </div>
            </div>

            {/* All questions (show unanswered + bookmarks indicators) */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {questionItems.map((q) => {
                const i = items.findIndex((x) => x.globalId === q.globalId);
                const answered = typeof answers[q.globalId] === "number";
                const bookmarked = bookmarks.has(q.globalId);
                return (
                  <button
                    key={q.globalId}
                    onClick={() => jumpTo(i)}
                    className="relative text-left px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 border border-gray-300"
                    title={`${q.sectionTitle} · Question ${q.qIndexInSection + 1}`}
                  >
                    {!answered && (
                      <span className="absolute left-2 top-1.5 h-3 w-3 rounded-full bg-orange-500" />
                    )}
                    <span className="pl-5">Question {q.qIndexInSection + 1}</span>
                    {bookmarked && <span className="absolute right-2 top-1 text-blue-600">🔖</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom hint */}
      <div className="text-center text-sm text-gray-500">Use ← and → keys to navigate</div>

      {/* ===== Fixed-position floating toolbox ===== */}
      {hlOpen && !current?.isEnd && (
        <div
          data-hl-palette
          className="fixed z-[1000] -translate-x-1/2"
          style={{ left: hlPos.x, top: hlPos.y }}
        >
          <div className="flex items-center gap-1 rounded-xl border border-gray-300 bg-white shadow-md px-1 py-1">
            <button
              onClick={eraseSelection}
              className="h-7 w-7 rounded border border-gray-200 hover:bg-gray-50"
              title="Erase highlight"
              aria-label="Erase highlight"
            >
              <span
                style={{
                  display: "inline-block",
                  width: 12,
                  height: 12,
                  transform: "rotate(45deg)",
                  borderTop: "2px solid #b91c1c",
                }}
              />
            </button>
            <button
              onClick={() => wrapSelection("blue")}
              className="h-7 w-7 rounded border border-gray-200 hover:bg-gray-50"
              title="Highlight blue"
              aria-label="Highlight blue"
            >
              <span style={{ display: "inline-block", width: 14, height: 14, background: "#bfdbfe" }} />
            </button>
            <button
              onClick={() => wrapSelection("pink")}
              className="h-7 w-7 rounded border border-gray-200 hover:bg-gray-50"
              title="Highlight pink"
              aria-label="Highlight pink"
            >
              <span style={{ display: "inline-block", width: 14, height: 14, background: "#fbcfe8" }} />
            </button>
          </div>
        </div>
      )}

      {/* ===== Passage styling (centered title/author + circled numbers + highlight colors) ===== */}
      <style>{`
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
        mark.hl { padding: 0 .15em; border-radius: 3px; }
        mark.hl.hl-blue { background: #bfdbfe; }
        mark.hl.hl-pink { background: #fbcfe8; }
      `}</style>
    </div>
  );
}
