// src/components/LiveSessionPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type ServerCursor = { id: string; name: string; x: number; y: number };
type Cursor = ServerCursor & { color: string };
type Tool = "cursor" | "pen" | "eraser" | "text";

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

type NetText = { id: string; text: string; x: number; y: number; w?: number };
type LocalText = { id: string; text: string; x: number; y: number; w: number };

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
  const [texts, setTexts] = useState<LocalText[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [drawingDisabled, setDrawingDisabled] = useState<boolean>(false);

  const dragRef = useRef<{ id: string | null; mode: "move" | "resize" | null; startX: number; startY: number; startImg: LocalImage | null; }>(
    { id: null, mode: null, startX: 0, startY: 0, startImg: null }
  );
  const textDragRef = useRef<{ id: string | null; mode: "move" | "resize" | null; startX: number; startY: number; startText: LocalText | null; }>(
    { id: null, mode: null, startX: 0, startY: 0, startText: null }
  );
  const drawingRef = useRef(false);
  const lastNormRef = useRef<{ x: number; y: number } | null>(null);

  // undo/redo for drawings
  const myStrokeEndsRef = useRef<number[]>([]);
  const myRedoStackRef = useRef<Stroke[][]>([]);
  const currentStrokeStartCountRef = useRef<number>(0);

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
      texts?: NetText[];
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

      const txs = (payload.texts || []).map((t) => ({
        id: t.id, text: t.text,
        x: (t.x ?? 0.5) * WORLD_W, y: (t.y ?? 0.5) * WORLD_H,
        w: (t.w ?? 0.25) * WORLD_W,
      }));
      setTexts(txs);

      // pick up admin flag on join
      setDrawingDisabled(!!payload.admin?.drawingDisabled);

      ensureCanvasesSize();
      replayAll();
    });

    socket.on("draw:segment", (p: StrokeMsg) => {
      const myId = socketRef.current?.id;
      const uid = p.userId || "_unknown";
      if (uid === myId) return; // ignore self-echo
      if (!strokesByUserRef.current.has(uid)) strokesByUserRef.current.set(uid, []);
      strokesByUserRef.current.get(uid)!.push({ from: p.from, to: p.to, color: p.color, size: p.size, mode: p.mode });
      const ctx = getCtxForUser(uid);
      const fromW = normToWorld(p.from.x, p.from.y);
      const toW = normToWorld(p.to.x, p.to.y);
      drawOnCtx(ctx, fromW, toW, p.color, p.size, p.mode);
    });

    socket.on("draw:clear:user", ({ userId }: { userId: string }) => {
      const myId = socketRef.current?.id;
      if (userId === myId) return; // ignore self-echo during resync
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
      setTexts([]);
    });

    socket.on("session:ended", () => {
      const v = viewRef.current;
      for (const ctx of layerCtxRef.current.values()) ctx.clearRect(0, 0, v.width, v.height);
      strokesByUserRef.current.clear();
      setImages([]);
      setTexts([]);
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

    socket.on("image:remove", ({ ids }: { ids: string[] }) => {
      if (!Array.isArray(ids) || !ids.length) return;
      setImages((prev) => prev.filter((im) => !ids.includes(im.id)));
    });

    socket.on("image:error", (p: { reason: string; maxMB?: number }) => {
      if (p?.reason === "too_large") {
        alert(`That image is too large. Max allowed is ~${p.maxMB ?? 5} MB.`);
      }
    });

    // TEXT events
    socket.on("text:add", (t: NetText) => {
      const withW: LocalText = {
        id: t.id, text: t.text || "",
        x: (t.x ?? 0.5) * WORLD_W, y: (t.y ?? 0.5) * WORLD_H,
        w: (t.w ?? 0.25) * WORLD_W,
      };
      setTexts((prev) => (prev.some((i) => i.id === withW.id) ? prev : [...prev, withW]));
    });
    socket.on("text:update", (patch: Partial<NetText> & { id: string }) => {
      const worldPatch: Partial<LocalText> & { id: string } = { id: patch.id };
      if (patch.text != null) (worldPatch as any).text = patch.text;
      if (patch.x != null) worldPatch.x = patch.x * WORLD_W;
      if (patch.y != null) worldPatch.y = patch.y * WORLD_H;
      if (patch.w != null) worldPatch.w = patch.w * WORLD_W;
      setTexts((prev) => prev.map((tx) => (tx.id === patch.id ? { ...tx, ...worldPatch } : tx)));
    });
    socket.on("text:remove", ({ ids }: { ids: string[] }) => {
      if (!Array.isArray(ids) || !ids.length) return;
      setTexts((prev) => prev.filter((tx) => !ids.includes(tx.id)));
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
      // don't capture/paint while editing a text box
      if (editingTextId) return;

      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      const { left, top } = hit.getBoundingClientRect();
      const cx = e.clientX - left, cy = e.clientY - top;
      const { x: wx, y: wy } = canvasToWorld(cx, cy);
      const clampedW = { x: Math.min(Math.max(wx, 0), WORLD_W), y: Math.min(Math.max(wy, 0), WORLD_H) };
      lastNormRef.current = worldToNorm(clampedW.x, clampedW.y);

      if (tool === "text" && !drawingLockedForMe) {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const local: LocalText = { id, text: "", x: clampedW.x, y: clampedW.y, w: 0.25 * WORLD_W };
        setTexts((prev) => [...prev, local]);
        setEditingTextId(id);
        socketRef.current?.emit("text:add", { id, text: "", x: local.x / WORLD_W, y: local.y / WORLD_H, w: local.w / WORLD_W });
        return;
      }

      if (tool !== "cursor" && !drawingLockedForMe) {
        drawingRef.current = true;
        const myId = me.id;
        const arr = strokesByUserRef.current.get(myId) || [];
        currentStrokeStartCountRef.current = arr.length;
      }
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

      // text dragging
      const tActive = textDragRef.current;
      if (tActive.id && tActive.mode && tActive.startText) {
        const dxW = wx - tActive.startX, dyW = wy - tActive.startY;
        if (tActive.mode === "move") {
          const patchWorld = {
            id: tActive.id,
            x: Math.min(WORLD_W, Math.max(0, (tActive.startText.x ?? WORLD_W / 2) + dxW)),
            y: Math.min(WORLD_H, Math.max(0, (tActive.startText.y ?? WORLD_H / 2) + dyW)),
          };
          setTexts((prev) => prev.map((tx) => (tx.id === patchWorld.id ? { ...tx, ...patchWorld } : tx)));
          socketRef.current?.emit("text:update", { id: patchWorld.id, x: patchWorld.x / WORLD_W, y: patchWorld.y / WORLD_H });
        } else if (tActive.mode === "resize") {
          const newWWorld = Math.min(WORLD_W, Math.max(0.1 * WORLD_W, (tActive.startText.w ?? 0.25 * WORLD_W) + dxW));
          setTexts((prev) => prev.map((tx) => (tx.id === tActive.id ? { ...tx, w: newWWorld } : tx)));
          socketRef.current?.emit("text:update", { id: tActive.id, w: newWWorld / WORLD_W });
        }
      }
    };

    const endStroke = () => {
      // Close a stroke: record boundary for undo if any segments were added
      if (me && drawingRef.current) {
        const myId = me.id;
        const arr = strokesByUserRef.current.get(myId) || [];
        const start = currentStrokeStartCountRef.current || 0;
        if (arr.length > start) {
          myStrokeEndsRef.current.push(arr.length);
          myRedoStackRef.current = [];
        }
      }
      drawingRef.current = false;
      lastNormRef.current = null;
      dragRef.current = { id: null, mode: null, startX: 0, startY: 0, startImg: null };
      textDragRef.current = { id: null, mode: null, startX: 0, startY: 0, startText: null };
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
  }, [me, tool, strokeColor, strokeSize, drawingDisabled, isTeacher, editingTextId]);

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

  // ---------- Paste & Drag/Drop images ----------
  useEffect(() => {
    const fileToBitmap = (file: File) => createImageBitmap(file);

    const bitmapToDataUrl = async (bmp: ImageBitmap, maxW = 1600, quality = 0.85) => {
      const scale = Math.min(1, maxW / bmp.width);
      const w = Math.max(1, Math.round(bmp.width * scale));
      const h = Math.max(1, Math.round(bmp.height * scale));
      const cvs = document.createElement("canvas");
      cvs.width = w; cvs.height = h;
      const ctx = cvs.getContext("2d")!;
      ctx.drawImage(bmp, 0, 0, w, h);
      return cvs.toDataURL("image/jpeg", quality);
    };

    const addImageNormalized = (src: string, xN?: number, yN?: number, wN = 0.3) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const nx = Math.min(1, Math.max(0, xN ?? (me?.x ?? 0.5)));
      const ny = Math.min(1, Math.max(0, yN ?? (me?.y ?? 0.5)));
      const nw = Math.min(1, Math.max(0.05, wN));
      socketRef.current?.emit("image:add", { id, src, x: nx, y: ny, w: nw });
    };

    const handleItems = async (items: DataTransferItemList | null) => {
      if (!items) return;

      for (const it of Array.from(items)) {
        if (it.kind === "file" && it.type.startsWith("image/")) {
          const file = it.getAsFile();
          if (!file) continue;
          const bmp = await fileToBitmap(file);
          let dataUrl = await bitmapToDataUrl(bmp, 1600, 0.85);
          let approx = Math.floor(dataUrl.length * 0.75);
          if (approx > 5 * 1024 * 1024) {
            dataUrl = await bitmapToDataUrl(bmp, 1200, 0.8);
            approx = Math.floor(dataUrl.length * 0.75);
          }
          addImageNormalized(dataUrl);
          return;
        }
      }

      const text = (items as any).clipboardData?.getData?.("text/plain") ?? (items as any).dataTransfer?.getData?.("text/plain");
      if (text && /^https?:\/\/\S+\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(text.trim())) {
        addImageNormalized(text.trim());
      }
    };

    const onPaste = (e: ClipboardEvent) => { handleItems(e.clipboardData?.items || null); };
    const onDrop = (e: DragEvent) => { e.preventDefault(); handleItems(e.dataTransfer?.items || null); };
    const onDragOver = (e: DragEvent) => e.preventDefault();

    window.addEventListener("paste", onPaste as any);
    window.addEventListener("drop", onDrop as any);
    window.addEventListener("dragover", onDragOver as any);

    return () => {
      window.removeEventListener("paste", onPaste as any);
      window.removeEventListener("drop", onDrop as any);
      window.removeEventListener("dragover", onDragOver as any);
    };
  }, [me]);

  // Auto-focus newly edited text boxes (safety net)
  useEffect(() => {
    if (!editingTextId) return;
    const el = document.getElementById(`tx-${editingTextId}`) as HTMLElement | null;
    el?.focus();
  }, [editingTextId]);

  // ---------- Undo / Redo (drawings) ----------
  const syncMyStrokesToServer = () => {
    if (!me || !socketRef.current) return;
    const myId = me.id;
    const arr = strokesByUserRef.current.get(myId) || [];
    socketRef.current.emit("draw:clear:user");
    for (const s of arr) socketRef.current.emit("draw:segment", s);
  };

  const undoMine = () => {
    if (!me) return;
    const myId = me.id;
    const ends = myStrokeEndsRef.current;
    const all = strokesByUserRef.current.get(myId) || [];
    if (!ends.length) return;
    const lastEnd = ends.pop()!;
    const prevEnd = ends.length ? ends[ends.length - 1] : 0;
    const removed = all.splice(prevEnd, lastEnd - prevEnd);
    myRedoStackRef.current.push(removed);
    const ctx = getCtxForUser(myId);
    const v = viewRef.current;
    ctx.clearRect(0, 0, v.width, v.height);
    for (const s of all) {
      const fromW = normToWorld(s.from.x, s.from.y);
      const toW = normToWorld(s.to.x, s.to.y);
      drawOnCtx(ctx, fromW, toW, s.color, s.size, s.mode);
    }
    syncMyStrokesToServer();
  };

  const redoMine = () => {
    if (!me) return;
    const myId = me.id;
    const group = myRedoStackRef.current.pop();
    if (!group || !group.length) return;
    if (!strokesByUserRef.current.has(myId)) strokesByUserRef.current.set(myId, []);
    const all = strokesByUserRef.current.get(myId)!;
    for (const s of group) {
      all.push(s);
      const ctx = getCtxForUser(myId);
      const fromW = normToWorld(s.from.x, s.from.y);
      const toW = normToWorld(s.to.x, s.to.y);
      drawOnCtx(ctx, fromW, toW, s.color, s.size, s.mode);
      socketRef.current?.emit("draw:segment", s);
    }
    myStrokeEndsRef.current.push(all.length);
  };

  // Keyboard shortcuts: Cmd/Ctrl+Z for undo, Shift+Cmd/Ctrl+Z for redo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;
      if (e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redoMine(); else undoMine();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---------- Clear mine ----------
  const clearMine = () => {
    if (!me) return;
    const myId = me.id;
    strokesByUserRef.current.set(myId, []);
    myStrokeEndsRef.current = [];
    myRedoStackRef.current = [];
    const ctx = getCtxForUser(myId);
    const v = viewRef.current;
    ctx.clearRect(0, 0, v.width, v.height);
    socketRef.current?.emit("draw:clear:user");
    socketRef.current?.emit("image:clear:mine");
    socketRef.current?.emit("text:clear:mine");
  };

  // ---------- Teacher controls ----------
  const teacherClearBoard = () => socketRef.current?.emit("draw:clear");
  const teacherToggleDrawing = () => {
    const next = !drawingDisabled;
    setDrawingDisabled(next);
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

  const beginMoveText = (e: React.PointerEvent, t: LocalText) => {
    // don't start drag if currently editing a text box
    if (tool !== "cursor" || editingTextId) return;
    e.stopPropagation();
    const crect = hitCanvasRef.current!.getBoundingClientRect();
    const cx = e.clientX - crect.left, cy = e.clientY - crect.top;
    const { x: wx, y: wy } = canvasToWorld(cx, cy);
    textDragRef.current = { id: t.id, mode: "move", startX: wx, startY: wy, startText: { ...t } };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const beginResizeText = (e: React.PointerEvent, t: LocalText) => {
    if (tool !== "cursor" || editingTextId) return;
    e.stopPropagation();
    const crect = hitCanvasRef.current!.getBoundingClientRect();
    const cx = e.clientX - crect.left;
    const { x: wx } = canvasToWorld(cx, 0);
    textDragRef.current = { id: t.id, mode: "resize", startX: wx, startY: 0, startText: { ...t } };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onEditText = (id: string, text: string) => {
    setTexts((prev) => prev.map((tx) => (tx.id === id ? { ...tx, text } : tx)));
    socketRef.current?.emit("text:update", { id, text });
  };

  const drawingLockedForMe = drawingDisabled && !isTeacher;

  return (
    <div className="w-full p-0 m-0">
      {/* Right toolbar (everyone) */}
      <div className="fixed z-[60] right-4 top-[calc(var(--topbar-height,56px)+8px)] flex items-center gap-2 bg-black/40 backdrop-blur px-3 py-2 rounded-lg ring-1 ring-white/10">
        <button onClick={() => setTool("cursor")} className={`px-2 py-1 text-xs rounded ${tool === "cursor" ? "bg-emerald-500 text-black" : "bg-white/10"}`}>Pointer</button>
        <button onClick={() => !drawingLockedForMe && setTool("pen")} disabled={drawingLockedForMe} title={drawingLockedForMe ? "Drawing disabled by teacher" : "Draw"} className={`px-2 py-1 text-xs rounded ${tool === "pen" ? "bg-emerald-500 text-black" : "bg-white/10"} ${drawingLockedForMe ? "opacity-50 cursor-not-allowed" : ""}`}>Draw</button>
        <button onClick={() => !drawingLockedForMe && setTool("eraser")} disabled={drawingLockedForMe} title={drawingLockedForMe ? "Drawing disabled by teacher" : "Erase"} className={`px-2 py-1 text-xs rounded ${tool === "eraser" ? "bg-emerald-500 text-black" : "bg-white/10"} ${drawingLockedForMe ? "opacity-50 cursor-not-allowed" : ""}`}>Erase</button>
        <button onClick={() => !drawingLockedForMe && setTool("text")} disabled={drawingLockedForMe} title={drawingLockedForMe ? "Drawing disabled by teacher" : "Text box"} className={`px-2 py-1 text-xs rounded ${tool === "text" ? "bg-emerald-500 text-black" : "bg-white/10"} ${drawingLockedForMe ? "opacity-50 cursor-not-allowed" : ""}`}>Text</button>
        <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer" disabled={drawingLockedForMe} />
        <input type="range" min={1} max={24} value={strokeSize} onChange={(e) => setStrokeSize(Number(e.target.value))} className="w-24" disabled={drawingLockedForMe} />
        <button onClick={undoMine} className="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/20">Undo</button>
        <button onClick={redoMine} className="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/20">Redo</button>
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
        style={{
          WebkitUserSelect: (editingTextId || tool === "text") ? "text" as const : "none" as const,
          userSelect: (editingTextId || tool === "text") ? "text" as const : "none" as const,
          cursor: tool === "text" ? "text" : (tool === "cursor" ? "default" : (drawingLockedForMe ? "not-allowed" : "crosshair")),
        }}
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

        {/* TEXT boxes under layers (above images) */}
        {texts.map((t) => {
          const pos = worldToScreen(t.x, t.y);
          const pxWidth = (t.w ?? 0.25 * WORLD_W) * viewRef.current.scale;
          const fontSize = Math.max(12, Math.floor(16 * viewRef.current.scale));
          return (
            <div key={t.id}
                 className="absolute pointer-events-auto group z-0"
                 style={{ left: `${pos.x}px`, top: `${pos.y}px`, transform: "translate(-50%, -50%)", width: `${pxWidth}px` }}
                 onPointerDown={(e) => beginMoveText(e, t)}>
<div
  id={`tx-${t.id}`}
  className={`w-full min-h-[1.5rem] rounded bg-white/80 ring-1 ring-black/10 shadow-sm px-2 py-1 outline-none
    ${editingTextId === t.id ? "ring-2 ring-emerald-400" : ""} !text-black caret-black`}
  contentEditable={editingTextId === t.id}
  suppressContentEditableWarning
  tabIndex={0}
  // prevent dragging when clicking to edit
  onPointerDown={(e) => e.stopPropagation()}
  onMouseDown={(e) => e.stopPropagation()}
  onDoubleClick={(e) => {
    e.stopPropagation();
    setEditingTextId(t.id);
    // focus after enabling contentEditable
    setTimeout(() => {
      const el = document.getElementById(`tx-${t.id}`);
      (el as HTMLElement | null)?.focus();
    }, 0);
  }}
  onClick={(e) => {
    // if already in edit mode, keep focus on click
    if (editingTextId === t.id) {
      e.stopPropagation();
      (e.currentTarget as HTMLElement).focus();
    }
  }}
  onBlur={() =>
    setEditingTextId((prev) => (prev === t.id ? null : prev))
  }
  onInput={(e) =>
    onEditText(t.id, (e.target as HTMLElement).innerText)
  }
  style={{
    fontSize,
    lineHeight: 1.2,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    // hard overrides in case a global rule uses !important
    color: "#111827",
    caretColor: "#111827",
    WebkitTextFillColor: "#111827",
  }}
>
  {t.text || ""}
</div>

              {/* resize handle */}
              <div onPointerDown={(e) => beginResizeText(e, t)} className="absolute right-0 bottom-0 translate-x-1/2 translate-y-1/2 w-3 h-3 rounded-full bg-black/60 ring-2 ring-white opacity-0 group-hover:opacity-100 cursor-ew-resize" />
            </div>
          );
        })}

        {/* per-user canvases */}
        <div ref={layersHostRef} className="absolute inset-0 z-10 pointer-events-none" />

        {/* hit canvas (only active for pen/eraser) */}
        <canvas
          ref={hitCanvasRef}
          className={`absolute z-20 ${tool === "pen" || tool === "eraser" ? "" : "pointer-events-none"}`}
          style={{ inset: "auto" }}
        />

        {/* cursors */}
        <div className="absolute inset-0 pointer-events-none z-30">
          {Object.values(cursors).map((c) => {
            const posW = normToWorld(c.x, c.y);
            const posS = worldToScreen(posW.x, posW.y);
            return (
              <div key={c.id} className="absolute" style={{ left: `${posS.x}px`, top: `${posS.y}px`, transform: "translate(-3px, -2px)" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill={c.color}><path d="M3 2l7 18 2-7 7-2L3 2z" /></svg>
                <div className="mt-1 px-2 py-0.5 text-xs font-medium rounded" style={{ background: c.color, color: "#0b0d12" }}>{c.name}</div>
              </div>
            );
          })}
        </div>

        {/* local brush/eraser size indicator */}
        {tool !== "cursor" && tool !== "text" && !drawingLockedForMe && me && (
          <div className="absolute inset-0 pointer-events-none z-40">
            {(() => {
              const posW = normToWorld(me.x, me.y);
              const posS = worldToScreen(posW.x, posW.y);
              const sizePx = Math.max(1, strokeSize);
              const ringStyle: React.CSSProperties = {
                position: "absolute", left: `${posS.x}px`, top: `${posS.y}px`, width: `${sizePx}px`, height: `${sizePx}px`,
                transform: "translate(-50%, -50%)", borderRadius: "9999px", background: "transparent",
                boxShadow: "0 0 0 1px #fff, 0 0 0 3px rgba(0,0,0,.35)",
                border: `1px solid ${tool === "eraser" ? "rgba(0,0,0,.6)" : strokeColor}`,
              };
              return <div style={ringStyle} />;
            })()}
          </div>
        )}

      </div>
    </div>
  );
}
