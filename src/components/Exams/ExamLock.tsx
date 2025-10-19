// src/components/ExamLock.ts
// Autodetects the lock API route shape (GET + PUT/POST) and reuses it.

const BASE = (import.meta.env.VITE_BACKEND_URL ?? "").replace(/\/$/, "");

type Pattern =
  | { kind: "exams-lock"; get: (slug: string) => string; set: (slug: string) => { url: string; method: "PUT" } }
  | { kind: "exam-lock-path"; get: (slug: string) => string; set: (slug: string) => { url: string; method: "POST" } }
  | { kind: "exam-lock-query"; get: (slug: string) => string; set: (slug: string) => { url: string; method: "POST" } };

let discovered: Pattern | null = null;

const headers = {
  Accept: "application/json, text/plain, */*",
  "Content-Type": "application/json",
} as const;

async function tryGet(url: string, signal?: AbortSignal): Promise<null | boolean> {
  try {
    const r = await fetch(url, { method: "GET", headers, credentials: "omit", signal });
    if (!r.ok) return null;

    const ct = r.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const data = await r.json().catch(() => null);
      if (data && typeof data.locked === "boolean") return data.locked;
      return null;
    }

    const t = (await r.text()).trim().toLowerCase();
    if (t === "true") return true;
    if (t === "false") return false;
    try {
      const j = JSON.parse(t);
      if (j && typeof j.locked === "boolean") return j.locked;
    } catch {}
    return null;
  } catch {
    return null;
  }
}

async function discoverPattern(slug: string, signal?: AbortSignal): Promise<Pattern | null> {
  // 1) REST: /api/exams/:slug/lock (PUT to set)
  const p1 = {
    kind: "exams-lock" as const,
    get: (s: string) => `${BASE}/api/exams/${encodeURIComponent(s)}/lock`,
    set: (s: string) => ({ url: `${BASE}/api/exams/${encodeURIComponent(s)}/lock`, method: "PUT" as const }),
  };
  if (await tryGet(p1.get(slug), signal) !== null) return p1;

  // 2) Path: /exam-lock/:slug (or /api/exam-lock/:slug) (POST to set)
  const p2s = [
    {
      kind: "exam-lock-path" as const,
      get: (s: string) => `${BASE}/exam-lock/${encodeURIComponent(s)}`,
      set: (s: string) => ({ url: `${BASE}/exam-lock/${encodeURIComponent(s)}`, method: "POST" as const }),
    },
    {
      kind: "exam-lock-path" as const,
      get: (s: string) => `${BASE}/api/exam-lock/${encodeURIComponent(s)}`,
      set: (s: string) => ({ url: `${BASE}/api/exam-lock/${encodeURIComponent(s)}`, method: "POST" as const }),
    },
  ] as const;
  for (const p of p2s) if (await tryGet(p.get(slug), signal) !== null) return p;

  // 3) Query: /exam-lock?slug=... (or /api/exam-lock?slug=...) (POST to same)
  const p3s = [
    {
      kind: "exam-lock-query" as const,
      get: (s: string) => `${BASE}/exam-lock?slug=${encodeURIComponent(s)}`,
      set: (s: string) => ({ url: `${BASE}/exam-lock?slug=${encodeURIComponent(s)}`, method: "POST" as const }),
    },
    {
      kind: "exam-lock-query" as const,
      get: (s: string) => `${BASE}/api/exam-lock?slug=${encodeURIComponent(s)}`,
      set: (s: string) => ({ url: `${BASE}/api/exam-lock?slug=${encodeURIComponent(s)}`, method: "POST" as const }),
    },
  ] as const;
  for (const p of p3s) if (await tryGet(p.get(slug), signal) !== null) return p;

  return null;
}

/** GET the current lock state. */
export async function fetchExamLock(slug: string, signal?: AbortSignal): Promise<boolean> {
  if (!BASE) return false; // no backend configured → treat as open
  if (!discovered) discovered = await discoverPattern(slug, signal);
  if (!discovered) throw new Error("No lock GET endpoint matched.");

  const state = await tryGet(discovered.get(slug), signal);
  if (state === null) throw new Error("Lock GET returned unexpected response.");
  return state;
}

/** SET the lock state. Throws on failure. */
export async function setExamLock(slug: string, locked: boolean): Promise<void> {
  if (!BASE) return;
  if (!discovered) discovered = await discoverPattern(slug);
  if (!discovered) throw new Error("No PUT/POST lock endpoint matched.");

  const { url, method } = discovered.set(slug);
  const res = await fetch(url, {
    method,
    headers,
    credentials: "omit", // avoid the CORS “Allow-Credentials must be true” trap
    body: JSON.stringify({ slug, locked }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${text || res.statusText}`);
  }
}
