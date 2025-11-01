// src/components/StudyHallReadingPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ----------------------- helpers: front-matter ----------------------- */
function splitFrontmatter(md: string): { fm: string | null; body: string } {
  if (!md.startsWith("---")) return { fm: null, body: md };
  const rest = md.slice(3);
  const m = rest.match(/\r?\n---\r?\n/);
  if (!m) return { fm: null, body: md };
  const end = m.index ?? 0;
  const fm = rest.slice(0, end).trim();
  const body = rest.slice(end + m[0].length).replace(/^\s+/, "");
  return { fm, body };
}

async function parseYaml<T = any>(yamlText: string | null): Promise<T | {}> {
  if (!yamlText) return {};
  try {
    const mod = await import(/* @vite-ignore */ "js-yaml");
    return (mod.load(yamlText) as T) ?? {};
  } catch {
    return {};
  }
}

/* ----------------------------- types ----------------------------- */
type ManifestFile =
  | string
  | {
      path: string;
      title?: string;
      image?: string;
      totalQuestions?: number;
    };

type PassageMeta = {
  slug: string; // derived from filename; uniqueness enforced
  title: string;
  image?: string;
  totalQuestions: number;
  url: string; // public url to the md in /public
};

/* ----------------- localStorage for highest scores ---------------- */
// New key shape used by ReadingRunnerPage recommendation:
//   localStorage.setItem(`readingBest:${mdPath}`, JSON.stringify({ correct, total }))
const getBestFromMdKey = (mdPath: string) => {
  try {
    const raw = localStorage.getItem(`readingBest:${mdPath}`);
    if (!raw) return null;
    const obj = JSON.parse(raw) as { correct?: number; total?: number };
    if (typeof obj?.correct === "number" && obj.correct >= 0) {
      return { correct: obj.correct, total: typeof obj.total === "number" ? obj.total : undefined };
    }
    return null;
  } catch {
    return null;
  }
};

// Legacy key shape you used before (number only):
//   localStorage.setItem(`reading_highscore:${slug}`, "7")
const getBestFromSlugKey = (slug: string) => {
  try {
    const raw = localStorage.getItem(`reading_highscore:${slug}`);
    if (!raw) return null;
    const correct = parseInt(raw, 10);
    if (isNaN(correct) || correct < 0) return null;
    return { correct };
  } catch {
    return null;
  }
};

/* --------------- load & normalize one manifest file --------------- */
async function loadManifest(url: string): Promise<ManifestFile[]> {
  try {
    const r = await fetch(url);
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data) ? (data as ManifestFile[]) : [];
  } catch {
    return [];
  }
}

/* ----------------- title fallback (from filename) ----------------- */
const titleFromFilename = (base: string) =>
  base
    .replace(/\.md$/i, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

/* ------------- build PassageMeta (fetch MD if needed) ------------- */
async function toPassageMeta(
  entry: ManifestFile,
  usedSlugs: Set<string>
): Promise<PassageMeta | null> {
  const path = typeof entry === "string" ? entry : entry.path;
  if (!path || !/\.md$/i.test(path)) return null;

  // slug from filename (last segment without .md)
  const last = path.split("/").pop() || "";
  let baseSlug = last.replace(/\.md$/i, "");
  // Ensure uniqueness across both folders
  let slug = baseSlug;
  let i = 2;
  while (usedSlugs.has(slug)) slug = `${baseSlug}-${i++}`;
  usedSlugs.add(slug);

  // If manifest already provided metadata, trust it
  if (typeof entry !== "string" && entry.title && typeof entry.totalQuestions === "number") {
    return {
      slug,
      title: entry.title,
      image: entry.image,
      totalQuestions: entry.totalQuestions,
      url: path,
    };
  }

  // Otherwise fetch the MD and parse front-matter for title / questions / image
  try {
    const txt = await fetch(path).then((r) => (r.ok ? r.text() : ""));
    const { fm } = splitFrontmatter(txt);
    const meta = (await parseYaml<any>(fm)) as any;
    const title: string = meta?.title ?? titleFromFilename(last);
    const image: string | undefined = meta?.image;
    const totalQuestions = Array.isArray(meta?.questions) ? meta.questions.length : 0;
    return { slug, title, image, totalQuestions, url: path };
  } catch {
    // minimal fallback
    const title = titleFromFilename(last);
    return { slug, title, totalQuestions: 0, url: path };
  }
}

/* ------------------------- the page ------------------------- */
export default function StudyHallReadingPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PassageMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      // Fetch manifests from both folders (optional files)
      const [top, official] = await Promise.all([
        loadManifest("/exams/readingpassages/_manifest.json"),
        loadManifest("/exams/readingpassages/OfficialSHSATReadingPassages/_manifest.json"),
      ]);

      const used = new Set<string>();
      const metas: PassageMeta[] = (
        await Promise.all([...top, ...official].map((e) => toPassageMeta(e, used)))
      ).filter((x): x is PassageMeta => !!x);

      metas.sort((a, b) => a.title.localeCompare(b.title));

      if (!cancelled) {
        setItems(metas);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((it) => it.title.toLowerCase().includes(s));
  }, [q, items]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Reading Passages</h2>
      <p className="text-white/70">
        Pick a passage to practice. Your best score is saved automatically.
      </p>

      {/* search */}
      <div className="flex items-center gap-2">
        <input
          className="w-full max-w-md rounded-xl px-4 py-2 border border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/40"
          placeholder="Search passages…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* list */}
      <div className="grid gap-3">
        {loading ? (
          <div className="text-white/70">Loading passages…</div>
        ) : filtered.length === 0 ? (
          <div className="text-white/70">No passages found.</div>
        ) : (
          filtered.map((p) => {
            const bestMd = getBestFromMdKey(p.url);
            const bestSlug = getBestFromSlugKey(p.slug);
            const total = Math.max(1, p.totalQuestions || 0);

            // Prefer md-based record; fallback to legacy slug-based
            const bestCorrect =
              typeof bestMd?.correct === "number"
                ? bestMd.correct
                : typeof bestSlug?.correct === "number"
                ? bestSlug.correct
                : 0;

            const displayCorrect = Math.max(0, Math.min(bestCorrect, total));
            const displayTotal = typeof bestMd?.total === "number" ? bestMd.total : total;

            return (
              <div
                key={p.slug}
                className="flex items-stretch gap-4 rounded-2xl bg-white text-gray-900 shadow-sm border border-gray-200 p-3"
              >
                {/* 1) Image */}
                <div className="w-40 h-28 rounded-xl overflow-hidden flex-shrink-0 border border-gray-200 bg-gray-100">
                  {p.image ? (
                    <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-200 to-fuchsia-200" />
                  )}
                </div>

                {/* 2) Title + 4) Highest Score */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold truncate">{p.title}</h3>
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    {p.totalQuestions > 0
                      ? `${p.totalQuestions} question${p.totalQuestions === 1 ? "" : "s"}`
                      : "Questions: —"}
                    {" • "}
                    <span className="font-medium">
                      Highest Score: {displayCorrect} / {displayTotal}
                    </span>
                  </div>
                </div>

                {/* 3) Start Button */}
                <div className="flex flex-col items-end justify-between">
                  <button
                    onClick={() =>
                      navigate(`/reading-runner?md=${encodeURIComponent(p.url)}`)
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2"
                  >
                    Start
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M5 12h14M13 5l7 7-7 7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <p className="text-xs text-white/50">
        Tip: The “Start” button expects a route for <code>/reading-runner</code>. Add
        <br />
        <code>{`<Route path="/reading-runner" element={<ReadingRunnerPage />} />`}</code> to your{" "}
        <code>App.tsx</code>. Your runner should save best scores to{" "}
        <code>localStorage</code> as <code>readingBest:&lt;mdPath&gt;</code> with{" "}
        <code>{`{correct,total}`}</code>.
      </p>
    </div>
  );
}
