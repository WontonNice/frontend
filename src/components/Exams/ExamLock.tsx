// src/components/ExamLock.ts
/**
 * Robust lock API helper.
 * - Uses VITE_BACKEND_URL (you set this to https://backend-tv8i.onrender.com ✅)
 * - Discovers which path/method your backend exposes and caches it.
 * - Avoids the old "Cannot PUT ..." 404s by trying fallbacks.
 */

type Cached = { getPath: string; setPath: string; setMethod: "PUT" | "POST" };
const CACHE_KEY = "lockApi:v2";

const BASE = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, ""); // <- you're set

function url(p: string) {
  return `${BASE}${p}`;
}

function looksJson(r: Response) {
  return (r.headers.get("content-type") || "").includes("application/json");
}

async function readJson(r: Response) {
  if (!r.ok) throw new Error(`${r.status}`);
  if (!looksJson(r)) {
    const txt = await r.text().catch(() => "");
    throw new Error(`Expected JSON; got ${r.headers.get("content-type")} body=${txt.slice(0, 200)}`);
  }
  return r.json();
}

function loadCache(): Cached | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Cached) : null;
  } catch { return null; }
}
function saveCache(c: Cached) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch {}
}

/** Try several GET shapes that should return {locked:boolean} */
async function discoverGet(slug: string, signal?: AbortSignal): Promise<string> {
  const candidates = [
    `/api/exams/${encodeURIComponent(slug)}/lock`,
    `/exams/${encodeURIComponent(slug)}/lock`,
    `/api/exam-lock/${encodeURIComponent(slug)}`,
    `/exam-lock/${encodeURIComponent(slug)}`,
  ];
  for (const p of candidates) {
    try {
      const r = await fetch(url(p), { credentials: "include", signal });
      if (!r.ok) continue;
      const j = await r.clone().json().catch(() => null);
      if (j && typeof j.locked === "boolean") return p;
    } catch { /* try next */ }
  }
  throw new Error("No GET lock endpoint matched.");
}

/** Try several PUT/POST shapes that should accept {locked:boolean} */
async function trySet(path: string, locked: boolean, method: "PUT" | "POST", signal?: AbortSignal) {
  const r = await fetch(url(path), {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    signal,
    body: JSON.stringify({ locked }),
  });
  const j = await readJson(r);
  if (typeof j.locked !== "boolean") throw new Error("Bad response");
  return !!j.locked;
}

async function discoverSet(slug: string, locked: boolean, signal?: AbortSignal): Promise<{ setPath: string; setMethod: "PUT" | "POST" }> {
  const candidates = [
    `/api/exams/${encodeURIComponent(slug)}/lock`,
    `/exams/${encodeURIComponent(slug)}/lock`,
    `/api/exam-lock/${encodeURIComponent(slug)}`,
    `/exam-lock/${encodeURIComponent(slug)}`,
  ];
  for (const p of candidates) {
    for (const m of ["PUT", "POST"] as const) {
      try {
        await trySet(p, locked, m, signal);
        return { setPath: p, setMethod: m };
      } catch { /* keep trying */ }
    }
  }
  throw new Error("No PUT/POST lock endpoint matched.");
}

/** Public API */
export async function fetchExamLock(slug: string, signal?: AbortSignal): Promise<boolean> {
  const cached = loadCache();
  if (cached?.getPath) {
    try {
      const r = await fetch(url(cached.getPath), { credentials: "include", signal });
      const j = await readJson(r);
      return !!j.locked;
    } catch { /* fall through to discovery */ }
  }
  const getPath = await discoverGet(slug, signal);
  saveCache({ getPath, setPath: getPath, setMethod: "PUT" }); // set* will be refined on first write
  const r = await fetch(url(getPath), { credentials: "include", signal });
  const j = await readJson(r);
  return !!j.locked;
}

export async function setExamLock(slug: string, locked: boolean): Promise<boolean> {
  const cached = loadCache();
  if (cached?.setPath && cached?.setMethod) {
    try { return await trySet(cached.setPath, locked, cached.setMethod); } catch { /* re-discover */ }
  }
  const { setPath, setMethod } = await discoverSet(slug, locked);
  const ok = await trySet(setPath, locked, setMethod);
  const getPath = cached?.getPath ?? setPath;
  saveCache({ getPath, setPath, setMethod });
  return ok;
}

// Optional breadcrumb for debugging
if (typeof window !== "undefined") {
  console.log("[ExamLock] base =", BASE);
}
