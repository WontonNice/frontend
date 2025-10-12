// src/components/TeacherDashboard.tsx
import { useEffect, useMemo, useState } from "react";
import {
  getEffectiveSatMathBank,
  upsertQuestion,
  deleteQuestion,
  exportOverrides,
  importOverrides,
} from "../data/satMathStore";
import type { SatMathQuestion, SatMathTopic } from "../data/satMathBank";

type Draft = Omit<SatMathQuestion, "id"> & { id?: string };

// ✅ Use your realtime server base (same as SOCKET_URL elsewhere)
const API_BASE = (import.meta.env.VITE_SOCKET_URL ?? "http://localhost:3001").replace(/\/$/, "");

export default function TeacherDashboard() {
  const [bank, setBank] = useState<SatMathQuestion[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Draft | null>(null);
  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);

  const refresh = () => setBank(getEffectiveSatMathBank());
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return bank.filter(q =>
      !s ||
      q.id.toLowerCase().includes(s) ||
      q.prompt.toLowerCase().includes(s) ||
      q.source.toLowerCase().includes(s) ||
      q.topic.toLowerCase().includes(s)
    );
  }, [bank, search]);

  const startNew = () =>
    setEditing({
      prompt: "",
      choices: ["", "", "", ""],
      correctIndex: 0,
      explanation: "",
      source: "",
      topic: "algebra",
    });

  const startEdit = (q: SatMathQuestion) => setEditing({ ...q });

  const save = () => {
    if (!editing) return;
    const id = editing.id?.trim() || slugify(editing.prompt).slice(0, 40) || `q-${Date.now()}`;
    if (!editing.prompt.trim()) return alert("Prompt is required.");
    if (editing.choices.some(c => !c.trim())) return alert("All choices must be filled.");
    if (editing.correctIndex < 0 || editing.correctIndex >= editing.choices.length) {
      return alert("Correct index out of range.");
    }
    const q: SatMathQuestion = {
      id,
      prompt: editing.prompt.trim(),
      choices: editing.choices.map(c => c.trim()),
      correctIndex: editing.correctIndex,
      explanation: editing.explanation.trim(),
      source: editing.source.trim() || "Unknown",
      topic: editing.topic as SatMathTopic,
    };
    upsertQuestion(q);
    setEditing(null);
    refresh();
  };

  const remove = (id: string) => {
    if (!confirm("Delete this question?")) return;
    deleteQuestion(id);
    refresh();
  };

  const doExport = () => {
    const data = exportOverrides();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sat-math-overrides.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = () => {
    try {
      importOverrides(importText);
      setShowImport(false);
      setImportText("");
      refresh();
      alert("Import successful.");
    } catch (e: any) {
      alert("Import failed: " + (e?.message ?? e));
    }
  };

  // 🔴 End live whiteboard session for the room
  const endSession = async () => {
    if (!confirm("End the current live session for everyone? This will clear the whiteboard.")) return;
    try {
      const res = await fetch(`${API_BASE}/session/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: "global" }),
      });
      if (!res.ok) throw new Error(await res.text());
      alert("Session ended. Students’ boards were cleared.");
    } catch (err) {
      console.error(err);
      alert("Failed to end session. Check your server URL and try again.");
    }
  };

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Teacher — SAT Math Bank</h2>
          <p className="text-white/60 text-sm">
            Welcome, <span className="font-semibold">{user?.username || "Teacher"}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={startNew}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold"
          >
            Add Question
          </button>
          <button
            onClick={doExport}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold"
          >
            Export
          </button>
          <button
            onClick={() => setShowImport(s => !s)}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold"
          >
            Import
          </button>
          {/* 🔴 End Session button */}
          <button
            onClick={endSession}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold"
          >
            End Session
          </button>
        </div>
      </header>

      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by id, prompt, source, or topic..."
        className="w-full rounded-xl bg-[#111318] ring-1 ring-white/10 px-4 py-2 text-sm"
      />

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl ring-1 ring-white/10">
        <table className="w-full text-sm">
          <thead className="bg-[#111318]">
            <tr>
              <th className="text-left px-4 py-3">ID</th>
              <th className="text-left px-4 py-3">Prompt</th>
              <th className="text-left px-4 py-3">Topic</th>
              <th className="text-left px-4 py-3">Source</th>
              <th className="text-left px-4 py-3">Answer</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((q) => (
              <tr key={q.id} className="border-t border-white/10">
                <td className="px-4 py-3 text-white/60">{q.id}</td>
                <td className="px-4 py-3">{q.prompt}</td>
                <td className="px-4 py-3 text-white/60">{q.topic}</td>
                <td className="px-4 py-3 text-white/60">{q.source}</td>
                <td className="px-4 py-3 text-white/60">{q.choices[q.correctIndex]}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => startEdit(q)}
                    className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(q.id)}
                    className="ml-2 px-3 py-1 rounded-lg bg-red-600/80 hover:bg-red-600 text-white"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-white/60">
                  No questions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Import Drawer */}
      {showImport && (
        <div className="rounded-2xl bg-[#111318] ring-1 ring-white/10 p-4 space-y-2">
          <div className="text-sm font-semibold">Import Overrides JSON</div>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={8}
            className="w-full rounded-xl bg-[#0e1014] ring-1 ring-white/10 p-3 text-sm"
            placeholder='{"byId": {...}, "deleted": [...]}'
          />
          <div className="flex gap-2">
            <button
              onClick={doImport}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold"
            >
              Import
            </button>
            <button
              onClick={() => setShowImport(false)}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Editor Modal (inline card) */}
      {editing && (
        <div className="rounded-2xl bg-[#111318] ring-1 ring-white/10 p-5 space-y-4">
          {/* ... keep your editor code as-is ... */}
        </div>
      )}
    </div>
  );
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}
