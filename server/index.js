// server/index.js
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());
const httpServer = createServer(app);

const io = new Server(httpServer, { cors: { origin: "*" } });

/** roomCursors: Map<room, Map<socketId, {id,name,x,y}>> */
const roomCursors = new Map();
const getRoomMap = (room) => roomCursors.get(room) || roomCursors.set(room, new Map()).get(room);
const serialize = (room) => Array.from(getRoomMap(room).values());
const clamp01 = (n) => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0.5));

io.on("connection", (socket) => {
  socket.on("join", ({ name, room }) => {
    if (!room) return;
    socket.join(room);
    socket.data.room = room;
    socket.data.name = (name || "Anonymous").toString().slice(0, 64);

    const cursors = getRoomMap(room);
    cursors.set(socket.id, { id: socket.id, name: socket.data.name, x: 0.5, y: 0.5 });
    io.to(room).emit("presence", serialize(room));
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

  // draw: segment (broadcast to the room)
socket.on("draw:segment", (p) => {
  const room = socket.data.room;
  if (!room) return;
  // Validate payload minimally
  const { from, to, color, size, mode } = p || {};
  if (!from || !to) return;
  socket.to(room).emit("draw:segment", {
    from: { x: +from.x, y: +from.y },
    to: { x: +to.x, y: +to.y },
    color: typeof color === "string" ? color : "#111827",
    size: Math.max(1, Math.min(64, +size || 3)),
    mode: mode === "eraser" ? "eraser" : "pen",
  });
});

// clear board for everyone in room
socket.on("draw:clear", () => {
  const room = socket.data.room;
  if (!room) return;
  socket.to(room).emit("draw:clear");
});

// receive & broadcast pasted images
socket.on("image:add", (img) => {
  const room = socket.data.room;
  if (!room || !img?.src) return;
  socket.to(room).emit("image:add", img);
});

});

const PORT = process.env.PORT || 3001; // Render sets PORT automatically
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Realtime server running on port ${PORT}`);
});

