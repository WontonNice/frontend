// src/components/TeacherDashboard.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import {
  getEffectiveSatMathBank,
  deleteQuestion,
  exportOverrides,
  importOverrides,
} from "../data/satMathStore";
import type { SatMathQuestion } from "../data/satMathBank";

// NEW: list exams + lock helpers
import { listExams } from "../data/exams";
import { fetchExamLock, setExamLock } from "./Exams/ExamLock";

// Reuse your realtime server base
const API_BASE = (import.meta.env.VITE_SOCKET_URL ?? "http://localhost:3001").replace(/\/$/, "");
const SOCKET_URL = API_BASE;
const ROOM = "global";

type LockStatus = "loading" | "open" | "locked" | "error";

export default function TeacherDashboard() {
  // ---------- Socket state ----------
  const socketRef = useRef<Socket | null>(null);
  const [participants, setParticipants] = useState<number>(0);
  const [drawingDisabled, setDrawingDisabled] = useState<boolean>(false);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      const name = (JSON.parse(localStorage.getItem("user") || "{}")?.username || "Teacher")
        .toString().slice(0, 64);
      socket.emit("join", { name, room: ROOM });
      socket.emit("move", { x: 0.5, y: 0.5 });
    });

    socket.on("presence", (snapshot: Array<{ id: string; name: string; x: number; y: number }>) => {
      setParticipants(snapshot?.length ?? 0);
    });

    return () => {
      socket.emit?.("leave");
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const clearBoardForAll = () => {
    if (!confirm("Clear the entire board for everyone?")) return;
    socketRef.current?.emit("draw:clear");
  };

  const toggleStudentDrawing = () => {
    const next = !drawingDisabled;
    setDrawingDisabled(next);
    socketRef.current?.emit("admin:drawing:set", { room: ROOM, disabled: next });
  };

  const endSession = async () => {
    if (!confirm("End the current live session for everyone? This will clear the whiteboard.")) return;
    try {
      const res = await fetch(`${API_BASE}/session/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: ROOM }),
      });
      if (!res.ok) throw new Error(await res.text());
      alert("Session ended. Students’ boards were cleared.");
    } catch (err) {
      console.error(err);
      alert("Failed to end session. Check your server URL and try again.");
    }
  };

  // ---------- Exam locks ----------
  const exams = listExams(); // static list from your /src/data/exams
  const [locks, setLocks] = useState<Record<string, LockStatus>>(() =>
    Object.fromEntries(exams.map(e => [e.slug, "loading" as LockStatus]))
  );
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(exams.map(async (e) => {
        try {
          const locked = await fetchExamLock(e.slug);
          return [e.slug, locked ? "locked" : "open"] as const;
        } catch (err) {
          console.warn("lock GET failed for", e.slug, err);
          return [e.slug, "error"] as const;
        }
      }));
      if (!cancelled) setLocks(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
  }, [exams.length]);

  const toggleLock = async (slug: string) => {
    setSaving(s => ({ ...s, [slug]: true }));
    try {
      const nextLocked = !(locks[slug] === "locked");
      const result = await setExamLock(slug, nextLocked);
      setLocks(prev => ({ ...prev, [slug]: result ? "locked" : "open" }));
    } catch (err: any) {
      const msg = (err?.message || "").replace(/<[^>]*>/g, "").slice(0, 200);
      alert(`Failed to update lock for ${slug}: ${msg || "unknown error"}`);
      setLocks(prev => ({ ...prev, [slug]: "error" }));
    } finally {
      setSaving(s => ({ ...s, [slug]: false }));
    }
  };

  // ---------- SAT Bank (unchanged) ----------
  const [bank, setBank] = useState<SatMathQuestion[]>([]);
  const [search, setSearch] = useState("");
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
    a.href = url; a.download = "sat-math-overrides.json"; a.click();
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

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Teacher Dashboard</h2>
          <p className="text-white/60 text-sm">
            Welcome, <span className="font-semibold">{user?.username || "Teacher"}</span>
          </p>
        </div>
        <div className="text-sm text-white/70">
          Participants: <span className="font-semibold">{participants}</span>
        </div>
      </header>

      {/* Live Session Controls */}
      <div className="rounded-2xl bg-[#111318] ring-1 ring-white/10 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-semibold">Live Session Controls</div>
            <div className="text-xs text-white/60">Manage the whiteboard in the current room</div>
          </div>
          <div className="flex gap-2">
            <button onClick={clearBoardForAll} className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold">
              Clear Board
            </button>
            <button
              onClick={toggleStudentDrawing}
              className={`px-3 py-2 rounded-lg text-sm font-semibold ${drawingDisabled ? "bg-amber-600 hover:bg-amber-500 text-white" : "bg-white/10 hover:bg-white/20"}`}
            >
              {drawingDisabled ? "Enable Student Drawing" : "Disable Student Drawing"}
            </button>
            <button onClick={endSession} className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold">
              End Session
            </button>
          </div>
        </div>
      </div>

      {/* NEW: Exam Locks */}
      <div className="rounded-2xl bg-[#111318] ring-1 ring-white/10 p-4">
        <div className="mb-3">
          <div className="text-base font-semibold">Exam Locks</div>
          <div className="text-xs text-white/60">Lock/unlock each exam. Students cannot start a locked exam.</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#0e1014]">
              <tr>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Slug</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Toggle</th>
              </tr>
            </thead>
            <tbody>
              {exams.map(e => {
                const st = locks[e.slug] || "loading";
                const disabled = st === "loading" || saving[e.slug];
                return (
                  <tr key={e.slug} className="border-t border-white/10">
                    <td className="px-4 py-3">{e.title}</td>
                    <td className="px-4 py-3 text-white/60">{e.slug}</td>
                    <td className="px-4 py-3">
                      {st === "loading" && <span className="text-white/60">Loading…</span>}
                      {st === "open" && <span className="text-emerald-400">Open</span>}
                      {st === "locked" && <span className="text-amber-400">Locked</span>}
                      {st === "error" && <span className="text-red-400">Error</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => toggleLock(e.slug)}
                        disabled={disabled}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${st === "locked" ? "bg-amber-600 hover:bg-amber-500 text-white" : "bg-white/10 hover:bg-white/20"}`}
                        title={st === "locked" ? "Unlock exam" : "Lock exam"}
                      >
                        {saving[e.slug] ? "Saving…" : st === "locked" ? "Unlock" : "Lock"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {exams.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-white/60">No exams found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SAT Math Bank (existing UI) */}
      <header className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">SAT Math Bank</h3>
        <div className="flex gap-2">
          <button onClick={doExport} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold">Export</button>
          <button onClick={() => setShowImport(s => !s)} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold">Import</button>
        </div>
      </header>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by id, prompt, source, or topic..."
        className="w-full rounded-xl bg-[#111318] ring-1 ring-white/10 px-4 py-2 text-sm"
      />

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
                  <button onClick={() => remove(q.id)} className="ml-2 px-3 py-1 rounded-lg bg-red-600/80 hover:bg-red-600 text-white">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-white/60">No questions yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
            <button onClick={doImport} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold">Import</button>
            <button onClick={() => setShowImport(false)} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
