import { useEffect, useState } from "react";
import "./index.css";

type AttendanceStatus = "Present" | "Absent";
type AttendanceRecords = Record<string, AttendanceStatus>;

const BACKEND = "https://attendance-app-backend-ze6p.onrender.com";

// 🔧 Change these to your real/default teacher
const DEMO_TEACHER_ID = 1;
const FALLBACK_TEACHER_NAME = "Teacher";

export default function App() {
  // Auth (now: one-click)
  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [teacherDisplayName, setTeacherDisplayName] = useState(FALLBACK_TEACHER_NAME);

  // Data
  const [students, setStudents] = useState<string[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecords>({});
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  // UI / state
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const isToday = selectedDate === today;
  const [attendanceLocked, setAttendanceLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const get = (path: string) => fetch(`${BACKEND}${path}`);
  const post = (path: string, body: unknown) =>
    fetch(`${BACKEND}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  // 🚪 One-click “login”
  async function enterApp() {
    // Set the teacher id directly (no credentials)
    setTeacherId(DEMO_TEACHER_ID);

    // try to fetch display name
    try {
      const r = await get(`/api/teacher/${DEMO_TEACHER_ID}/display-name`);
      if (r.ok) {
        const j = await r.json();
        const raw = j.class_display_name as string;
        const m = raw?.match(/\(([^)]+)\)/);
        setTeacherDisplayName(m ? m[1] : raw || FALLBACK_TEACHER_NAME);
      }
    } catch {
      /* ignore, keep fallback */
    }

    // lock status
    try {
      const r = await get("/api/attendance/lock-status");
      if (r.ok) {
        const j = await r.json();
        setAttendanceLocked(!!j.locked);
      }
    } catch {
      /* ignore */
    }
  }

  // Load students for date/teacher
  useEffect(() => {
    if (teacherId == null) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await get(`/api/students?teacherId=${teacherId}&date=${selectedDate}`);
        if (!res.ok) throw new Error("Failed to fetch students");
        const data = await res.json();

        const names = (data as Array<{ name: string }>).map((s) => s.name);
        const saved: AttendanceRecords = {};
        (data as Array<{ name: string; status?: AttendanceStatus }>).forEach((s) => {
          if (s.status) saved[s.name] = s.status;
        });

        if (!cancelled) {
          setStudents(names);
          setAttendanceRecords(saved);
          setSelectedStudent(names[0] || null);
        }
      } catch {
        if (!cancelled) setError("Failed to load students");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [teacherId, selectedDate]);

  function markAttendance(studentName: string, status: AttendanceStatus) {
    if (attendanceLocked || !isToday) return;
    setAttendanceRecords((prev) => ({ ...prev, [studentName]: status }));
    const idx = students.indexOf(studentName);
    const next = students[(idx + 1) % Math.max(1, students.length)];
    setSelectedStudent(next || null);
  }

  async function handleSubmit() {
    if (!teacherId) return;
    try {
      for (const [studentName, status] of Object.entries(attendanceRecords)) {
        await post("/api/attendance", { teacherId, studentName, status, date: today });
      }
      alert("Attendance submitted.");
    } catch {
      alert("Failed to submit attendance.");
    }
  }

  // 👇 One-click entry screen (no username/pw)
  if (teacherId == null) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50 p-6">
        <div className="w-full max-w-sm bg-white rounded-lg shadow p-6 text-center">
          <h1 className="text-xl font-semibold mb-4 text-gray-800">Welcome</h1>
          <p className="text-gray-600 mb-6">Enter to take attendance.</p>
          <button
            onClick={enterApp}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded py-2"
          >
            Enter
          </button>
          <p className="mt-3 text-xs text-gray-500">
            Using demo teacher ID: <code>{DEMO_TEACHER_ID}</code>
          </p>
        </div>
      </div>
    );
  }

  // Minimal attendance UI
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white">
        <div className="max-w-4xl mx-auto p-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-800">
            Attendance — {teacherDisplayName}
          </h1>
          <input
            type="date"
            value={selectedDate}
            max={today}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border rounded p-2 text-black"
            aria-label="Select date"
          />
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto p-4 grid gap-4 md:grid-cols-[1fr_320px]">
        <section className="bg-white rounded-lg shadow p-6 min-h-[300px] flex items-center justify-center">
          {loading ? (
            <div className="text-gray-500">Loading students…</div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : selectedStudent ? (
            <div className="w-full max-w-md text-center">
              <h2 className="text-2xl font-semibold mb-6 text-gray-800">{selectedStudent}</h2>
              <div className="flex gap-4 justify-center">
                <button
                  disabled={!isToday || attendanceLocked}
                  onClick={() => markAttendance(selectedStudent, "Present")}
                  className={`flex-1 py-3 rounded text-white ${
                    !isToday || attendanceLocked ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  Present
                </button>
                <button
                  disabled={!isToday || attendanceLocked}
                  onClick={() => markAttendance(selectedStudent, "Absent")}
                  className={`flex-1 py-3 rounded text-white ${
                    !isToday || attendanceLocked ? "bg-gray-400" : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  Absent
                </button>
              </div>
              <button
                onClick={handleSubmit}
                disabled={!isToday || attendanceLocked}
                className={`mt-5 px-5 py-3 rounded text-white ${
                  !isToday || attendanceLocked ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                Submit Attendance
              </button>
              {!isToday && <p className="mt-3 text-gray-600 italic">Past dates are view-only.</p>}
              {attendanceLocked && isToday && (
                <p className="mt-3 text-red-600 font-semibold">Attendance is locked for today.</p>
              )}
            </div>
          ) : (
            <div className="text-gray-500">No students available.</div>
          )}
        </section>

        <aside className="bg-gray-100 rounded-lg p-4 overflow-auto">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">Students</h3>
          <div className="flex flex-col gap-2">
            {students.map((s) => {
              const status = attendanceRecords[s];
              const base =
                status === "Present"
                  ? "bg-green-600 hover:bg-green-700"
                  : status === "Absent"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-gray-400 hover:bg-gray-500";
              const ring = selectedStudent === s ? "ring-4 ring-blue-400" : "";
              return (
                <button
                  key={s}
                  onClick={() => setSelectedStudent(s)}
                  className={`text-left text-white rounded px-4 py-3 transition ${base} ${ring}`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </aside>
      </main>
    </div>
  );
}
