// src/components/ExamLock.ts
/**
 * Unified helpers to hit your backend's lock endpoints:
 *   GET  /api/exams/:slug/lock  -> { locked: boolean }
 *   PUT  /api/exams/:slug/lock  -> { locked: boolean }
 *
 * Configure your backend origin with VITE_BACKEND_URL.
 * Fallbacks:
 * - if VITE_BACKEND_URL not set, we try VITE_SOCKET_URL
 * - if still empty, we use relative "/api" (same-origin) so a reverse proxy can handle it
 */

const rawBase =
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_SOCKET_URL ||
  ""; // final fallback: relative "/api"

const BASE =
  rawBase.trim() === "" ? "" : rawBase.replace(/\/$/, "");

function apiUrl(path: string) {
  // If BASE is empty, use relative "/api/..." so a proxy can forward to backend.
  return BASE ? `${BASE}${path}` : path;
}

export async function fetchExamLock(slug: string, signal?: AbortSignal): Promise<boolean> {
  const url = apiUrl(`/api/exams/${encodeURIComponent(slug)}/lock`);
  const r = await fetch(url, { credentials: "include", signal });
  if (!r.ok) throw new Error(`lock GET failed: ${r.status}`);
  const j = await r.json();
  return !!j.locked;
}

export async function setExamLock(slug: string, locked: boolean): Promise<boolean> {
  const url = apiUrl(`/api/exams/${encodeURIComponent(slug)}/lock`);
  const r = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    // If your backend authorizes via header/JWT, add it here:
    // Authorization: `Bearer ${token}`
    body: JSON.stringify({ locked }),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`lock PUT failed: ${r.status} ${text}`);
  }
  const j = await r.json();
  return !!j.locked;
}
