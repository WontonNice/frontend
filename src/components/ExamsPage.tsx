// src/components/ExamsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type ExamSummary = {
  id: string;
  title: string;
  subject: string;
  version: number;
  status: "open" | "closed";
};

type User = { id?: string; username?: string; role?: "student" | "teacher" | string } | null;

// ---------- API base ----------
// In dev, hit your local server; in prod (served by the same server), use relative paths.
const DEV_API = (import.meta as any)?.env?.VITE_API_URL ?? "http://localhost:3001";
const API_BASE = import.meta.env.PROD ? "" : DEV_API;

// ---------- tiny auth helpers ----------
function getUser(): User {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}
function authHeaders(): Record<string, string> {
  const u = getUser();
  if (!u) return {};
  return {
    "x-user-id": String(u.id || u.username || "1"),
    "x-user-name": String(u.username || "demo"),
    "x-user-role": u.role === "teacher" ? "teacher" : "student",
  };
}

export default function ExamsPage() {
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  const user = useMemo(() => getUser(), []);
  const isTeacher = user?.role === "teacher";

  async function load() {
    setLoading(true);
    setMsg("");
    try {
      const qs = isTeacher ? "?all=1" : "";
      const url = `${API_BASE}/api/exams${qs}`;
      const res = await fetch(url, {
        headers: { ...authHeaders() },
        // credentials: "include", // only if your server uses cookies + proper CORS
      });
      if (!res.ok) {
        // Try to parse error body; if not JSON, show status text
        let errText = res.statusText;
        try {
          const data = await res.json();
          errText = data?.error || errText;
        } catch {}
        throw new Error(`${res.status} ${errText}`);
      }
      const data = (await res.json()) as ExamSummary[];
      setExams(data);
    } catch (e: any) {
      // e.message is "Failed to fetch" for network/CORS/mixed-content
      setMsg(`❌ ${e?.message || "Failed to load exams"}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTeacher]);

  async function setStatus(id: string, next: "open" | "closed") {
    if (!isTeacher) return;
    setMsg("");
    try {
      const path = next === "open" ? "open" : "close";
      const url = `${API_BASE}/api/exams/${id}/${path}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
      });
      if (!res.ok) {
        let errText = res.statusText;
        try {
          const data = await res.json();
          errText = data?.error || errText;
        } catch {}
        throw new Error(`${res.status} ${errText}`);
      }
      await load();
    } catch (e: any) {
      setMsg(`❌ ${e?.message || "Update failed"}`);
    }
  }

  if (loading) return <div className="p-6 text-white/80">Loading exams…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Exams</h2>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white"
          >
            Refresh
          </button>
          {isTeacher && (
            <button
              onClick={() => navigate("/teacher-dashboard")}
              className="px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white"
            >
              Teacher Dashboard
            </button>
          )}
        </div>
      </div>

      {msg && <div className="text-sm p-2 bg-gray-800 rounded">{msg}</div>}

      {isTeacher ? (
        exams.length === 0 ? (
          <p className="text-white/70">No exams found. Import one from your teacher tools.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="min-w-full text-left text-sm text-white/90">
              <thead className="bg-gray-800 text-white/70">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Version</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 bg-gray-900/40">
                {exams.map((ex) => (
                  <tr key={ex.id}>
                    <td className="px-4 py-3 font-semibold">{ex.title}</td>
                    <td className="px-4 py-3">{ex.subject.toUpperCase()}</td>
                    <td className="px-4 py-3">v{ex.version}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          ex.status === "open" ? "bg-emerald-700" : "bg-gray-700"
                        }`}
                      >
                        {ex.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setStatus(ex.id, "open")}
                          className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
                          disabled={ex.status === "open"}
                        >
                          Open
                        </button>
                        <button
                          onClick={() => setStatus(ex.id, "closed")}
                          className="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50"
                          disabled={ex.status === "closed"}
                        >
                          Close
                        </button>
                        <button
                          onClick={() => navigate(`/exam/${ex.id}`)}
                          className="px-3 py-2 rounded-lg bg-blue-700 hover:bg-blue-600"
                          title="Preview exam"
                        >
                          Preview
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : exams.length === 0 ? (
        <p className="text-white/70">No exams are open yet. Please check back later.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exams.map((ex) => (
            <button
              key={ex.id}
              onClick={() => navigate(`/exam/${ex.id}`)}
              className="text-left p-4 rounded-xl bg-gray-800 hover:bg-gray-700 transition text-white shadow"
            >
              <div className="text-lg font-semibold">{ex.title}</div>
              <div className="text-white/80 text-sm mt-1">
                {ex.subject.toUpperCase()} • v{ex.version}
              </div>
              <div className="mt-3 text-xs px-2 py-1 rounded bg-emerald-700 inline-block">OPEN</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
