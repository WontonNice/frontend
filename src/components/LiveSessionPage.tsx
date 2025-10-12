// src/components/LiveSessionPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type ServerCursor = { id: string; name: string; x: number; y: number }; // normalized 0..1
type Cursor = ServerCursor & { color: string };
type Tool = "cursor" | "pen" | "eraser";

type Stroke = {
  from: { x: number; y: number }; // normalized 0..1
  to: { x: number; y: number };   // normalized 0..1
  color: string;
  size: number; // rendered in screen px (kept as-is)
  mode: "pen" | "eraser";
};

// Network image payload (normalized, as the server expects)
type NetImage = {
  id: string;
  src: string;
  x: number; // center (0..1)
  y: number; // center (0..1)
  w?: number; // width fraction (0..1)
};

// Local image for rendering (world units)
type LocalImage = {
  id: string;
  src: string;
  x: number; // world px (0..WORLD_W)
  y: number; // world px (0..WORLD_H)
  w: number; // world px (width in WORLD space)
};

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:3001";
const ROOM = "global";

// ===== Fixed virtual canvas ("world") =====
const WORLD_W = 1920;
const WORLD_H = 1080;

type View = { scale: number; offsetX: number; offsetY: number; width: number; height: number };
const viewRef = { current: { scale: 1, offsetX: 0, offsetY: 0, width: 0, height: 0 } as View };

function computeView(el: HTMLElement): View {
  const r = el.getBoundingClientRect();
  const scale = Math.min(r.width / WORLD_W, r.height / WORLD_H);
  const width = WORLD_W * scale;
  const height = WORLD_H * scale;
  const offsetX = (r.width - width) / 2;
  const offsetY = (r.height - height) / 2;
  return { scale, offsetX, offsetY, width, height };
}

function worldToScreen(wx: number, wy: number) {
  const v = viewRef.current;
  return { x: v.offsetX + wx * v.scale, y: v.offsetY + wy * v.scale };
}

function screenToWorld(sx: number, sy: number, el: HTMLElement) {
  const v = viewRef.current;
  return { x: (sx - v.offsetX) / v.scale, y: (sy - v.offsetY) / v.scale };
}

const normToWorld = (nx: number, ny: number) => ({ x: nx * WORLD_W, y: ny * WORLD_H });
const worldToNorm = (wx: number, wy: number) => ({
  x: Math.min(1, Math.max(0, wx / WORLD_W)),
  y: Math.min(1, Math.max(0, wy / WORLD_H)),
});

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

  const wbRef = useRef<{ strokes: Stroke[]; images: LocalImage[] }>({ strokes: [], images: [] });

  const [me, setMe] = useState<Cursor | null>(null);
  const [cursors, setCursors] = useState<Record<string, Cursor>>({});
  const [tool, setTool] = useState<Tool>("cursor");
  const [strokeColor, setStrokeColor] = useState("#111827");
  const [strokeSize, setStrokeSize] = useState(3);
  const [images, setImages] = useState<LocalImage[]>([]);

  const dragRef = useRef<{
    id: string | null;
    mode: "move" | "resize" | null;
    startX: number;   // world
    startY: number;   // world
    startImg: LocalImage | null;
  }>({ id: null, mode: null, startX: 0, startY: 0, startImg: null });

  const drawingRef = useRef(false);
  const lastNormRef = useRef<{ x: number; y: number } | null>(null);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  // ---------- canvas helpers (letterboxed world) ----------
  const ensureCanvasSize = () => {
    const el = boardRef.current, canvas = canvasRef.current;
    if (!el || !canvas) return;

    const view = computeView(el);
    viewRef.current = view;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(view.width * dpr));
    canvas.height = Math.max(1, Math.floor(view.height * dpr));

    // place canvas inside letterbox area
    canvas.style.position = "absolute";
    canvas.style.left = `${view.offsetX}px`;
    canvas.style.top = `${view.offsetY}px`;
    canvas.style.width = `${view.width}px`;
    canvas.style.height = `${view.height}px`;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
    ctxRef.current = ctx;
  };

  const drawSegmentLocal = (
    fromW: { x: number; y: number }, // world coords
    toW: { x: number; y: number },   // world coords
    color: string,
    size: number,
    mode: "pen" | "eraser"
  ) => {
    const ctx = ctxRef.current, el = boardRef.current;
    if (!ctx || !el) return;
    const fromS = worldToScreen(fromW.x, fromW.y);
    const toS = worldToScreen(toW.x, toW.y);

    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = mode === "eraser" ? "destination-out" : "source-over";
    if (mode !== "eraser") ctx.strokeStyle = color;
    ctx.lineWidth = size; // screen pixels (kept constant visually)
    ctx.beginPath();
    ctx.moveTo(fromS.x, fromS.y);
    ctx.lineTo(toS.x, toS.y);
    ctx.stroke();
    ctx.globalCompositeOperation = prev;
  };

  const repaintFromHistory = () => {
    const ctx = ctxRef.current, el = boardRef.current;
    if (!ctx || !el) return;
    const v = viewRef.current;
    ctx.clearRect(0, 0, v.width, v.height);
    for (const s of wbRef.current.strokes) {
      const fromW = normToWorld(s.from.x, s.from.y);
      const toW = normToWorld(s.to.x, s.to.y);
      drawSegmentLocal(fromW, toW, s.color, s.size, s.mode);
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
    socket.on("session:state", (payload: { sessionId: number; strokes: Stroke[]; images: NetImage[] }) => {
      wbRef.current.strokes = payload.strokes || [];
      // Convert images to world units locally
      wbRef.current.images = (payload.images || []).map((img) => ({
        id: img.id,
        src: img.src,
        x: (img.x ?? 0.5) * WORLD_W,
        y: (img.y ?? 0.5) * WORLD_H,
        w: (img.w ?? 0.2) * WORLD_W,
      }));
      setImages(wbRef.current.images);
      ensureCanvasSize();
      repaintFromHistory();
    });

    socket.on("session:ended", () => {
      wbRef.current.strokes = [];
      wbRef.current.images = [];
      setImages([]);
      const ctx = ctxRef.current, el = boardRef.current;
      if (ctx && el) {
        const v = viewRef.current;
        ctx.clearRect(0, 0, v.width, v.height);
      }
    });

    // drawing
    socket.on("draw:segment", (p: Stroke) => {
      wbRef.current.strokes.push(p);
      const fromW = normToWorld(p.from.x, p.from.y);
      const toW = normToWorld(p.to.x, p.to.y);
      drawSegmentLocal(fromW, toW, p.color, p.size, p.mode);
    });

    socket.on("draw:clear", () => {
      wbRef.current.strokes = [];
      wbRef.current.images = [];
      setImages([]);
      const ctx = ctxRef.current, el = boardRef.current;
      if (ctx && el) {
        const v = viewRef.current;
        ctx.clearRect(0, 0, v.width, v.height);
      }
    });

    // images (authoritative from server) + dedupe
    socket.on("image:add", (img: NetImage) => {
      const withW: LocalImage = {
        id: img.id,
        src: img.src,
        x: (img.x ?? 0.5) * WORLD_W,
        y: (img.y ?? 0.5) * WORLD_H,
        w: (img.w ?? 0.2) * WORLD_W,
      };
      if (wbRef.current.images.some((i) => i.id === withW.id)) return; // dedupe
      wbRef.current.images.push(withW);
      setImages((prev) => (prev.some((i) => i.id === withW.id) ? prev : [...prev, withW]));
    });

    socket.on("image:update", (patch: Partial<NetImage> & { id: string }) => {
      const worldPatch: Partial<LocalImage> & { id: string } = { id: patch.id };
      if (patch.x != null) worldPatch.x = patch.x * WORLD_W;
      if (patch.y != null) worldPatch.y = patch.y * WORLD_H;
      if (patch.w != null) worldPatch.w = patch.w * WORLD_W;

      wbRef.current.images = wbRef.current.images.map((im) => (im.id === patch.id ? { ...im, ...worldPatch } : im));
      setImages((prev) => prev.map((im) => (im.id === patch.id ? { ...im, ...worldPatch } : im)));
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
      const rect = el.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const { x: wx, y: wy } = screenToWorld(sx, sy, el);
      const clampedW = { x: Math.min(Math.max(wx, 0), WORLD_W), y: Math.min(Math.max(wy, 0), WORLD_H) };
      lastNormRef.current = worldToNorm(clampedW.x, clampedW.y);
      if (tool !== "cursor") drawingRef.current = true;
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const { x: wx, y: wy } = screenToWorld(sx, sy, el);
      const clampedW = { x: Math.min(Math.max(wx, 0), WORLD_W), y: Math.min(Math.max(wy, 0), WORLD_H) };
      const n = worldToNorm(clampedW.x, clampedW.y);

      setMe((prev) => (prev ? { ...prev, x: n.x, y: n.y } : prev));
      setCursors((prev) => (me ? { ...prev, [me.id]: { ...me, x: n.x, y: n.y } } : prev));

      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          socketRef.current?.volatile.emit("move", { x: n.x, y: n.y });
        });
      }

      if (drawingRef.current && lastNormRef.current) {
        const fromN = lastNormRef.current, toN = n;
        lastNormRef.current = toN;
        const fromW = normToWorld(fromN.x, fromN.y);
        const toW = normToWorld(toN.x, toN.y);
        const mode = tool === "eraser" ? "eraser" : "pen";
        drawSegmentLocal(fromW, toW, strokeColor, strokeSize, mode);
        const stroke: Stroke = { from: fromN, to: toN, color: strokeColor, size: strokeSize, mode };
        wbRef.current.strokes.push(stroke);
        socketRef.current?.emit("draw:segment", stroke);
      }

      // dragging/resizing images (world-based)
      const active = dragRef.current;
      if (active.id && active.mode && active.startImg) {
        const dxW = wx - active.startX;
        const dyW = wy - active.startY;

        if (active.mode === "move") {
          const patchWorld = {
            id: active.id,
            x: Math.min(WORLD_W, Math.max(0, (active.startImg.x ?? WORLD_W / 2) + dxW)),
            y: Math.min(WORLD_H, Math.max(0, (active.startImg.y ?? WORLD_H / 2) + dyW)),
          };
          wbRef.current.images = wbRef.current.images.map((im) => (im.id === patchWorld.id ? { ...im, ...patchWorld } : im));
          setImages((prev) => prev.map((im) => (im.id === patchWorld.id ? { ...im, ...patchWorld } : im)));
          socketRef.current?.emit("image:update", {
            id: patchWorld.id,
            x: patchWorld.x / WORLD_W,
            y: patchWorld.y / WORLD_H,
          });
        } else if (active.mode === "resize") {
          const newWWorld = Math.min(WORLD_W, Math.max(0.05 * WORLD_W, (active.startImg.w ?? 0.2 * WORLD_W) + dxW));
          const patchWorld = { id: active.id, w: newWWorld };
          wbRef.current.images = wbRef.current.images.map((im) => (im.id === patchWorld.id ? { ...im, ...patchWorld } : im));
          setImages((prev) => prev.map((im) => (im.id === patchWorld.id ? { ...im, ...patchWorld } : im)));
          socketRef.current?.emit("image:update", {
            id: active.id,
            w: newWWorld / WORLD_W,
          });
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
    ensureCanvasSize();
    repaintFromHistory();

    const ro = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
          ensureCanvasSize();
          repaintFromHistory();
        })
      : null;
    if (boardRef.current && ro) ro.observe(boardRef.current);

    const handleResize = () => {
      ensureCanvasSize();
      repaintFromHistory();
    };
    window.addEventListener("resize", handleResize);

    // devicePixelRatio changes (zoom/monitor change)
    const mq = matchMedia?.(`(resolution: ${window.devicePixelRatio}dppx)`);
    const onDpr = () => { ensureCanvasSize(); repaintFromHistory(); };
    mq?.addEventListener?.("change", onDpr);

    // prevent scroll while drawing
    const el = boardRef.current;
    const onWheel = (e: WheelEvent) => { if (drawingRef.current) e.preventDefault(); };
    el?.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      ro?.disconnect?.();
      window.removeEventListener("resize", handleResize);
      mq?.removeEventListener?.("change", onDpr);
      el?.removeEventListener("wheel", onWheel);
    };
  }, []);

  const clearBoard = () => {
    const ctx = ctxRef.current;
    if (ctx) {
      const v = viewRef.current;
      ctx.clearRect(0, 0, v.width, v.height);
    }
    wbRef.current.strokes = [];
    wbRef.current.images = [];
    setImages([]);
    socketRef.current?.emit("draw:clear");
  };

  // ---------- paste / drop images (emit only; server echo updates UI) ----------
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;

    const emitImageFile = (file: File, xWorld = WORLD_W / 2, yWorld = WORLD_H / 2) => {
      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result as string;
        const id = crypto.randomUUID();
        const norm = worldToNorm(xWorld, yWorld);
        const wNorm = 0.2; // 20% of WORLD_W
        socketRef.current?.emit("image:add", { src, id, x: norm.x, y: norm.y, w: wNorm } as NetImage);
      };
      reader.readAsDataURL(file);
    };

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            const meWorld = me ? normToWorld(me.x, me.y) : { x: WORLD_W / 2, y: WORLD_H / 2 };
            emitImageFile(file, meWorld.x, meWorld.y);
            break;
          }
        }
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith("image/")) emitImageFile(file, WORLD_W / 2, WORLD_H / 2);
    };

    const handleDragOver = (e: DragEvent) => e.preventDefault();

    el.addEventListener("paste", handlePaste as any);
    el.addEventListener("drop", handleDrop as any);
    el.addEventListener("dragover", handleDragOver as any);
    el.tabIndex = 0;
    el.focus();

    return () => {
      el.removeEventListener("paste", handlePaste as any);
      el.removeEventListener("drop", handleDrop as any);
      el.removeEventListener("dragover", handleDragOver as any);
    };
  }, [me]);

  // ---------- image pointer handlers (world-based) ----------
  const beginMove = (e: React.PointerEvent, img: LocalImage) => {
    if (tool !== "cursor") return;
    e.stopPropagation();
    const rect = boardRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const { x: wx, y: wy } = screenToWorld(sx, sy, boardRef.current!);
    dragRef.current = { id: img.id, mode: "move", startX: wx, startY: wy, startImg: { ...img } };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const beginResize = (e: React.PointerEvent, img: LocalImage) => {
    if (tool !== "cursor") return;
    e.stopPropagation();
    const rect = boardRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const { x: wx } = screenToWorld(sx, 0, boardRef.current!);
    dragRef.current = { id: img.id, mode: "resize", startX: wx, startY: 0, startImg: { ...img } };
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
        {/* images UNDER canvas, rendered from world -> screen */}
        {images.map((img) => {
          const el = boardRef.current!;
          const pos = el ? worldToScreen(img.x, img.y) : { x: 0, y: 0 };
          const v = viewRef.current;
          const pxWidth = (img.w ?? 0.2 * WORLD_W) * v.scale;
          return (
            <div
              key={img.id}
              className="absolute pointer-events-auto group z-0"
              style={{
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                transform: "translate(-50%, -50%)",
                width: `${pxWidth}px`,
              }}
              onPointerDown={(e) => beginMove(e, img)}
            >
              <img
                src={img.src}
                alt=""
                className="w-full h-auto rounded shadow select-none pointer-events-none"
                draggable={false}
              />
              <div
                onPointerDown={(e) => beginResize(e, img)}
                className="absolute right-0 bottom-0 translate-x-1/2 translate-y-1/2
                           w-4 h-4 rounded-full bg-black/60 ring-2 ring-white
                           opacity-0 group-hover:opacity-100 cursor-nwse-resize"
              />
            </div>
          );
        })}

        {/* single canvas ABOVE images; pass-through in cursor mode */}
        <canvas
          ref={canvasRef}
          className={`absolute z-10 ${tool === "cursor" ? "pointer-events-none" : ""}`}
          style={{ inset: "auto" }} // positioned by ensureCanvasSize()
        />

        {/* live cursors (normalized -> world -> screen) */}
        <div className="absolute inset-0 pointer-events-none">
          {Object.values(cursors).map((c) => {
            const el = boardRef.current!;
            const posW = normToWorld(c.x, c.y);
            const posS = el ? worldToScreen(posW.x, posW.y) : { x: 0, y: 0 };
            return (
              <div key={c.id} className="absolute" style={{ left: `${posS.x}px`, top: `${posS.y}px`, transform: "translate(-20%, -60%)" }}>
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
