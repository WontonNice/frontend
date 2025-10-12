// server/index.js
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*" },
});

/**
 * roomCursors: Map<room, Map<socketId, Cursor>>
 * Cursor = { id, name, x, y }
 */
const roomCursors = new Map();

function getRoomMap(room) {
  if (!roomCursors.has(room)) roomCursors.set(room, new Map());
  return roomCursors.get(room);
}
function serializeRoom(room) {
  return Array.from(getRoomMap(room).values());
}
function clamp01(n) {
  return Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0.5));
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // join a room with a display name
  socket.on("join", ({ name, room }) => {
    if (typeof room !== "string" || !room) return;
    const safeName = (name || "Anonymous").toString().slice(0, 64);

    socket.join(room);
    socket.data.room = room;
    socket.data.name = safeName;

    const cursors = getRoomMap(room);
    const cursor = { id: socket.id, name: safeName, x: 0.5, y: 0.5 };
    cursors.set(socket.id, cursor);

    // send full presence list to the room
    io.to(room).emit("presence", serializeRoom(room));
  });

  // move within your current room
  socket.on("move", (payload = {}) => {
    const room = socket.data.room;
    if (!room) return;

    const cursors = getRoomMap(room);
    // trust socket.id, not client-provided id
    const prev = cursors.get(socket.id);
    if (!prev) return;

    const x = clamp01(payload.x);
    const y = clamp01(payload.y);
    const updated = { ...prev, x, y };
    cursors.set(socket.id, updated);

    // broadcast to everyone else in the same room
    socket.to(room).emit("move", updated);
  });

  // optional: allow explicit leave
  socket.on("leave", () => {
    const room = socket.data.room;
    if (!room) return;
    const cursors = getRoomMap(room);
    cursors.delete(socket.id);
    socket.leave(room);

    io.to(room).emit("left", socket.id);
    io.to(room).emit("presence", serializeRoom(room));
    socket.data.room = undefined;
  });

  // clean up on disconnect (handles all rooms this socket was in)
  socket.on("disconnecting", () => {
    for (const room of socket.rooms) {
      if (room === socket.id) continue; // skip private room
      const cursors = getRoomMap(room);
      if (cursors.has(socket.id)) {
        cursors.delete(socket.id);
        io.to(room).emit("left", socket.id);
        io.to(room).emit("presence", serializeRoom(room));
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

httpServer.listen(3001, () => console.log("✅ Realtime server running on port 3001"));
