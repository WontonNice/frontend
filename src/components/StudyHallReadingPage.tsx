// src/components/StudyHallReadingPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

function splitFrontmatter(md: string): { fm: string | null; body: string } {
  let s = md.replace(/^\uFEFF/, "");
  if (!s.startsWith("---")) return { fm: null, body: md };
  const rest = s.slice(3);
  const m = rest.match(/\r?\n---/);
  if (!m) return { fm: null, body: md };
  const end = m.index ?? 0;
  const fm = rest.slice(0, end).trim();
  const body = rest.slice(end + m[0].length).trimStart();
  return { fm, body };
}

async function parseYaml<T = any>(yamlText: string | null): Promise<T | {}> {
  if (!yamlText) return {};
  try {
    const mod = await import("js-yaml");
    return (mod.load(yamlText) as T) ?? {};
  } catch {
    return {};
  }
}

/** ✅ FIX: ensure spaces + curly quotes in filenames load correctly */
function resolve(mdPath: string, img?: string): string | undefined {
  if (!img || typeof img !== "string") return undefined;

  // absolute URL or site-root path
  if (/^(https?:)?\/\//i.test(img) || img.startsWith("/")) {
    return encodeURI(img);
  }

  const base = mdPath.replace(/[^/]+$/, "");
  return encodeURI(base + img);
}

type PassageMeta = {
  slug: string;
  title: string;
  image?: string;
  totalQuestions: number;
  url: string;
};

async function toPassageMeta(path: string): Promise<PassageMeta | null> {
  const filename = path.split("/").pop() || "";
  const slug = filename.replace(/\.md$/i, "");

  try {
    const txt = await fetch(path).then((r) => (r.ok ? r.text() : ""));
    const { fm } = splitFrontmatter(txt);
    const meta = (await parseYaml<any>(fm)) as any;

    const title =
      (typeof meta?.title === "string" && meta.title.trim()) ||
      slug.replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

    const totalQuestions = Array.isArray(meta?.questions)
      ? meta.questions.length
      : 0;

    /** ✅ ONLY USE coverImage for the card */
    const image = resolve(path, meta?.coverImage);

    return { slug, title, totalQuestions, image, url: path };
  } catch {
    return { slug, title: slug, totalQuestions: 0, url: path };
  }
}

async function loadManifest(url: string): Promise<string[]> {
  try {
    const r = await fetch(url);
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data) ? data.map((e: any) => (typeof e === "string" ? e : e.path)) : [];
  } catch {
    return [];
  }
}

export default function StudyHallReadingPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PassageMeta[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const lists = await Promise.all([
        loadManifest("/exams/readingpassages/_manifest.json"),
        loadManifest("/exams/readingpassages/OfficialSHSATReadings/_manifest.json"),
      ]);

      const paths = [...lists.flat()];
      const metas = (await Promise.all(paths.map(toPassageMeta))).filter(
        (x): x is PassageMeta => !!x
      );

      metas.sort((a, b) => a.title.localeCompare(b.title));
      setItems(metas);
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? items.filter((it) => it.title.toLowerCase().includes(s)) : items;
  }, [q, items]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Reading Passages</h2>

      <input
        className="w-full max-w-md rounded-xl px-4 py-2 border border-white/20 bg-white/10 text-white"
        placeholder="Search passages…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {/* ✅ 1 → 2 → 3 columns responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <div key={p.slug} className="rounded-2xl bg-white text-gray-900 shadow border overflow-hidden">
            {/* ✅ Image or blank placeholder */}
            <div className="relative aspect-[16/10] bg-gray-200">
              {p.image ? (
                <img src={p.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : null}
            </div>

            <div className="p-4">
              <h3 className="font-semibold">{p.title}</h3>
              <p className="text-sm text-gray-600">{p.totalQuestions} questions</p>

              <button
                onClick={() => navigate(`/reading-runner?md=${encodeURIComponent(p.url)}`)}
                className="mt-3 w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white py-2"
              >
                Start
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
