// src/components/Login.tsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API = "https://backend-3wuq.onrender.com"; // your backend URL

// Helper: POST with timeout + safe JSON parsing
async function postWithTimeout(url: string, body: any, ms = 10000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });

    const text = await res.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch {}

    if (!res.ok) {
      throw new Error((data && data.error) || text || `HTTP ${res.status}`);
    }
    if (!data || !data.user) throw new Error("Bad response from server.");
    return data;
  } catch (e: any) {
    if (e?.name === "AbortError") {
      throw new Error("Server is taking too long. Please try again.");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const loc = useLocation();

  // Warm the backend to avoid cold-start lag
  useEffect(() => {
    fetch(`${API}/healthz`).catch(() => {});
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) return;

    setLoading(true);
    setMsg("");

    try {
      const { user } = await postWithTimeout(
        `${API}/api/auth/login`,
        { username, password },
        10000
      );

      // Persist session
      localStorage.setItem("user", JSON.stringify(user));
      setMsg(`✅ Logged in as "${user.username}" (${user.role})`);

      // Read persisted redirect (set by RequireAuth), then state.from, then fallback by role
      let stored: string | undefined;
      try {
        stored = sessionStorage.getItem("redirect") || undefined;
        if (stored) sessionStorage.removeItem("redirect");
      } catch {
        // ignore storage errors
      }
      const safeStored =
        typeof stored === "string" && stored.startsWith("/") ? stored : undefined;

      const rawFrom = (loc.state as any)?.from as string | undefined;
      const safeFrom =
        typeof rawFrom === "string" && rawFrom.startsWith("/") ? rawFrom : undefined;

      const fallback = user.role === "teacher" ? "/teacher-dashboard" : "/student-dashboard";
      const dest = safeStored ?? safeFrom ?? fallback;

console.debug("[Login] dest deciding", {
  stored: sessionStorage.getItem("redirect"),
  stateFrom: (useLocation().state as any)?.from,
});

      // Use replace so login isn't left in history
      setTimeout(() => navigate(dest, { replace: true }), 0);
    } catch (err: any) {
      setMsg(`❌ ${err.message || "Login failed"}`);
    } finally {
      setLoading(false);
    }
  }

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
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 rounded-lg font-medium transition ${
            loading ? "bg-blue-600/50 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500"
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
