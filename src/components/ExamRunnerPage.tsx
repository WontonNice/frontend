// src/components/ExamRunnerPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getExamBySlug } from "../data/exams";
import ReactMarkdown from "react-markdown";

/** Stores selected choice index per question (keyed by globalId) */
type AnswerMap = Record<string, number | undefined>;
type ReviewTab = "all" | "unanswered" | "bookmarked";

export default function ExamRunnerPage() {
  const { slug } = useParams<{ slug: string }>();
  const exam = slug ? getExamBySlug(slug) : undefined;

  // Flatten sections -> linear list of questions for navigation
  const items = useMemo(() => {
    if (!exam) return [];
    const out: {
      globalId: string;
      sectionId: string;
      sectionTitle: string;
      sectionType: "reading" | "math" | string;
      sectionPassageMarkdown?: string;
      sectionPassageImages?: string[];
      /** optional external passage URL or filename (from `passageMd`/`passageUrl`) */
      sectionPassageUrl?: string;
      qIndexInSection: number;
      qTotalInSection: number;
      stemMarkdown?: string;
      image?: string;
      choices?: string[];
    }[] = [];

    exam.sections.forEach((sec) => {
      sec.questions.forEach((q, i) => {
        out.push({
          globalId: `${sec.id}:${q.id}`,
          sectionId: sec.id,
          sectionTitle: sec.title,
          sectionType: sec.type,
          // inline markdown/images
          sectionPassageMarkdown: (sec as any).passageMarkdown,
          sectionPassageImages: (sec as any).passageImages,
          // external MD file
          sectionPassageUrl: (sec as any).passageMd ?? (sec as any).passageUrl,

          qIndexInSection: i,
          qTotalInSection: sec.questions.length,
          stemMarkdown: (q as any).stemMarkdown ?? (q as any).promptMarkdown,
          image: (q as any).image,
          choices: (q as any).choices,
        });
      });
    });

    return out;
  }, [exam]);

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
    if (!cur) return;
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

  useEffect(() => {
    setIdx(0);
    setAnswers({});
    setReviewOpen(false);
    setReviewTab("all");
  }, [slug]);

  // Keyboard nav + close review on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIdx((i) => Math.min(items.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
      if (e.key === "Escape") setReviewOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items.length]);

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

    let url = (current as any)?.sectionPassageUrl as string | undefined;
    if (!url) return;

    // If a short filename is provided, auto-prefix with the public folder path
    if (!url.startsWith("/")) {
      url = `/exams/readingpassages/${url}`;
    }

    fetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((txt) => setFetchedPassage(txt))
      .catch(() => setFetchedPassage(undefined));
  }, [current?.sectionId, (current as any)?.sectionPassageUrl]);

  if (!exam) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-red-600">Exam not found</h1>
        <p className="text-gray-600 mt-2">Check the URL or choose from the exams list.</p>
      </div>
    );
  }

  const sectionForCurrent = exam.sections.find((s) => s.id === current?.sectionId);

  // Prefer fetched content (from .md), then fall back to inline JSON passage
  const effectivePassage =
    fetchedPassage ??
    current?.sectionPassageMarkdown ??
    (sectionForCurrent as any)?.passageMarkdown;

  const effectivePassageImages =
    current?.sectionPassageImages ?? (sectionForCurrent as any)?.passageImages;

  const total = items.length;
  const progressPct = total ? Math.round(((idx + 1) / total) * 100) : 0;

  const goPrev = () => setIdx((i) => Math.max(0, i - 1));
  const goNext = () => setIdx((i) => Math.min(total - 1, i + 1));
  const jumpTo = (i: number) => {
    setIdx(i);
    setReviewOpen(false);
  };
  const selectChoice = (choiceIndex: number) => {
    if (!current) return;
    setAnswers((prev) => ({ ...prev, [current.globalId]: choiceIndex }));
  };

  // ===== Load saved highlights for this exam/section =====
  const hlStorageKey = slug && current?.sectionId ? `hl:${slug}:${current.sectionId}` : null;
  useEffect(() => {
    if (!hlStorageKey) {
      setSavedHtml(null);
      return;
    }
    const html = localStorage.getItem(hlStorageKey);
    setSavedHtml(html);
  }, [hlStorageKey]);

  // ===== Selection handlers: robust listeners on document (fixed-position palette) =====
  useEffect(() => {
    const el = passageRef.current; // inner content element where text lives
    if (!el) return;

    // helper: is a DOM node inside `el`?
    const isInside = (node: Node | null) => {
      if (!node) return false;
      let cur: Node | null = node;
      while (cur) {
        if (cur === el) return true;
        // support shadow hosts
        cur = (cur as any).parentNode || (cur as any).host || null;
      }
      return false;
    };

    // helper: get a reliable rect for selection range (fallback span if needed)
    const getSafeRect = (range: Range): DOMRect => {
      const rect = range.getBoundingClientRect();
      if (rect && (rect.width > 0 || rect.height > 0)) return rect;

      // fallback: insert a tiny marker to measure
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

      // Must be non-empty and BOTH ends inside the passage container
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

      // Keep a stable clone we can mutate later
      selectionRangeRef.current = range.cloneRange();

      // Position toolbox centered above selection using viewport coords (FIXED palette)
      const rect = getSafeRect(range);

      // Clamp a bit to keep on-screen
      const x = Math.max(8, Math.min(rect.left + rect.width / 2, window.innerWidth - 8));
      const y = Math.max(8, rect.top - 8); // sit just above selection

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
      // close if clicking outside the passage; ignore clicks on the palette
      const palette = document.querySelector("[data-hl-palette]");
      const t = e.target as Node | null;
      if (palette && t && (palette === t || palette.contains(t))) return;
      if (!t || !isInside(t)) setHlOpen(false);
    };

    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("selectionchange", onSelectionChange);
    document.addEventListener("mousedown", onDocMouseDown);
    // hide on scroll of the window or any container
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("selectionchange", onSelectionChange);
      document.removeEventListener("mousedown", onDocMouseDown);
      window.removeEventListener("scroll", onScroll);
    };
  }, [slug, current?.sectionId]);

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
      // Fallback: wrap each text node inside the selection
      const contents = range.cloneContents();
      const fragWalker = document.createTreeWalker(contents, NodeFilter.SHOW_TEXT);
      const pieces: { text: string }[] = [];
      while (fragWalker.nextNode()) pieces.push({ text: fragWalker.currentNode!.textContent || "" });
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
    // Unwrap any <mark.hl> that overlaps with the selection
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
  const unansweredCount = items.filter((q) => !isAnswered(q.globalId)).length;
  const bookmarkedCount = items.filter((q) => bookmarks.has(q.globalId)).length;

  const filteredItems = useMemo(() => {
    switch (reviewTab) {
      case "unanswered":
        return items.filter((q) => !isAnswered(q.globalId));
      case "bookmarked":
        return items.filter((q) => bookmarks.has(q.globalId));
      default:
        return items;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, reviewTab, answers, bookmarks]);

  // group by section for the list view
  const groupedBySection = useMemo(() => {
    const groups: Record<string, typeof filteredItems> = {};
    filteredItems.forEach((q) => {
      if (!groups[q.sectionId]) (groups as any)[q.sectionId] = [];
      (groups as any)[q.sectionId].push(q);
    });
    return groups;
  }, [filteredItems]);

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
              title="Previous Question"
            >
              ←
            </button>
            <button
              onClick={goNext}
              disabled={idx === total - 1}
              className={`px-3 py-1.5 text-white text-sm font-medium ${
                idx === total - 1 ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500"
              }`}
              title="Next Question"
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
                {/* caret */}
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
                      <span className="mt-1 text-base font-semibold">{total}</span>
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
                      className={`flex flex-col items-center rounded border px-2 py-2 relative ${
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
                                {/* status dot */}
                                <span
                                  className={`h-2.5 w-2.5 rounded-full ${
                                    answered ? "bg-green-500" : "bg-orange-500"
                                  }`}
                                />
                                <span className="flex-1">
                                  Question {q.qIndexInSection + 1}
                                </span>
                                {bookmarked && (
                                  <span className="text-blue-600" aria-hidden>🔖</span>
                                )}
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
            className={`inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-sm font-medium ${
              bookmarks.has(current?.globalId ?? "")
                ? "border-blue-600 bg-blue-50 hover:bg-blue-100"
                : "border-gray-400 bg-gradient-to-b from-white to-gray-100 hover:bg-gray-50"
            }`}
            title={bookmarks.has(current?.globalId ?? "") ? "Remove bookmark" : "Bookmark Question for Review"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 ${bookmarks.has(current?.globalId ?? "") ? "text-blue-700" : "text-gray-700"}`}
              fill={bookmarks.has(current?.globalId ?? "") ? "currentColor" : "none"}
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
            <span>SECTION {current?.sectionTitle ?? "-"}</span>
            <span>/</span>
            <span>
              {idx + 1} OF {total}
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

      {/* ======= Main “Sheet” (two columns) ======= */}
      <div className="rounded-2xl bg-white shadow-md border border-gray-200 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: shared section passage (scrollable) */}
          <div className="rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="h-[520px] overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
              <div className="border rounded-md p-6 bg-white">
                {effectivePassage ? (
                  <div className="prose md:prose-lg max-w-none passage">
                    {/* Render saved HTML if exists, else markdown; both go into the same ref container */}
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

          {/* Right: question stem + choices */}
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

      {/* Bottom hint */}
      <div className="text-center text-sm text-gray-500">Use ← and → keys to navigate</div>

      {/* ===== Fixed-position floating toolbox ===== */}
      {hlOpen && (
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
        /* Center the title and author */
        .passage h1, .passage h2, .passage h3 {
          text-align: center;
          margin-bottom: 0.25rem;
        }
        /* Center the author line (paragraph right after the heading) */
        .passage h1 + p, .passage h2 + p, .passage h3 + p {
          text-align: center;
          margin-top: 0.25rem;
          margin-bottom: 1rem;
        }
        /* Optional: center/soften any intro italic paragraph */
        .passage em {
          display: block;
          text-align: center;
          color: #6b7280; /* gray-500 */
          font-style: italic;
        }

        /* Turn ordered-list numbers into circular badges */
        .passage ol {
          counter-reset: item;
          list-style: none;
          padding-left: 0;
          margin-left: 0;
        }
        .passage ol > li {
          counter-increment: item;
          position: relative;
          padding-left: 2.25rem;   /* space for the badge */
          margin: 0.75rem 0;
        }
        .passage ol > li::before {
          content: counter(item);
          position: absolute;
          left: 0;
          top: 0.1rem;
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 9999px;
          background: #111827;     /* gray-900 */
          color: #fff;
          font-weight: 700;
          font-size: 0.875rem;     /* ~text-sm */
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        /* highlight colors */
        mark.hl { padding: 0 .15em; border-radius: 3px; }
        mark.hl.hl-blue { background: #bfdbfe; }  /* tailwind blue-200 */
        mark.hl.hl-pink { background: #fbcfe8; }  /* tailwind pink-200 */
      `}</style>
    </div>
  );
}
