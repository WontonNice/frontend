// src/components/LiveSessionPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type ServerCursor = { id: string; name: string; x: number; y: number };
type Cursor = ServerCursor & { color: string };

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:3001";
const ROOM = "global";

const colorFromId = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return `hsl(${Math.abs(h) % 360} 80% 65%)`;
};

export default function LiveSessionPage() {
  const boardRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const rafRef = useRef<number | null>(null);

  const [me, setMe] = useState<Cursor | null>(null);
  const [cursors, setCursors] = useState<Record<string, Cursor>>({});

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      const name = (user?.username || "Student").toString().slice(0, 64);
      const mine: Cursor = { id: socket.id!, name, x: 0.5, y: 0.5, color: colorFromId(socket.id!) };
      setMe(mine);
      socket.emit("join", { name, room: ROOM });
    });

    socket.on("presence", (snapshot: ServerCursor[]) => {
      const next: Record<string, Cursor> = {};
      snapshot.forEach((c) => (next[c.id] = { ...c, color: colorFromId(c.id) }));
      setCursors(next);
    });

    socket.on("move", (c: ServerCursor) => {
      setCursors((prev) => ({ ...prev, [c.id]: { ...c, color: colorFromId(c.id) } }));
    });

    socket.on("left", (id: string) => {
      setCursors((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    });

    return () => {
      socket.emit?.("leave");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [SOCKET_URL, user?.username]);

  // Pointer tracking (mouse/touch/pen) with rAF throttle
  useEffect(() => {
    const el = boardRef.current;
    if (!el || !me) return;

    const emit = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
      // local optimistic update
      setMe((prev) => (prev ? { ...prev, x, y } : prev));
      setCursors((prev) => ({ ...prev, [me.id]: { ...me, x, y } }));
      // throttle network sends
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          socketRef.current?.emit("move", { x, y });
        });
      }
    };

    const onPointerMove = (e: PointerEvent) => emit(e.clientX, e.clientY);

    el.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      el.removeEventListener("pointermove", onPointerMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [me]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Live Session</h2>
      <p className="text-white/70 text-sm">Move your pointer in the whiteboard — everyone will see it.</p>

      <div
        ref={boardRef}
        className="relative mx-auto max-w-5xl h-[520px] bg-white rounded-xl ring-1 ring-black/10 overflow-hidden"
      >
        {Object.values(cursors).map((c) => {
          const left = `${c.x * 100}%`, top = `${c.y * 100}%`;
          return (
            <div key={c.id} className="absolute pointer-events-none" style={{ left, top, transform: "translate(-20%, -60%)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill={c.color}>
                <path d="M3 2l7 18 2-7 7-2L3 2z" />
              </svg>
              <div className="mt-1 px-2 py-0.5 text-xs font-medium rounded" style={{ background: c.color, color: "#0b0d12" }}>
                {c.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
