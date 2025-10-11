// src/components/LiveSessionPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type Cursor = {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
};

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ?? "https://your-realtime.onrender.com";

function colorFromId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 80% 65%)`;
}

export default function LiveSessionPage() {
  const boardRef = useRef<HTMLDivElement>(null);
  const [me, setMe] = useState<Cursor | null>(null);
  const [cursors, setCursors] = useState<Record<string, Cursor>>({});

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  useEffect(() => {
    const socket: Socket = io(SOCKET_URL, { transports: ["websocket"] });

    socket.on("connect", () => {
      const name = user?.username || "Student";
      const mine: Cursor = {
        id: socket.id!,
        name,
        x: 0.5,
        y: 0.5,
        color: colorFromId(socket.id!),
      };
      setMe(mine);
      socket.emit("join", { name, room: "global" });
    });

    socket.on("presence", (snapshot: Cursor[]) => {
      const next: Record<string, Cursor> = {};
      snapshot.forEach((c) => (next[c.id] = c));
      setCursors(next);
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
    };
  }, [SOCKET_URL, user?.username]);

  useEffect(() => {
    if (!me) return;
    const socket: Socket = io(SOCKET_URL, { transports: ["websocket"] });

    const onMove = (e: MouseEvent) => {
      if (!boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const clampedX = Math.max(0, Math.min(1, x));
      const clampedY = Math.max(0, Math.min(1, y));

      const mine = { ...me, x: clampedX, y: clampedY };
      setMe(mine);
      socket.emit("move", { ...mine, room: "global" });
    };

    const el = boardRef.current;
    el?.addEventListener("mousemove", onMove);
    return () => el?.removeEventListener("mousemove", onMove);
  }, [me, SOCKET_URL]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Live Session</h2>
      <p className="text-white/70 text-sm">
        Move your mouse inside the whiteboard — everyone will see your cursor.
      </p>

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
