import { useMemo, useState } from "react";
const API = "https://backend-3wuq.onrender.com";

export default function Register() {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err" | ""; text: string }>({ type: "", text: "" });

  const usernameOk = useMemo(() => /^[a-zA-Z0-9_]{3,32}$/.test(u), [u]);
  const passwordOk = useMemo(() => p.length >= 8 && p.length <= 128, [p]);
  const formOk = usernameOk && passwordOk && !loading;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!formOk) return;
    setLoading(true);
    setMsg({ type: "", text: "Creating account…" });
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password: p })
      });

      const text = await res.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch {}

      if (!res.ok) {
        throw new Error((data && data.error) || text || `HTTP ${res.status}`);
      }
      if (!data || !data.user) throw new Error("Server returned no JSON body");

      setMsg({ type: "ok", text: `Account created for "${data.user.username}"` });
      setU(""); setP("");
    } catch (err: any) {
      setMsg({ type: "err", text: err.message || "Something went wrong" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-900 p-6 text-white">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-gray-800/70 shadow-xl ring-1 ring-white/10">
          <div className="px-6 pt-6">
            <h1 className="text-2xl font-semibold">Create Account</h1>
            <p className="mt-1 text-sm text-gray-300">Choose a username and password to get started.</p>
          </div>

          {msg.text ? (
            <div
              className={`mx-6 mt-4 rounded-lg px-4 py-3 text-sm ${
                msg.type === "ok" ? "bg-green-600/20 text-green-200 ring-1 ring-green-500/30"
                : msg.type === "err" ? "bg-red-600/20 text-red-200 ring-1 ring-red-500/30"
                : "bg-gray-700/50 text-gray-200 ring-1 ring-white/10"
              }`}
              role="status"
            >
              {msg.text}
            </div>
          ) : null}

          <form onSubmit={submit} className="px-6 pb-6 pt-4 space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm mb-1 text-gray-200">Username</label>
              <input
                id="username"
                autoComplete="username"
                className={`w-full rounded-lg px-3 py-2 text-black outline-none ring-2 transition
                  ${u.length === 0 ? "ring-transparent" : usernameOk ? "ring-green-400" : "ring-red-400"}`}
                placeholder="e.g. ccm_student_01"
                value={u}
                onChange={(e) => setU(e.target.value)}
                required
              />
              <p className="mt-1 text-xs text-gray-400">Letters, numbers, underscores · 3–32 characters</p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm mb-1 text-gray-200">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  className={`w-full rounded-lg px-3 py-2 pr-24 text-black outline-none ring-2 transition
                    ${p.length === 0 ? "ring-transparent" : passwordOk ? "ring-green-400" : "ring-red-400"}`}
                  placeholder="At least 8 characters"
                  value={p}
                  onChange={(e) => setP(e.target.value)}
                  required
                  minLength={8}
                  maxLength={128}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs bg-gray-200 text-gray-900 hover:bg-gray-300"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={!formOk}
              className={`w-full rounded-lg px-4 py-2 font-medium transition
                ${formOk ? "bg-blue-600 hover:bg-blue-500" : "bg-blue-600/50 cursor-not-allowed"}`}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner /> Creating Account…
                </span>
              ) : (
                "Create Account"
              )}
            </button>

            <p className="text-xs text-gray-400">By continuing you agree to have an account created with this username.</p>
          </form>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
    </svg>
  );
}
