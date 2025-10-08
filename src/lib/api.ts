// src/lib/api.ts
const BASE_URL = "https://frontend-tgl3.onrender.com";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    credentials: "include",
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${text}`);
  }
  return res.json() as Promise<T>;
}

// Example typed endpoints:
export const api = {
  health: () => fetch(`${BASE_URL}/health`).then(r => r.text()), // plain text
  hello: () => request<{ msg: string }>("/api/hello"),
  // add more: request("/api/students"), request("/api/tests"), etc.
};

export { BASE_URL };
