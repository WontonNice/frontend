// src/components/ExamsPage.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { listExams, getExamBySlug } from "../../data/exams";
import ReactMarkdown from "react-markdown";

type ParsedMd = {
  title?: string;
  source?: string;
  body: string;
};

/** Minimal front-matter parser for title/source; keeps everything else in body. */
function parsePassageMd(md: string): ParsedMd {
  const trimmed = md.trimStart();
  if (!trimmed.startsWith("---")) {
    return { body: md };
  }
  const end = trimmed.indexOf("\n---", 3);
  if (end === -1) return { body: md };
  const fmRaw = trimmed.slice(3, end + 1).trim(); // between --- and ---
  const body = trimmed.slice(end + 4).trimStart();

  // ultra-light parse for 'title:' and 'source:' lines
  let title: string | undefined;
  let source: string | undefined;
  fmRaw.split("\n").forEach((line) => {
    const mTitle = line.match(/^\s*title\s*:\s*"(.*)"\s*$/) || line.match(/^\s*title\s*:\s*(.*)\s*$/);
    const mSource = line.match(/^\s*source\s*:\s*"(.*)"\s*$/) || line.match(/^\s*source\s*:\s*(.*)\s*$/);
    if (mTitle && mTitle[1]) title = mTitle[1].trim();
    if (mSource && mSource[1]) source = mSource[1].trim();
  });

  return { title, source, body };
}

function PassageBlock({
  passageMdPath,
  fallbackMarkdown,
  passageImages,
}: {
  passageMdPath?: string;
  fallbackMarkdown?: string;
  passageImages?: string[] | undefined;
}) {
  const [loading, setLoading] = useState<boolean>(!!passageMdPath);
  const [error, setError] = useState<string | null>(null);
  const [doc, setDoc] = useState<ParsedMd | null>(null);

  useEffect(() => {
    let active = true;
    if (!passageMdPath) {
      setLoading(false);
      setDoc(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(passageMdPath)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((txt) => {
        if (!active) return;
        setDoc(parsePassageMd(txt));
        setLoading(false);
      })
      .catch((e) => {
        if (!active) return;
        setError(e?.message || "Failed to load passage");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [passageMdPath]);

  const hasImages = Array.isArray(passageImages) && passageImages.length > 0;

  return (
    <div className="space-y-3">
      {loading && <div className="text-white/70 text-sm">Loading passage…</div>}
      {error && (
        <div className="text-red-300 text-sm">
          {error} {fallbackMarkdown ? "(showing inline fallback)" : null}
        </div>
      )}

      {/* Prefer fetched .md (with front-matter) */}
      {doc && (
        <div className="space-y-2">
          {(doc.title || doc.source) && (
            <div className="text-white/80 text-sm">
              {doc.title && <span className="font-semibold">{doc.title}</span>}
              {doc.title && doc.source && <span className="mx-2">•</span>}
              {doc.source && <span className="italic">{doc.source}</span>}
            </div>
          )}
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown>{doc.body}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Fallback to inline passageMarkdown if present */}
      {!doc && fallbackMarkdown && (
        <div className="prose prose-invert max-w-none">
          <ReactMarkdown>{fallbackMarkdown}</ReactMarkdown>
        </div>
      )}

      {/* Optional passage images (skipped when missing/empty) */}
      {hasImages && (
        <div className="grid sm:grid-cols-2 gap-3 pt-1">
          {passageImages!.map((src, i) => (
            <img key={i} src={src} className="rounded-lg border border-gray-700" alt={`figure-${i + 1}`} />
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionPreview({
  q,
  examTitle,
}: {
  q: any;
  examTitle: string;
}) {
  const stem = q.stemMarkdown ?? q.promptMarkdown ?? "";
  const badge = q.type ?? (Array.isArray(q.choices) && q.answerIndex != null ? "single_select" : undefined);

  return (
    <div className="space-y-3 border-t border-gray-700 pt-4">
      {/* Type badge (new interactive kinds or inferred) */}
      {badge && (
        <span className="inline-block text-[10px] uppercase tracking-wide bg-gray-700/70 text-white/80 px-2 py-0.5 rounded">
          {badge}
        </span>
      )}

      {stem && (
        <div className="prose prose-invert max-w-none">
          <ReactMarkdown>{stem}</ReactMarkdown>
        </div>
      )}

      {q.image && (
        <img
          src={q.image}
          alt={`${examTitle} - ${q.id}`}
          className="max-w-full rounded-lg border border-gray-700"
        />
      )}

      {Array.isArray(q.choices) && q.choices.length > 0 && (
        <ol className="grid sm:grid-cols-2 gap-2 list-decimal list-inside">
          {q.choices.map((choice: string, i: number) => (
            <li key={i} className="px-3 py-2 rounded-lg bg-gray-900/50 text-white/90">
              {choice}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function ExamsPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug?: string }>();

  // If there's a slug, show the detail page for that exam
  if (slug) {
    const exam = getExamBySlug(slug);

    if (!exam) {
      return (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-red-400">Exam Not Found</h2>
          <button
            onClick={() => navigate("/exams")}
            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition text-white font-medium"
          >
            ← Back to Exams
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <button
          onClick={() => navigate("/exams")}
          className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition text-white font-medium"
        >
          ← Back to Exams
        </button>

        <h1 className="text-3xl font-bold text-white">{exam.title}</h1>
        {exam.description && <p className="text-white/70">{exam.description}</p>}

        {exam.sections.map((section) => (
          <div key={section.id} className="rounded-xl border border-gray-700 p-6 space-y-4 bg-gray-800">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-2xl font-semibold text-white">{section.title}</h2>
              <button
                onClick={() => navigate(`/exam/${exam.slug}`)}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition text-white font-medium"
                title="Start Exam"
              >
                Start this exam
              </button>
            </div>

            {/* Reading passage preview */}
            {section.type === "reading" && (
              <PassageBlock
                passageMdPath={(section as any).passageMd}
                fallbackMarkdown={section.passageMarkdown}
                passageImages={section.passageImages}
              />
            )}

            {/* Inline questions preview (usually math or legacy reading) */}
            {(section.questions ?? []).length > 0 && (
              <div className="mt-2">
                {(section.questions ?? []).map((q) => (
                  <QuestionPreview key={q.id} q={q} examTitle={exam.title} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Otherwise, show the list of all exams
  const exams = listExams();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">SHSAT — Practice Exams</h2>
      <p className="text-white/70">Choose an exam to get started.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.map((exam) => (
          <div
            key={exam.slug}
            className="p-6 rounded-xl bg-gray-800 border border-gray-700 shadow-md hover:shadow-lg transition"
          >
            <h3 className="text-xl font-semibold mb-2 text-white">{exam.title}</h3>
            {exam.description && <p className="text-white/60 mb-4">{exam.description}</p>}
            <button
              onClick={() => navigate(`/exam/${exam.slug}`)}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition text-white font-medium"
            >
              Start
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
