// src/components/LiveSessionPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type Cursor = {
  id: string;
  name: string;
  x: number; // 0..1 relative
  y: number; // 0..1 relative
  color: string;
};

const SOCKET_URL =
  (import.meta as any).env?.VITE_SOCKET_URL ?? "https://your-realtime.onrender.com";

function colorFromId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 85% 65%)`;
}

export default function LiveSessionPage() {
  const boardRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const [me, setMe] = useState<Cursor | null>(null);
  const [cursors, setCursors] = useState<Record<string, Cursor>>({});

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  // Connect & wire socket listeners
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      const name: string = user?.username || "Student";
      const sid: string = socket.id ?? (crypto?.randomUUID?.() ?? String(Date.now()));
      const mine: Cursor = {
        id: sid,
        name,
        x: 0.5,
        y: 0.5,
        color: colorFromId(sid),
      };
      setMe(mine);
      socket.emit("join", { name, room: "global" });
    });

    socket.on("presence", (snapshot: Cursor[]) => {
      setCursors(() => {
        const next: Record<string, Cursor> = {};
        snapshot.forEach((c) => (next[c.id] = c));
        return next;
      });
    });

    socket.on("move", (c: Cursor) => {
      setCursors((prev) => ({ ...prev, [c.id]: c }));
    });

    socket.on("left", (id: string) => {
      setCursors((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [SOCKET_URL, user?.username]);

  // Emit mouse moves (throttled with rAF)
  useEffect(() => {
    if (!me) return;

    let raf = 0;
    const onMove = (e: MouseEvent) => {
      const board = boardRef.current;
      const socket = socketRef.current;
      if (!board || !socket) return;

      const rect = board.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const clampedX = Math.max(0, Math.min(1, x));
      const clampedY = Math.max(0, Math.min(1, y));

      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const mine: Cursor = { ...me, x: clampedX, y: clampedY };
        setMe(mine);
        socket.emit("move", { ...mine, room: "global" });
      });
    };

    const el = boardRef.current;
    el?.addEventListener("mousemove", onMove);
    return () => {
      el?.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [me]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Live Session</h2>
      <p className="text-white/70 text-sm">
        Move your mouse inside the whiteboard—everyone in the session will see your cursor.
      </p>

      {/* Whiteboard area */}
      <div
        ref={boardRef}
        className="relative mx-auto max-w-5xl h-[520px] bg-white rounded-xl ring-1 ring-black/10 overflow-hidden"
      >
        {Object.values(cursors).map((c) => {
          const left = `${c.x * 100}%`;
          const top = `${c.y * 100}%`;
          return (
            <div
              key={c.id}
              className="absolute pointer-events-none"
              style={{ left, top, transform: "translate(-20%, -60%)" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill={c.color}>
                <path d="M3 2l7 18 2-7 7-2L3 2z" />
              </svg>
              <div
                className="mt-1 px-2 py-0.5 text-xs font-medium rounded"
                style={{ background: c.color, color: "#0b0d12" }}
              >
                {c.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
