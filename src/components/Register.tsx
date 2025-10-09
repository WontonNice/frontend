import { useState } from "react";

const API = "https://backend-3wuq.onrender.com";

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) return;

    setLoading(true);
    setMsg("");

    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create account.");

      setMsg(`✅ Account created for "${data.user.username}"`);
      setUsername("");
      setPassword("");
    } catch (err: any) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

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
            loading ? "bg-blue-600/50" : "bg-blue-600 hover:bg-blue-500"
          }`}
        >
          {loading ? "Creating…" : "Create Account"}
        </button>
      </form>
    </div>
  );
}
