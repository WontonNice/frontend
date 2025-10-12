// src/components/LiveSessionPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type ServerCursor = { id: string; name: string; x: number; y: number };
type Cursor = ServerCursor & { color: string };
type Tool = "cursor" | "pen" | "eraser";

type Stroke = {
  from: { x: number; y: number }; // normalized
  to: { x: number; y: number };   // normalized
  color: string;
  size: number;                   // screen px
  mode: "pen" | "eraser";
};
type StrokeMsg = Stroke & { userId: string };

type NetImage = { id: string; src: string; x: number; y: number; w?: number };
type LocalImage = { id: string; src: string; x: number; y: number; w: number };

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:3001";
const API_BASE = (SOCKET_URL as string).replace(/\/$/, "");
const ROOM = "global";

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
function worldToCanvas(wx: number, wy: number) {
  const v = viewRef.current;
  return { x: wx * v.scale, y: wy * v.scale };
}
function canvasToWorld(cx: number, cy: number) {
  const v = viewRef.current;
  return { x: cx / v.scale, y: cy / v.scale };
}
const normToWorld = (nx: number, ny: number) => ({ x: nx * WORLD_W, y: ny * WORLD_H });
const worldToNorm = (wx: number, wy: number) => ({
  x: Math.min(1, Math.max(0, wx / WORLD_W)),
  y: Math.min(1, Math.max(0, wy / WORLD_H)),
});
const colorFromId = (id: string) => {
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return `hsl(${Math.abs(h) % 360} 80% 65%)`;
};

export default function LiveSessionPage() {
  const boardRef = useRef<HTMLDivElement>(null);
  const hitCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const rafRef = useRef<number | null>(null);

  // per-user layer canvases
  const layersHostRef = useRef<HTMLDivElement | null>(null);
  const layerMapRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const layerCtxRef = useRef<Map<string, CanvasRenderingContext2D>>(new Map());
  const strokesByUserRef = useRef<Map<string, Stroke[]>>(new Map());

  const [me, setMe] = useState<Cursor | null>(null);
  const [cursors, setCursors] = useState<Record<string, Cursor>>({});
  const [tool, setTool] = useState<Tool>("cursor");
  const [strokeColor, setStrokeColor] = useState("#111827");
  const [strokeSize, setStrokeSize] = useState(3);
  const [images, setImages] = useState<LocalImage[]>([]);
  const [drawingDisabled, setDrawingDisabled] = useState<boolean>(false);

  const dragRef = useRef<{ id: string | null; mode: "move" | "resize" | null; startX: number; startY: number; startImg: LocalImage | null; }>({ id: null, mode: null, startX: 0, startY: 0, startImg: null });
  const drawingRef = useRef(false);
  const lastNormRef = useRef<{ x: number; y: number } | null>(null);

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  }, []);
  const isTeacher = !!(user?.role === "teacher" || user?.isTeacher === true);

  // ----- layer helpers -----
  const ensureLayerCanvas = (userId: string) => {
    let c = layerMapRef.current.get(userId);
    if (!c) {
      c = document.createElement("canvas");
      c.className = "absolute top-0 left-0";
      c.style.pointerEvents = "none";
      layersHostRef.current?.appendChild(c);
      layerMapRef.current.set(userId, c);
    }
    const dpr = window.devicePixelRatio || 1;
    const v = viewRef.current;
    c.style.left = `${v.offsetX}px`;
    c.style.top = `${v.offsetY}px`;
    c.style.width = `${v.width}px`;
    c.style.height = `${v.height}px`;
    c.width = Math.max(1, Math.floor(v.width * dpr));
    c.height = Math.max(1, Math.floor(v.height * dpr));
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    layerCtxRef.current.set(userId, ctx);
    return ctx;
  };
  const getCtxForUser = (userId: string) => layerCtxRef.current.get(userId) ?? ensureLayerCanvas(userId);
  const replayUser = (userId: string) => {
    const ctx = getCtxForUser(userId);
    const v = viewRef.current;
    ctx.clearRect(0, 0, v.width, v.height);
    for (const s of (strokesByUserRef.current.get(userId) || [])) {
      const fromW = normToWorld(s.from.x, s.from.y);
      const toW = normToWorld(s.to.x, s.to.y);
      drawOnCtx(ctx, fromW, toW, s.color, s.size, s.mode);
    }
  };
  const replayAll = () => { for (const id of layerMapRef.current.keys()) replayUser(id); };
  const drawOnCtx = (ctx: CanvasRenderingContext2D, fromW: {x:number;y:number}, toW: {x:number;y:number}, color: string, size: number, mode: "pen"|"eraser") => {
    const fromC = worldToCanvas(fromW.x, fromW.y);
    const toC = worldToCanvas(toW.x, toW.y);
    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = mode === "eraser" ? "destination-out" : "source-over";
    if (mode !== "eraser") ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.beginPath();
    ctx.moveTo(fromC.x, fromC.y);
    ctx.lineTo(toC.x, toC.y);
    ctx.stroke();
    ctx.globalCompositeOperation = prev;
  };
  const ensureCanvasesSize = () => {
    const board = boardRef.current, hit = hitCanvasRef.current;
    if (!board || !hit) return;
    const v = computeView(board);
    viewRef.current = v;
    const dpr = window.devicePixelRatio || 1;
    hit.style.position = "absolute";
    hit.style.left = `${v.offsetX}px`;
    hit.style.top = `${v.offsetY}px`;
    hit.style.width = `${v.width}px`;
    hit.style.height = `${v.height}px`;
    hit.width = Math.max(1, Math.floor(v.width * dpr));
    hit.height = Math.max(1, Math.floor(v.height * dpr));
    hit.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const id of layerMapRef.current.keys()) ensureLayerCanvas(id);
    replayAll();
  };

  // ---------- socket ----------
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      const name = (user?.username || (isTeacher ? "Teacher" : "Student")).toString().slice(0, 64);
      const mine: Cursor = { id: socket.id!, name, x: 0.5, y: 0.5, color: colorFromId(socket.id!) };
      setMe(mine);
      // ✅ send role so server can gate admin actions
      socket.emit("join", { name, room: ROOM, role: isTeacher ? "teacher" : "student" });
      socket.emit("move", { x: 0.5, y: 0.5 });
      ensureLayerCanvas(socket.id!);
    });

    socket.on("presence", (snapshot: ServerCursor[]) => {
      const next: Record<string, Cursor> = {};
      snapshot.forEach((c) => (next[c.id] = { ...c, color: colorFromId(c.id) }));
      setCursors(next);
      snapshot.forEach((c) => ensureLayerCanvas(c.id));
    });

    socket.on("move", (c: ServerCursor) => {
      setCursors((prev) => ({ ...prev, [c.id]: { ...c, color: colorFromId(c.id) } }));
    });

    // 🔒 admin lock broadcasts
    socket.on("admin:drawing:set", ({ disabled }: { disabled: boolean }) => {
      setDrawingDisabled(!!disabled);
      if (disabled) { drawingRef.current = false; lastNormRef.current = null; }
    });

    // initial state (also contains admin flags)
    socket.on("session:state", (payload: {
      sessionId: number;
      strokes: (Stroke & { userId?: string })[];
      images: NetImage[];
      admin?: { drawingDisabled?: boolean };
    }) => {
      strokesByUserRef.current.clear();
      for (const s of payload.strokes || []) {
        const uid = (s as any).userId ? String((s as any).userId) : "_unknown";
        if (!strokesByUserRef.current.has(uid)) strokesByUserRef.current.set(uid, []);
        strokesByUserRef.current.get(uid)!.push({ from: s.from, to: s.to, color: s.color, size: s.size, mode: s.mode });
        ensureLayerCanvas(uid);
      }
      const imgs = (payload.images || []).map((img) => ({
        id: img.id, src: img.src,
        x: (img.x ?? 0.5) * WORLD_W, y: (img.y ?? 0.5) * WORLD_H,
        w: (img.w ?? 0.2) * WORLD_W,
      }));
      setImages(imgs);

      // pick up admin flag on join
      setDrawingDisabled(!!payload.admin?.drawingDisabled);

      ensureCanvasesSize();
      replayAll();
    });

    socket.on("draw:segment", (p: StrokeMsg) => {
      const uid = p.userId || "_unknown";
      if (!strokesByUserRef.current.has(uid)) strokesByUserRef.current.set(uid, []);
      strokesByUserRef.current.get(uid)!.push({ from: p.from, to: p.to, color: p.color, size: p.size, mode: p.mode });
      const ctx = getCtxForUser(uid);
      const fromW = normToWorld(p.from.x, p.from.y);
      const toW = normToWorld(p.to.x, p.to.y);
      drawOnCtx(ctx, fromW, toW, p.color, p.size, p.mode);
    });

    socket.on("draw:clear:user", ({ userId }: { userId: string }) => {
      const ctx = getCtxForUser(userId);
      const v = viewRef.current;
      ctx.clearRect(0, 0, v.width, v.height);
      strokesByUserRef.current.set(userId, []);
    });

    // Teacher "Clear Board"
    socket.on("draw:clear", () => {
      const v = viewRef.current;
      for (const ctx of layerCtxRef.current.values()) ctx.clearRect(0, 0, v.width, v.height);
      strokesByUserRef.current.clear();
      setImages([]);
    });

    socket.on("session:ended", () => {
      const v = viewRef.current;
      for (const ctx of layerCtxRef.current.values()) ctx.clearRect(0, 0, v.width, v.height);
      strokesByUserRef.current.clear();
      setImages([]);
      setDrawingDisabled(false);
    });

    socket.on("image:add", (img: NetImage) => {
      const withW: LocalImage = {
        id: img.id, src: img.src,
        x: (img.x ?? 0.5) * WORLD_W, y: (img.y ?? 0.5) * WORLD_H,
        w: (img.w ?? 0.2) * WORLD_W,
      };
      setImages((prev) => (prev.some((i) => i.id === withW.id) ? prev : [...prev, withW]));
    });

    socket.on("image:update", (patch: Partial<NetImage> & { id: string }) => {
      const worldPatch: Partial<LocalImage> & { id: string } = { id: patch.id };
      if (patch.x != null) worldPatch.x = patch.x * WORLD_W;
      if (patch.y != null) worldPatch.y = patch.y * WORLD_H;
      if (patch.w != null) worldPatch.w = patch.w * WORLD_W;
      setImages((prev) => prev.map((im) => (im.id === patch.id ? { ...im, ...worldPatch } : im)));
    });

    return () => {
      socket.emit?.("leave");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [SOCKET_URL, user?.username, isTeacher]);

  // ---------- pointer + drawing ----------
  useEffect(() => {
    const board = boardRef.current;
    const hit = hitCanvasRef.current;
    if (!board || !hit || !me) return;

    const drawingLockedForMe = drawingDisabled && !isTeacher;

    const onPointerDown = (e: PointerEvent) => {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      const { left, top } = hit.getBoundingClientRect();
      const cx = e.clientX - left, cy = e.clientY - top;
      const { x: wx, y: wy } = canvasToWorld(cx, cy);
      const clampedW = { x: Math.min(Math.max(wx, 0), WORLD_W), y: Math.min(Math.max(wy, 0), WORLD_H) };
      lastNormRef.current = worldToNorm(clampedW.x, clampedW.y);
      if (tool !== "cursor" && !drawingLockedForMe) drawingRef.current = true;
    };

    const onPointerMove = (e: PointerEvent) => {
      const { left, top } = hit.getBoundingClientRect();
      const cx = e.clientX - left, cy = e.clientY - top;
      const { x: wx, y: wy } = canvasToWorld(cx, cy);
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
        if (drawingDisabled && !isTeacher) { drawingRef.current = false; lastNormRef.current = null; return; }
        const fromN = lastNormRef.current, toN = n;
        lastNormRef.current = toN;

        const stroke: Stroke = { from: fromN, to: toN, color: strokeColor, size: strokeSize, mode: tool === "eraser" ? "eraser" : "pen" };
        const myId = me.id;
        const ctx = getCtxForUser(myId);
        const fromW = normToWorld(stroke.from.x, stroke.from.y);
        const toW = normToWorld(stroke.to.x, stroke.to.y);
        drawOnCtx(ctx, fromW, toW, stroke.color, stroke.size, stroke.mode);
        if (!strokesByUserRef.current.has(myId)) strokesByUserRef.current.set(myId, []);
        strokesByUserRef.current.get(myId)!.push(stroke);
        socketRef.current?.emit("draw:segment", stroke);
      }

      // image dragging
      const active = dragRef.current;
      if (active.id && active.mode && active.startImg) {
        const dxW = wx - active.startX, dyW = wy - active.startY;
        if (active.mode === "move") {
          const patchWorld = {
            id: active.id,
            x: Math.min(WORLD_W, Math.max(0, (active.startImg.x ?? WORLD_W / 2) + dxW)),
            y: Math.min(WORLD_H, Math.max(0, (active.startImg.y ?? WORLD_H / 2) + dyW)),
          };
          setImages((prev) => prev.map((im) => (im.id === patchWorld.id ? { ...im, ...patchWorld } : im)));
          socketRef.current?.emit("image:update", { id: patchWorld.id, x: patchWorld.x / WORLD_W, y: patchWorld.y / WORLD_H });
        } else if (active.mode === "resize") {
          const newWWorld = Math.min(WORLD_W, Math.max(0.05 * WORLD_W, (active.startImg.w ?? 0.2 * WORLD_W) + dxW));
          setImages((prev) => prev.map((im) => (im.id === active.id ? { ...im, w: newWWorld } : im)));
          socketRef.current?.emit("image:update", { id: active.id, w: newWWorld / WORLD_W });
        }
      }
    };

    const endStroke = () => {
      drawingRef.current = false;
      lastNormRef.current = null;
      dragRef.current = { id: null, mode: null, startX: 0, startY: 0, startImg: null };
    };

    board.addEventListener("pointerdown", onPointerDown);
    board.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", endStroke);
    return () => {
      board.removeEventListener("pointerdown", onPointerDown);
      board.removeEventListener("pointermove", onPointerMove as any);
      window.removeEventListener("pointerup", endStroke);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [me, tool, strokeColor, strokeSize, drawingDisabled, isTeacher]);

  // ---------- sizing & DPR ----------
  useEffect(() => {
    ensureCanvasesSize();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => ensureCanvasesSize()) : null;
    if (boardRef.current && ro) ro.observe(boardRef.current);
    const handleResize = () => ensureCanvasesSize();
    window.addEventListener("resize", handleResize);
    const mq = matchMedia?.(`(resolution: ${window.devicePixelRatio}dppx)`);
    const onDpr = () => ensureCanvasesSize();
    mq?.addEventListener?.("change", onDpr);
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

  // ---------- Clear mine ----------
  const clearMine = () => {
    if (!me) return;
    const myId = me.id;
    strokesByUserRef.current.set(myId, []);
    const ctx = getCtxForUser(myId);
    const v = viewRef.current;
    ctx.clearRect(0, 0, v.width, v.height);
    socketRef.current?.emit("draw:clear:user");
  };

  // ---------- Teacher controls ----------
  const teacherClearBoard = () => socketRef.current?.emit("draw:clear");
  const teacherToggleDrawing = () => {
    const next = !drawingDisabled;
    setDrawingDisabled(next); // optimistic
    socketRef.current?.emit("admin:drawing:set", { disabled: next });
  };
  const teacherEndSession = async () => {
    if (!confirm("End the current live session for everyone? This will clear the whiteboard.")) return;
    try {
      const res = await fetch(`${API_BASE}/session/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: ROOM }),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (e) {
      console.error(e);
      alert("Failed to end session. Check your server URL and try again.");
    }
  };

  const beginMove = (e: React.PointerEvent, img: LocalImage) => {
    if (tool !== "cursor") return;
    e.stopPropagation();
    const crect = hitCanvasRef.current!.getBoundingClientRect();
    const cx = e.clientX - crect.left, cy = e.clientY - crect.top;
    const { x: wx, y: wy } = canvasToWorld(cx, cy);
    dragRef.current = { id: img.id, mode: "move", startX: wx, startY: wy, startImg: { ...img } };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const beginResize = (e: React.PointerEvent, img: LocalImage) => {
    if (tool !== "cursor") return;
    e.stopPropagation();
    const crect = hitCanvasRef.current!.getBoundingClientRect();
    const cx = e.clientX - crect.left;
    const { x: wx } = canvasToWorld(cx, 0);
    dragRef.current = { id: img.id, mode: "resize", startX: wx, startY: 0, startImg: { ...img } };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const drawingLockedForMe = drawingDisabled && !isTeacher;

  return (
    <div className="w-full p-0 m-0">
      {/* Right toolbar (everyone) */}
      <div className="fixed z-[60] right-4 top-[calc(var(--topbar-height,56px)+8px)] flex items-center gap-2 bg-black/40 backdrop-blur px-3 py-2 rounded-lg ring-1 ring-white/10">
        <button onClick={() => setTool("cursor")} className={`px-2 py-1 text-xs rounded ${tool === "cursor" ? "bg-emerald-500 text-black" : "bg-white/10"}`}>Pointer</button>
        <button onClick={() => !drawingLockedForMe && setTool("pen")} disabled={drawingLockedForMe} title={drawingLockedForMe ? "Drawing disabled by teacher" : "Draw"} className={`px-2 py-1 text-xs rounded ${tool === "pen" ? "bg-emerald-500 text-black" : "bg-white/10"} ${drawingLockedForMe ? "opacity-50 cursor-not-allowed" : ""}`}>Draw</button>
        <button onClick={() => !drawingLockedForMe && setTool("eraser")} disabled={drawingLockedForMe} title={drawingLockedForMe ? "Drawing disabled by teacher" : "Erase"} className={`px-2 py-1 text-xs rounded ${tool === "eraser" ? "bg-emerald-500 text-black" : "bg-white/10"} ${drawingLockedForMe ? "opacity-50 cursor-not-allowed" : ""}`}>Erase</button>
        <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer" disabled={drawingLockedForMe} />
        <input type="range" min={1} max={24} value={strokeSize} onChange={(e) => setStrokeSize(Number(e.target.value))} className="w-24" disabled={drawingLockedForMe} />
        <button onClick={clearMine} className="px-2 py-1 text-xs rounded bg-red-500/80 text-black">Clear</button>
      </div>

      {/* Left teacher panel */}
      {isTeacher && (
        <div className="fixed z-[60] left-4 top-[calc(var(--topbar-height,56px)+8px)] bg-black/40 backdrop-blur px-4 py-3 rounded-2xl ring-1 ring-white/10 space-x-2">
          <button onClick={teacherClearBoard} className="px-3 py-1.5 rounded-lg border border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/10 text-sm font-semibold" title="Clears drawings and images for everyone">Clear Board</button>
          <button onClick={teacherToggleDrawing} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold" title="Toggle whether students can draw">{drawingDisabled ? "Enable Student Drawing" : "Disable Student Drawing"}</button>
          <button onClick={teacherEndSession} className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold" title="Ends session and clears the board for everyone">End Session</button>
        </div>
      )}

      {/* banner for students */}
      {drawingLockedForMe && (
        <div className="fixed left-1/2 -translate-x-1/2 top-[calc(var(--topbar-height,56px)+8px)] z-[65]">
          <div className="px-3 py-1 rounded-md bg-amber-500 text-black text-xs font-semibold shadow">
            Drawing disabled by teacher
          </div>
        </div>
      )}

      <div
        ref={boardRef}
        className="relative w-full h-[calc(100vh-var(--topbar-height))] bg-white overflow-hidden touch-none"
        style={{ WebkitUserSelect: "none", userSelect: "none", cursor: tool === "cursor" ? "default" : drawingLockedForMe ? "not-allowed" : "crosshair" }}
      >
        {/* Images under layers */}
        {images.map((img) => {
          const pos = worldToScreen(img.x, img.y);
          const pxWidth = (img.w ?? 0.2 * WORLD_W) * viewRef.current.scale;
          return (
            <div key={img.id} className="absolute pointer-events-auto group z-0"
              style={{ left: `${pos.x}px`, top: `${pos.y}px`, transform: "translate(-50%, -50%)", width: `${pxWidth}px` }}
              onPointerDown={(e) => beginMove(e, img)}>
              <img src={img.src} alt="" className="w-full h-auto rounded shadow select-none pointer-events-none" draggable={false} />
              <div onPointerDown={(e) => beginResize(e, img)} className="absolute right-0 bottom-0 translate-x-1/2 translate-y-1/2 w-4 h-4 rounded-full bg-black/60 ring-2 ring-white opacity-0 group-hover:opacity-100 cursor-nwse-resize" />
            </div>
          );
        })}

        {/* per-user canvases */}
        <div ref={layersHostRef} className="absolute inset-0 z-10 pointer-events-none" />

        {/* hit canvas */}
        <canvas ref={hitCanvasRef} className={`absolute z-20 ${tool === "cursor" ? "pointer-events-none" : ""}`} style={{ inset: "auto" }} />

        {/* cursors */}
        <div className="absolute inset-0 pointer-events-none z-30">
          {Object.values(cursors).map((c) => {
            const posW = normToWorld(c.x, c.y);
            const posS = worldToScreen(posW.x, posW.y);
            const isPointerMode = tool === "cursor";
            const ARROW_TX = -20, ARROW_TY = -60;
            return (
              <div key={c.id} className="absolute"
                   style={{ left: `${posS.x}px`, top: `${posS.y}px`, transform: isPointerMode ? `translate(${ARROW_TX}%, ${ARROW_TY}%)` : "translate(-50%, -50%)" }}>
                {isPointerMode ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill={c.color}><path d="M3 2l7 18 2-7 7-2L3 2z" /></svg>
                ) : (
                  <div className="rounded-full" style={{ width: 8, height: 8, background: c.color, boxShadow: "0 0 0 2px #fff, 0 0 0 4px rgba(0,0,0,.15)" }} />
                )}
                <div className="mt-1 px-2 py-0.5 text-xs font-medium rounded" style={{ background: c.color, color: "#0b0d12" }}>{c.name}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
