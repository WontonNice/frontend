// src/components/LiveSessionPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type ServerCursor = { id: string; name: string; x: number; y: number };
type Cursor = ServerCursor & { color: string };
type Tool = "cursor" | "pen" | "eraser";

type Stroke = {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  size: number;
  mode: "pen" | "eraser";
};

type WbImage = {
  id: string;
  src: string;
  x: number; // center (0..1)
  y: number; // center (0..1)
  w?: number; // width as fraction of board width (0..1)
};

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:3001";
const ROOM = "global";

const colorFromId = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return `hsl(${Math.abs(h) % 360} 80% 65%)`;
};

export default function LiveSessionPage() {
  const boardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const rafRef = useRef<number | null>(null);

  // full whiteboard state to repaint on resize
  const wbRef = useRef<{ strokes: Stroke[]; images: WbImage[] }>({ strokes: [], images: [] });

  const [me, setMe] = useState<Cursor | null>(null);
  const [cursors, setCursors] = useState<Record<string, Cursor>>({});
  const [tool, setTool] = useState<Tool>("cursor");
  const [strokeColor, setStrokeColor] = useState("#111827");
  const [strokeSize, setStrokeSize] = useState(3);
  const [images, setImages] = useState<WbImage[]>([]);

  // drag/resize state
  const dragRef = useRef<{
    id: string | null;
    mode: "move" | "resize" | null;
    startX: number;
    startY: number;
    startImg: WbImage | null;
  }>({ id: null, mode: null, startX: 0, startY: 0, startImg: null });

  const drawingRef = useRef(false);
  const lastNormRef = useRef<{ x: number; y: number } | null>(null);

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  }, []);

  // ---------- canvas helpers ----------
  const ensureCanvasSize = () => {
    const el = boardRef.current, canvas = canvasRef.current;
    if (!el || !canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = el.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round"; ctx.lineJoin = "round";
    }
    ctxRef.current = ctx;
  };

  const pxFromNorm = (nx: number, ny: number) => {
    const el = boardRef.current!, rect = el.getBoundingClientRect();
    return { x: nx * rect.width, y: ny * rect.height };
  };

  const drawSegmentLocal = (from:{x:number;y:number}, to:{x:number;y:number}, color:string, size:number, mode:"pen"|"eraser") => {
    const ctx = ctxRef.current; if (!ctx) return;
    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = mode === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = mode === "eraser" ? "rgba(0,0,0,1)" : color;
    ctx.lineWidth = size;
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
    ctx.globalCompositeOperation = prev;
  };

  const repaintFromHistory = () => {
    const ctx = ctxRef.current, el = boardRef.current; if (!ctx || !el) return;
    const r = el.getBoundingClientRect();
    ctx.clearRect(0,0,r.width,r.height);
    for (const s of wbRef.current.strokes) {
      const from = pxFromNorm(s.from.x, s.from.y);
      const to = pxFromNorm(s.to.x, s.to.y);
      drawSegmentLocal(from, to, s.color, s.size, s.mode);
    }
  };

  // ---------- socket connection ----------
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

    // hydrate on join
    socket.on("session:state", (payload: {
      sessionId: number;
      strokes: Stroke[];
      images: WbImage[];
    }) => {
      wbRef.current.strokes = payload.strokes || [];
      // ensure default width if missing
      wbRef.current.images = (payload.images || []).map(img => ({ ...img, w: img.w ?? 0.2 }));
      setImages(wbRef.current.images);
      ensureCanvasSize(); repaintFromHistory();
    });

    socket.on("session:ended", () => {
      wbRef.current.strokes = []; wbRef.current.images = [];
      setImages([]);
      const ctx = ctxRef.current, el = boardRef.current;
      if (ctx && el) { const r = el.getBoundingClientRect(); ctx.clearRect(0,0,r.width,r.height); }
    });

    // drawing
    socket.on("draw:segment", (p: Stroke) => {
      wbRef.current.strokes.push(p);
      const from = pxFromNorm(p.from.x, p.from.y);
      const to = pxFromNorm(p.to.x, p.to.y);
      drawSegmentLocal(from, to, p.color, p.size, p.mode);
    });

    socket.on("draw:clear", () => {
      wbRef.current.strokes = []; wbRef.current.images = [];
      setImages([]);
      const ctx = ctxRef.current, el = boardRef.current;
      if (ctx && el) { const r = el.getBoundingClientRect(); ctx.clearRect(0,0,r.width,r.height); }
    });

    // images
    socket.on("image:add", (img: WbImage) => {
      const withW = { ...img, w: img.w ?? 0.2 };
      wbRef.current.images.push(withW);
      setImages((prev) => [...prev, withW]);
    });

    // NEW: image updates (drag/resize)
    socket.on("image:update", (patch: Partial<WbImage> & { id: string }) => {
      wbRef.current.images = wbRef.current.images.map(im => im.id === patch.id ? { ...im, ...patch } : im);
      setImages((prev) => prev.map(im => im.id === patch.id ? { ...im, ...patch } : im));
    });

    return () => {
      socket.emit?.("leave");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [SOCKET_URL, user?.username]);

  // ---------- pointer move + drawing ----------
  useEffect(() => {
    const el = boardRef.current;
    if (!el || !me) return;

    const onPointerDown = (e: PointerEvent) => {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

      // If starting on a handle or image, drag logic will handle it; drawing when tool!=cursor
      const rect = el.getBoundingClientRect();
      const nx = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const ny = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
      lastNormRef.current = { x: nx, y: ny };
      if (tool !== "cursor") drawingRef.current = true;
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const nx = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const ny = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));

      setMe((prev) => (prev ? { ...prev, x: nx, y: ny } : prev));
      setCursors((prev) => (me ? { ...prev, [me.id]: { ...me, x: nx, y: ny } } : prev));
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          socketRef.current?.emit("move", { x: nx, y: ny });
        });
      }

      if (drawingRef.current && lastNormRef.current) {
        const fromN = lastNormRef.current, toN = { x: nx, y: ny };
        lastNormRef.current = toN;
        const fromPx = pxFromNorm(fromN.x, fromN.y);
        const toPx = pxFromNorm(toN.x, toN.y);
        const mode = tool === "eraser" ? "eraser" : "pen";
        drawSegmentLocal(fromPx, toPx, strokeColor, strokeSize, mode);
        const stroke: Stroke = { from: fromN, to: toN, color: strokeColor, size: strokeSize, mode };
        wbRef.current.strokes.push(stroke);
        socketRef.current?.emit("draw:segment", stroke);
      }

      // handle dragging/resizing images
      const active = dragRef.current;
      if (active.id && active.mode && active.startImg) {
        const dx = nx - active.startX;
        const dy = ny - active.startY;

        if (active.mode === "move") {
          const patch = { id: active.id, x: Math.min(1, Math.max(0, (active.startImg.x ?? 0.5) + dx)), y: Math.min(1, Math.max(0, (active.startImg.y ?? 0.5) + dy)) };
          wbRef.current.images = wbRef.current.images.map(im => im.id === patch.id ? { ...im, ...patch } : im);
          setImages((prev) => prev.map(im => im.id === patch.id ? { ...im, ...patch } : im));
          socketRef.current?.emit("image:update", patch);
        } else if (active.mode === "resize") {
          // resize width by horizontal delta; keep height via natural aspect ratio
          const newW = Math.min(1, Math.max(0.05, (active.startImg.w ?? 0.2) + dx));
          const patch = { id: active.id, w: newW };
          wbRef.current.images = wbRef.current.images.map(im => im.id === patch.id ? { ...im, ...patch } : im);
          setImages((prev) => prev.map(im => im.id === patch.id ? { ...im, ...patch } : im));
          socketRef.current?.emit("image:update", patch);
        }
      }
    };

    const endStroke = () => {
      drawingRef.current = false;
      lastNormRef.current = null;
      dragRef.current = { id: null, mode: null, startX: 0, startY: 0, startImg: null };
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

  // ---------- canvas sizing & repaint ----------
  useEffect(() => {
    ensureCanvasSize(); repaintFromHistory();
    const ro = new ResizeObserver(() => { ensureCanvasSize(); repaintFromHistory(); });
    if (boardRef.current) ro.observe(boardRef.current);
    const handleResize = () => { ensureCanvasSize(); repaintFromHistory(); };
    window.addEventListener("resize", handleResize);
    return () => { ro.disconnect(); window.removeEventListener("resize", handleResize); };
  }, []);

  const clearBoard = () => {
    const ctx = ctxRef.current, el = boardRef.current;
    if (ctx && el) { const r = el.getBoundingClientRect(); ctx.clearRect(0,0,r.width,r.height); }
    wbRef.current.strokes = []; wbRef.current.images = [];
    setImages([]); socketRef.current?.emit("draw:clear");
  };

  // ---------- paste / drop images ----------
  useEffect(() => {
    const el = boardRef.current; if (!el) return;

    const handleImageFile = (file: File, x = 0.5, y = 0.5) => {
      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result as string;
        const imgObj: WbImage = { src, x, y, id: crypto.randomUUID(), w: 0.2 };
        wbRef.current.images.push(imgObj);
        setImages((prev) => [...prev, imgObj]);
        socketRef.current?.emit("image:add", imgObj);
      };
      reader.readAsDataURL(file);
    };

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items; if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile(); if (file) {
            e.preventDefault(); handleImageFile(file, me?.x ?? 0.5, me?.y ?? 0.5);
            break;
          }
        }
      }
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith("image/")) handleImageFile(file, 0.5, 0.5);
    };
    const handleDragOver = (e: DragEvent) => e.preventDefault();

    el.addEventListener("paste", handlePaste as any);
    el.addEventListener("drop", handleDrop as any);
    el.addEventListener("dragover", handleDragOver as any);

    el.tabIndex = 0; el.focus();

    return () => {
      el.removeEventListener("paste", handlePaste as any);
      el.removeEventListener("drop", handleDrop as any);
      el.removeEventListener("dragover", handleDragOver as any);
    };
  }, [me]);

  // ---------- image pointer handlers ----------
  const beginMove = (e: React.PointerEvent, img: WbImage) => {
    if (tool !== "cursor") return; // drawing mode: ignore
    e.stopPropagation();
    const rect = boardRef.current!.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    dragRef.current = { id: img.id, mode: "move", startX: nx, startY: ny, startImg: { ...img } };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const beginResize = (e: React.PointerEvent, img: WbImage) => {
    if (tool !== "cursor") return;
    e.stopPropagation();
    const rect = boardRef.current!.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    dragRef.current = { id: img.id, mode: "resize", startX: nx, startY: 0, startImg: { ...img } };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  return (
    <div className="w-full p-0 m-0">
      {/* toolbar */}
      <div className="fixed z-[60] right-4 top-[calc(var(--topbar-height,56px)+8px)] flex items-center gap-2 bg-black/40 backdrop-blur px-3 py-2 rounded-lg ring-1 ring-white/10">
        <button onClick={() => setTool("cursor")} className={`px-2 py-1 text-xs rounded ${tool === "cursor" ? "bg-emerald-500 text-black" : "bg-white/10"}`}>Pointer</button>
        <button onClick={() => setTool("pen")} className={`px-2 py-1 text-xs rounded ${tool === "pen" ? "bg-emerald-500 text-black" : "bg-white/10"}`}>Draw</button>
        <button onClick={() => setTool("eraser")} className={`px-2 py-1 text-xs rounded ${tool === "eraser" ? "bg-emerald-500 text-black" : "bg-white/10"}`}>Erase</button>
        <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer" />
        <input type="range" min={1} max={24} value={strokeSize} onChange={(e) => setStrokeSize(Number(e.target.value))} className="w-24" />
        <button onClick={clearBoard} className="px-2 py-1 text-xs rounded bg-red-500/80 text-black">Clear</button>
      </div>

      <div
        ref={boardRef}
        className="relative w-full h-[calc(100vh-var(--topbar-height))] bg-white overflow-hidden touch-none"
        style={{ WebkitUserSelect: "none", userSelect: "none" }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 block" />

        {/* images (draggable + resizable) */}
        {images.map((img) => {
          const left = `${img.x * 100}%`;
          const top = `${img.y * 100}%`;
          const widthPercent = `${(img.w ?? 0.2) * 100}%`;
          return (
            <div
              key={img.id}
              className="absolute pointer-events-auto group"
              style={{ left, top, transform: "translate(-50%, -50%)", width: widthPercent }}
              onPointerDown={(e) => beginMove(e, img)}
            >
              <img src={img.src} alt="" className="w-full h-auto rounded shadow select-none pointer-events-none" draggable={false} />
              {/* resize handle (bottom-right) */}
              <div
                onPointerDown={(e) => beginResize(e, img)}
                  className="absolute right-0 bottom-0 translate-x-1/2 translate-y-1/2 w-4 h-4 rounded-full bg-black/60 ring-2 ring-white opacity-0 group-hover:opacity-100 cursor-nwse-resize"
              />
            </div>
          );
        })}

        {/* live cursors */}
        <div className="absolute inset-0 pointer-events-none">
          {Object.values(cursors).map((c) => {
            const left = `${c.x * 100}%`, top = `${c.y * 100}%`;
            return (
              <div key={c.id} className="absolute" style={{ left, top, transform: "translate(-20%, -60%)" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill={c.color}><path d="M3 2l7 18 2-7 7-2L3 2z" /></svg>
                <div className="mt-1 px-2 py-0.5 text-xs font-medium rounded" style={{ background: c.color, color: "#0b0d12" }}>{c.name}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
