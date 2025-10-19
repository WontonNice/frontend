// src/components/AuthSplit.tsx
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  type InputHTMLAttributes,
} from "react";
import { useNavigate } from "react-router-dom";

/** API base:
 *  - Dev: leave VITE_API_URL unset -> "" so requests are RELATIVE and Vite proxies them
 *  - Prod: set VITE_API_URL to your backend origin (e.g., https://backend.example.com)
 */
const API_BASE = (import.meta.env?.VITE_API_URL ?? "").replace(/\/+$/, "");
const apiUrl = (p: string) => `${API_BASE}${p}`;

// tiny fetch helper (timeout + safe JSON)
async function postJSON<T>(url: string, body: unknown, ms = 10000): Promise<T> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // credentials: "include",
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
  const isSignup = mode === "signup";

  // autofocus first field when switching modes
  const firstFieldRef = useRef<HTMLInputElement>(null);
  useEffect(() => { firstFieldRef.current?.focus(); }, [isSignup]);

  // optional warmup
  useEffect(() => {
    const ctl = new AbortController();
    fetch(apiUrl("/health"), { signal: ctl.signal }).catch(() => {});
    return () => ctl.abort();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    setMsg("");
    setLoading(true);
    try {
      if (isSignup) {
        // ⬅️ enforce student role on creation
        const { user } = await postJSON<RegisterRes>(apiUrl("/api/auth/register"), {
          username,
          password,
          role: "student",
        });
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
      setMsg(`❌ ${err?.message || (isSignup ? "Sign up failed" : "Login failed")}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f3f6f6] flex items-center justify-center p-6">
      <div className="relative w-full max-w-5xl">
        {/* Card shell */}
        <div className="relative bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* SLIDING OVERLAY (teal) */}
          <div
            className={[
              "absolute inset-y-0 left-0 w-1/2 rounded-2xl bg-teal-500 shadow-lg",
              "transition-transform duration-700 ease-in-out will-change-transform",
              "motion-reduce:transition-none motion-reduce:transform-none",
              "pointer-events-none",
              isSignup ? "translate-x-0" : "translate-x-full",
            ].join(" ")}
            aria-hidden
          />

          {/* CONTENT LAYER */}
          <div className="relative grid grid-cols-1 md:grid-cols-2">
            {/* LEFT PANEL CONTENT */}
            <div className="relative p-10 md:p-12 flex flex-col justify-center">
              {/* Decorative shapes */}
              <div className="pointer-events-none absolute inset-0 opacity-10">
                <div className="absolute left-8 top-10 w-24 h-24 bg-white/20 rounded-lg rotate-12" />
                <div className="absolute right-10 bottom-14 w-16 h-16 bg-white/20 rounded-full" />
                <div className="absolute left-1/3 bottom-8 w-10 h-10 bg-white/20 rounded-md -rotate-12" />
              </div>

              <div className="relative z-10">
                <div className="mb-8 inline-flex items-center gap-3">
                  <div className={[
                    "h-9 w-9 rounded-lg flex items-center justify-center font-bold transition-colors duration-700",
                    isSignup ? "bg-white/20 text-white" : "bg-teal-600/10 text-teal-600",
                  ].join(" ")}>D</div>
                  <div className={[
                    "font-semibold text-lg transition-colors duration-700",
                    isSignup ? "text-white" : "text-teal-700",
                  ].join(" ")}>Nathan Teacher's Website</div>
                </div>

                <h2 className={[
                  "text-3xl md:text-4xl font-extrabold mb-2 transition-colors duration-700",
                  isSignup ? "text-white" : "text-teal-700",
                ].join(" ")}>
                  {isSignup ? "Welcome Back!" : "Hello, Student!"}
                </h2>

                <p className={[
                  "mb-8 transition-colors duration-700",
                  isSignup ? "text-white/90" : "text-teal-700/80",
                ].join(" ")}>
                  Please enter your account details
                </p>

                {/* Toggle mode */}
                <button
                  type="button"
                  onClick={() => setMode(isSignup ? "login" : "signup")}
                  className={[
                    "inline-flex items-center justify-center rounded-full px-8 py-3 transition duration-300 font-medium",
                    isSignup
                      ? "border border-white/80 text-white hover:bg-white hover:text-teal-600"
                      : "border border-teal-600/60 text-teal-700 hover:bg-teal-600 hover:text-white",
                  ].join(" ")}
                >
                  {isSignup ? "SIGN IN" : "SIGN UP"}
                </button>
              </div>
            </div>

            {/* RIGHT PANEL — FORMS */}
            <div className="p-10 md:p-12">
              <div className="max-w-md mx-auto">
                <h1 className="text-3xl font-extrabold text-teal-600 text-center">
                  {isSignup ? "Create Account" : "Log In"}
                </h1>

                <p className="mt-4 text-center text-sm text-gray-500">
                  Use your {isSignup ? "username for registration" : "username to login"}:
                </p>

                {msg && (
                  <div
                    className="mt-4 text-sm text-center p-2 rounded-md bg-gray-100 text-gray-800 border"
                    role="status"
                    aria-live="polite"
                  >
                    {msg}
                  </div>
                )}

                {/* FORM */}
                <form onSubmit={handleSubmit} className="mt-6">
                  <div className="relative h-[190px]">
                    {/* Sign Up form */}
                    <FormShell visible={isSignup}>
                      <AuthInput
                        ref={isSignup ? firstFieldRef : undefined}
                        icon="👤"
                        type="text"
                        placeholder="Name"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoComplete="username"
                      />
                      <AuthInput
                        icon="🔒"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                    </FormShell>

                    {/* Log In form */}
                    <FormShell visible={!isSignup}>
                      <AuthInput
                        ref={!isSignup ? firstFieldRef : undefined}
                        icon="👤"
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoComplete="username"
                      />
                      <AuthInput
                        icon="🔒"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                      />
                    </FormShell>
                  </div>

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className={[
                      "mt-2 w-full rounded-full py-3 font-semibold transition",
                      !canSubmit ? "bg-teal-500/50 text-white cursor-not-allowed" : "bg-teal-500 hover:bg-teal-400 text-white",
                    ].join(" ")}
                  >
                    {loading ? (isSignup ? "Signing up…" : "Signing in…") : (isSignup ? "SIGN UP" : "SIGN IN")}
                  </button>

                  <p className="text-center text-sm text-gray-500 mt-4">
                    {isSignup ? (
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
    </div>
  );
}

/* ----------------- small presentational helpers ----------------- */

type AuthInputProps = { icon: string } & InputHTMLAttributes<HTMLInputElement>;

const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(function AuthInput(
  { icon, className, ...props },
  ref
) {
  return (
    <div className="relative">
      <input
        ref={ref}
        {...props}
        className={
          "w-full rounded-md border border-gray-200 bg-gray-50 px-11 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent " +
          (className || "")
        }
      />
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        {icon}
      </span>
    </div>
  );
});

function FormShell({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  // stacked absolutely; animate transform + opacity to "slide" in/out
  return (
    <div
      className={[
        "absolute inset-0 flex flex-col gap-4",
        "transition-all duration-500 ease-out will-change-transform",
        "motion-reduce:transition-none motion-reduce:transform-none",
        visible ? "opacity-100 translate-x-0" : "opacity-0 pointer-events-none translate-x-8",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
