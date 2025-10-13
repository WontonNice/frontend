// src/lib/api.ts
// Prefer VITE_API_URL when set. In prod, default to same-origin.
// In dev, default to your local API.
export const BASE_URL =
  (import.meta as any)?.env?.VITE_API_URL ??
  (import.meta.env.PROD ? "" : "http://localhost:3001");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    credentials: "include",
    ...init,
  });

  // Guard against HTML/SPA fallbacks
  const ct = res.headers.get("content-type") || "";
  if (!res.ok || !ct.includes("application/json")) {
    const text = await res.text();
    throw new Error(`Expected JSON. Got ${res.status} ${ct}: ${text.slice(0,180)}…`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  healthz: () => request<{ ok: boolean }>("/healthz"),
  hello: () => request<{ msg: string }>("/api/hello"),
  exams: (all = false) => request(`/api/exams${all ? "?all=1" : ""}`),
  // add more: request("/api/exams/:id/open"), etc.
};
