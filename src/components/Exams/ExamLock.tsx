// src/components/ExamLock.ts
const BASE = (import.meta.env.VITE_BACKEND_URL ?? "").replace(/\/$/, "");

function withAuth(init?: RequestInit): RequestInit {
  const method = (init?.method || "GET").toUpperCase();
  const headers = new Headers(init?.headers || {});
  headers.set("Accept", "application/json, text/plain, */*");
  // IMPORTANT: don't add Content-Type for GET/HEAD; it triggers CORS preflight
  if (method !== "GET" && method !== "HEAD") {
    headers.set("Content-Type", "application/json");
  }

  // Try to find a token in several common places you already use
  const user = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  })();
  const token =
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    user?.token || user?.jwt || user?.accessToken;

  if (token) headers.set("Authorization", `Bearer ${token}`);

  // Do NOT force credentials by default — your server isn’t returning
  // Access-Control-Allow-Credentials on preflight, which is why it was failing.
  return { ...init, headers, credentials: "omit" };
}

/** GET current lock state */
export async function fetchExamLock(slug: string, signal?: AbortSignal): Promise<boolean> {
  if (!BASE) return false;
  const url = `${BASE}/api/exams/${encodeURIComponent(slug)}/lock`;
  const res = await fetch(url, withAuth({ method: "GET", signal }));
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const data = await res.json().catch(() => ({}));
  if (typeof data?.locked === "boolean") return data.locked;
  throw new Error("Unexpected GET /lock response shape.");
}

/** POST (or PUT fallback) to set the lock state */
export async function setExamLock(slug: string, locked: boolean): Promise<void> {
  if (!BASE) return;
  const url = `${BASE}/api/exams/${encodeURIComponent(slug)}/lock`;
  const body = JSON.stringify({ locked });

  // Try POST first
  let res: Response;
  try {
    res = await fetch(url, withAuth({ method: "POST", body }));
  } catch (e) {
    // network/CORS failure – surface as a clear error
    throw new Error("Failed to reach lock endpoint.");
  }
  if (res.ok) return;

  // PUT fallback if server only wired PUT
  if (res.status === 405) {
    const res2 = await fetch(url, withAuth({ method: "PUT", body }));
    if (res2.ok) return;
    const t2 = await res2.text().catch(() => "");
    throw new Error(`${res2.status} ${t2 || res2.statusText}`);
  }

  const t = await res.text().catch(() => "");
  throw new Error(`${res.status} ${t || res.statusText}`);
}
