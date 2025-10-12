// server/index.js
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());
const httpServer = createServer(app);

const io = new Server(httpServer, { cors: { origin: "*" } });

// ===============================
//  Data stores
// ===============================

/** roomCursors: Map<room, Map<socketId, {id,name,x,y}>> */
const roomCursors = new Map();

/** roomState: Map<room, { sessionId:number, strokes:Stroke[], images:WbImage[] }> */
const roomState = new Map();

const getRoomMap = (room) =>
  roomCursors.get(room) || roomCursors.set(room, new Map()).get(room);
const serialize = (room) => Array.from(getRoomMap(room).values());
const clamp01 = (n) => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0.5));

// ===============================
//  Socket.io
// ===============================

io.on("connection", (socket) => {
  socket.on("join", ({ name, room }) => {
    if (!room) return;
    socket.join(room);
    socket.data.room = room;
    socket.data.name = (name || "Anonymous").toString().slice(0, 64);

    const cursors = getRoomMap(room);
    cursors.set(socket.id, { id: socket.id, name: socket.data.name, x: 0.5, y: 0.5 });
    io.to(room).emit("presence", serialize(room));

    // send/ensure session state
    const state =
      roomState.get(room) ||
      roomState.set(room, { sessionId: Date.now(), strokes: [], images: [] }).get(room);
    socket.emit("session:state", state);
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
    socket.to(room).emit("move", updated);
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
  });

  socket.on("disconnecting", () => {
    for (const room of socket.rooms) {
      if (room === socket.id) continue;
      const cursors = getRoomMap(room);
      if (cursors.delete(socket.id)) {
        io.to(room).emit("left", socket.id);
        io.to(room).emit("presence", serialize(room));
      }
    }
  });

  // ===============================
  // Drawing + images (PERSISTED)
  // ===============================

  socket.on("draw:segment", (p) => {
    const room = socket.data.room;
    if (!room) return;
    const { from, to, color, size, mode } = p || {};
    if (!from || !to) return;

    const state =
      roomState.get(room) ||
      roomState.set(room, { sessionId: Date.now(), strokes: [], images: [] }).get(room);

    const stroke = {
      from: { x: +from.x, y: +from.y },
      to: { x: +to.x, y: +to.y },
      color: typeof color === "string" ? color : "#111827",
      size: Math.max(1, Math.min(64, +size || 3)),
      mode: mode === "eraser" ? "eraser" : "pen",
    };
    state.strokes.push(stroke);

    socket.to(room).emit("draw:segment", stroke);
  });

  socket.on("draw:clear", () => {
    const room = socket.data.room;
    if (!room) return;
    const state =
      roomState.get(room) ||
      roomState.set(room, { sessionId: Date.now(), strokes: [], images: [] }).get(room);
    state.strokes = [];
    state.images = [];
    socket.to(room).emit("draw:clear");
  });

  // add image (supports width fraction "w")
  socket.on("image:add", (img) => {
    const room = socket.data.room;
    if (!room || !img?.src) return;

    const state =
      roomState.get(room) ||
      roomState.set(room, { sessionId: Date.now(), strokes: [], images: [] }).get(room);

    const safe = {
      id: img.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      src: img.src,
      x: Math.min(1, Math.max(0, +img.x || 0.5)),
      y: Math.min(1, Math.max(0, +img.y || 0.5)),
      w: Math.min(1, Math.max(0.05, +img.w || 0.2)),
    };
    state.images.push(safe);
    socket.to(room).emit("image:add", safe);
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
      ...(patch.x != null ? { x: Math.min(1, Math.max(0, +patch.x)) } : {}),
      ...(patch.y != null ? { y: Math.min(1, Math.max(0, +patch.y)) } : {}),
      ...(patch.w != null ? { w: Math.min(1, Math.max(0.05, +patch.w)) } : {}),
    };
    state.images[idx] = next;

    socket.to(room).emit("image:update", { id: next.id, x: next.x, y: next.y, w: next.w });
  });
});

// ===============================
//  Teacher session controls
// ===============================

app.post("/session/end", (req, res) => {
  const { room } = req.body || {};
  if (!room) return res.status(400).json({ error: "Missing room" });
  roomState.set(room, { sessionId: Date.now(), strokes: [], images: [] });
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
