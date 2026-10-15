import { useCallback, useEffect, useReducer, useRef, useState, type ReactNode, type MouseEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Type, ImagePlus, Shapes, Smile, Star, Layers, PaintBucket, Undo2, Redo2, ZoomIn, ZoomOut, Maximize,
  Hand, Download, Copy, Trash2, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown, Eye, EyeOff, Lock, Unlock, Grid2X2,
  Bold, Italic, AlignLeft, AlignCenter, AlignRight, SlidersHorizontal, X, FlipHorizontal, FlipVertical, Plus, ArrowLeft, ArrowRight, CalendarDays, Scan, RotateCcw, Pencil, Sparkles, Send,
} from "lucide-react";
import { Logo } from "./Logo";
import { getProject, saveProject, deleteProject, type Project } from "@/lib/projects";
import { uploadDesignAsset } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { FontPicker } from "./FontPicker";
import { DEFAULT_ADJUSTMENTS, installDesignAdjustments, type DesignAdjustments } from "@/lib/design-adjustments";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { askGeminiDesignAssistant, type GeminiAction } from "@/lib/gemini";

type Fab = typeof import("fabric");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Obj = any;
const PROPS = ["name", "selectable", "evented", "lockedLayer", "text3dDepth", "textReflection", "textCurve"];
const isTextObject = (o: Obj) => ["textbox", "i-text", "text"].includes(o?.type);
const STICKERS = ["😀", "😍", "🔥", "✨", "🎉", "❤️", "👍", "💯", "⭐", "🌟", "🎁", "🎂", "🌈", "☀️", "🌙", "⚡", "🍕", "☕", "🎵", "📸", "🚀", "💎", "👑", "🏆", "🌸", "🍀", "🦋", "🐱", "🎈", "💥", "✅", "📍"];
const ICONS: Record<string, string> = {
  Heart: "M12 21s-7-4.35-9.5-8.5C.5 8.5 3 4 7 4c2 0 3.5 1 5 3 1.5-2 3-3 5-3 4 0 6.5 4.5 4.5 8.5C19 16.65 12 21 12 21z",
  Star: "M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z",
  Bolt: "M13 2L3 14h8l-1 8 10-12h-8z",
  Check: "M20 6L9 17l-5-5 1.5-1.5L9 14l9.5-9.5z",
  Arrow: "M4 11h12.2l-5.6-5.6L12 4l8 8-8 8-1.4-1.4 5.6-5.6H4z",
  Pin: "M12 2a7 7 0 00-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6a2.5 2.5 0 010 5.5z",
  Chat: "M4 4h16a2 2 0 012 2v10a2 2 0 01-2 2H8l-5 4V6a2 2 0 011-2z",
  Phone: "M6.6 10.8a15 15 0 006.6 6.6l2.2-2.2a1 1 0 011-.25 11 11 0 003.6.6 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.6 3.6a1 1 0 01-.25 1z",
  Mail: "M3 5h18v14H3zm2 2v.5l7 4.5 7-4.5V7l-7 4.5z",
  Music: "M9 18V5l12-2v13a3 3 0 11-2-2.8V6.3l-8 1.4V18a3 3 0 11-2-2.8",
  Home: "M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3z",
  Crown: "M2 7l5 4 5-7 5 7 5-4-2 12H4z",
};
type Tab = "props" | "textTools" | "position" | "fill" | "stroke" | "effects" | "layers" | "shapes" | "stickers" | "icons" | "bg" | "edit";

export function Editor({ id }: { id: string }) {
  const nav = useNavigate();
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const backgroundFileRef = useRef<HTMLInputElement>(null);
  const tapRef = useRef<{ target: Obj | null; count: number }>({ target: null, count: 0 });
  const fc = useRef<Obj>(null);
  const fab = useRef<Fab | null>(null);
  const proj = useRef<Project | null>(null);
  const hist = useRef({ stack: [] as string[], i: -1, lock: false });
  const timers = useRef<{ snap?: number; save?: number }>({});
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [ready, setReady] = useState(false);
  const [missing, setMissing] = useState(false);
  const [zoom, setZoomState] = useState(1);
  const zoomRef = useRef(1);
  const [tab, setTab] = useState<Tab>("bg");
  const [panelOpen, setPanelOpen] = useState(false);
  const [hand, setHand] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [saved, setSaved] = useState(true);
  const [adding, setAdding] = useState(false);
  const [transparentOpen, setTransparentOpen] = useState(false);
  const [eraseBusy, setEraseBusy] = useState<string | null>(null);
  const [saveHomeOpen, setSaveHomeOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ file: File; url: string; target: "element" | "background"; width: number; height: number } | null>(null);
  const [fitImportedImage, setFitImportedImage] = useState(true);
  const [useImageAsCanvas, setUseImageAsCanvas] = useState(false);
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [snapAlign, setSnapAlign] = useState(false);
  const snapAlignRef = useRef(false);
  const [alignmentGuide, setAlignmentGuide] = useState<{ axis: "x" | "y"; value: number } | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMessages, setAiMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const askAssistant = useServerFn(askGeminiDesignAssistant);

  const W = () => proj.current?.width ?? 1;
  const H = () => proj.current?.height ?? 1;
  snapAlignRef.current = snapAlign;
  const closeVirtualKeyboard = () => { const element = document.activeElement; if (element instanceof HTMLElement && element !== document.body) element.blur(); };

  const applyZoom = useCallback((z: number) => {
    const c = fc.current;
    if (!c) return;
    z = Math.min(4, Math.max(0.05, z));
    zoomRef.current = z;
    c.setZoom(z);
    c.setDimensions({ width: W() * z, height: H() * z });
    setZoomState(z);
  }, []);

  const fit = useCallback(() => {
    const el = wrapRef.current;
    if (!el || !proj.current) return;
    const z = Math.min((el.clientWidth - 48) / W(), (el.clientHeight - 48) / H());
    applyZoom(z);
  }, [applyZoom]);

  const persist = useCallback(async () => {
    const c = fc.current, p = proj.current;
    if (!c || !p) return;
    const thumb = c.toDataURL({ format: "png", multiplier: 320 / Math.max(W(), H()) / zoomRef.current });
    const bg = c.backgroundColor;
    const next: Project = { ...p, background: typeof bg === "string" ? bg : p.background, json: c.toObject(PROPS), thumb, updatedAt: Date.now() };
    proj.current = next;
    try {
      const savedProject = await saveProject(next);
      proj.current = savedProject;
      setSaved(true);
    } catch (error) {
      console.error(error);
      setSaved(false);
    }
  }, []);

  const scheduleSave = useCallback(() => {
    setSaved(false);
    clearTimeout(timers.current.save);
    timers.current.save = window.setTimeout(() => { void persist(); }, 800);
  }, [persist]);

  const snapshot = useCallback(() => {
    const c = fc.current, h = hist.current;
    if (!c || h.lock) return;
    const s = JSON.stringify(c.toObject(PROPS));
    if (h.stack[h.i] === s) return;
    h.stack = h.stack.slice(0, h.i + 1);
    h.stack.push(s);
    if (h.stack.length > 60) h.stack.shift();
    h.i = h.stack.length - 1;
    force();
  }, []);

  const commit = useCallback(() => {
    fc.current?.requestRenderAll();
    force();
    clearTimeout(timers.current.snap);
    timers.current.snap = window.setTimeout(snapshot, 300);
    scheduleSave();
  }, [snapshot, scheduleSave]);

  const restore = useCallback(async (s: string) => {
    const c = fc.current, h = hist.current;
    h.lock = true;
    await c.loadFromJSON(JSON.parse(s));
    c.requestRenderAll();
    h.lock = false;
    force();
    scheduleSave();
  }, [scheduleSave]);

  const undo = useCallback(() => {
    const h = hist.current;
    if (h.i > 0) { h.i--; const s = h.stack[h.i]; if (s) restore(s); }
  }, [restore]);
  const redo = useCallback(() => {
    const h = hist.current;
    if (h.i < h.stack.length - 1) { h.i++; const s = h.stack[h.i]; if (s) restore(s); }
  }, [restore]);

  // init
  useEffect(() => {
    let disposed = false;
    (async () => {
      const p = await getProject(id);
      if (!p) { setMissing(true); return; }
      proj.current = p;
      const f = await import("fabric");
      if (disposed || !canvasEl.current) return;
      fab.current = f;
      const c = new f.Canvas(canvasEl.current, { preserveObjectStacking: true, backgroundColor: p.background, width: p.width, height: p.height });
      installDesignAdjustments(c);
      fc.current = c;
      if (p.json) {
        hist.current.lock = true;
        await c.loadFromJSON(p.json as object);
        hist.current.lock = false;
      }
      c.requestRenderAll();
      const onChange = () => { if (!hist.current.lock) { snapshot(); scheduleSave(); } force(); };
      c.on("object:modified", onChange);
      c.on("object:added", onChange);
      c.on("object:removed", onChange);
      c.on("text:changed", onChange);
      const onSel = () => { const selected = c.getActiveObject(); if (selected?.type === "image") setTab((current) => current === "fill" ? "position" : current); force(); };
      c.on("selection:created", onSel);
      c.on("selection:updated", onSel);
      c.on("selection:cleared", () => force());
      c.on("object:moving", ({ target }: { target?: Obj }) => {
        if (!snapAlignRef.current || !target || !["textbox", "i-text", "text"].includes(target.type)) return;
        const tolerance = 14 / zoomRef.current, cx = W() / 2, cy = H() / 2;
        const left = target.left ?? 0, top = target.top ?? 0, centerX = left + (target.getScaledWidth?.() ?? 0) / 2, centerY = top + (target.getScaledHeight?.() ?? 0) / 2;
        let guide: { axis: "x" | "y"; value: number } | null = null;
        if (Math.abs(centerX - cx) < tolerance) { target.left = cx - (target.getScaledWidth?.() ?? 0) / 2; guide = { axis: "x", value: cx }; }
        else if (Math.abs(left - 0) < tolerance) { target.left = 0; guide = { axis: "x", value: 0 }; }
        else if (Math.abs((left + (target.getScaledWidth?.() ?? 0)) - W()) < tolerance) { target.left = W() - (target.getScaledWidth?.() ?? 0); guide = { axis: "x", value: W() }; }
        else if (Math.abs(centerY - cy) < tolerance) { target.top = cy - (target.getScaledHeight?.() ?? 0) / 2; guide = { axis: "y", value: cy }; }
        else if (Math.abs(top - 0) < tolerance) { target.top = 0; guide = { axis: "y", value: 0 }; }
        else if (Math.abs((top + (target.getScaledHeight?.() ?? 0)) - H()) < tolerance) { target.top = H() - (target.getScaledHeight?.() ?? 0); guide = { axis: "y", value: H() }; }
        const textObjects = c.getObjects().filter((x: Obj) => x !== target && ["textbox", "i-text", "text"].includes(x.type));
        for (const other of textObjects) {
          if (Math.abs((target.top ?? 0) - (other.top ?? 0)) < tolerance) { target.top = other.top; guide = { axis: "y", value: other.top ?? 0 }; break; }
          if (Math.abs((target.left ?? 0) - (other.left ?? 0)) < tolerance) { target.left = other.left; guide = { axis: "x", value: other.left ?? 0 }; break; }
          if (Math.abs(centerX - ((other.left ?? 0) + (other.getScaledWidth?.() ?? 0) / 2)) < tolerance) { target.left = (other.left ?? 0) + (other.getScaledWidth?.() ?? 0) / 2 - (target.getScaledWidth?.() ?? 0) / 2; guide = { axis: "x", value: (other.left ?? 0) + (other.getScaledWidth?.() ?? 0) / 2 }; break; }
        }
        target.setCoords(); setAlignmentGuide(guide); if (guide) window.setTimeout(() => setAlignmentGuide(null), 200);
      });
      c.on("mouse:down", ({ target }: { target?: Obj }) => {
        if (!target) { tapRef.current = { target: null, count: 0 }; setTab("bg"); setPanelOpen(true); return; }
        if (tapRef.current.target === target) tapRef.current.count += 1;
        else tapRef.current = { target, count: 1 };
        if (tapRef.current.count < 3) closeVirtualKeyboard();
        if (tapRef.current.count === 1 && ["textbox", "i-text", "text"].includes(target.type)) { setPanelOpen(false); }
        setPanelOpen(tapRef.current.count >= 2);
        if (tapRef.current.count >= 2) setTab("props");
        force();
      });
      c.on("mouse:dblclick", ({ target }: { target?: Obj }) => {
        if (target && ["textbox", "i-text", "text"].includes(target.type)) { tapRef.current = { target, count: 2 }; setPanelOpen(true); setTab("props"); target.exitEditing?.(); force(); }
      });
      c.on("mouse:up", ({ target }: { target?: Obj }) => {
        if (target && ["textbox", "i-text", "text"].includes(target.type) && tapRef.current.target === target && tapRef.current.count >= 3) { target.enterEditing?.(); target.selectAll?.(); c.requestRenderAll(); }
      });
      setReady(true);
      requestAnimationFrame(() => { fit(); snapshot(); });
      document.fonts?.ready.then(() => c.requestRenderAll());
    })();
    return () => {
      disposed = true;
      clearTimeout(timers.current.save);
      if (fc.current) { void persist(); fc.current.dispose(); fc.current = null; }
    };
  }, [id, fit, snapshot, scheduleSave, persist]);

  const active = (): Obj => fc.current?.getActiveObject() ?? null;

  const add = (o: Obj) => {
    const c = fc.current;
    o.set({ left: W() / 2, top: H() / 2, originX: "center", originY: "center" });
    o.setCoords();
    c.add(o);
    c.setActiveObject(o);
    c.requestRenderAll();
    setTab("props");
  };

  const addText = () => {
    const f = fab.current;
    if (!f) return;
    add(new f.Textbox("Double-click to edit", { width: W() * 0.6, fontSize: Math.round(Math.min(W(), H()) / 12), fontFamily: "Manrope", fill: "#111111", textAlign: "center", name: "Text" }));
    setPanelOpen(true);
  };

  const addShape = (kind: string) => {
    const f = fab.current;
    if (!f) return;
    const s = Math.min(W(), H()) * 0.3;
    const fill = "#c6f432";
    let o: Obj;
    if (kind === "rect") o = new f.Rect({ width: s, height: s, fill, name: "Rectangle" });
    else if (kind === "rounded") o = new f.Rect({ width: s, height: s * 0.7, rx: s * 0.12, ry: s * 0.12, fill, name: "Rounded rect" });
    else if (kind === "circle") o = new f.Circle({ radius: s / 2, fill, name: "Circle" });
    else if (kind === "ellipse") o = new f.Ellipse({ rx: s / 2, ry: s / 3, fill, name: "Ellipse" });
    else if (kind === "triangle") o = new f.Triangle({ width: s, height: s, fill, name: "Triangle" });
    else if (kind === "line") o = new f.Line([0, 0, s * 1.5, 0], { stroke: "#111111", strokeWidth: Math.max(4, s / 25), name: "Line" });
    else {
      const pts = [];
      const n = kind === "star" ? 10 : kind === "hexagon" ? 6 : 5;
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n - Math.PI / 2;
        const r = kind === "star" && i % 2 ? s / 4.5 : s / 2;
        pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
      }
      o = new f.Polygon(pts, { fill });
      o.set({ name: kind.charAt(0).toUpperCase() + kind.slice(1) });
    }
    add(o);
  };

  const addSticker = (e: string) => {
    const f = fab.current;
    if (!f) return;
    add(new f.FabricText(e, { fontSize: Math.min(W(), H()) / 5, name: "Sticker " + e }));
  };
  const addIcon = (n: string) => {
    const f = fab.current;
    const path = ICONS[n];
    if (!f || !path) return;
    const o = new f.Path(path, { fill: "#111111", name: "Icon " + n });
    o.scaleToWidth(Math.min(W(), H()) * 0.2);
    add(o);
  };

  const previewImage = (file: File | undefined, target: "element" | "background") => {
    if (!file) return;
    const url = URL.createObjectURL(file), image = new Image();
    image.onload = () => { setPendingImage({ file, url, target, width: image.naturalWidth, height: image.naturalHeight }); setCropRect({ x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight }); setUseImageAsCanvas(false); setFitImportedImage(image.naturalWidth > W() || image.naturalHeight > H()); };
    image.src = url;
  };
  const onFile = (file?: File) => previewImage(file, "element");
  const onBackgroundFile = (file?: File) => previewImage(file, "background");
  const importPendingImage = async () => {
    const pending = pendingImage, f = fab.current, c = fc.current;
    if (!pending || !f || !c) return;
    let fileToUpload = pending.file;
    if (cropRect.width > 0 && (cropRect.x !== 0 || cropRect.y !== 0 || cropRect.width !== pending.width || cropRect.height !== pending.height)) {
      const source = new Image(); source.src = pending.url; await new Promise<void>((resolve) => { source.onload = () => resolve(); });
      const cropCanvas = document.createElement("canvas"); cropCanvas.width = cropRect.width; cropCanvas.height = cropRect.height; cropCanvas.getContext("2d")?.drawImage(source, cropRect.x, cropRect.y, cropRect.width, cropRect.height, 0, 0, cropRect.width, cropRect.height);
      const cropBlob = await new Promise<Blob | null>((resolve) => cropCanvas.toBlob(resolve, pending.file.type || "image/png"));
      if (cropBlob) fileToUpload = new File([cropBlob], pending.file.name, { type: pending.file.type || "image/png" });
    }
    if (pending.target === "background" && useImageAsCanvas && proj.current) { proj.current = { ...proj.current, width: cropRect.width, height: cropRect.height }; c.setDimensions({ width: cropRect.width, height: cropRect.height }); }
    const url = await uploadDesignAsset(fileToUpload, proj.current?.id);
    const img = await f.FabricImage.fromURL(url, { crossOrigin: "anonymous" });
    if (pending.target === "element") {
      img.set({ name: "Image" });
      if (fitImportedImage) { const max = Math.min(W(), H()) * 0.8; if (img.width > max || img.height > max) img.scale(max / Math.max(img.width, img.height)); }
      add(img);
    } else {
      const scale = fitImportedImage ? Math.max(W() / Math.max(1, img.width), H() / Math.max(1, img.height)) : 1;
      img.set({ left: 0, top: 0, originX: "left", originY: "top", scaleX: scale, scaleY: scale });
      c.backgroundColor = ""; c.backgroundImage = img; c.requestRenderAll(); commit();
    }
    URL.revokeObjectURL(pending.url); setPendingImage(null);
  };
  const eraseImageBackground = async (mode: "smart" | "auto" | "color", pickedColor?: string, tolerance = 40) => {
    const c = fc.current, f = fab.current, old = active();
    if (!c || !f || !old || old.type !== "image" || eraseBusy) return;
    const source = old.getElement?.() as HTMLImageElement | undefined;
    if (!source?.naturalWidth || !source?.naturalHeight) return;
    setEraseBusy(mode === "smart" ? "Removing background… (first use downloads the engine)" : "Removing background…");
    try {
      const work = document.createElement("canvas"); work.width = source.naturalWidth; work.height = source.naturalHeight;
      const ctx = work.getContext("2d", { willReadFrequently: true }); if (!ctx) return;
      let blob: Blob | null = null;
      if (mode === "smart") {
        ctx.drawImage(source, 0, 0);
        const input = await new Promise<Blob | null>((r) => work.toBlob(r, "image/png"));
        if (!input) return;
        const { removeBackground } = await import("@imgly/background-removal");
        blob = await removeBackground(input, { output: { format: "image/png" } });
      } else {
        ctx.drawImage(source, 0, 0);
        const W = work.width, H = work.height;
        const image = ctx.getImageData(0, 0, W, H), px = image.data;
        // tolerance 0-100 → colour distance; soft band for feathered edges
        const hard = 10 + tolerance * 1.6, soft = hard + 30;
        const dist = (i: number, r: number, g: number, b: number) => Math.hypot((px[i] ?? 0) - r, (px[i + 1] ?? 0) - g, (px[i + 2] ?? 0) - b);
        const alphaFor = (d: number) => d <= hard ? 0 : d >= soft ? 255 : Math.round(((d - hard) / (soft - hard)) * 255);
        if (mode === "color") {
          const hex = (pickedColor ?? "#ffffff").replace("#", "");
          const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
          for (let i = 0; i < px.length; i += 4) px[i + 3] = Math.min(px[i + 3] ?? 255, alphaFor(dist(i, r, g, b)));
        } else {
          // sample the border, average it into a few reference colours
          const border: number[][] = [];
          const step = Math.max(1, Math.floor((W + H) / 200));
          for (let x = 0; x < W; x += step) { border.push([x, 0], [x, H - 1]); }
          for (let y = 0; y < H; y += step) { border.push([0, y], [W - 1, y]); }
          const refs: number[][] = [];
          for (const [x = 0, y = 0] of border) { const i = (y * W + x) * 4; const col = [px[i] ?? 0, px[i + 1] ?? 0, px[i + 2] ?? 0]; if (!refs.some((r) => Math.hypot(r[0]! - col[0]!, r[1]! - col[1]!, r[2]! - col[2]!) < 24)) refs.push(col); if (refs.length > 12) break; }
          const near = (n: number) => { let best = Infinity; for (const r of refs) { const d = dist(n * 4, r[0]!, r[1]!, r[2]!); if (d < best) best = d; } return best; };
          const visited = new Uint8Array(W * H), queue = new Int32Array(W * H); let qe = 0;
          const seed = (n: number) => { if (!visited[n] && near(n) < soft) { visited[n] = 1; queue[qe++] = n; } };
          for (let x = 0; x < W; x++) { seed(x); seed((H - 1) * W + x); }
          for (let y = 0; y < H; y++) { seed(y * W); seed(y * W + W - 1); }
          let qs = 0;
          while (qs < qe) {
            const n = queue[qs++]!; const d = near(n);
            px[n * 4 + 3] = Math.min(px[n * 4 + 3] ?? 255, alphaFor(d));
            if (d > hard) continue; // edge pixel: feather but don't spread past it
            const x = n % W;
            if (x > 0) seed(n - 1); if (x < W - 1) seed(n + 1); if (n >= W) seed(n - W); if (n < W * (H - 1)) seed(n + W);
          }
        }
        ctx.putImageData(image, 0, 0);
        blob = await new Promise<Blob | null>((r) => work.toBlob(r, "image/png"));
      }
      if (!blob) return;
      snapshot();
      const url = await uploadDesignAsset(new File([blob], "background-erased.png", { type: "image/png" }), proj.current?.id);
      const next = await f.FabricImage.fromURL(url, { crossOrigin: "anonymous" });
      next.set({ left: old.left, top: old.top, scaleX: (old.scaleX ?? 1) * (source.naturalWidth / (next.width || source.naturalWidth)), scaleY: (old.scaleY ?? 1) * (source.naturalHeight / (next.height || source.naturalHeight)), angle: old.angle, flipX: old.flipX, flipY: old.flipY, originX: old.originX, originY: old.originY, opacity: old.opacity, clipPath: old.clipPath, name: old.name });
      const idx = c.getObjects().indexOf(old);
      c.remove(old); c.insertAt(Math.max(0, idx), next); c.setActiveObject(next); c.requestRenderAll(); commit();
    } catch (err) {
      console.error(err);
      alert("Couldn't remove the background from this photo. Try the Colour or Edges option instead.");
    } finally {
      setEraseBusy(null);
    }
  };
  const pickColorFromCanvas = async () => {
    const EyeDropperCtor = (window as Window & { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper;
    if (!EyeDropperCtor) return null;
    try { return (await new EyeDropperCtor().open()).sRGBHex; } catch { return null; }
  };
  const maskImage = (shape: "square" | "circle" | "rounded" | "triangle" | "star" | "heart" | "polygon") => {
    const c = fc.current, f = fab.current, o = active();
    if (!c || !f || !o || o.type !== "image") return;
    const w = o.width ?? 1, h = o.height ?? 1;
    if (shape === "square") o.clipPath = undefined;
    if (shape === "circle") o.clipPath = new f.Circle({ radius: Math.min(w, h) / 2, originX: "center", originY: "center" });
    if (shape === "rounded") o.clipPath = new f.Rect({ width: w, height: h, rx: Math.min(w, h) * 0.18, ry: Math.min(w, h) * 0.18, originX: "center", originY: "center" });
    if (shape === "triangle") o.clipPath = new f.Triangle({ width: w, height: h, originX: "center", originY: "center" });
    if (shape === "star" || shape === "polygon") { const n = shape === "star" ? 10 : 6, points = Array.from({ length: n }, (_, i) => { const a = Math.PI * 2 * i / n - Math.PI / 2, r = shape === "star" && i % 2 ? 0.22 : 0.5; return { x: w / 2 + Math.cos(a) * w * r, y: h / 2 + Math.sin(a) * h * r }; }); o.clipPath = new f.Polygon(points, { originX: "center", originY: "center" }); }
    if (shape === "heart") { const heart = new f.Path("M 50 88 C 42 78 10 60 10 35 C 10 12 38 8 50 28 C 62 8 90 12 90 35 C 90 60 58 78 50 88 Z", { originX: "center", originY: "center" }); heart.scaleX = w / 100; heart.scaleY = h / 100; o.clipPath = heart; }
    o.setCoords(); c.requestRenderAll(); commit();
  };

  const del = () => {
    const c = fc.current;
    const objs = c.getActiveObjects();
    if (!objs.length) return;
    c.discardActiveObject();
    c.remove(...objs);
    c.requestRenderAll();
  };
  const dup = async () => {
    const c = fc.current, o = active();
    if (!o) return;
    const cl = await o.clone(PROPS);
    cl.set({ left: o.left + 30, top: o.top + 30 });
    if (cl.type === "activeselection" || cl.type === "activeSelection") {
      cl.canvas = c;
      cl.forEachObject((x: Obj) => c.add(x));
      cl.setCoords();
    } else c.add(cl);
    c.setActiveObject(cl);
    c.requestRenderAll();
  };
  const order = (k: "up" | "down" | "top" | "bottom") => {
    const c = fc.current, o = active();
    if (!o) return;
    if (k === "up") c.bringObjectForward(o);
    if (k === "down") c.sendObjectBackwards(o);
    if (k === "top") c.bringObjectToFront(o);
    if (k === "bottom") c.sendObjectToBack(o);
    c.fire("object:modified", { target: o });
    commit();
  };
  const applyAiAction = async (a: GeminiAction) => {
    const c = fc.current, f = fab.current, o = active();
    if (!c || !f) return;
    if (a.type === "addText") { rememberPaletteColor(a.fill); const text = new f.Textbox(a.text, { width: W() * 0.6, fontSize: a.fontSize ?? Math.round(Math.min(W(), H()) / 12), fill: a.fill ?? "#111111", fontWeight: a.fontWeight ?? "normal", fontFamily: "Manrope", textAlign: "center", name: "AI text" }); add(text); text.set({ left: a.x ?? W() / 2, top: a.y ?? H() / 2 }); text.setCoords(); commit(); return; }
    if (a.type === "addIcon") { rememberPaletteColor(a.fill); addIcon(a.icon); const created = active(); if (created) { created.set({ left: a.x ?? W() / 2, top: a.y ?? H() / 2, fill: a.fill ?? "#111111" }); if (a.scale) { created.scaleX = (created.scaleX ?? 1) * a.scale; created.scaleY = (created.scaleY ?? 1) * a.scale; } created.setCoords(); commit(); } return; }
    if (a.type === "addShape") { rememberPaletteColor(a.fill); rememberPaletteColor(a.stroke); addShape(a.shape); const created = active(); if (created) { created.set({ left: a.x ?? W() / 2, top: a.y ?? H() / 2, fill: a.fill ?? created.fill, stroke: a.stroke ?? created.stroke, strokeWidth: a.strokeWidth ?? created.strokeWidth }); if (a.width) created.scaleToWidth(a.width); if (a.height) created.scaleToHeight(a.height); created.setCoords(); commit(); } return; }
    const editable = o && (isTextObject(o) || ["rect", "circle", "ellipse", "triangle", "polygon", "path", "line"].includes(o.type) && o.type !== "image");
    if (!editable) return;
    if (a.type === "deleteSelected") { del(); return; }
    if (a.type === "duplicateSelected") { await dup(); return; }
    if (a.type === "moveSelected" && o) { o.set({ left: (o.left ?? 0) + a.dx, top: (o.top ?? 0) + a.dy }); o.setCoords(); commit(); return; }
    if (a.type === "setOrder" && o) { order(a.direction === "front" ? "top" : a.direction === "forward" ? "up" : a.direction === "backward" ? "down" : "bottom"); return; }
    if (a.type === "updateSelected" && o) { const next: Record<string, unknown> = {}; if (a.text !== undefined) next.text = a.text; if (a.fill) next.fill = a.fill; if (a.fontSize) next.fontSize = a.fontSize; if (a.fontWeight) next.fontWeight = a.fontWeight; if (a.left !== undefined) next.left = a.left; if (a.top !== undefined) next.top = a.top; if (a.angle !== undefined) next.angle = a.angle; if (a.scale !== undefined) { next.scaleX = a.scale; next.scaleY = a.scale; } if (a.opacity !== undefined) next.opacity = a.opacity; if (a.stroke) next.stroke = a.stroke; if (a.strokeWidth !== undefined) next.strokeWidth = a.strokeWidth; o.set(next); o.setCoords(); commit(); return; }
    if (a.type === "alignSelected" && o) { const w = o.getScaledWidth?.() ?? o.width ?? 0, h = o.getScaledHeight?.() ?? o.height ?? 0; o.set({ left: a.alignment === "left" ? w / 2 : a.alignment === "right" ? W() - w / 2 : W() / 2, top: a.alignment === "top" ? h / 2 : a.alignment === "bottom" ? H() - h / 2 : H() / 2 }); o.setCoords(); commit(); return; }
    if (a.type === "arrange") { const list = c.getObjects().filter((x: Obj) => x !== c.backgroundImage && x.type !== "image"); list.forEach((x: Obj, i: number) => x.set({ left: W() * (i + 1) / (list.length + 1), top: H() / 2 })); c.requestRenderAll(); commit(); }
  };
  const runAssistant = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt || aiBusy || !fc.current) return;
    setAiPrompt(""); setAiMessages((m) => [...m, { role: "user", text: prompt }]); setAiBusy(true);
    try {
      const selected = active();
      const result = await askAssistant({ data: { prompt, canvas: { width: W(), height: H(), background: String(fc.current.backgroundColor ?? ""), selected: selected ? { type: selected.type, text: selected.text, left: selected.left, top: selected.top, width: selected.getScaledWidth?.() ?? selected.width, height: selected.getScaledHeight?.() ?? selected.height, fill: typeof selected.fill === "string" ? selected.fill : undefined } : null, objects: fc.current.getObjects().slice(0, 30).map((x: Obj) => ({ type: x.type, name: x.name, text: x.text, left: x.left, top: x.top, width: x.getScaledWidth?.() ?? x.width, height: x.getScaledHeight?.() ?? x.height })) } } });
      for (const action of result.actions) await applyAiAction(action);
      setAiMessages((m) => [...m, { role: "assistant", text: result.reply }]);
    } catch (error) { setAiMessages((m) => [...m, { role: "assistant", text: error instanceof Error ? error.message : "The assistant could not complete that request." }]); }
    finally { setAiBusy(false); }
  };
  const toggleLock = (o: Obj) => {
    const l = !o.lockedLayer;
    o.set({ lockedLayer: l, selectable: !l, evented: !l });
    if (l && fc.current.getActiveObject() === o) fc.current.discardActiveObject();
    commit();
  };
  const toggleVis = (o: Obj) => {
    o.set({ visible: !o.visible });
    if (!o.visible && fc.current.getActiveObject() === o) fc.current.discardActiveObject();
    commit();
  };

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT") return;
      if (active()?.isEditing) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
      else if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); dup(); }
      else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); del(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // pan (hand tool) + ctrl-wheel zoom
  const drag = useRef<{ x: number; y: number; sl: number; st: number } | null>(null);
  const onWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) applyZoom(zoomRef.current * (e.deltaY < 0 ? 1.1 : 0.9));
  };

  // export
  const exportAs = async (kind: "png" | "tpng" | "jpg" | "pdf") => {
    const c = fc.current;
    setExportOpen(false);
    c.discardActiveObject();
    const prev = c.backgroundColor;
    if (kind === "tpng") c.backgroundColor = "";
    else if (!prev) c.backgroundColor = kind === "png" ? "" : "#ffffff";
    c.renderAll();
    const fmt = kind === "jpg" ? "jpeg" : "png";
    const url = c.toDataURL({ format: fmt, quality: 0.95, multiplier: 1 / zoomRef.current });
    c.backgroundColor = prev;
    c.renderAll();
    const name = (proj.current?.name || "design").replace(/[^\w-]+/g, "_");
    if (kind === "pdf") {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: W() > H() ? "l" : "p", unit: "px", format: [W(), H()], hotfixes: ["px_scaling"] });
      pdf.addImage(url, "PNG", 0, 0, W(), H());
      pdf.save(name + ".pdf");
      return;
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}${kind === "tpng" ? "_transparent" : ""}.${kind === "jpg" ? "jpg" : "png"}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (missing)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">This design could not be found.</p>
        <button className="rounded-lg bg-primary px-4 py-2 text-primary-foreground" onClick={() => nav({ to: "/" })}>Back to dashboard</button>
      </div>
    );

  const o = ready ? active() : null;
  const h = hist.current;
  const objects: Obj[] = ready && fc.current ? [...fc.current.getObjects()].reverse() : [];
  const openTab = (t: Tab) => { setTab(t); setPanelOpen(true); };
  const isTextSelected = !!o && ["textbox", "i-text", "text"].includes(o.type);
  const isImageSelected = !!o && o.type === "image";
  const isElementSelected = !!o;
  const contextualTabs: Tab[] = tab === "layers" ? ["layers"] : tab === "edit" ? ["edit"] : ["shapes", "stickers", "icons"].includes(tab) ? [tab] : isTextSelected ? ["props", "textTools", "position", "fill", "stroke", "effects"] : isImageSelected ? ["props", "position", "stroke", "effects"] : isElementSelected ? ["props", "position", "fill", "stroke", "effects"] : ["bg", "layers", "edit"];
  const tabLabel: Record<Tab, string> = { props: "Properties", textTools: "Text tools", position: "Position", fill: "Fill", stroke: "Stroke", effects: "Effects", layers: "Layers", shapes: "Shapes", stickers: "Stickers", icons: "Icons", bg: "Canvas", edit: "Edit" };
  const tabIcon: Record<Tab, ReactNode> = { props: <SlidersHorizontal />, textTools: <Type />, position: <Scan />, fill: <PaintBucket />, stroke: <SlidersHorizontal />, effects: <Star />, layers: <Layers />, shapes: <Shapes />, stickers: <Smile />, icons: <Star />, bg: <PaintBucket />, edit: <SlidersHorizontal /> };
  const selectionBounds = o?.getBoundingRect?.();
  const canvasBounds = canvasEl.current?.getBoundingClientRect();
  const wrapBounds = wrapRef.current?.getBoundingClientRect();
  const selectionInsideCanvas = !!selectionBounds && !!canvasBounds && selectionBounds.left < canvasBounds.width && selectionBounds.top < canvasBounds.height && selectionBounds.left + selectionBounds.width > 0 && selectionBounds.top + selectionBounds.height > 0;
  const toolbarLeft = selectionBounds && canvasBounds && wrapBounds ? Math.max(8, Math.min(wrapBounds.width - 150, canvasBounds.left - wrapBounds.left + selectionBounds.left + selectionBounds.width / 2 - 75)) : 12;
  const toolbarTop = selectionBounds && canvasBounds && wrapBounds ? Math.max(8, canvasBounds.top - wrapBounds.top + selectionBounds.top - 48) : 12;

  const addDate = () => {
    const f = fab.current;
    if (!f) return;
    add(new f.Textbox(new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }), { width: W() * 0.6, fontSize: Math.round(Math.min(W(), H()) / 18), fontFamily: "Manrope", fill: "#111111", textAlign: "center", name: "Date" }));
    setPanelOpen(true);
  };
  const addTools: { icon: ReactNode; label: string; on: () => void }[] = [
    { icon: <ImagePlus />, label: "Images", on: () => fileRef.current?.click() },
    { icon: <Type />, label: "Text", on: addText },
    { icon: <Shapes />, label: "Shapes", on: () => openTab("shapes") },
    { icon: <Star />, label: "Icons", on: () => openTab("icons") },
    { icon: <CalendarDays />, label: "Date", on: addDate },
  ];
  const mainTools: { icon: ReactNode; label: string; on: () => void }[] = [
    { icon: <Plus />, label: "Add", on: () => { setAdding(true); setPanelOpen(false); } },
    { icon: <Layers />, label: "Layers", on: () => openTab("layers") },
    { icon: <SlidersHorizontal />, label: "Edit", on: () => openTab("edit") },
    { icon: <Scan />, label: "Transparent", on: () => setTransparentOpen(true) },
  ];
  const tools = adding ? addTools : mainTools;
  const backTools = () => { setAdding(false); setPanelOpen(false); };
  const requestHome = (event: MouseEvent<HTMLAnchorElement>) => { event.preventDefault(); setSaveHomeOpen(true); };
  const saveProjectAndHome = async () => { await persist(); setSaveHomeOpen(false); nav({ to: "/" }); };
  const exportAndHome = async (kind: "png" | "jpg" | "pdf") => { await exportAs(kind); setSaveHomeOpen(false); nav({ to: "/" }); };

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      {/* top bar */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-2 sm:px-4">
        <Logo compact onClick={requestHome} />
        <input
          className="min-w-0 max-w-[40vw] rounded-md bg-transparent px-2 py-1 text-sm font-medium outline-none hover:bg-muted focus:bg-muted sm:max-w-xs"
          defaultValue={proj.current?.name}
          key={ready ? "r" : "n"}
          onBlur={(e) => { if (proj.current) { proj.current.name = e.target.value || "Untitled design"; persist(); } }}
        />
        <button title="Smart alignment" aria-label="Smart alignment" onClick={() => setSnapAlign((v) => !v)} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs ${snapAlign ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}><Grid2X2 className="h-4 w-4" /> <span className="hidden sm:inline">Align</span></button>
        <button title="AI design assistant" aria-label="AI design assistant" onClick={() => setAiOpen((v) => !v)} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs ${aiOpen ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}><Sparkles className="h-4 w-4" /><span className="hidden sm:inline">Assistant</span></button>
        <span className="hidden text-xs text-muted-foreground md:inline">{saved ? "Saved" : "Saving…"}</span>
        <div className="ml-auto flex items-center gap-1">
          <IconBtn label="Undo" disabled={h.i <= 0} onClick={undo}><Undo2 /></IconBtn>
          <IconBtn label="Redo" disabled={h.i >= h.stack.length - 1} onClick={redo}><Redo2 /></IconBtn>
          <div className="relative">
            <button onClick={() => setExportOpen((v) => !v)} className="ml-1 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
              <Download className="h-4 w-4" /> <span className="hidden sm:inline">Export</span>
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-11 z-50 w-52 rounded-xl border border-border bg-popover p-1 shadow-xl">
                {([["png", "PNG"], ["tpng", "Transparent PNG"], ["jpg", "JPG"], ["pdf", "PDF"]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => exportAs(k)} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted">{l}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {aiOpen && <section className="fixed inset-x-2 bottom-20 z-50 flex max-h-[65vh] flex-col overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur md:bottom-auto md:left-auto md:right-4 md:top-16 md:w-96"><div className="flex items-center gap-2 border-b border-border p-3"><Sparkles className="h-4 w-4 text-primary" /><h2 className="font-semibold">Design assistant</h2><button className="ml-auto rounded p-1 hover:bg-muted" onClick={() => setAiOpen(false)} aria-label="Close assistant"><X className="h-4 w-4" /></button></div><div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">{aiMessages.length === 0 && <p className="text-xs text-muted-foreground">Ask me to add, edit, move, arrange, or style objects on your canvas.</p>}{aiMessages.map((message, i) => <div key={i} className={`rounded-lg p-2 text-sm ${message.role === "user" ? "ml-5 bg-primary/15" : "mr-5 bg-muted"}`}>{message.text}</div>)}{aiBusy && <p className="text-xs text-muted-foreground">Working on your design…</p>}</div><form className="flex gap-2 border-t border-border p-3" onSubmit={(e) => { e.preventDefault(); void runAssistant(); }}><input className="field min-w-0 flex-1" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Try: add a blue circle" disabled={aiBusy} /><button className="rounded-lg bg-primary p-2 text-primary-foreground disabled:opacity-50" disabled={aiBusy || !aiPrompt.trim()} aria-label="Send command"><Send className="h-4 w-4" /></button></form></section>}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* tool rail desktop */}
        <nav className="hidden w-20 shrink-0 flex-col gap-1 border-r border-border bg-card p-2 md:flex">
          {adding && <Button variant="outline" size="icon" className="mx-auto mb-2 rounded-full" title="Back to tools" aria-label="Back to tools" onClick={backTools}><ArrowLeft /></Button>}
          {tools.map((t) => (
            <Button variant="ghost" disabled={!ready} key={t.label} onClick={t.on} className={`h-16 flex-col gap-1 px-0 text-[10px] [&_svg]:size-5 ${t.label === "Add" ? "text-primary" : "text-muted-foreground"}`}>
              {t.icon}{t.label}
            </Button>
          ))}
        </nav>

        {/* canvas area */}
        <div className="relative min-h-0 min-w-0 flex-1">
          <div
            ref={wrapRef}
            onWheel={onWheel}
            onPointerDown={(e) => { if (hand && wrapRef.current) { drag.current = { x: e.clientX, y: e.clientY, sl: wrapRef.current.scrollLeft, st: wrapRef.current.scrollTop }; } }}
            onPointerMove={(e) => { const d = drag.current; if (d && wrapRef.current) { wrapRef.current.scrollLeft = d.sl - (e.clientX - d.x); wrapRef.current.scrollTop = d.st - (e.clientY - d.y); } }}
            onPointerUp={() => (drag.current = null)}
            onPointerLeave={() => (drag.current = null)}
            className={`workspace absolute inset-x-0 top-0 ${panelOpen ? "bottom-[calc(24vh+4rem)] md:bottom-[22vh]" : "bottom-0"} overflow-auto ${hand ? "cursor-grab active:cursor-grabbing" : ""}`}
          >
            <div className="flex min-h-full min-w-full items-center justify-center p-6" style={{ width: "max-content" }}>
              <div className={`checker shadow-2xl ${hand ? "pointer-events-none" : ""}`}>
                <canvas ref={canvasEl} />
              </div>
            </div>
          </div>
          {o && selectionInsideCanvas && (
            <div className="pointer-events-auto absolute z-30 flex items-center gap-1 rounded-xl border border-border bg-card/95 p-1 shadow-xl backdrop-blur" style={{ left: toolbarLeft, top: toolbarTop }}>
              <IconBtn label="Edit" onClick={() => openTab(["textbox", "i-text", "text"].includes(o.type) ? "textTools" : "props")}><Pencil /></IconBtn>
              <IconBtn label="Copy" onClick={() => { void dup(); }}><Copy /></IconBtn>
              <IconBtn label="Delete" className="text-destructive" onClick={del}><Trash2 /></IconBtn>
            </div>
          )}
          {alignmentGuide && canvasBounds && wrapBounds && <div className="pointer-events-none absolute z-20 bg-primary/70" style={alignmentGuide.axis === "x" ? { left: canvasBounds.left - wrapBounds.left + alignmentGuide.value * zoom - 1, top: canvasBounds.top - wrapBounds.top, height: canvasBounds.height, width: 2 } : { left: canvasBounds.left - wrapBounds.left, top: canvasBounds.top - wrapBounds.top + alignmentGuide.value * zoom - 1, width: canvasBounds.width, height: 2 }} />}
          {/* zoom controls */}
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-card/95 px-2 py-1 shadow-lg backdrop-blur">
            <IconBtn label="Zoom out" onClick={() => applyZoom(zoom / 1.2)}><ZoomOut /></IconBtn>
            <span className="w-12 text-center text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
            <IconBtn label="Zoom in" onClick={() => applyZoom(zoom * 1.2)}><ZoomIn /></IconBtn>
            <IconBtn label="Fit to screen" onClick={fit}><Maximize /></IconBtn>
            <IconBtn label="Pan" active={hand} onClick={() => setHand((v) => !v)}><Hand /></IconBtn>
            {o && <IconBtn label="Edit properties" className="md:hidden" onClick={() => openTab("props")}><SlidersHorizontal /></IconBtn>}
          </div>
        </div>

        {/* side panel */}
        <aside className={`${panelOpen ? "flex" : "hidden"} fixed inset-x-0 ${adding ? "bottom-28" : "bottom-16"} z-40 h-[24vh] max-h-none flex-col rounded-t-xl border-t border-border bg-card/95 shadow-2xl backdrop-blur md:bottom-0 md:left-20 md:right-0 md:h-[22vh] md:rounded-t-xl md:border-l-0 md:border-t md:shadow-2xl`}>
          <div className="flex min-w-0 items-center gap-1 border-b border-border p-2">
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto overscroll-contain whitespace-nowrap">
            {contextualTabs.map((t) => (
              <Button variant="ghost" size="sm" key={t} onClick={() => setTab(t)} className={`shrink-0 px-2 ${tab === t ? "bg-muted text-foreground" : "text-muted-foreground"}`}>
                <span className="inline-flex items-center gap-1 [&_svg]:h-4 [&_svg]:w-4">{tabIcon[t]}{tabLabel[t]}</span>
              </Button>
            ))}
            </div>
            <button className="ml-auto rounded p-1 md:hidden" aria-label="Close panel" onClick={() => setPanelOpen(false)}><X className="h-4 w-4" /></button>
          </div>
          <div className="min-h-0 flex-1 snap-x snap-mandatory overflow-x-scroll overflow-y-auto scroll-smooth p-4">
            {ready && fab.current && tab === "props" && (o ? <Properties o={o} f={fab.current} commit={commit} onPickColor={pickColorFromCanvas} actions={{ dup, del, order, toggleLock }} /> : <p className="text-sm text-muted-foreground">Select an element on the canvas to edit it.</p>)}
            {ready && fab.current && o && ["textTools", "position", "fill", "stroke", "effects"].includes(tab) && <ContextualTools o={o} f={fab.current} mode={tab as EditMode} commit={commit} onEraseBackground={(mode, color, corner) => { void eraseImageBackground(mode, color, corner); }} onPickColor={pickColorFromCanvas} onMaskImage={maskImage} />}
            {ready && tab === "edit" && <DesignEdit c={fc.current} commit={commit} />}
            {ready && tab === "layers" && (
              <div className="space-y-1">
                {objects.length === 0 && <p className="text-sm text-muted-foreground">No layers yet. Add text, images or shapes.</p>}
                {objects.map((x, i) => (
                  <div key={i} className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm ${o === x ? "border-primary bg-primary/10" : "border-border"}`}>
                    <button className="min-w-0 flex-1 truncate text-left" onClick={() => { if (!x.lockedLayer && x.visible) { fc.current.setActiveObject(x); fc.current.requestRenderAll(); force(); } }}>
                      {x.name || x.type}{x.text ? `: ${x.text.slice(0, 18)}` : ""}
                    </button>
                    <IconBtn label={x.visible ? "Hide" : "Show"} onClick={() => toggleVis(x)}>{x.visible ? <Eye /> : <EyeOff />}</IconBtn>
                    <IconBtn label={x.lockedLayer ? "Unlock" : "Lock"} onClick={() => toggleLock(x)}>{x.lockedLayer ? <Lock /> : <Unlock />}</IconBtn>
                  </div>
                ))}
                {o && (
                  <div className="grid grid-cols-4 gap-1 pt-3">
                    <IconBtn label="Bring to front" onClick={() => order("top")}><ChevronsUp /></IconBtn>
                    <IconBtn label="Bring forward" onClick={() => order("up")}><ArrowUp /></IconBtn>
                    <IconBtn label="Send backward" onClick={() => order("down")}><ArrowDown /></IconBtn>
                    <IconBtn label="Send to back" onClick={() => order("bottom")}><ChevronsDown /></IconBtn>
                  </div>
                )}
              </div>
            )}
            {ready && fab.current && proj.current && tab === "bg" && <CanvasPanel c={fc.current} f={fab.current} proj={proj.current} commit={commit} addImage={() => backgroundFileRef.current?.click()} resize={(w, hh) => { if (!proj.current) return; proj.current = { ...proj.current, width: w, height: hh }; fit(); commit(); }} />}
            {ready && tab === "shapes" && (
              <Grid>
                {["rect", "rounded", "circle", "ellipse", "triangle", "pentagon", "hexagon", "star", "line"].map((k) => (
                  <Tile key={k} onClick={() => addShape(k)}><ShapeIcon k={k} /><span className="text-[10px] capitalize">{k}</span></Tile>
                ))}
              </Grid>
            )}
            {ready && tab === "stickers" && (
              <Grid>{STICKERS.map((s) => <Tile key={s} onClick={() => addSticker(s)}><span className="text-3xl">{s}</span></Tile>)}</Grid>
            )}
            {ready && tab === "icons" && (
              <Grid>{Object.keys(ICONS).map((n) => (
                <Tile key={n} onClick={() => addIcon(n)}>
                  <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current"><path d={ICONS[n]} /></svg>
                  <span className="text-[10px]">{n}</span>
                </Tile>
              ))}</Grid>
            )}
          </div>
        </aside>

        {/* tool rail mobile */}
        <div className="shrink-0 border-t border-border bg-card md:hidden">
          {adding && <div className="flex h-12 items-center gap-3 px-4"><Button variant="outline" size="icon" className="h-8 w-8 rounded-full" aria-label="Back to tools" title="Back to tools" onClick={backTools}><ArrowLeft /></Button><span className="text-xs font-semibold text-primary">Add</span></div>}
        <nav aria-label="Design tools" className="flex h-16 items-center justify-around gap-1 px-2">
          {tools.map((t) => (
            <Button variant="ghost" disabled={!ready} key={t.label} onClick={t.on} className={`h-14 min-w-0 flex-1 flex-col gap-1 px-1 text-[10px] [&_svg]:size-5 ${t.label === "Add" ? "text-primary" : "text-muted-foreground"}`}>
              {t.icon}{t.label}
            </Button>
          ))}
        </nav>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={backgroundFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onBackgroundFile(e.target.files?.[0]); e.target.value = ""; }} />
      <AlertDialog open={!!pendingImage} onOpenChange={(open) => { if (!open && pendingImage) { URL.revokeObjectURL(pendingImage.url); setPendingImage(null); } }}>
        <AlertDialogContent className="fixed inset-0 left-0 top-0 flex h-[100svh] max-h-[100dvh] min-h-0 w-[100vw] max-w-none translate-x-0 translate-y-0 flex-col gap-2 overflow-y-auto overscroll-contain rounded-none border-0 bg-background p-3 sm:h-[100dvh] sm:p-8">
          <AlertDialogHeader><AlertDialogTitle>Preview and crop image</AlertDialogTitle><AlertDialogDescription>{pendingImage ? `${cropRect.width} × ${cropRect.height}px crop · original ${pendingImage.width} × ${pendingImage.height}px` : ""}</AlertDialogDescription></AlertDialogHeader>
          {pendingImage && <div className="h-[42svh] min-h-0 shrink-0 overflow-auto rounded-lg border border-border bg-muted p-2 sm:h-auto sm:flex-1"><img src={pendingImage.url} alt="Fullscreen image preview" className="mx-auto h-full max-h-full max-w-full object-contain" /></div>}
          {pendingImage && <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4"><input className="field h-9" type="number" min="0" value={cropRect.x} onChange={(e) => setCropRect({ ...cropRect, x: +e.target.value })} aria-label="Crop left" /><input className="field h-9" type="number" min="0" value={cropRect.y} onChange={(e) => setCropRect({ ...cropRect, y: +e.target.value })} aria-label="Crop top" /><input className="field h-9" type="number" min="1" value={cropRect.width} onChange={(e) => setCropRect({ ...cropRect, width: +e.target.value })} aria-label="Crop width" /><input className="field h-9" type="number" min="1" value={cropRect.height} onChange={(e) => setCropRect({ ...cropRect, height: +e.target.value })} aria-label="Crop height" /></div>}
          {pendingImage && <div className="flex flex-wrap gap-4 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={fitImportedImage} onChange={(e) => setFitImportedImage(e.target.checked)} /> Fit image to current canvas</label>{pendingImage.target === "background" && <label className="flex items-center gap-2"><input type="checkbox" checked={useImageAsCanvas} onChange={(e) => setUseImageAsCanvas(e.target.checked)} /> Use image crop as canvas size</label>}</div>}
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { void importPendingImage(); }}>Confirm import</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={saveHomeOpen} onOpenChange={setSaveHomeOpen}>
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-lg">
          <AlertDialogHeader><AlertDialogTitle>Save this project before leaving?</AlertDialogTitle><AlertDialogDescription>Save it to your Gridora library to keep editing it later, or export a copy to your device. Leaving without saving may lose your latest changes.</AlertDialogDescription></AlertDialogHeader>
          <div className="grid gap-2 sm:grid-cols-2"><Button onClick={() => { void saveProjectAndHome(); }}>Save project</Button><Button variant="outline" onClick={() => { void exportAndHome("png"); }}>Export PNG</Button><Button variant="outline" onClick={() => { void exportAndHome("jpg"); }}>Export JPG</Button><Button variant="outline" onClick={() => { void exportAndHome("pdf"); }}>Export PDF</Button></div>
          <button className="text-center text-xs text-destructive underline" onClick={() => { void deleteProject(id).finally(() => { setSaveHomeOpen(false); nav({ to: "/" }); }); }}>Discard project without saving</button>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={transparentOpen} onOpenChange={setTransparentOpen}>
        <AlertDialogContent className="w-[calc(100%-2rem)] rounded-lg">
          <AlertDialogHeader><AlertDialogTitle>Make the background transparent?</AlertDialogTitle><AlertDialogDescription>This removes the canvas background color or gradient. Your images, text and other layers stay unchanged.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (!fc.current) return; snapshot(); fc.current.backgroundColor = ""; commit(); }}>Make transparent</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------- UI bits ---------- */
function IconBtn({ children, label, onClick, disabled, active, className = "" }: { children: ReactNode; label: string; onClick: () => void; disabled?: boolean; active?: boolean; className?: string }) {
  return (
    <button title={label} aria-label={label} disabled={disabled} onClick={onClick}
      className={`inline-flex items-center justify-center rounded-md p-1.5 transition hover:bg-muted disabled:opacity-30 [&_svg]:h-4 [&_svg]:w-4 ${active ? "bg-primary text-primary-foreground hover:bg-primary" : ""} ${className}`}>
      {children}
    </button>
  );
}
const Grid = ({ children }: { children: ReactNode }) => <div className="grid grid-cols-4 gap-2">{children}</div>;
const Tile = ({ children, onClick }: { children: ReactNode; onClick: () => void }) => (
  <button onClick={onClick} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-border hover:border-primary hover:bg-muted">{children}</button>
);
function ShapeIcon({ k }: { k: string }) {
  const c = "h-7 w-7 fill-primary";
  if (k === "rect") return <svg viewBox="0 0 24 24" className={c}><rect x="3" y="3" width="18" height="18" /></svg>;
  if (k === "rounded") return <svg viewBox="0 0 24 24" className={c}><rect x="2" y="6" width="20" height="13" rx="3" /></svg>;
  if (k === "circle") return <svg viewBox="0 0 24 24" className={c}><circle cx="12" cy="12" r="9" /></svg>;
  if (k === "ellipse") return <svg viewBox="0 0 24 24" className={c}><ellipse cx="12" cy="12" rx="10" ry="6" /></svg>;
  if (k === "triangle") return <svg viewBox="0 0 24 24" className={c}><path d="M12 3l10 18H2z" /></svg>;
  if (k === "pentagon") return <svg viewBox="0 0 24 24" className={c}><path d="M12 2l10 7-4 12H6L2 9z" /></svg>;
  if (k === "hexagon") return <svg viewBox="0 0 24 24" className={c}><path d="M12 2l9 5v10l-9 5-9-5V7z" /></svg>;
  if (k === "star") return <svg viewBox="0 0 24 24" className={c}><path d={ICONS['Star']} /></svg>;
  return <svg viewBox="0 0 24 24" className="h-7 w-7 stroke-primary" strokeWidth="3"><path d="M2 12h20" /></svg>;
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-0 min-w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] shrink-0 snap-start md:min-w-[240px] md:max-w-[280px]">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function Slider({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  return (
    <label className="block text-xs">
      <div className="mb-1 flex justify-between text-muted-foreground"><span>{label}</span><span className="tabular-nums">{Math.round(value * 100) / 100}</span></div>
      <input type="range" className="w-full accent-[var(--primary)]" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
    </label>
  );
}
function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block text-[11px] text-muted-foreground">
      {label}
      <input type="number" className="field mt-1 h-8 px-2 text-xs" value={Math.round(value * 100) / 100} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
function rememberPaletteColor(value: unknown) { if (typeof window === "undefined" || typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value)) return; try { const current = JSON.parse(window.localStorage.getItem("gridora-color-palette") || "[]") as string[]; const colors = [value.toLowerCase(), ...current.filter((x) => x.toLowerCase() !== value.toLowerCase())].slice(0, 24); window.localStorage.setItem("gridora-color-palette", JSON.stringify(colors)); } catch { /* storage can be unavailable */ } }
function Color({ label, value, onChange, onPick }: { label: string; value: string; onChange: (v: string) => void; onPick?: () => Promise<string | null> }) {
  const [draft, setDraft] = useState(value);
  const [palette, setPalette] = useState<string[]>(() => { if (typeof window === "undefined") return []; try { return JSON.parse(window.localStorage.getItem("gridora-color-palette") || "[]") as string[]; } catch { return []; } });
  useEffect(() => setDraft(value), [value]);
  const apply = (next: string) => { if (!/^#[0-9a-f]{6}$/i.test(next)) return; setDraft(next); onChange(next); const colors = [next.toLowerCase(), ...palette.filter((x) => x.toLowerCase() !== next.toLowerCase())].slice(0, 24); setPalette(colors); rememberPaletteColor(next); };
  return <div className="space-y-1 text-xs text-muted-foreground"><div className="flex items-center gap-2"><span className="min-w-0 flex-1">{label}</span><input type="color" value={toHex(draft, "#000000")} onChange={(e) => apply(e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent" /><input className="field h-8 w-24 px-2 text-[11px] uppercase" value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => apply(draft)} placeholder="#000000" aria-label={`${label} hex code`} />{onPick && <button type="button" className="rounded border border-border px-2 py-1.5 text-[11px] hover:bg-muted" onClick={async () => { const picked = await onPick(); if (picked) apply(picked); }}>Pick</button>}</div>{palette.length > 0 && <div className="flex flex-wrap gap-1" aria-label="Saved colours">{palette.map((color) => <button type="button" key={color} title={color} aria-label={`Use saved colour ${color}`} className="h-5 w-5 rounded-full border border-border" style={{ backgroundColor: color }} onClick={() => apply(color)} />)}</div>}</div>;
}
const toHex = (v: unknown, d = "#000000") => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : d);
const alphaOf = (v: unknown) => {
  if (typeof v !== "string") return 1;
  const match = v.match(/^rgba?\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)$/i);
  return match ? Number(match[1]) : 1;
};
const withAlpha = (v: unknown, alpha: number) => {
  const hex = toHex(v);
  const n = hex.slice(1);
  return `rgba(${parseInt(n.slice(0, 2), 16)},${parseInt(n.slice(2, 4), 16)},${parseInt(n.slice(4, 6), 16)},${alpha})`;
};

function makeGradient(f: Fab, a: string, b: string, angle: number, w = 1, h = 1, units: "percentage" | "pixels" = "percentage") {
  const r = (angle * Math.PI) / 180;
  const cx = w / 2, cy = h / 2, dx = (Math.cos(r) * w) / 2, dy = (Math.sin(r) * h) / 2;
  return new f.Gradient({ type: "linear", gradientUnits: units, coords: { x1: cx - dx, y1: cy - dy, x2: cx + dx, y2: cy + dy }, colorStops: [{ offset: 0, color: a }, { offset: 1, color: b }] });
}

/* ---------- Properties ---------- */
function ShapeProperties({ o, f, set, commit, onPickColor }: { o: Obj; f: Fab; set: (p: Record<string, unknown>) => void; commit: () => void; onPickColor?: () => Promise<string | null> }) {
  const isRect = o instanceof f.Rect;
  const width = Math.max(1, o.getScaledWidth?.() ?? o.width ?? 1);
  const height = Math.max(1, o.getScaledHeight?.() ?? o.height ?? 1);
  const fillAlpha = alphaOf(o.fill);
  const strokeAlpha = alphaOf(o.stroke);
  const setSize = (key: "width" | "height", value: number) => {
    const base = key === "width" ? Math.max(1, o.width ?? 1) : Math.max(1, o.height ?? 1);
    set({ [key === "width" ? "scaleX" : "scaleY"]: Math.max(0.05, value / base) });
  };
  const setFillGradient = () => set({ fill: makeGradient(f, "#c6f432", "#ffffff", 0) });
  const setStrokeGradient = () => set({ stroke: makeGradient(f, "#111111", "#c6f432", 0) });
  return (
    <>
      <Section title="Shape size & radius">
        {isRect && <Slider label="Radius (%)" value={Math.round(((o.rx ?? 0) / Math.max(1, (o.width ?? width))) * 100)} min={0} max={50} onChange={(v) => set({ rx: ((o.width ?? width) * v) / 100, ry: ((o.height ?? height) * v) / 100 })} />}
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Width" value={width} onChange={(v) => setSize("width", v)} />
          <NumberField label="Height" value={height} onChange={(v) => setSize("height", v)} />
        </div>
      </Section>

      <Section title="Fill">
        <Slider label="Opacity (%)" value={Math.round(fillAlpha * 100)} min={0} max={100} onChange={(v) => set({ fill: withAlpha(o.fill, v / 100) })} />
        <div className="flex gap-1 text-xs">
          <button className={`flex-1 rounded-md py-1.5 ${typeof o.fill === "string" ? "bg-muted" : "border border-border"}`} onClick={() => set({ fill: toHex(o.fill, "#c6f432") })}>Colour</button>
          <button className={`flex-1 rounded-md py-1.5 ${typeof o.fill === "object" ? "bg-muted" : "border border-border"}`} onClick={setFillGradient}>Gradient</button>
        </div>
        {typeof o.fill === "string" && <Color label="Fill colour" value={toHex(o.fill, "#c6f432")} onChange={(v) => set({ fill: withAlpha(v, fillAlpha) })} onPick={onPickColor} />}
      </Section>

      <Section title="Stroke">
        <Slider label="Stroke width" value={o.strokeWidth ?? 0} min={0} max={100} onChange={(v) => set({ strokeWidth: v })} />
        <Slider label="Stroke opacity (%)" value={Math.round(strokeAlpha * 100)} min={0} max={100} onChange={(v) => set({ stroke: withAlpha(o.stroke, v / 100) })} />
        <div className="flex gap-1 text-xs">
          <button className={`flex-1 rounded-md py-1.5 ${typeof o.stroke === "string" ? "bg-muted" : "border border-border"}`} onClick={() => set({ stroke: toHex(o.stroke, "#111111") })}>Colour</button>
          <button className={`flex-1 rounded-md py-1.5 ${typeof o.stroke === "object" ? "bg-muted" : "border border-border"}`} onClick={setStrokeGradient}>Gradient</button>
        </div>
        {typeof o.stroke === "string" && <Color label="Stroke colour" value={toHex(o.stroke, "#111111")} onChange={(v) => set({ stroke: withAlpha(v, strokeAlpha) })} />}
      </Section>
    </>
  );
}

function Properties({ o, f, commit, onPickColor, actions, mode = "general" }: { o: Obj; f: Fab; commit: () => void; onPickColor?: () => Promise<string | null>; mode?: "general" | "legacy"; actions: { dup: () => void; del: () => void; order: (k: "up" | "down" | "top" | "bottom") => void; toggleLock: (o: Obj) => void } }) {
  const set = (p: Record<string, unknown>) => { o.set(p); o.setCoords(); commit(); };
  const isText = o instanceof f.IText || o instanceof f.Textbox || o instanceof f.FabricText;
  const isImg = o instanceof f.FabricImage;
  const isShape = !isText && !isImg;
  const isLine = o instanceof f.Line;
  const text3dDepth = Number(o.text3dDepth ?? 0);
  const textReflection = !!o.textReflection;
  const gradFill = o.fill && typeof o.fill === "object";
  const stops = gradFill ? o.fill.colorStops : null;
  const [g, setG] = useState({ a: stops?.[0]?.color ?? "#ff4d6d", b: stops?.[1]?.color ?? "#ffb703", angle: 0 });
  const sh = o.shadow;
  const shadowSet = (p: Partial<{ color: string; blur: number; offsetX: number; offsetY: number }>) => {
    const cur = { color: sh?.color ?? "#000000", blur: sh?.blur ?? 10, offsetX: sh?.offsetX ?? 5, offsetY: sh?.offsetY ?? 5 };
    set({ shadow: new f.Shadow({ ...cur, ...p }) });
  };
  if (mode === "general") return (
    <div className="flex min-w-[calc(100vw-2rem)] items-start gap-2 md:min-w-[240px]">
      <IconBtn label="Copy" onClick={actions.dup}><Copy /></IconBtn>
      <IconBtn label="Bring forward" onClick={() => actions.order("up")}><ArrowUp /></IconBtn>
      <IconBtn label="Send backward" onClick={() => actions.order("down")}><ArrowDown /></IconBtn>
      <IconBtn label="Lock" onClick={() => actions.toggleLock(o)}><Lock /></IconBtn>
      <IconBtn label="Delete" className="text-destructive" onClick={actions.del}><Trash2 /></IconBtn>
    </div>
  );

  return (
    <div className="flex min-w-max items-start gap-4 pb-2">
      <div className="grid min-w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] shrink-0 snap-start grid-cols-6 gap-1 md:min-w-[240px] md:max-w-[280px]">
        <IconBtn label="Duplicate" onClick={actions.dup}><Copy /></IconBtn>
        <IconBtn label="Bring forward" onClick={() => actions.order("up")}><ArrowUp /></IconBtn>
        <IconBtn label="Send backward" onClick={() => actions.order("down")}><ArrowDown /></IconBtn>
        <IconBtn label="Flip horizontal" onClick={() => set({ flipX: !o.flipX })}><FlipHorizontal /></IconBtn>
        <IconBtn label="Lock" onClick={() => actions.toggleLock(o)}><Lock /></IconBtn>
        <IconBtn label="Delete" className="text-destructive" onClick={actions.del}><Trash2 /></IconBtn>
      </div>

      {isText && (
        <>
          <Section title="Text tools">
            <div className="grid grid-cols-2 gap-2">
              <button className="rounded-md bg-primary px-2 py-2 text-xs font-semibold text-primary-foreground" onClick={() => { (o as Obj).enterEditing?.(); (o as Obj).selectAll?.(); o.canvas?.requestRenderAll(); }}>Edit text</button>
              <button className="rounded-md border border-border px-2 py-2 text-xs hover:bg-muted" onClick={actions.dup}>Copy</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className="rounded-md border border-border px-2 py-2 text-xs hover:bg-muted" onClick={actions.del}>Delete</button>
              <button className="rounded-md border border-border px-2 py-2 text-xs hover:bg-muted" onClick={() => set({ backgroundColor: o.backgroundColor ? "" : "#fff3a3" })}>Background</button>
            </div>
          </Section>

          <Section title="Position">
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="X" value={o.left ?? 0} onChange={(v) => set({ left: v })} />
              <NumberField label="Y" value={o.top ?? 0} onChange={(v) => set({ top: v })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="Relative X %" value={((o.left ?? 0) / Math.max(1, o.canvas?.getWidth?.() ?? 1)) * 100} onChange={(v) => set({ left: (v / 100) * (o.canvas?.getWidth?.() ?? 1) })} />
              <NumberField label="Relative Y %" value={((o.top ?? 0) / Math.max(1, o.canvas?.getHeight?.() ?? 1)) * 100} onChange={(v) => set({ top: (v / 100) * (o.canvas?.getHeight?.() ?? 1) })} />
            </div>
          </Section>

          <Section title="Size & padding">
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="Width" value={o.getScaledWidth?.() ?? o.width ?? 0} onChange={(v) => set({ scaleX: Math.max(0.05, v / Math.max(1, o.width ?? 1)) })} />
              <NumberField label="Height" value={o.getScaledHeight?.() ?? o.height ?? 0} onChange={(v) => set({ scaleY: Math.max(0.05, v / Math.max(1, o.height ?? 1)) })} />
            </div>
            <NumberField label="Padding" value={o.padding ?? 0} onChange={(v) => set({ padding: Math.max(0, v) })} />
          </Section>

          {o instanceof f.Textbox && (
            <textarea className="field min-h-[60px]" value={o.text} onChange={(e) => set({ text: e.target.value })} />
          )}
          <Section title="Font & style">
            <FontPicker value={o.fontFamily} onChange={v => { set({ fontFamily: v }); document.fonts?.load(`40px "${v}"`).then(() => { o.set({ fontFamily: v }); o.initDimensions?.(); commit(); }); }} />
            <Slider label="Font size" value={o.fontSize} min={6} max={600} onChange={(v) => set({ fontSize: v })} />
            <div className="flex flex-wrap gap-1">
              <IconBtn label="Bold" active={o.fontWeight === "bold"} onClick={() => set({ fontWeight: o.fontWeight === "bold" ? "normal" : "bold" })}><Bold /></IconBtn>
              <IconBtn label="Italic" active={o.fontStyle === "italic"} onClick={() => set({ fontStyle: o.fontStyle === "italic" ? "normal" : "italic" })}><Italic /></IconBtn>
              <button className={`rounded-md px-2 text-xs ${o.underline ? "bg-muted" : "hover:bg-muted"}`} onClick={() => set({ underline: !o.underline })}>Underline</button>
              <button className={`rounded-md px-2 text-xs ${o.linethrough ? "bg-muted" : "hover:bg-muted"}`} onClick={() => set({ linethrough: !o.linethrough })}>Strike</button>
            </div>
            <div className="flex gap-1">
              <IconBtn label="Align left" active={o.textAlign === "left"} onClick={() => set({ textAlign: "left" })}><AlignLeft /></IconBtn>
              <IconBtn label="Align center" active={o.textAlign === "center"} onClick={() => set({ textAlign: "center" })}><AlignCenter /></IconBtn>
              <IconBtn label="Align right" active={o.textAlign === "right"} onClick={() => set({ textAlign: "right" })}><AlignRight /></IconBtn>
            </div>
            <Slider label="Letter spacing" value={o.charSpacing ?? 0} min={-200} max={1000} onChange={(v) => set({ charSpacing: v })} />
            <Slider label="Line height" value={o.lineHeight ?? 1.16} min={0.5} max={3} step={0.05} onChange={(v) => set({ lineHeight: v })} />
          </Section>

          <Section title="Colour & texture">
            <Color label="Colour" value={toHex(o.fill, "#111111")} onChange={(v) => set({ fill: v })} onPick={onPickColor} />
            <div className="flex gap-1 text-xs">
              <button className="flex-1 rounded-md bg-muted py-1.5">Solid</button>
              <button className="flex-1 rounded-md border border-border py-1.5" onClick={() => set({ fill: makeGradient(f, toHex(o.fill, "#c6f432"), "#ffffff", 0) })}>Texture / gradient</button>
            </div>
          </Section>

          <Section title="3D text & reflection">
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={text3dDepth > 0} onChange={(e) => { const depth = e.target.checked ? 10 : 0; set({ text3dDepth: depth, shadow: e.target.checked ? new f.Shadow({ color: "rgba(0,0,0,0.35)", blur: 0, offsetX: depth, offsetY: depth }) : null }); }} />
              3D text
            </label>
            {text3dDepth > 0 && <Slider label="Depth" value={text3dDepth} min={1} max={40} onChange={(v) => set({ text3dDepth: v, shadow: new f.Shadow({ color: "rgba(0,0,0,0.35)", blur: 0, offsetX: v, offsetY: v }) })} />}
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={textReflection} onChange={(e) => set({ textReflection: e.target.checked })} />
              Reflection
            </label>
            {textReflection && <p className="text-[11px] text-muted-foreground">Reflection is saved with this text layer.</p>}
          </Section>
        </>
      )}

      {isShape && <ShapeProperties o={o} f={f} set={set} commit={commit} onPickColor={onPickColor} />}

      {!isImg && !isShape && (
        <Section title={isLine ? "Line color" : "Fill"}>
          {!isLine && (
            <div className="flex gap-1 text-xs">
              <button className={`flex-1 rounded-md py-1.5 ${!gradFill ? "bg-muted" : "text-muted-foreground"}`} onClick={() => set({ fill: g.a })}>Solid</button>
              <button className={`flex-1 rounded-md py-1.5 ${gradFill ? "bg-muted" : "text-muted-foreground"}`} onClick={() => set({ fill: makeGradient(f, g.a, g.b, g.angle) })}>Gradient</button>
            </div>
          )}
          {isLine ? (
            <Color label="Color" value={toHex(o.stroke)} onChange={(v) => set({ stroke: v })} />
          ) : gradFill ? (
            <>
              <Color label="Start" value={toHex(g.a)} onChange={(v) => { const n = { ...g, a: v }; setG(n); set({ fill: makeGradient(f, n.a, n.b, n.angle) }); }} />
              <Color label="End" value={toHex(g.b)} onChange={(v) => { const n = { ...g, b: v }; setG(n); set({ fill: makeGradient(f, n.a, n.b, n.angle) }); }} />
              <Slider label="Angle" value={g.angle} min={0} max={360} onChange={(v) => { const n = { ...g, angle: v }; setG(n); set({ fill: makeGradient(f, n.a, n.b, n.angle) }); }} />
            </>
          ) : (
            <Color label="Color" value={toHex(o.fill)} onChange={(v) => set({ fill: v })} onPick={onPickColor} />
          )}
        </Section>
      )}

      {isImg && <ImageCrop o={o} set={set} />}

      <Section title={isLine ? "Thickness" : "Outline"}>
        {!isLine && <Color label="Outline color" value={toHex(o.stroke, "#000000")} onChange={(v) => set({ stroke: v, strokeWidth: o.strokeWidth || 2 })} />}
        <Slider label="Width" value={o.strokeWidth ?? 0} min={0} max={isLine ? 100 : 40} onChange={(v) => set({ strokeWidth: v, stroke: o.stroke || "#000000", paintFirst: isText ? "stroke" : "fill" })} />
      </Section>

      <Section title="Shadow">
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={!!sh} onChange={(e) => (e.target.checked ? shadowSet({}) : set({ shadow: null }))} /> Enable shadow
        </label>
        {sh && (
          <>
            <Color label="Color" value={toHex(sh.color)} onChange={(v) => shadowSet({ color: v })} />
            <Slider label="Blur" value={sh.blur} min={0} max={100} onChange={(v) => shadowSet({ blur: v })} />
            <Slider label="Offset X" value={sh.offsetX} min={-100} max={100} onChange={(v) => shadowSet({ offsetX: v })} />
            <Slider label="Offset Y" value={sh.offsetY} min={-100} max={100} onChange={(v) => shadowSet({ offsetY: v })} />
          </>
        )}
      </Section>

      <Section title="Transform">
        <Slider label="Rotation" value={Math.round(o.angle ?? 0)} min={-180} max={180} onChange={(v) => { o.rotate(v); commit(); }} />
        <Slider label="Scale" value={o.scaleX ?? 1} min={0.05} max={5} step={0.01} onChange={(v) => set({ scaleX: v, scaleY: v * ((o.scaleY ?? 1) / (o.scaleX || 1)) })} />
        <Slider label="Opacity" value={o.opacity ?? 1} min={0} max={1} step={0.01} onChange={(v) => set({ opacity: v })} />
        <div className="flex gap-1">
          <IconBtn label="Flip horizontal" onClick={() => set({ flipX: !o.flipX })}><FlipHorizontal /></IconBtn>
          <IconBtn label="Flip vertical" onClick={() => set({ flipY: !o.flipY })}><FlipVertical /></IconBtn>
        </div>
      </Section>
    </div>
  );
}

type EditMode = "textTools" | "position" | "fill" | "stroke" | "effects";
function ContextualTools({ o, f, mode, commit, onEraseBackground, onPickColor, onMaskImage }: { o: Obj; f: Fab; mode: EditMode; commit: () => void; onEraseBackground: (mode: "auto" | "color", color?: string, corner?: "top-left" | "top-right" | "bottom-left" | "bottom-right") => void; onPickColor: () => Promise<string | null>; onMaskImage: (shape: "square" | "circle" | "rounded" | "triangle" | "star" | "heart" | "polygon") => void }) {
  const set = (p: Record<string, unknown>) => { o.set(p); o.setCoords(); commit(); };
  const isText = o.type === "textbox" || o.type === "i-text" || o.type === "text";
  const fillAlpha = alphaOf(o.fill), strokeAlpha = alphaOf(o.stroke);
  const shadow = o.shadow;
  const [eraseColor, setEraseColor] = useState("#ffffff");
  const [eraseMode, setEraseMode] = useState<"auto" | "color">("auto");
  const [eraseCorner, setEraseCorner] = useState<"top-left" | "top-right" | "bottom-left" | "bottom-right">("top-left");
  const nudgeTimer = useRef<number | undefined>(undefined);
  const nudge = (dx: number, dy: number) => set({ left: (o.left ?? 0) + dx, top: (o.top ?? 0) + dy });
  const startNudge = (dx: number, dy: number) => { nudge(dx, dy); window.clearTimeout(nudgeTimer.current); nudgeTimer.current = window.setTimeout(() => { nudgeTimer.current = window.setInterval(() => nudge(dx * 5, dy * 5), 140); }, 1000); };
  const stopNudge = () => { window.clearTimeout(nudgeTimer.current); window.clearInterval(nudgeTimer.current); nudgeTimer.current = undefined; };
  const setCurve = (amount: number) => { o.textCurve = amount; if (amount === 0) o.path = undefined; else o.path = new f.Path(`M 0 0 Q ${(o.width ?? 200) / 2} ${-amount} ${o.width ?? 200} 0`, { fill: "" }); commit(); };
  const shadowSet = (p: Partial<{ color: string; blur: number; offsetX: number; offsetY: number }>) => set({ shadow: new f.Shadow({ color: shadow?.color ?? "#000000", blur: shadow?.blur ?? 10, offsetX: shadow?.offsetX ?? 5, offsetY: shadow?.offsetY ?? 5, ...p }) });
  if (mode === "textTools") return <Section title="Text tools">
    {o.type === "textbox" && <textarea className="field min-h-[56px]" value={o.text ?? ""} onChange={(e) => set({ text: e.target.value })} />}
    <FontPicker value={o.fontFamily ?? "Manrope"} onChange={(v) => { set({ fontFamily: v }); document.fonts?.load(`40px "${v}"`).then(() => { o.set({ fontFamily: v }); o.initDimensions?.(); commit(); }); }} />
    <Slider label="Font size" value={o.fontSize ?? 24} min={6} max={600} onChange={(v) => set({ fontSize: v })} />
    <Color label="Colour" value={toHex(o.fill, "#111111")} onChange={(v) => set({ fill: v })} onPick={onPickColor} />
    <Slider label="Text curve" value={Number(o.textCurve ?? 0)} min={-160} max={160} onChange={setCurve} />
    <div className="flex flex-wrap gap-1">
      <IconBtn label="Bold" active={o.fontWeight === "bold"} onClick={() => set({ fontWeight: o.fontWeight === "bold" ? "normal" : "bold" })}><Bold /></IconBtn>
      <IconBtn label="Italic" active={o.fontStyle === "italic"} onClick={() => set({ fontStyle: o.fontStyle === "italic" ? "normal" : "italic" })}><Italic /></IconBtn>
      <button className="rounded-md border border-border px-2 py-1 text-xs" onClick={() => set({ underline: !o.underline })}>Underline</button>
      <IconBtn label="Align left" onClick={() => set({ textAlign: "left" })}><AlignLeft /></IconBtn><IconBtn label="Align center" onClick={() => set({ textAlign: "center" })}><AlignCenter /></IconBtn><IconBtn label="Align right" onClick={() => set({ textAlign: "right" })}><AlignRight /></IconBtn>
    </div>
  </Section>;
  if (mode === "position") return <Section title="Position & size">
    <div className="mx-auto grid w-28 grid-cols-3 gap-1"><span /><button className="rounded border border-border p-2" onPointerDown={() => startNudge(0, -1)} onPointerUp={stopNudge} onPointerCancel={stopNudge} onPointerLeave={stopNudge}><ArrowUp className="mx-auto h-4 w-4" /></button><span /><button className="rounded border border-border p-2" onPointerDown={() => startNudge(-1, 0)} onPointerUp={stopNudge} onPointerCancel={stopNudge} onPointerLeave={stopNudge}><ArrowLeft className="mx-auto h-4 w-4" /></button><span className="flex items-center justify-center text-[10px] text-muted-foreground">1px</span><button className="rounded border border-border p-2" onPointerDown={() => startNudge(1, 0)} onPointerUp={stopNudge} onPointerCancel={stopNudge} onPointerLeave={stopNudge}><ArrowRight className="mx-auto h-4 w-4" /></button><span /><button className="rounded border border-border p-2" onPointerDown={() => startNudge(0, 1)} onPointerUp={stopNudge} onPointerCancel={stopNudge} onPointerLeave={stopNudge}><ArrowDown className="mx-auto h-4 w-4" /></button><span /></div>
    <div className="grid grid-cols-2 gap-2"><NumberField label="X" value={o.left ?? 0} onChange={(v) => set({ left: v })} /><NumberField label="Y" value={o.top ?? 0} onChange={(v) => set({ top: v })} /></div>
    <div className="grid grid-cols-2 gap-2"><NumberField label="Width" value={o.getScaledWidth?.() ?? o.width ?? 0} onChange={(v) => set({ scaleX: v / Math.max(1, o.width ?? 1) })} /><NumberField label="Height" value={o.getScaledHeight?.() ?? o.height ?? 0} onChange={(v) => set({ scaleY: v / Math.max(1, o.height ?? 1) })} /></div>
    {isText && <NumberField label="Padding" value={o.padding ?? 0} onChange={(v) => set({ padding: v })} />}
    <Slider label="Rotation" value={o.angle ?? 0} min={-180} max={180} onChange={(v) => set({ angle: v })} /><Slider label="Opacity (%)" value={(o.opacity ?? 1) * 100} min={0} max={100} onChange={(v) => set({ opacity: v / 100 })} />
  </Section>;
  if (mode === "fill") return <Section title="Fill">
    <Slider label="Opacity (%)" value={fillAlpha * 100} min={0} max={100} onChange={(v) => set({ fill: withAlpha(o.fill, v / 100) })} />
    <div className="flex gap-1 text-xs"><button className="flex-1 rounded-md bg-muted py-1.5" onClick={() => set({ fill: toHex(o.fill, "#c6f432") })}>Colour</button><button className="flex-1 rounded-md border border-border py-1.5" onClick={() => set({ fill: makeGradient(f, "#c6f432", "#ffffff", 0) })}>Gradient</button></div>
    {typeof o.fill === "string" && <Color label="Fill colour" value={toHex(o.fill, "#c6f432")} onChange={(v) => set({ fill: withAlpha(v, fillAlpha) })} onPick={onPickColor} />}
  </Section>;
  if (mode === "stroke") return <Section title="Stroke">
    <Slider label="Width" value={o.strokeWidth ?? 0} min={0} max={100} onChange={(v) => set({ strokeWidth: v, stroke: o.stroke ?? "#111111" })} /><Slider label="Opacity (%)" value={strokeAlpha * 100} min={0} max={100} onChange={(v) => set({ stroke: withAlpha(o.stroke, v / 100) })} />
    <div className="flex gap-1 text-xs"><button className="flex-1 rounded-md bg-muted py-1.5" onClick={() => set({ stroke: toHex(o.stroke, "#111111") })}>Colour</button><button className="flex-1 rounded-md border border-border py-1.5" onClick={() => set({ stroke: makeGradient(f, "#111111", "#c6f432", 0) })}>Gradient</button></div>
    {typeof o.stroke === "string" && <Color label="Stroke colour" value={toHex(o.stroke, "#111111")} onChange={(v) => set({ stroke: withAlpha(v, strokeAlpha) })} onPick={onPickColor} />}
  </Section>;
  return <Section title="Effects">
    {o.type === "image" && <><div className="flex gap-1 text-xs"><button className={`flex-1 rounded-md py-1.5 ${eraseMode === "auto" ? "bg-primary text-primary-foreground" : "border border-border"}`} onClick={() => setEraseMode("auto")}>Auto remove</button><button className={`flex-1 rounded-md py-1.5 ${eraseMode === "color" ? "bg-primary text-primary-foreground" : "border border-border"}`} onClick={() => setEraseMode("color")}>Solid colour</button></div>{eraseMode === "auto" ? <button className="w-full rounded-md border border-border py-2 text-xs hover:bg-muted" onClick={() => onEraseBackground("auto")}>Automatically remove background</button> : <div className="flex items-center gap-2"><input type="color" value={eraseColor} onChange={(e) => setEraseColor(e.target.value)} className="h-8 w-10 rounded border border-border" /><span className="text-[11px] text-muted-foreground">Choose a solid background colour</span><button className="rounded-md border border-border px-2 py-2 text-xs hover:bg-muted" onClick={() => onEraseBackground("color", eraseColor)}>Erase</button></div>}<div className="grid grid-cols-4 gap-1"><button className="rounded-md border border-border px-1 py-1 text-[11px]" onClick={() => onMaskImage("square")}>Square</button><button className="rounded-md border border-border px-1 py-1 text-[11px]" onClick={() => onMaskImage("circle")}>Circle</button><button className="rounded-md border border-border px-1 py-1 text-[11px]" onClick={() => onMaskImage("rounded")}>Rounded</button><button className="rounded-md border border-border px-1 py-1 text-[11px]" onClick={() => onMaskImage("triangle")}>Triangle</button><button className="rounded-md border border-border px-1 py-1 text-[11px]" onClick={() => onMaskImage("star")}>Star</button><button className="rounded-md border border-border px-1 py-1 text-[11px]" onClick={() => onMaskImage("heart")}>Heart</button><button className="rounded-md border border-border px-1 py-1 text-[11px]" onClick={() => onMaskImage("polygon")}>Polygon</button></div></>}
    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!shadow} onChange={(e) => e.target.checked ? shadowSet({}) : set({ shadow: null })} /> Shadow</label>
    {shadow && <><Color label="Shadow colour" value={toHex(shadow.color)} onChange={(v) => shadowSet({ color: v })} /><Slider label="Blur" value={shadow.blur} min={0} max={100} onChange={(v) => shadowSet({ blur: v })} /></>}
    {isText && <><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={Number(o.text3dDepth ?? 0) > 0} onChange={(e) => { const depth = e.target.checked ? 10 : 0; set({ text3dDepth: depth, shadow: e.target.checked ? new f.Shadow({ color: "rgba(0,0,0,0.4)", blur: 0, offsetX: depth, offsetY: depth }) : null }); }} /> 3D text</label>{Number(o.text3dDepth ?? 0) > 0 && <Slider label="3D depth" value={Number(o.text3dDepth)} min={1} max={40} onChange={(v) => set({ text3dDepth: v, shadow: new f.Shadow({ color: "rgba(0,0,0,0.4)", blur: 0, offsetX: v, offsetY: v }) })} />}<label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!o.textReflection} onChange={(e) => set({ textReflection: e.target.checked })} /> Reflection</label></>}
  </Section>;
}

function DesignEdit({ c, commit }: { c: Obj; commit: () => void }) {
  const a: DesignAdjustments = c.designAdjustments;
  const set = (key: keyof DesignAdjustments, value: number) => { c.designAdjustments = { ...a, [key]: value }; commit(); };
  return <Section title="Whole design">
    <Slider label="Saturation" value={a.saturation} min={-100} max={100} onChange={v => set("saturation", v)} />
    <Slider label="Contrast" value={a.contrast} min={-100} max={100} onChange={v => set("contrast", v)} />
    <Slider label="Brightness" value={a.brightness} min={-100} max={100} onChange={v => set("brightness", v)} />
    <Slider label="Blur" value={a.blur} min={0} max={30} step={0.5} onChange={v => set("blur", v)} />
    <Slider label="Grain" value={a.grain} min={0} max={100} onChange={v => set("grain", v)} />
    <Slider label="Warmth" value={a.warmth} min={0} max={100} onChange={v => set("warmth", v)} />
    <Button variant="outline" className="mt-3 w-full" onClick={() => { c.designAdjustments = { ...DEFAULT_ADJUSTMENTS }; commit(); }}><RotateCcw /> Reset adjustments</Button>
  </Section>;
}

function ImageCrop({ o, set }: { o: Obj; set: (p: Record<string, unknown>) => void }) {
  const el = o.getElement();
  const ow = el.naturalWidth || el.width, oh = el.naturalHeight || el.height;
  const l = o.cropX || 0, t = o.cropY || 0;
  const r = Math.max(0, ow - l - o.width), b = Math.max(0, oh - t - o.height);
  const apply = (nl: number, nt: number, nr: number, nb: number) => {
    const w = Math.max(10, ow - nl - nr), h = Math.max(10, oh - nt - nb);
    set({ cropX: Math.min(nl, ow - 10), cropY: Math.min(nt, oh - 10), width: w, height: h });
  };
  return (
    <Section title="Crop image">
      <Slider label="Left" value={l} min={0} max={ow - 10} onChange={(v) => apply(v, t, Math.min(r, ow - v - 10), b)} />
      <Slider label="Right" value={r} min={0} max={ow - 10} onChange={(v) => apply(Math.min(l, ow - v - 10), t, v, b)} />
      <Slider label="Top" value={t} min={0} max={oh - 10} onChange={(v) => apply(l, v, r, Math.min(b, oh - v - 10))} />
      <Slider label="Bottom" value={b} min={0} max={oh - 10} onChange={(v) => apply(l, Math.min(t, oh - v - 10), r, v)} />
      <button className="w-full rounded-md border border-border py-1.5 text-xs hover:bg-muted" onClick={() => apply(0, 0, 0, 0)}>Reset crop</button>
    </Section>
  );
}

/* ---------- Canvas panel ---------- */
function CanvasPanel({ c, f, proj, commit, addImage, resize }: { c: Obj; f: Fab; proj: Project; commit: () => void; addImage: () => void; resize: (w: number, h: number) => void }) {
  const bg = c.backgroundColor;
  const bgImage = c.backgroundImage;
  const mode = !bg ? "none" : typeof bg === "string" ? "solid" : "gradient";
  const [g, setG] = useState({ a: "#0f172a", b: "#c6f432", angle: 45 });
  const [w, setW] = useState(proj.width);
  const [h, setH] = useState(proj.height);
  const grad = (n: typeof g) => { setG(n); c.backgroundColor = makeGradient(f, n.a, n.b, n.angle, proj.width, proj.height, "pixels"); commit(); };
  return (
    <div>
      <Section title="Background">
        <div className="flex items-center gap-2 rounded-lg border border-border p-2">
          {bgImage ? <img className="h-10 w-10 rounded object-cover" src={bgImage.getElement?.()?.src} alt="Current background" /> : <span className="h-10 w-10 rounded border border-border" style={{ background: typeof bg === "string" && bg ? bg : "#ffffff" }} />}
          <div className="min-w-0 flex-1"><p className="text-xs font-medium">Current background</p><p className="truncate text-[11px] text-muted-foreground">{bgImage ? "Image" : mode === "none" ? "White / transparent" : mode}</p></div>
          <button className="rounded-md border border-border px-2 py-1 text-xs text-destructive hover:bg-muted" onClick={() => { c.backgroundImage = undefined; c.backgroundColor = "#ffffff"; commit(); }}>Delete</button>
        </div>
        <button className="flex w-full items-center justify-center gap-2 rounded-md border border-border py-2 text-xs hover:bg-muted" onClick={addImage}><ImagePlus className="h-4 w-4" /> Add background image</button>
        <div className="flex gap-1 text-xs">
          {(["solid", "gradient", "none"] as const).map((m) => (
            <button key={m} className={`flex-1 rounded-md py-1.5 capitalize ${mode === m ? "bg-muted" : "text-muted-foreground"}`}
              onClick={() => { c.backgroundImage = undefined; if (m === "solid") c.backgroundColor = "#ffffff"; else if (m === "none") c.backgroundColor = ""; else return grad(g); commit(); }}>
              {m === "none" ? "Transparent" : m}
            </button>
          ))}
        </div>
        {mode === "solid" && <Color label="Color" value={toHex(bg, "#ffffff")} onChange={(v) => { c.backgroundColor = v; commit(); }} />}
        {mode === "gradient" && (
          <>
            <Color label="Start" value={g.a} onChange={(v) => grad({ ...g, a: v })} />
            <Color label="End" value={g.b} onChange={(v) => grad({ ...g, b: v })} />
            <Slider label="Angle" value={g.angle} min={0} max={360} onChange={(v) => grad({ ...g, angle: v })} />
          </>
        )}
      </Section>
      <Section title="Canvas size">
        <div className="grid grid-cols-2 gap-2">
          <input type="number" className="field" value={w} onChange={(e) => setW(+e.target.value)} aria-label="Width" />
          <input type="number" className="field" value={h} onChange={(e) => setH(+e.target.value)} aria-label="Height" />
        </div>
        <button className="w-full rounded-md bg-secondary py-2 text-xs font-medium hover:opacity-90" onClick={() => resize(Math.min(5000, Math.max(50, w)), Math.min(5000, Math.max(50, h)))}>Apply size</button>
      </Section>
    </div>
  );
}
