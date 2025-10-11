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

let cursors = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", ({ name, room }) => {
    socket.join(room);
    cursors[socket.id] = { id: socket.id, name, x: 0.5, y: 0.5 };
    io.to(room).emit("presence", Object.values(cursors));
  });

  socket.on("move", (cursor) => {
    cursors[cursor.id] = cursor;
    io.to("global").emit("move", cursor);
  });

  socket.on("disconnect", () => {
    delete cursors[socket.id];
    io.emit("left", socket.id);
  });
});

httpServer.listen(3001, () => console.log("✅ Realtime server running on port 3001"));
