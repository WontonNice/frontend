import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/** API base:
 *  - Dev: leave VITE_API_URL unset -> "" so requests are RELATIVE and Vite proxies them
 *  - Prod: set VITE_API_URL to your backend origin (e.g., https://backend.example.com)
 */
const API_BASE = (import.meta.env?.VITE_API_URL ?? "").replace(/\/+$/, "");
const apiUrl = (path: string) => `${API_BASE}${path}`;

// tiny fetch helper with timeout + safe JSON
async function postJSON<T>(url: string, body: unknown, ms = 10000): Promise<T> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // credentials: "include", // if you use cookie sessions
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    const text = await res.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch {}
    if (!res.ok) {
      const message =
        data?.error ||
        (res.status === 409 ? "Username already taken" : "") ||
        text ||
        `HTTP ${res.status} ${res.statusText}`;
      throw new Error(message);
    }
    if (!data) throw new Error("Empty response from server.");
    return data as T;
  } catch (e: any) {
    if (e?.name === "AbortError") throw new Error("Server is taking too long. Please try again.");
    if (String(e?.message).includes("Failed to fetch")) {
      throw new Error("Network/CORS error — is the backend reachable for this origin?");
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

type Role = "teacher" | "student" | (string & {});
type User = { username: string; role: Role };
type LoginRes = { user: User };
type RegisterRes = { user: User };

export default function AuthSplit() {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const canSubmit = useMemo(() => !!username && !!password && !loading, [username, password, loading]);

  // optional: warm the backend (helps cold starts)
  useEffect(() => {
    const ctl = new AbortController();
    fetch(apiUrl("/health"), { signal: ctl.signal }).catch(() => {});
    return () => ctl.abort();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setMsg("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const { user } = await postJSON<RegisterRes>(apiUrl("/api/auth/register"), { username, password });
        setMsg(`✅ Account created for “${user.username}”`);
        setUsername("");
        setPassword("");
      } else {
        const { user } = await postJSON<LoginRes>(apiUrl("/api/auth/login"), { username, password });
        try { localStorage.setItem("user", JSON.stringify(user)); } catch {}
        setMsg(`✅ Logged in as “${user.username}” (${user.role})`);
        navigate(user.role === "teacher" ? "/teacher-dashboard" : "/student-dashboard", { replace: true });
      }
    } catch (err: any) {
      setMsg(`❌ ${err?.message || (mode === "signup" ? "Sign up failed" : "Login failed")}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f3f6f6] flex items-center justify-center p-6">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* LEFT — Welcome back (teal panel) */}
          <div className="relative bg-teal-500 text-white p-10 md:p-12 flex flex-col justify-center">
            <div className="pointer-events-none absolute inset-0 opacity-10">
              <div className="absolute left-8 top-10 w-24 h-24 bg-white/20 rounded-lg rotate-12" />
              <div className="absolute right-10 bottom-14 w-16 h-16 bg-white/20 rounded-full" />
              <div className="absolute left-1/3 bottom-8 w-10 h-10 bg-white/20 rounded-md -rotate-12" />
            </div>

            <div className="relative">
              <div className="mb-8 inline-flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center font-bold">D</div>
                <div className="font-semibold text-lg">Diprella</div>
              </div>

              <h2 className="text-3xl md:text-4xl font-extrabold mb-2">Welcome Back!</h2>
              <p className="text-white/90 mb-8">To keep connected with us please login with your personal info</p>

              <button
                onClick={() => setMode("login")}
                className="inline-flex items-center justify-center rounded-full px-8 py-3 border border-white/80 hover:bg-white hover:text-teal-600 transition font-medium"
              >
                SIGN IN
              </button>
            </div>
          </div>

          {/* RIGHT — Auth form */}
          <div className="p-10 md:p-12">
            <div className="max-w-md mx-auto">
              <h1 className="text-3xl font-extrabold text-teal-600 text-center">
                {mode === "signup" ? "Create Account" : "Log In"}
              </h1>

              {/* Social icons row (visual only) */}
              <div className="mt-6 flex items-center justify-center gap-4">
                <IconCircle label="f" />
                <IconCircle label="G+" />
                <IconCircle label="in" />
              </div>

              <p className="mt-4 text-center text-sm text-gray-500">
                or use your username for {mode === "signup" ? "registration" : "login"}:
              </p>

              {msg && (
                <div className="mt-4 text-sm text-center p-2 rounded-md bg-gray-100 text-gray-800 border">
                  {msg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {/* Username */}
                <div className="relative">
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={mode === "signup" ? "Name" : "Username"}
                    autoComplete="username"
                  />
                  <FieldIcon>👤</FieldIcon>
                </div>

                {/* Password */}
                <div className="relative">
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  />
                  <FieldIcon>🔒</FieldIcon>
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`w-full rounded-full py-3 font-semibold transition ${
                    !canSubmit ? "bg-teal-500/50 text-white cursor-not-allowed" : "bg-teal-500 hover:bg-teal-400 text-white"
                  }`}
                >
                  {loading ? (mode === "signup" ? "Signing up…" : "Signing in…") : (mode === "signup" ? "SIGN UP" : "SIGN IN")}
                </button>

                <p className="text-center text-sm text-gray-500">
                  {mode === "signup" ? (
                    <>
                      Already have an account?{" "}
                      <button type="button" onClick={() => setMode("login")} className="text-teal-600 hover:underline">
                        Log in
                      </button>
                    </>
                  ) : (
                    <>
                      New here?{" "}
                      <button type="button" onClick={() => setMode("signup")} className="text-teal-600 hover:underline">
                        Create an account
                      </button>
                    </>
                  )}
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- tiny presentational helpers ---------- */

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={
        "w-full rounded-md border border-gray-200 bg-gray-50 px-11 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent" +
        (props.className ? " " + props.className : "")
      }
    />
  );
}

function FieldIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
      {children}
    </span>
  );
}

function IconCircle({ label }: { label: string }) {
  return (
    <div className="h-10 w-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 text-sm hover:bg-gray-50">
      {label}
    </div>
  );
}
