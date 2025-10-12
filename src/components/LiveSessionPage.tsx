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

type Tool = "cursor" | "pen" | "eraser";

export default function LiveSessionPage() {
  const boardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const rafRef = useRef<number | null>(null);

  const [me, setMe] = useState<Cursor | null>(null);
  const [cursors, setCursors] = useState<Record<string, Cursor>>({});

  // drawing state
  const [tool, setTool] = useState<Tool>("cursor");
  const [strokeColor, setStrokeColor] = useState<string>("#111827"); // gray-900
  const [strokeSize, setStrokeSize] = useState<number>(3);
  const drawingRef = useRef(false);
  const lastNormRef = useRef<{ x: number; y: number } | null>(null);

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  }, []);

  // --- helpers
  const ensureCanvasSize = () => {
    const el = boardRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = el.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // scale for DPR but keep CSS pixels for math
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
    ctxRef.current = ctx;
  };

  const pxFromNorm = (nx: number, ny: number) => {
    const el = boardRef.current!;
    const rect = el.getBoundingClientRect();
    return { x: nx * rect.width, y: ny * rect.height };
  };

  const drawSegmentLocal = (from: {x:number,y:number}, to: {x:number,y:number}, color: string, size: number, mode: "pen"|"eraser") => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = mode === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = mode === "eraser" ? "rgba(0,0,0,1)" : color;
    ctx.lineWidth = size;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.globalCompositeOperation = prev;
  };

  // --- socket connect + events
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

    // ---- drawing broadcasts
    socket.on("draw:segment", (p: {from:{x:number,y:number}, to:{x:number,y:number}, color:string, size:number, mode:"pen"|"eraser"}) => {
      const from = pxFromNorm(p.from.x, p.from.y);
      const to = pxFromNorm(p.to.x, p.to.y);
      drawSegmentLocal(from, to, p.color, p.size, p.mode);
    });

    socket.on("draw:clear", () => {
      const ctx = ctxRef.current;
      const el = boardRef.current;
      if (ctx && el) {
        const r = el.getBoundingClientRect();
        ctx.clearRect(0, 0, r.width, r.height);
      }
    });

    return () => {
      socket.emit?.("leave");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [SOCKET_URL, user?.username]);

  // --- pointer tracking (cursors) + drawing
  useEffect(() => {
    const el = boardRef.current;
    if (!el || !me) return;

    const onPointerDown = (e: PointerEvent) => {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      const rect = el.getBoundingClientRect();
      const nx = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const ny = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
      lastNormRef.current = { x: nx, y: ny };
      if (tool !== "cursor") {
        drawingRef.current = true;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const nx = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const ny = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));

      // update my cursor + broadcast (throttled)
      setMe((prev) => (prev ? { ...prev, x: nx, y: ny } : prev));
      setCursors((prev) => (me ? { ...prev, [me.id]: { ...me, x: nx, y: ny } } : prev));
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          socketRef.current?.emit("move", { x: nx, y: ny });
        });
      }

      // draw if in drawing mode
      if (drawingRef.current && lastNormRef.current) {
        const fromN = lastNormRef.current;
        const toN = { x: nx, y: ny };
        lastNormRef.current = toN;

        // local paint
        const fromPx = pxFromNorm(fromN.x, fromN.y);
        const toPx = pxFromNorm(toN.x, toN.y);
        drawSegmentLocal(fromPx, toPx, strokeColor, strokeSize, tool === "eraser" ? "eraser" : "pen");

        // broadcast segment in normalized coords
        socketRef.current?.emit("draw:segment", {
          from: fromN, to: toN, color: strokeColor, size: strokeSize, mode: tool === "eraser" ? "eraser" : "pen",
        });
      }
    };

    const endStroke = () => {
      drawingRef.current = false;
      lastNormRef.current = null;
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", endStroke);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove as any);
      window.removeEventListener("pointerup", endStroke);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [me, tool, strokeColor, strokeSize]);

  // --- canvas sizing
  useEffect(() => {
    ensureCanvasSize();
    const ro = new ResizeObserver(ensureCanvasSize);
    if (boardRef.current) ro.observe(boardRef.current);
    window.addEventListener("resize", ensureCanvasSize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", ensureCanvasSize);
    };
  }, []);

  const clearBoard = () => {
    const ctx = ctxRef.current;
    const el = boardRef.current;
    if (ctx && el) {
      const r = el.getBoundingClientRect();
      ctx.clearRect(0, 0, r.width, r.height);
    }
    socketRef.current?.emit("draw:clear");
  };

  return (
    <div className="w-full p-0 m-0">
      {/* toolbar overlay */}
      <div className="absolute z-10 left-4 top-[calc(var(--topbar-height,56px)+8px)] flex items-center gap-2 bg-black/40 backdrop-blur px-3 py-2 rounded-lg ring-1 ring-white/10">
        <button
          onClick={() => setTool("cursor")}
          className={`px-2 py-1 text-xs rounded ${tool === "cursor" ? "bg-emerald-500 text-black" : "bg-white/10"}`}
          title="Pointer"
        >
          Pointer
        </button>
        <button
          onClick={() => setTool("pen")}
          className={`px-2 py-1 text-xs rounded ${tool === "pen" ? "bg-emerald-500 text-black" : "bg-white/10"}`}
          title="Draw"
        >
          Draw
        </button>
        <button
          onClick={() => setTool("eraser")}
          className={`px-2 py-1 text-xs rounded ${tool === "eraser" ? "bg-emerald-500 text-black" : "bg-white/10"}`}
          title="Erase"
        >
          Erase
        </button>

        <input
          type="color"
          value={strokeColor}
          onChange={(e) => setStrokeColor(e.target.value)}
          className="w-6 h-6 rounded overflow-hidden border-0 bg-transparent cursor-pointer"
          title="Color"
        />
        <input
          type="range"
          min={1}
          max={24}
          value={strokeSize}
          onChange={(e) => setStrokeSize(Number(e.target.value))}
          className="w-24"
          title="Size"
        />
        <button onClick={clearBoard} className="ml-1 px-2 py-1 text-xs rounded bg-red-500/80 text-black" title="Clear board">
          Clear
        </button>
      </div>

      <div
        ref={boardRef}
        className="
          relative w-full
          h-[calc(100vh-var(--topbar-height))]
          bg-white overflow-hidden touch-none
        "
        style={{ WebkitUserSelect: "none", userSelect: "none" }}
      >
        {/* drawing layer */}
        <canvas ref={canvasRef} className="absolute inset-0 block" />

        {/* live cursors above the ink */}
        <div className="absolute inset-0 pointer-events-none">
          {Object.values(cursors).map((c) => {
            const left = `${c.x * 100}%`, top = `${c.y * 100}%`;
            return (
              <div key={c.id} className="absolute" style={{ left, top, transform: "translate(-20%, -60%)" }}>
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
    </div>
  );
}
