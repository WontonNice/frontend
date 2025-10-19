// src/components/ExamLock.ts
// Robust exam-lock client with no-credentials (avoids CORS-with-credentials).
// If your backend later requires cookies, flip USE_CREDENTIALS to true and
// add CORS headers on the server per Option B.

type Cached = { getPath?: string; setPath: string; setMethod: "PUT" | "POST" };
const CACHE_KEY = "lockApi:v2";

// ---- toggle this if your backend ever needs cookies
const USE_CREDENTIALS = false; // <- keep false for now

const BASE = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");
const withBase = (p: string) => `${BASE}${p}`;

const fetchOpts = (extra?: RequestInit): RequestInit =>
  ({ ...(extra || {}), credentials: USE_CREDENTIALS ? "include" : "omit" });

const looksJson = (r: Response) =>
  (r.headers.get("content-type") || "").includes("application/json");

async function readJson(r: Response) {
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`${r.status} ${txt.slice(0, 200)}`);
  }
  if (!looksJson(r)) {
    const txt = await r.text().catch(() => "");
    throw new Error(`Expected JSON; got ${r.headers.get("content-type") || "unknown"} ${txt.slice(0, 200)}`);
  }
  return r.json();
}

const load = (): Cached | null => {
  try { const raw = localStorage.getItem(CACHE_KEY); return raw ? JSON.parse(raw) as Cached : null; } catch { return null; }
};
const save = (c: Cached) => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch {} };

const pathCandidates = (slug: string) => [
  `/exam-lock/${encodeURIComponent(slug)}`,
  `/api/exam-lock/${encodeURIComponent(slug)}`,
  `/api/v1/exams/${encodeURIComponent(slug)}/lock`,
  `/v1/exams/${encodeURIComponent(slug)}/lock`,
  `/exams/${encodeURIComponent(slug)}/lock`,
  `/api/exams/${encodeURIComponent(slug)}/lock`,
];

async function discoverGet(slug: string, signal?: AbortSignal): Promise<string | undefined> {
  for (const p of pathCandidates(slug)) {
    try {
      const r = await fetch(withBase(p), fetchOpts({ signal }));
      if (!r.ok) continue;
      const j = await r.clone().json().catch(() => null);
      if (j && typeof j.locked === "boolean") return p;
    } catch {}
  }
  return undefined; // GET not required; we’ll fail-open
}

async function trySet(path: string, locked: boolean, method: "PUT" | "POST", signal?: AbortSignal) {
  const r = await fetch(
    withBase(path),
    fetchOpts({
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locked }),
      signal,
    })
  );
  const j = await readJson(r);
  if (typeof j.locked !== "boolean") throw new Error("Bad response");
  return !!j.locked;
}

async function discoverSet(slug: string, locked: boolean, signal?: AbortSignal) {
  for (const p of pathCandidates(slug)) {
    for (const m of ["PUT", "POST"] as const) {
      try {
        await trySet(p, locked, m, signal);
        return { setPath: p, setMethod: m };
      } catch {}
    }
  }
  throw new Error("No PUT/POST lock endpoint matched.");
}

// ---------- public API ----------

export async function fetchExamLock(slug: string, signal?: AbortSignal): Promise<boolean> {
  const cached = load();
  if (cached?.getPath) {
    try {
      const j = await readJson(await fetch(withBase(cached.getPath), fetchOpts({ signal })));
      return !!j.locked;
    } catch {}
  }
  const getPath = await discoverGet(slug, signal);
  if (getPath) {
    const j = await readJson(await fetch(withBase(getPath), fetchOpts({ signal })));
    const prev = load();
    save({ ...(prev ?? {}), getPath, setPath: prev?.setPath || getPath, setMethod: prev?.setMethod || "PUT" });
    return !!j.locked;
  }
  // No GET available — treat as OPEN
  return false;
}

export async function setExamLock(slug: string, locked: boolean): Promise<boolean> {
  const cached = load();
  if (cached?.setPath && cached?.setMethod) {
    try { return await trySet(cached.setPath, locked, cached.setMethod); } catch {}
  }
  const { setPath, setMethod } = await discoverSet(slug, locked);
  const ok = await trySet(setPath, locked, setMethod);
  const prev = load();
  save({ getPath: prev?.getPath, setPath, setMethod });
  return ok;
}
