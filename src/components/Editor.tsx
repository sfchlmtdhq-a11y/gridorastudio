import { useCallback, useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Type, ImagePlus, Shapes, Smile, Star, Layers, PaintBucket, Undo2, Redo2, ZoomIn, ZoomOut, Maximize,
  Hand, Download, Copy, Trash2, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown, Eye, EyeOff, Lock, Unlock,
  Bold, Italic, AlignLeft, AlignCenter, AlignRight, SlidersHorizontal, X, FlipHorizontal, FlipVertical, Plus, ArrowLeft, CalendarDays, Scan, RotateCcw,
} from "lucide-react";
import { Logo } from "./Logo";
import { getProject, saveProject, type Project } from "@/lib/projects";
import { uploadDesignAsset } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { FontPicker } from "./FontPicker";
import { DEFAULT_ADJUSTMENTS, installDesignAdjustments, type DesignAdjustments } from "@/lib/design-adjustments";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";

type Fab = typeof import("fabric");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Obj = any;
const PROPS = ["name", "selectable", "evented", "lockedLayer", "text3dDepth", "textReflection"];
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
type Tab = "props" | "layers" | "shapes" | "stickers" | "icons" | "bg" | "edit";

export function Editor({ id }: { id: string }) {
  const nav = useNavigate();
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
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

  const W = () => proj.current?.width ?? 1;
  const H = () => proj.current?.height ?? 1;

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
      const onSel = () => { force(); if (c.getActiveObject()) { setTab(current => current === "layers" || current === "edit" ? current : "props"); setPanelOpen(true); } };
      c.on("selection:created", onSel);
      c.on("selection:updated", onSel);
      c.on("selection:cleared", () => force());
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

  const onFile = (file?: File) => {
    if (!file) return;
    void (async () => {
      const f = fab.current;
      if (!f) return;
      const url = await uploadDesignAsset(file, proj.current?.id);
      const img = await f.FabricImage.fromURL(url, { crossOrigin: "anonymous" });
      img.set({ name: "Image" });
      const max = Math.min(W(), H()) * 0.8;
      if (img.width > max || img.height > max) img.scale(max / Math.max(img.width, img.height));
      add(img);
    })().catch(console.error);
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

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      {/* top bar */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-2 sm:px-4">
        <Logo compact />
        <input
          className="min-w-0 max-w-[40vw] rounded-md bg-transparent px-2 py-1 text-sm font-medium outline-none hover:bg-muted focus:bg-muted sm:max-w-xs"
          defaultValue={proj.current?.name}
          key={ready ? "r" : "n"}
          onBlur={(e) => { if (proj.current) { proj.current.name = e.target.value || "Untitled design"; persist(); } }}
        />
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
            className={`workspace absolute inset-0 overflow-auto ${hand ? "cursor-grab active:cursor-grabbing" : ""}`}
          >
            <div className="flex min-h-full min-w-full items-center justify-center p-6" style={{ width: "max-content" }}>
              <div className={`checker shadow-2xl ${hand ? "pointer-events-none" : ""}`}>
                <canvas ref={canvasEl} />
              </div>
            </div>
          </div>
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
        <aside className={`${panelOpen ? "flex" : "hidden"} fixed inset-x-0 ${adding ? "bottom-28" : "bottom-16"} z-40 h-auto max-h-[24vh] flex-col rounded-t-xl border-t border-border bg-card/95 shadow-2xl backdrop-blur md:bottom-0 md:left-20 md:right-0 md:max-h-[22vh] md:rounded-t-xl md:border-l-0 md:border-t md:shadow-2xl`}>
          <div className="flex items-center gap-1 border-b border-border p-2">
            {(["props", "layers", "bg", "edit"] as Tab[]).map((t) => (
              <Button variant="ghost" size="sm" key={t} onClick={() => setTab(t)} className={`px-2 ${tab === t ? "bg-muted text-foreground" : "text-muted-foreground"}`}>
                {t === "props" ? "Properties" : t === "layers" ? "Layers" : t === "edit" ? "Edit" : "Canvas"}
              </Button>
            ))}
            <button className="ml-auto rounded p-1 md:hidden" aria-label="Close panel" onClick={() => setPanelOpen(false)}><X className="h-4 w-4" /></button>
          </div>
          <div className="min-h-0 flex-1 snap-x snap-mandatory overflow-x-scroll overflow-y-hidden scroll-smooth p-4">
            {ready && fab.current && tab === "props" && (o ? <Properties o={o} f={fab.current} commit={commit} actions={{ dup, del, order, toggleLock }} /> : <p className="text-sm text-muted-foreground">Select an element on the canvas to edit it.</p>)}
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
            {ready && fab.current && proj.current && tab === "bg" && <CanvasPanel c={fc.current} f={fab.current} proj={proj.current} commit={commit} resize={(w, hh) => { if (!proj.current) return; proj.current = { ...proj.current, width: w, height: hh }; fit(); commit(); }} />}
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
function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between text-xs text-muted-foreground">
      {label}
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-12 cursor-pointer rounded border border-border bg-transparent" />
    </label>
  );
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
function ShapeProperties({ o, f, set, commit }: { o: Obj; f: Fab; set: (p: Record<string, unknown>) => void; commit: () => void }) {
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
        {typeof o.fill === "string" && <Color label="Fill colour" value={toHex(o.fill, "#c6f432")} onChange={(v) => set({ fill: withAlpha(v, fillAlpha) })} />}
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

function Properties({ o, f, commit, actions }: { o: Obj; f: Fab; commit: () => void; actions: { dup: () => void; del: () => void; order: (k: "up" | "down" | "top" | "bottom") => void; toggleLock: (o: Obj) => void } }) {
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
            <Color label="Colour" value={toHex(o.fill, "#111111")} onChange={(v) => set({ fill: v })} />
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

      {isShape && <ShapeProperties o={o} f={f} set={set} commit={commit} />}

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
            <Color label="Color" value={toHex(o.fill)} onChange={(v) => set({ fill: v })} />
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
function CanvasPanel({ c, f, proj, commit, resize }: { c: Obj; f: Fab; proj: Project; commit: () => void; resize: (w: number, h: number) => void }) {
  const bg = c.backgroundColor;
  const mode = !bg ? "none" : typeof bg === "string" ? "solid" : "gradient";
  const [g, setG] = useState({ a: "#0f172a", b: "#c6f432", angle: 45 });
  const [w, setW] = useState(proj.width);
  const [h, setH] = useState(proj.height);
  const grad = (n: typeof g) => { setG(n); c.backgroundColor = makeGradient(f, n.a, n.b, n.angle, proj.width, proj.height, "pixels"); commit(); };
  return (
    <div>
      <Section title="Background">
        <div className="flex gap-1 text-xs">
          {(["solid", "gradient", "none"] as const).map((m) => (
            <button key={m} className={`flex-1 rounded-md py-1.5 capitalize ${mode === m ? "bg-muted" : "text-muted-foreground"}`}
              onClick={() => { if (m === "solid") c.backgroundColor = "#ffffff"; else if (m === "none") c.backgroundColor = ""; else return grad(g); commit(); }}>
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
