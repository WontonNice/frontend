// server/index.js
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import fs from "fs";
import { promises as fsp } from "fs";          // ⬅️ added
import crypto from "crypto";                   // ⬅️ added
import { fileURLToPath } from "url";

// ---------- path resolution ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, ".."); // project root

// allow STATIC_DIR relative to ROOT (e.g., "dist" or "client/dist")
const STATIC_DIR_ENV = process.env.STATIC_DIR
  ? path.resolve(ROOT, process.env.STATIC_DIR)
  : null;

// preferred locations for index.html
const CANDIDATES = [
  STATIC_DIR_ENV,             // env override, if set
  path.join(ROOT, "dist"),    // vite build output (recommended)
  ROOT                        // fallback: project root (dev-ish)
].filter(Boolean);

let STATIC_DIR = "";
let INDEX_FILE = "";
for (const dir of CANDIDATES) {
  const idx = path.join(dir, "index.html");
  if (fs.existsSync(idx)) {
    STATIC_DIR = dir;
    INDEX_FILE = idx;
    break;
  }
}

if (!INDEX_FILE) {
  console.error("❌ index.html not found. Checked:", CANDIDATES);
} else {
  console.log("✅ Static base directory:", STATIC_DIR);
  console.log("✅ index.html:", INDEX_FILE);
}

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") || "*" }));
app.use(express.json());

// health check
app.get("/healthz", (_req, res) => res.json({ ok: true }));

// serve static assets if we found a dir
if (STATIC_DIR) {
  app.use(express.static(STATIC_DIR, { maxAge: "1h", index: false }));
}

// 👉 Create the HTTP server BEFORE using it in Socket.IO
const httpServer = createServer(app);

const allowed = process.env.CORS_ORIGIN?.split(",") || "*";
const io = new Server(httpServer, {
  cors: { origin: allowed },
  maxHttpBufferSize: 6 * 1024 * 1024,
  perMessageDeflate: { threshold: 1024 },
});

// ===============================
//  Data stores (whiteboard)
// ===============================
/** roomCursors: Map<room, Map<socketId, {id,name,x,y}>> */
const roomCursors = new Map();
/**
 * roomState: Map<room, {
 *   sessionId:number,
 *   strokes: Array<Stroke & { userId: string }>,
 *   images: Array<WbImage>
 * }>
 */
const roomState = new Map();
/** roomFlags: Map<room, { drawingDisabled: boolean }> */
const roomFlags = new Map();

const getRoomMap = (room) =>
  roomCursors.get(room) || roomCursors.set(room, new Map()).get(room);
const serialize = (room) => Array.from(getRoomMap(room).values());
const clamp01 = (n) => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0.5));
const getFlags = (room) =>
  roomFlags.get(room) || roomFlags.set(room, { drawingDisabled: false }).get(room);

// ===============================
//  Socket.io
// ===============================
io.on("connection", (socket) => {
  socket.on("join", ({ name, room, role } = {}) => {
    if (!room) return;
    socket.join(room);
    socket.data.room = room;
    socket.data.name = (name || "Anonymous").toString().slice(0, 64);
    socket.data.role = role === "teacher" ? "teacher" : "student";

    const cursors = getRoomMap(room);
    cursors.set(socket.id, { id: socket.id, name: socket.data.name, x: 0.5, y: 0.5 });
    io.to(room).emit("presence", serialize(room));

    const state =
      roomState.get(room) ||
      roomState.set(room, { sessionId: Date.now(), strokes: [], images: [] }).get(room);
    const flags = getFlags(room);

    const MAX_BOOTSTRAP_STROKES = 1000;
    socket.emit("session:state", {
      sessionId: state.sessionId,
      strokes: state.strokes.slice(-MAX_BOOTSTRAP_STROKES),
      images: state.images,
      admin: { drawingDisabled: !!flags.drawingDisabled },
    });
  });

  socket.on("move", ({ x, y } = {}) => {
    const room = socket.data.room;
    if (!room) return;
    const cursors = getRoomMap(room);
    const prev = cursors.get(socket.id);
    if (!prev) return;
    const nx = clamp01(x), ny = clamp01(y);
    const updated = { ...prev, x: nx, y: ny };
    cursors.set(socket.id, updated);
    socket.to(room).volatile.emit("move", updated);
  });

  socket.on("leave", () => {
    const room = socket.data.room;
    if (!room) return;
    const cursors = getRoomMap(room);
    cursors.delete(socket.id);
    socket.leave(room);
    io.to(room).emit("left", socket.id);
    io.to(room).emit("presence", serialize(room));
    socket.data.room = undefined;
    if (cursors.size === 0) {
      roomCursors.delete(room);
      roomState.delete(room);
      roomFlags.delete(room);
    }
  });

  socket.on("disconnecting", () => {
    for (const room of socket.rooms) {
      if (room === socket.id) continue;
      const cursors = getRoomMap(room);
      if (cursors.delete(socket.id)) {
        io.to(room).emit("left", socket.id);
        io.to(room).emit("presence", serialize(room));
      }
      if (cursors.size === 0) {
        roomCursors.delete(room);
        roomState.delete(room);
        roomFlags.delete(room);
      }
    }
  });

  // Admin controls
  socket.on("admin:drawing:set", ({ disabled } = {}) => {
    const room = socket.data.room;
    if (!room) return;
    if (socket.data.role !== "teacher") return;
    const flags = getFlags(room);
    flags.drawingDisabled = !!disabled;
    io.to(room).emit("admin:drawing:set", { disabled: !!disabled });
  });

  // Drawing + images (PERSISTED)
  socket.on("draw:segment", (p = {}) => {
    const room = socket.data.room;
    if (!room) return;

    const flags = getFlags(room);
    if (flags.drawingDisabled && socket.data.role !== "teacher") return;

    const { from, to, color, size, mode } = p;
    if (!from || !to) return;

    const state =
      roomState.get(room) ||
      roomState.set(room, { sessionId: Date.now(), strokes: [], images: [] }).get(room);

    const stroke = {
      from: { x: clamp01(+from.x), y: clamp01(+from.y) },
      to: { x: clamp01(+to.x), y: clamp01(+to.y) },
      color: typeof color === "string" ? color : "#111827",
      size: Math.max(1, Math.min(64, Number.isFinite(+size) ? +size : 3)),
      mode: mode === "eraser" ? "eraser" : "pen",
      userId: socket.id,
    };

    state.strokes.push(stroke);
    io.to(room).emit("draw:segment", stroke);
  });

  socket.on("draw:clear:user", () => {
    const room = socket.data.room;
    if (!room) return;

    const state =
      roomState.get(room) ||
      roomState.set(room, { sessionId: Date.now(), strokes: [], images: [] }).get(room);

    state.strokes = (state.strokes || []).filter((s) => s.userId !== socket.id);
    io.to(room).emit("draw:clear:user", { userId: socket.id });
  });

  socket.on("draw:clear", () => {
    const room = socket.data.room;
    if (!room) return;
    if (socket.data.role !== "teacher") return;

    const state =
      roomState.get(room) ||
      roomState.set(room, { sessionId: Date.now(), strokes: [], images: [] }).get(room);

    state.strokes = [];
    state.images = [];
    io.to(room).emit("draw:clear");
  });

  socket.on("image:add", (img) => {
    const room = socket.data.room;
    if (!room || !img?.src) return;

    const approxBytes = Math.floor((img.src.length || 0) * 0.75);
    if (approxBytes > 5 * 1024 * 1024) return;

    const state =
      roomState.get(room) ||
      roomState.set(room, { sessionId: Date.now(), strokes: [], images: [] }).get(room);

    const safe = {
      id: img.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      src: img.src,
      x: clamp01(+img?.x || 0.5),
      y: clamp01(+img?.y || 0.5),
      w: Math.min(1, Math.max(0.05, Number.isFinite(+img?.w) ? +img.w : 0.2)),
    };
    state.images.push(safe);
    io.to(room).emit("image:add", safe);
  });

  socket.on("image:update", (patch) => {
    const room = socket.data.room;
    if (!room || !patch?.id) return;
    const state = roomState.get(room);
    if (!state) return;

    const idx = state.images.findIndex((i) => i.id === patch.id);
    if (idx === -1) return;

    const cur = state.images[idx];
    const next = {
      ...cur,
      ...(patch.x != null ? { x: clamp01(+patch.x) } : {}),
      ...(patch.y != null ? { y: clamp01(+patch.y) } : {}),
      ...(patch.w != null ? { w: Math.min(1, Math.max(0.05, +patch.w)) } : {}),
    };
    state.images[idx] = next;

    socket.to(room).emit("image:update", { id: next.id, x: next.x, y: next.y, w: next.w });
    socket.emit("image:update", { id: next.id, x: next.x, y: next.y, w: next.w });
  });
});

// ===============================
//  Teacher session controls (API)
// ===============================
app.post("/session/end", (req, res) => {
  const { room } = req.body || {};
  if (!room) return res.status(400).json({ error: "Missing room" });

  roomState.set(room, { sessionId: Date.now(), strokes: [], images: [] });
  roomFlags.set(room, { drawingDisabled: false });
  io.to(room).emit("session:ended");

  res.json({ ok: true });
});

// ======================================
//  ⬇️ File-backed Exams: helpers & API
// ======================================
const EXAMS_DIR = path.join(__dirname, "exams");        // JSON exam packs (with answers)
const STATE_DIR = path.join(__dirname, "exam_state");   // {status:"open"|"closed"}
const ATTEMPTS_DIR = path.join(__dirname, "attempts");  // per-user attempts

async function ensureDirs() {
  for (const d of [EXAMS_DIR, STATE_DIR, ATTEMPTS_DIR]) {
    await fsp.mkdir(d, { recursive: true });
  }
}
ensureDirs().catch(console.error);

async function readJson(file) {
  const txt = await fsp.readFile(file, "utf8");
  return JSON.parse(txt);
}
async function writeJson(file, data) {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  await fsp.writeFile(file, JSON.stringify(data, null, 2), "utf8");
}
async function listExamFiles() {
  const all = await fsp.readdir(EXAMS_DIR);
  return all.filter((f) => f.endsWith(".json")).map((f) => path.join(EXAMS_DIR, f));
}
async function loadExamById(id) {
  try { return await readJson(path.join(EXAMS_DIR, `${id}.json`)); }
  catch { return null; }
}
async function getExamState(id) {
  try {
    const s = await readJson(path.join(STATE_DIR, `${id}.state.json`));
    return (s && s.status) === "open" ? "open" : "closed";
  } catch {
    return "closed";
  }
}
function stripAnswers(exam) {
  return {
    id: exam.id,
    title: exam.title,
    subject: exam.subject,
    version: exam.version,
    sections: exam.sections.map((s) => ({
      title: s.title,
      questions: s.questions.map(({ answer, explanation, ...rest }) => rest),
    })),
  };
}
// Tiny auth shim for API role checks (replace with your real auth if you want)
function getUser(req) {
  const id = req.header("x-user-id") || "1";
  const username = req.header("x-user-name") || "demo";
  const role = req.header("x-user-role") === "teacher" ? "teacher" : "student";
  return { id, username, role };
}
function requireRole(role) {
  return (req, res, next) => {
    const user = getUser(req);
    if (user.role !== role) return res.status(403).json({ error: "Forbidden" });
    req.user = user;
    next();
  };
}

// List exams (students see only OPEN unless ?all=1)
app.get("/api/exams", async (req, res) => {
  try {
    const user = getUser(req);
    const files = await listExamFiles();
    const summaries = [];
    for (const file of files) {
      const exam = await readJson(file);
      const status = await getExamState(exam.id);
      summaries.push({
        id: exam.id,
        title: exam.title,
        subject: exam.subject,
        version: exam.version ?? 1,
        status,
      });
    }
    if (user.role === "student" && !("all" in req.query)) {
      return res.json(summaries.filter((x) => x.status === "open"));
    }
    res.json(summaries);
  } catch (e) {
    res.status(500).json({ error: e?.message || "Failed to list exams" });
  }
});

// Get a single exam (student-safe; blocked if closed)
app.get("/api/exams/:id", async (req, res) => {
  const user = getUser(req);
  const { id } = req.params;
  const exam = await loadExamById(id);
  if (!exam) return res.status(404).json({ error: "Exam not found" });

  const status = await getExamState(id);
  if (user.role === "student" && status !== "open") {
    return res.status(403).json({ error: "Exam is not open" });
  }
  res.json(user.role === "student" ? stripAnswers(exam) : exam);
});

// Create attempt
app.post("/api/exams/:id/attempts", async (req, res) => {
  const user = getUser(req);
  const { id } = req.params;
  const exam = await loadExamById(id);
  if (!exam) return res.status(404).json({ error: "Exam not found" });

  const status = await getExamState(id);
  if (user.role === "student" && status !== "open") {
    return res.status(403).json({ error: "Exam is not open" });
  }

  const attemptId = crypto.randomBytes(8).toString("hex");
  const file = {
    attemptId,
    examId: id,
    userId: user.id,
    status: "active",
    startedAt: new Date().toISOString(),
    answers: {},
  };
  await writeJson(path.join(ATTEMPTS_DIR, user.id, `${attemptId}.json`), file);
  res.json({ id: attemptId });
});

// Save attempt progress
app.patch("/api/attempts/:attemptId/progress", async (req, res) => {
  const user = getUser(req);
  const fp = path.join(ATTEMPTS_DIR, user.id, `${req.params.attemptId}.json`);
  try {
    const cur = await readJson(fp);
    if (cur.status !== "active") return res.status(400).json({ error: "Attempt locked" });
    const incoming = req.body?.answers || {};
    cur.answers = { ...cur.answers, ...incoming };
    await writeJson(fp, cur);
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "Attempt not found" });
  }
});

// Submit attempt (grade & lock)
app.post("/api/attempts/:attemptId/submit", async (req, res) => {
  const user = getUser(req);
  const fp = path.join(ATTEMPTS_DIR, user.id, `${req.params.attemptId}.json`);
  try {
    const attempt = await readJson(fp);
    if (attempt.status !== "active") return res.status(400).json({ error: "Already submitted" });

    const exam = await loadExamById(attempt.examId);
    if (!exam) return res.status(404).json({ error: "Exam not found" });

    // build answer key
    const key = new Map();
    for (const s of exam.sections) {
      for (const q of s.questions) {
        if (typeof q.answer === "number") key.set(q.id, q.answer);
      }
    }

    let correct = 0;
    for (const [qid, choice] of Object.entries(attempt.answers || {})) {
      if (choice != null && key.get(qid) === choice) correct++;
    }

    attempt.status = "submitted";
    attempt.submittedAt = new Date().toISOString();
    attempt.score = correct;
    await writeJson(fp, attempt);

    res.json({ score: correct, total: key.size });
  } catch {
    res.status(404).json({ error: "Attempt not found" });
  }
});

// Teacher: open/close exam
app.patch("/api/exams/:id/open", requireRole("teacher"), async (req, res) => {
  await writeJson(path.join(STATE_DIR, `${req.params.id}.state.json`), { status: "open" });
  res.json({ ok: true });
});
app.patch("/api/exams/:id/close", requireRole("teacher"), async (req, res) => {
  await writeJson(path.join(STATE_DIR, `${req.params.id}.state.json`), { status: "closed" });
  res.json({ ok: true });
});

// Teacher: import exam pack (JSON body)
app.post("/api/exams/import", requireRole("teacher"), async (req, res) => {
  const pack = req.body || {};
  if (!pack.id || !pack.title || !Array.isArray(pack.sections)) {
    return res.status(400).json({ error: "Invalid exam pack" });
  }
  await writeJson(path.join(EXAMS_DIR, `${pack.id}.json`), pack);
  await writeJson(path.join(STATE_DIR, `${pack.id}.state.json`), { status: "closed" });
  res.json({ ok: true, id: pack.id });
});

// ===============================
//  SPA fallback (after APIs/static, before listen)
// ===============================
app.get(/^\/(?!socket\.io\/|api\/).*/, (_req, res) => {
  if (!INDEX_FILE) {
    return res.status(500).send("index.html not found. Did the build run?");
  }
  res.sendFile(INDEX_FILE);
});

// ===============================
//  Start server
// ===============================
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Realtime server + SPA on ${PORT}`);
});
