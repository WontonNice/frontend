// src/components/ExamLock.ts
// Robust exam-lock helper: discovers the right GET/PUT/POST endpoint and caches it.

type Cached = { getPath: string; setPath: string; setMethod: "PUT" | "POST" };
const CACHE_KEY = "lockApi:v2";

const BASE = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");

function u(p: string) { return `${BASE}${p}`; }
function looksJson(r: Response) { return (r.headers.get("content-type") || "").includes("application/json"); }

async function readJson(r: Response) {
  if (!r.ok) {
    const txt = await r.text().catch(()=>"");
    throw new Error(`${r.status} ${txt.slice(0,200)}`);
  }
  if (!looksJson(r)) {
    const txt = await r.text().catch(()=>"");
    throw new Error(`Expected JSON (got ${r.headers.get("content-type")}) ${txt.slice(0,200)}`);
  }
  return r.json();
}

function load(): Cached | null {
  try { const raw = localStorage.getItem(CACHE_KEY); return raw ? JSON.parse(raw) as Cached : null; } catch { return null; }
}
function save(c: Cached) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch {} }

async function discoverGet(slug: string, signal?: AbortSignal): Promise<string> {
  const tests = [
    `/api/exams/${encodeURIComponent(slug)}/lock`,
    `/exams/${encodeURIComponent(slug)}/lock`,
    `/api/exam-lock/${encodeURIComponent(slug)}`,
    `/exam-lock/${encodeURIComponent(slug)}`,
  ];
  for (const p of tests) {
    try {
      const r = await fetch(u(p), { credentials: "include", signal });
      if (!r.ok) continue;
      const j = await r.clone().json().catch(()=>null);
      if (j && typeof j.locked === "boolean") return p;
    } catch {}
  }
  throw new Error("No GET lock endpoint matched.");
}

async function trySet(path: string, locked: boolean, method: "PUT" | "POST", signal?: AbortSignal) {
  const r = await fetch(u(path), {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locked }),
    signal
  });
  const j = await readJson(r);
  if (typeof j.locked !== "boolean") throw new Error("Bad response");
  return !!j.locked;
}

async function discoverSet(slug: string, locked: boolean, signal?: AbortSignal) {
  const tests = [
    `/api/exams/${encodeURIComponent(slug)}/lock`,
    `/exams/${encodeURIComponent(slug)}/lock`,
    `/api/exam-lock/${encodeURIComponent(slug)}`,
    `/exam-lock/${encodeURIComponent(slug)}`,
  ];
  for (const p of tests) {
    for (const m of ["PUT","POST"] as const) {
      try {
        await trySet(p, locked, m, signal);
        return { setPath: p, setMethod: m };
      } catch {}
    }
  }
  throw new Error("No PUT/POST lock endpoint matched.");
}

export async function fetchExamLock(slug: string, signal?: AbortSignal): Promise<boolean> {
  const c = load();
  if (c?.getPath) {
    try {
      const j = await readJson(await fetch(u(c.getPath), { credentials: "include", signal }));
      return !!j.locked;
    } catch {}
  }
  const getPath = await discoverGet(slug, signal);
  save({ getPath, setPath: getPath, setMethod: "PUT" });
  const j = await readJson(await fetch(u(getPath), { credentials: "include", signal }));
  return !!j.locked;
}

export async function setExamLock(slug: string, locked: boolean): Promise<boolean> {
  const c = load();
  if (c?.setPath && c?.setMethod) {
    try { return await trySet(c.setPath, locked, c.setMethod); } catch {}
  }
  const { setPath, setMethod } = await discoverSet(slug, locked);
  const ok = await trySet(setPath, locked, setMethod);
  const getPath = c?.getPath ?? setPath;
  save({ getPath, setPath, setMethod });
  return ok;
}
