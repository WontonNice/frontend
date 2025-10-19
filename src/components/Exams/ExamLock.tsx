// src/components/ExamLock.ts

const BASE = (import.meta.env.VITE_BACKEND_URL ?? "").replace(/\/$/, "");

function withAuth(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers || {});
  headers.set("Accept", "application/json, text/plain, */*");
  headers.set("Content-Type", "application/json");

  // OPTIONAL: if you keep a JWT anywhere in localStorage, add it.
  // Adjust the key names to match your app.
  const token =
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("access_token");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  return { ...init, headers, credentials: "include" }; // include cookies for teacher role
}

/** GET current lock state (public; still OK to include auth). */
export async function fetchExamLock(slug: string, signal?: AbortSignal): Promise<boolean> {
  if (!BASE) return false;
  const url = `${BASE}/api/exams/${encodeURIComponent(slug)}/lock`;
  const res = await fetch(url, withAuth({ method: "GET", signal }));
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const data = await res.json().catch(() => ({}));
  if (typeof data?.locked === "boolean") return data.locked;
  throw new Error("Unexpected GET /lock response shape.");
}

/** SET lock state (requires teacher). */
export async function setExamLock(slug: string, locked: boolean): Promise<void> {
  if (!BASE) return;
  const url = `${BASE}/api/exams/${encodeURIComponent(slug)}/lock`;
  const body = JSON.stringify({ locked });

  const res = await fetch(url, withAuth({ method: "POST", body }));
  if (res.ok) return;

  // Try PUT as a fallback if POST isn’t wired
  if (res.status === 405) {
    const res2 = await fetch(url, withAuth({ method: "PUT", body }));
    if (res2.ok) return;
    const t2 = await res2.text().catch(() => "");
    throw new Error(`${res2.status} ${t2 || res2.statusText}`);
  }

  const t = await res.text().catch(() => "");
  throw new Error(`${res.status} ${t || res.statusText}`);
}
