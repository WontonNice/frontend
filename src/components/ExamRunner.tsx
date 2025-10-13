// src/components/ExamRunner.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { ExamDetail } from "../types/exam";

const DEV_API = (import.meta as any)?.env?.VITE_API_URL ?? "http://localhost:3001";
const API = import.meta.env.PROD ? "" : DEV_API;

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
    return exam.sections.flatMap((s, si) => s.questions.map((q, qi) => ({ ...q, si, qi })));
  }, [exam]);

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        // 1) fetch exam (student-safe)
        const res = await fetch(`${API}/api/exams/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || res.statusText);
        if (abort) return;
        setExam(data as ExamDetail);

        // 2) create attempt
        const res2 = await fetch(`${API}/api/exams/${id}/attempts`, { method: "POST" });
        const data2 = await res2.json();
        if (!res2.ok) throw new Error(data2?.error || res2.statusText);
        if (abort) return;
        setAttemptId(data2.id);
      } catch (e: any) {
        if (!abort) setMsg(`❌ ${e.message || "Failed to start exam"}`);
      }
    })();
    return () => { abort = true; };
  }, [id]);

  // autosave on change (debounced)
  useEffect(() => {
    if (!attemptId) return;
    const t = setTimeout(async () => {
      try {
        await fetch(`${API}/api/attempts/${attemptId}/progress`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers }),
        });
      } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [answers, attemptId]);

  if (!exam) return <div className="p-6 text-white/80">Loading exam… {msg}</div>;
  const q = flat[cursor];

  function choose(choiceIdx: number) {
    setAnswers((prev) => ({ ...prev, [q.id]: choiceIdx }));
  }

  async function submit() {
    if (!attemptId) return;
    try {
      const res = await fetch(`${API}/api/attempts/${attemptId}/submit`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || res.statusText);
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
        <div className="text-white/70">{cursor + 1} / {flat.length}</div>
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
                <span className="font-semibold mr-2">{String.fromCharCode(65 + idx)}.</span>{c}
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
