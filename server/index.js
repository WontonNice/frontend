// server/index.js
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || "*",
  })
);
app.use(express.json());
const httpServer = createServer(app);

const allowed = process.env.CORS_ORIGIN?.split(",") || "*";
const io = new Server(httpServer, {
  cors: { origin: allowed },
  maxHttpBufferSize: 6 * 1024 * 1024, // 6MB
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
    // simple role hint from client; secure it with auth if needed
    socket.data.role = role === "teacher" ? "teacher" : "student";

    const cursors = getRoomMap(room);
    cursors.set(socket.id, { id: socket.id, name: socket.data.name, x: 0.5, y: 0.5 });
    io.to(room).emit("presence", serialize(room));

    // ensure session + flags and send to joiner
    const state =
      roomState.get(room) ||
      roomState.set(room, { sessionId: Date.now(), strokes: [], images: [] }).get(room);
    const flags = getFlags(room);

    const MAX_BOOTSTRAP_STROKES = 1000;
    socket.emit("session:state", {
      sessionId: state.sessionId,
      strokes: state.strokes.slice(-MAX_BOOTSTRAP_STROKES), // each stroke has userId
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

  // ===============================
  // Admin controls
  // ===============================

  // Teacher toggles student drawing
  socket.on("admin:drawing:set", ({ disabled } = {}) => {
    const room = socket.data.room;
    if (!room) return;
    if (socket.data.role !== "teacher") return; // gate
    const flags = getFlags(room);
    flags.drawingDisabled = !!disabled;
    io.to(room).emit("admin:drawing:set", { disabled: !!disabled });
  });

  // ===============================
  // Drawing + images (PERSISTED)
  // ===============================

  // Add a stroke and tag it with the author's socket.id
  socket.on("draw:segment", (p = {}) => {
    const room = socket.data.room;
    if (!room) return;

    // enforce lock: while disabled, ignore non-teacher strokes
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
      userId: socket.id, // owner
    };

    state.strokes.push(stroke);

    // send to everyone (authoritative stroke includes userId)
    io.to(room).emit("draw:segment", stroke);
  });

  // Clear ONLY the caller's strokes
  socket.on("draw:clear:user", () => {
    const room = socket.data.room;
    if (!room) return;

    const state =
      roomState.get(room) ||
      roomState.set(room, { sessionId: Date.now(), strokes: [], images: [] }).get(room);

    state.strokes = (state.strokes || []).filter((s) => s.userId !== socket.id);

    io.to(room).emit("draw:clear:user", { userId: socket.id });
  });

  // Teacher-only global clear (drawings + images)
  socket.on("draw:clear", () => {
    const room = socket.data.room;
    if (!room) return;
    if (socket.data.role !== "teacher") return; // gate

    const state =
      roomState.get(room) ||
      roomState.set(room, { sessionId: Date.now(), strokes: [], images: [] }).get(room);

    state.strokes = [];
    state.images = [];
    io.to(room).emit("draw:clear");
  });

  // add image (supports width fraction "w")
  socket.on("image:add", (img) => {
    const room = socket.data.room;
    if (!room || !img?.src) return;

    // ~5MB cap to avoid huge base64 payloads
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
    io.to(room).emit("image:add", safe); // include sender
  });

  // update image (drag / resize)
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
    socket.emit("image:update", { id: next.id, x: next.x, y: next.y, w: next.w }); // echo to author
  });
});

// ===============================
//  Teacher session controls
// ===============================

app.post("/session/end", (req, res) => {
  const { room } = req.body || {};
  if (!room) return res.status(400).json({ error: "Missing room" });

  roomState.set(room, { sessionId: Date.now(), strokes: [], images: [] });
  roomFlags.set(room, { drawingDisabled: false });
  io.to(room).emit("session:ended");

  res.json({ ok: true });
});

// ===============================
//  Start server
// ===============================
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Realtime server running on port ${PORT}`);
});
