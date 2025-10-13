// server/index.js
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import fs from "fs";
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
app.use(express.json({ limit: "12mb" }));

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
  maxHttpBufferSize: 12 * 1024 * 1024, // ↑ was 6MB
  perMessageDeflate: { threshold: 1024 },
});

// ===============================
//  Data stores
// ===============================
/** roomCursors: Map<room, Map<socketId, {id,name,x,y}>> */
const roomCursors = new Map();
/**
 * roomState: Map<room, {
 *   sessionId:number,
 *   strokes: Array<Stroke & { userId: string }>,
 *   images: Array<WbImage>,
 *   texts: Array<WbText>
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

const getState = (room) =>
  roomState.get(room) ||
  roomState
    .set(room, { sessionId: Date.now(), strokes: [], images: [], texts: [] })
    .get(room);

// --- text safety helpers: strip bidi/zero-width controls & normalize ---
const stripBidi = (s = "") =>
  s.replace(/[\u202A-\u202E\u2066-\u2069\u200E\u200F\u200B-\u200D\uFEFF]/g, "");
const normalizeText = (s = "") =>
  stripBidi(String(s)).normalize("NFC").slice(0, 5000); // cap to 5k chars

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

    const state = getState(room);
    const flags = getFlags(room);

    const MAX_BOOTSTRAP_STROKES = 1000;
    socket.emit("session:state", {
      sessionId: state.sessionId,
      strokes: state.strokes.slice(-MAX_BOOTSTRAP_STROKES),
      images: state.images.map(({ ownerId, ...pub }) => pub),
      texts: state.texts.map(({ ownerId, ...pub }) => pub),
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

  // ===============================
  // Drawing (PERSISTED)
  // ===============================
  socket.on("draw:segment", (p = {}) => {
    const room = socket.data.room;
    if (!room) return;

    const flags = getFlags(room);
    if (flags.drawingDisabled && socket.data.role !== "teacher") return;

    const { from, to, color, size, mode } = p;
    if (!from || !to) return;

    const state = getState(room);

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

    const state = getState(room);

    state.strokes = (state.strokes || []).filter((s) => s.userId !== socket.id);
    io.to(room).emit("draw:clear:user", { userId: socket.id });
  });

  socket.on("draw:clear", () => {
    const room = socket.data.room;
    if (!room) return;
    if (socket.data.role !== "teacher") return;

    const state = getState(room);

    state.strokes = [];
    state.images = [];
    state.texts = [];
    io.to(room).emit("draw:clear");
  });

  // ===============================
  // Images (PERSISTED)
  // ===============================
  socket.on("image:add", (img) => {
    const room = socket.data.room;
    if (!room || !img?.src) return;

    const approxBytes = Math.floor((img.src.length || 0) * 0.75);
    const MAX_MB = 10; // ↑ was 5
    if (approxBytes > MAX_MB * 1024 * 1024) {
      socket.emit("image:error", { reason: "too_large", maxMB: MAX_MB });
      return;
    }

    const state = getState(room);

    const safe = {
      id: img.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      src: img.src,
      x: clamp01(+img?.x || 0.5),
      y: clamp01(+img?.y || 0.5),
      w: Math.min(1, Math.max(0.05, Number.isFinite(+img?.w) ? +img.w : 0.2)),
      ownerId: socket.id,
    };
    state.images.push(safe);
    const { ownerId, ...publicImg } = safe;
    io.to(room).emit("image:add", publicImg);
  });

  // Per-user image clear: remove only images added by this socket
  socket.on("image:clear:mine", () => {
    const room = socket.data.room;
    if (!room) return;
    const state = getState(room);

    const removedIds = (state.images || [])
      .filter((im) => im.ownerId === socket.id)
      .map((im) => im.id);
    if (!removedIds.length) return;

    state.images = state.images.filter((im) => im.ownerId !== socket.id);
    io.to(room).emit("image:remove", { ids: removedIds });
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

  // ===============================
  // Text boxes (PERSISTED)
  // ===============================
socket.on("text:add", (t = {}) => {
  const room = socket.data.room;
  if (!room) return;
  const state = getState(room);

  const safe = {
    id: t.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    text: normalizeText(t.text),            // ⬅️ sanitize here
    x: clamp01(+t.x || 0.5),
    y: clamp01(+t.y || 0.5),
    w: Math.min(1, Math.max(0.1, Number.isFinite(+t.w) ? +t.w : 0.25)),
    ownerId: socket.id,
  };
  state.texts.push(safe);
  const { ownerId, ...pub } = safe;
  io.to(room).emit("text:add", pub);
});

socket.on("text:update", (patch = {}) => {
  const room = socket.data.room;
  if (!room || !patch.id) return;
  const state = roomState.get(room);
  if (!state) return;

  const idx = state.texts.findIndex((i) => i.id === patch.id);
  if (idx === -1) return;

  const cur = state.texts[idx];
  const next = {
    ...cur,
    ...(typeof patch.text === "string" ? { text: normalizeText(patch.text) } : {}),
    ...(patch.x != null ? { x: clamp01(+patch.x) } : {}),
    ...(patch.y != null ? { y: clamp01(+patch.y) } : {}),
    ...(patch.w != null ? { w: Math.min(1, Math.max(0.1, +patch.w)) } : {}),
  };
  state.texts[idx] = next;

  const out = { id: next.id, text: next.text, x: next.x, y: next.y, w: next.w };
  socket.to(room).emit("text:update", out);
  socket.emit("text:update", out);
});

  // Remove this user's text boxes
  socket.on("text:clear:mine", () => {
    const room = socket.data.room;
    if (!room) return;
    const state = getState(room);

    const removedIds = (state.texts || [])
      .filter((tx) => tx.ownerId === socket.id)
      .map((tx) => tx.id);
    if (!removedIds.length) return;

    state.texts = state.texts.filter((tx) => tx.ownerId !== socket.id);
    io.to(room).emit("text:remove", { ids: removedIds });
  });
});

// ===============================
//  Teacher session controls (API)
// ===============================
app.post("/session/end", (req, res) => {
  const { room } = req.body || {};
  if (!room) return res.status(400).json({ error: "Missing room" });

  roomState.set(room, { sessionId: Date.now(), strokes: [], images: [], texts: [] });
  roomFlags.set(room, { drawingDisabled: false });
  io.to(room).emit("session:ended");

  res.json({ ok: true });
});

// ===============================
//  SPA fallback (after APIs/static, before listen)
// ===============================
app.get(/^\/(?!socket\.io\/).*/, (_req, res) => {
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
