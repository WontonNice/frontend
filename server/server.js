// server.js
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

app.get("/health", (_req, res) => res.sendStatus(200));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const rooms = new Map(); // room -> Map(socketId -> cursor)

io.on("connection", (socket) => {
  let room = "global";

  socket.on("join", ({ name, room: r }) => {
    room = r || "global";
    socket.join(room);
    const cursors = rooms.get(room) ?? new Map();
    cursors.set(socket.id, {
      id: socket.id,
      name: name || "Student",
      x: 0.5,
      y: 0.5,
      color: "#999",
    });
    rooms.set(room, cursors);

    // send snapshot to everyone in room
    io.to(room).emit("presence", Array.from(cursors.values()));
  });

  socket.on("move", (payload) => {
    const cursors = rooms.get(room);
    if (!cursors) return;
    cursors.set(socket.id, {
      id: socket.id,
      name: payload.name || cursors.get(socket.id)?.name || "Student",
      x: Math.max(0, Math.min(1, payload.x)),
      y: Math.max(0, Math.min(1, payload.y)),
      color: payload.color || cursors.get(socket.id)?.color || "#999",
    });
    io.to(room).emit("move", cursors.get(socket.id));
  });

  socket.on("disconnect", () => {
    const cursors = rooms.get(room);
    if (cursors) {
      cursors.delete(socket.id);
      io.to(room).emit("left", socket.id);
      if (cursors.size === 0) rooms.delete(room);
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, "0.0.0.0", () => {
  console.log("Realtime server listening on", PORT);
});
