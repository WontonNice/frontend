// src/components/Login.tsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API =
  (import.meta as any)?.env?.VITE_API_URL ??
  //"https://backend-3wuq.onrender.com";
  "https://backend-tv8i.onrender.com";

type Role = "teacher" | "student" | (string & {});
type User = { username: string; role: Role };
type LoginResponse = { user: User };
type LocationState = { from?: string };

// Helper: POST with timeout + safe JSON parsing + typing
async function postWithTimeout<T>(
  url: string,
  body: unknown,
  ms = 10000
): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // If your backend uses cookie sessions, uncomment:
      // credentials: "include",
      body: JSON.stringify(body),
      signal: ctl.signal,
    });

    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // ignore bad JSON
    }

    if (!res.ok) {
      const msg =
        (data as any)?.error ||
        text ||
        `HTTP ${res.status} ${res.statusText}`;
      throw new Error(msg);
    }
    if (!data) throw new Error("Empty response from server.");
    return data as T;
  } catch (e: any) {
    if (e?.name === "AbortError") {
      throw new Error("Server is taking too long. Please try again.");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function getSafePath(maybe: unknown): string | undefined {
  return typeof maybe === "string" && maybe.startsWith("/") ? maybe : undefined;
}

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const loc = useLocation(); // don't cast to Location; avoid DOM Location clash

  // Warm the backend to avoid cold-start lag
  useEffect(() => {
    const ctl = new AbortController();
    fetch(`${API}/healthz`, { signal: ctl.signal }).catch(() => {});
    return () => ctl.abort();
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password || loading) return;

    setLoading(true);
    setMsg("");

    try {
      const { user } = await postWithTimeout<LoginResponse>(
        `${API}/api/auth/login`,
        { username, password },
        10000
      );

      // Persist session
      try {
        localStorage.setItem("user", JSON.stringify(user));
      } catch {
        // ignore storage errors
      }

      setMsg(`✅ Logged in as "${user.username}" (${user.role})`);

      // Read persisted redirect (set by RequireAuth), then state.from, then fallback by role
      let storedRaw: string | undefined;
      try {
        storedRaw = sessionStorage.getItem("redirect") || undefined;
        if (storedRaw) sessionStorage.removeItem("redirect");
      } catch {
        storedRaw = undefined;
      }

      const safeStored = getSafePath(storedRaw);

      // Narrow only the state shape (avoid casting the entire location)
      const rawFrom = (loc.state as LocationState | undefined)?.from;
      const safeFrom = getSafePath(rawFrom);

      const fallback =
        user.role === "teacher" ? "/teacher-dashboard" : "/student-dashboard";
      const dest = safeStored ?? safeFrom ?? fallback;

      console.debug("[Login] redirect decision", {
        stored: safeStored,
        stateFrom: safeFrom,
        fallback,
        dest,
      });

      // Use replace so login isn't left in history
      navigate(dest, { replace: true });
    } catch (err: any) {
      setMsg(`❌ ${err?.message || "Login failed"}`);
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = !!username && !!password && !loading;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-6">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm bg-gray-800 p-6 rounded-xl space-y-4 shadow-lg"
      >
        <h1 className="text-2xl font-semibold text-center">Log In</h1>

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
            autoComplete="current-password"
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
          {loading ? "Logging in…" : "Log In"}
        </button>

        <button
          type="button"
          onClick={() => navigate("/register")}
          className="w-full mt-3 py-2 rounded-lg font-medium bg-gray-700 hover:bg-gray-600 transition"
          disabled={loading}
        >
          Create Account
        </button>
      </form>
    </div>
  );
}
