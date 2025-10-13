// src/components/ExamRunner.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { ExamDetail } from "../types/exam";
import { BASE_URL } from "../lib/api";

// ---------- tiny auth helpers (same behavior as ExamsPage) ----------
type User =
  | { id?: string; username?: string; role?: "student" | "teacher" | string }
  | null;

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

// Expect JSON and fail clearly if we accidentally hit the SPA
async function jsonOrThrow<T>(res: Response): Promise<T> {
  const ct = res.headers.get("content-type") || "";
  if (!res.ok || !ct.includes("application/json")) {
    const text = await res.text();
    throw new Error(
      `Expected JSON. Got ${res.status} ${ct || "(no content-type)"}: ${text.slice(0, 180)}…`
    );
  }
  return (await res.json()) as T;
}

export default function ExamRunner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [cursor, setCursor] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [msg, setMsg] = useState("");

  // flatten questions for easy navigation
  const flat = useMemo(() => {
    if (!exam) return [];
    return exam.sections.flatMap((s, si) =>
      s.questions.map((q, qi) => ({ ...q, si, qi }))
    );
  }, [exam]);

  useEffect(() => {
    let abort = false;
    (async () => {
      if (!id) return;
      try {
        // 1) fetch exam (student-safe)
        const res = await fetch(`${BASE_URL}/api/exams/${id}`, {
          headers: { ...authHeaders() },
        });
        const examData = await jsonOrThrow<ExamDetail>(res);
        if (abort) return;
        setExam(examData);

        // 2) create attempt
        const res2 = await fetch(`${BASE_URL}/api/exams/${id}/attempts`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
        });
        const data2 = await jsonOrThrow<{ id: string }>(res2);
        if (abort) return;
        setAttemptId(data2.id);
      } catch (e: any) {
        if (!abort) setMsg(`❌ ${e.message || "Failed to start exam"}`);
      }
    })();
    return () => {
      abort = true;
    };
  }, [id]);

  // autosave on change (debounced)
  useEffect(() => {
    if (!attemptId) return;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/attempts/${attemptId}/progress`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ answers }),
        });
        // no throw on non-OK, but guard against HTML to avoid console noise
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          // swallow silently; autosave is best-effort
          await res.text();
        }
      } catch {
        /* best-effort autosave */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [answers, attemptId]);

  if (!exam) return <div className="p-6 text-white/80">Loading exam… {msg}</div>;
  const q = flat[cursor];
  if (!q) {
    return (
      <div className="p-6 text-white/80">
        Unable to load questions. {msg && <span>{msg}</span>}
      </div>
    );
  }

  function choose(choiceIdx: number) {
    setAnswers((prev) => ({ ...prev, [q.id]: choiceIdx }));
  }

  async function submit() {
    if (!attemptId) return;
    try {
      const res = await fetch(`${BASE_URL}/api/attempts/${attemptId}/submit`, {
        method: "POST",
        headers: { ...authHeaders() },
      });
      const data = await jsonOrThrow<{ score: number }>(res);
      alert(`Submitted. Score: ${data.score}`);
      navigate("/exams");
    } catch (e: any) {
      setMsg(`❌ ${e.message || "Submit failed"}`);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">{exam.title}</div>
        <div className="text-white/70">
          {cursor + 1} / {flat.length}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-gray-800">
        <div className="text-white mb-4">{q.prompt}</div>
        <div className="space-y-2">
          {q.choices.map((c, idx) => {
            const picked = answers[q.id] === idx;
            return (
              <button
                key={idx}
                onClick={() => choose(idx)}
                className={`w-full text-left p-3 rounded-lg transition
                  ${picked ? "bg-emerald-600" : "bg-gray-700 hover:bg-gray-600"}`}
              >
                <span className="font-semibold mr-2">
                  {String.fromCharCode(65 + idx)}.
                </span>
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setCursor((c) => Math.max(0, c - 1))}
          className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600"
          disabled={cursor === 0}
        >
          Previous
        </button>
        <button
          onClick={() => setCursor((c) => Math.min(flat.length - 1, c + 1))}
          className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 ml-auto"
          disabled={cursor === flat.length - 1}
        >
          Next
        </button>
        <button
          onClick={submit}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500"
        >
          Submit
        </button>
      </div>

      {msg && <div className="text-sm p-2 bg-gray-800 rounded">{msg}</div>}
    </div>
  );
}
