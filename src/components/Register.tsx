// src/components/Register.tsx
import { useEffect, useState } from "react";

/**
 * API base:
 * - Dev: leave VITE_API_URL unset -> "" so requests are RELATIVE and Vite proxies them
 * - Prod: set VITE_API_URL to your backend origin (e.g., https://backend.yourapp.com)
 */
const API_BASE = (import.meta.env?.VITE_API_URL ?? "").replace(/\/+$/, "");
const apiUrl = (path: string) => `${API_BASE}${path}`;

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Optional: warm the backend (helps cold starts in prod)
  useEffect(() => {
    const ctl = new AbortController();
    fetch(apiUrl("/health"), { signal: ctl.signal }).catch(() => {});
    return () => ctl.abort();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password || loading) return;

    setLoading(true);
    setMsg("");

    try {
      const res = await fetch(apiUrl("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // If your backend uses cookie sessions, also set:
        // credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      // Robust parsing (handles empty or non-JSON error bodies)
      const text = await res.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch {}

      if (!res.ok) {
        // Common helpful messages
        const message =
          data?.error ||
          (res.status === 409 ? "Username already taken" : "") ||
          text ||
          `HTTP ${res.status} ${res.statusText}`;
        throw new Error(message);
      }

      if (!data?.user?.username) {
        throw new Error("Server returned an unexpected/empty response.");
      }

      setMsg(`✅ Account created for "${data.user.username}"`);
      setUsername("");
      setPassword("");
    } catch (err: any) {
      const m = String(err?.message || "");
      // Map the classic fetch failure to something clearer
      const friendly =
        m.includes("Failed to fetch")
          ? "Network/CORS error — is the backend reachable and allowing this origin?"
          : m;
      setMsg(`❌ ${friendly}`);
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = !!username && !!password && !loading;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-gray-800 p-6 rounded-xl space-y-4 shadow-lg"
      >
        <h1 className="text-2xl font-semibold text-center">Create Account</h1>

        {msg && (
          <div className="text-sm text-center p-2 bg-gray-700 rounded-lg">
            {msg}
          </div>
        )}

        <div>
          <label className="block mb-1 text-sm">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-black"
            placeholder="username"
            required
            autoComplete="username"
          />
        </div>

        <div>
          <label className="block mb-1 text-sm">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-black"
            placeholder="password"
            required
            autoComplete="new-password"
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className={`w-full py-2 rounded-lg font-medium transition ${
            !canSubmit
              ? "bg-blue-600/50 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-500"
          }`}
        >
          {loading ? "Creating…" : "Create Account"}
        </button>
      </form>
    </div>
  );
}
