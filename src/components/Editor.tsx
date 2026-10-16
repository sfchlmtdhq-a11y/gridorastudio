import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Type,
  ImagePlus,
  Shapes,
  Smile,
  Star,
  Layers,
  PaintBucket,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Hand,
  Download,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Grid2X2,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  SlidersHorizontal,
  X,
  FlipHorizontal,
  FlipVertical,
  Plus,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Scan,
  RotateCcw,
  Pencil,
  Sparkles,
  Send,
  Group as GroupIcon,
  Ungroup,
  Frame,
  Grid3X3,
  Paintbrush,
  Heading,
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  FolderOpen,
  WandSparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Logo } from "./Logo";
import { getProject, listProjects, saveProject, deleteProject, type Project } from "@/lib/projects";
import { uploadDesignAsset } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { FontPicker } from "./FontPicker";
import {
  DEFAULT_ADJUSTMENTS,
  installDesignAdjustments,
  type DesignAdjustments,
} from "@/lib/design-adjustments";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { askGeminiDesignAssistant, type GeminiAction } from "@/lib/gemini";
import {
  calculateSmartAlignment,
  measureNearestDistances,
  measureSelectionDistances,
  type Bounds,
  type DistanceMarker,
  type SmartGuide,
} from "@/lib/smart-guides";
import { translateVectorPoints, vectorPathData, type VectorPoint } from "@/lib/vector-paths";

type Fab = typeof import("fabric");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Obj = any;
const PROPS = [
  "name",
  "selectable",
  "evented",
  "lockedLayer",
  "text3dDepth",
  "textReflection",
  "textCurve",
  "gridoraPoints",
  "gridoraClosed",
];
const isTextObject = (o: Obj) => ["textbox", "i-text", "text"].includes(o?.type);
const boundsOf = (object: Obj): Bounds | null => {
  const bounds = object?.getBoundingRect?.();
  if (!bounds || ![bounds.left, bounds.top, bounds.width, bounds.height].every(Number.isFinite))
    return null;
  return { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height };
};
const STICKERS = [
  "😀",
  "😍",
  "🔥",
  "✨",
  "🎉",
  "❤️",
  "👍",
  "💯",
  "⭐",
  "🌟",
  "🎁",
  "🎂",
  "🌈",
  "☀️",
  "🌙",
  "⚡",
  "🍕",
  "☕",
  "🎵",
  "📸",
  "🚀",
  "💎",
  "👑",
  "🏆",
  "🌸",
  "🍀",
  "🦋",
  "🐱",
  "🎈",
  "💥",
  "✅",
  "📍",
];
const ICONS: Record<string, string> = {
  Heart:
    "M12 21s-7-4.35-9.5-8.5C.5 8.5 3 4 7 4c2 0 3.5 1 5 3 1.5-2 3-3 5-3 4 0 6.5 4.5 4.5 8.5C19 16.65 12 21 12 21z",
  Star: "M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z",
  Bolt: "M13 2L3 14h8l-1 8 10-12h-8z",
  Check: "M20 6L9 17l-5-5 1.5-1.5L9 14l9.5-9.5z",
  Arrow: "M4 11h12.2l-5.6-5.6L12 4l8 8-8 8-1.4-1.4 5.6-5.6H4z",
  Pin: "M12 2a7 7 0 00-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6a2.5 2.5 0 010 5.5z",
  Chat: "M4 4h16a2 2 0 012 2v10a2 2 0 01-2 2H8l-5 4V6a2 2 0 011-2z",
  Phone:
    "M6.6 10.8a15 15 0 006.6 6.6l2.2-2.2a1 1 0 011-.25 11 11 0 003.6.6 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.6 3.6a1 1 0 01-.25 1z",
  Mail: "M3 5h18v14H3zm2 2v.5l7 4.5 7-4.5V7l-7 4.5z",
  Music: "M9 18V5l12-2v13a3 3 0 11-2-2.8V6.3l-8 1.4V18a3 3 0 11-2-2.8",
  Home: "M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3z",
  Crown: "M2 7l5 4 5-7 5 7 5-4-2 12H4z",
};
type Tab =
  | "add"
  | "props"
  | "textTools"
  | "textPresets"
  | "position"
  | "fill"
  | "stroke"
  | "effects"
  | "layers"
  | "shapes"
  | "stickers"
  | "icons"
  | "frames"
  | "grids"
  | "decorations"
  | "bg"
  | "edit"
  | "colors"
  | "draw"
  | "vector";
type DrawingTool = "pen" | "freehand" | "brush" | "eraser" | "line" | "highlighter" | null;
type Guide = { axis: "x" | "y"; value: number };
type AiProposal = {
  prompt: string;
  reply: string;
  actions: GeminiAction[];
  status: "suggested" | "preview";
};
const describeAiAction = (action: GeminiAction) => {
  switch (action.type) {
    case "addText":
      return `Add text: “${action.text}”`;
    case "addIcon":
      return `Add a ${action.icon.toLowerCase()} icon`;
    case "addShape":
      return `Add a ${action.shape} shape`;
    case "updateSelected": {
      const properties = Object.keys(action).filter(
        (key) => !["type", "targetIndex", "targetName"].includes(key),
      );
      return `Adjust ${action.targetName || (action.targetIndex !== undefined ? `object ${action.targetIndex + 1}` : "selected object")}: ${properties.join(", ") || "style"}`;
    }
    case "deleteSelected":
      return `Remove ${action.targetName || (action.targetIndex !== undefined ? `object ${action.targetIndex + 1}` : "the selected object")}`;
    case "duplicateSelected":
      return `Duplicate ${action.targetName || (action.targetIndex !== undefined ? `object ${action.targetIndex + 1}` : "the selected object")}`;
    case "moveSelected":
      return `Move ${action.targetName || (action.targetIndex !== undefined ? `object ${action.targetIndex + 1}` : "the selected object")}`;
    case "setOrder":
      return `Move ${action.targetName || (action.targetIndex !== undefined ? `object ${action.targetIndex + 1}` : "the selected object")} ${action.direction}`;
    case "alignSelected":
      return `Align ${action.targetName || (action.targetIndex !== undefined ? `object ${action.targetIndex + 1}` : "the selected object")} ${action.alignment}`;
    case "arrange":
      return `Arrange objects ${action.alignment ?? "horizontally"}`;
    case "setBackground":
      return "Change the canvas background";
  }
};

export function Editor({ id }: { id: string }) {
  const nav = useNavigate();
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelContentRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const backgroundFileRef = useRef<HTMLInputElement>(null);
  const vectorFileRef = useRef<HTMLInputElement>(null);
  const vectorActionsRef = useRef<{ finish: (closed?: boolean) => void; undo: () => void } | null>(
    null,
  );
  const vectorDraftRef = useRef<VectorPoint[]>([]);
  const tapRef = useRef<{ target: Obj | null; count: number }>({ target: null, count: 0 });
  const fc = useRef<Obj>(null);
  const fab = useRef<Fab | null>(null);
  const objectClipboard = useRef<Obj>(null);
  const proj = useRef<Project | null>(null);
  const hist = useRef({ stack: [] as string[], i: -1, lock: false });
  const aiPreviewActive = useRef(false);
  const aiPreviewBefore = useRef<string | null>(null);
  const timers = useRef<{ snap?: number; save?: number }>({});
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [ready, setReady] = useState(false);
  const [missing, setMissing] = useState(false);
  const [zoom, setZoomState] = useState(1);
  const zoomRef = useRef(1);
  const preferredZoomRef = useRef(1);
  const [tab, setTab] = useState<Tab>("bg");
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [hand, setHand] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [saved, setSaved] = useState(true);
  const [eraseBusy, setEraseBusy] = useState<string | null>(null);
  const [saveHomeOpen, setSaveHomeOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState<{
    file: File;
    url: string;
    target: "element" | "background";
    width: number;
    height: number;
  } | null>(null);
  const [fitImportedImage, setFitImportedImage] = useState(true);
  const [useImageAsCanvas, setUseImageAsCanvas] = useState(false);
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [snapAlign, setSnapAlign] = useState(true);
  const snapAlignRef = useRef(true);
  const [showGrid, setShowGrid] = useState(false);
  const showGridRef = useRef(false);
  const [gridSpacing, setGridSpacing] = useState(20);
  const gridSpacingRef = useRef(20);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const snapToGridRef = useRef(false);
  const [showRulers, setShowRulers] = useState(false);
  const [guides, setGuides] = useState<Guide[]>([]);
  const guidesRef = useRef<Guide[]>([]);
  const [drawingTool, setDrawingTool] = useState<DrawingTool>(null);
  const [vectorMode, setVectorMode] = useState(false);
  const [vectorDraft, setVectorDraft] = useState<VectorPoint[]>([]);
  const [vectorClosed, setVectorClosed] = useState(false);
  const [vectorColor, setVectorColor] = useState("#111111");
  const [vectorWidth, setVectorWidth] = useState(4);
  const [vectorStrokeStyle, setVectorStrokeStyle] = useState<"solid" | "dashed" | "dotted">(
    "solid",
  );
  const [vectorFill, setVectorFill] = useState("#c6f432");
  const [vectorPointIndex, setVectorPointIndex] = useState(0);
  const [drawColor, setDrawColor] = useState("#111111");
  const [brushSize, setBrushSize] = useState(6);
  const [strokeStyle, setStrokeStyle] = useState<"solid" | "dashed" | "dotted">("solid");
  const [clearOpen, setClearOpen] = useState(false);
  const [alignmentGuides, setAlignmentGuides] = useState<SmartGuide[]>([]);
  const [distanceMarkers, setDistanceMarkers] = useState<DistanceMarker[]>([]);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMessages, setAiMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>(
    [],
  );
  const [aiProposal, setAiProposal] = useState<AiProposal | null>(null);
  const aiPanelRef = useRef<HTMLElement | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const askAssistant = useServerFn(askGeminiDesignAssistant);

  useEffect(() => {
    if (aiProposal?.status !== "preview") return;
    const panel = aiPanelRef.current;
    if (!panel) return;
    panel.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const controls = panel.querySelectorAll<HTMLElement>(
        "button:not(:disabled), input:not(:disabled)",
      );
      const first = controls.item(0);
      const last = controls.item(controls.length - 1);
      if (!first || !last) return;
      if (!panel.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === panel)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trapFocus, true);
    return () => document.removeEventListener("keydown", trapFocus, true);
  }, [aiProposal?.status]);

  const W = () => proj.current?.width ?? 1;
  const H = () => proj.current?.height ?? 1;
  snapAlignRef.current = snapAlign;
  showGridRef.current = showGrid;
  gridSpacingRef.current = gridSpacing;
  snapToGridRef.current = snapToGrid;
  guidesRef.current = guides;
  useEffect(() => {
    const panel = panelContentRef.current;
    if (!panel || !panelOpen) return;
    panel.scrollLeft = 0;
    panel.scrollTop = 0;
  }, [tab, panelOpen]);
  const closeVirtualKeyboard = () => {
    const element = document.activeElement;
    if (element instanceof HTMLElement && element !== document.body) element.blur();
  };

  const applyZoom = useCallback((z: number, remember = true) => {
    const c = fc.current;
    if (!c) return;
    z = Math.min(4, Math.max(0.05, z));
    zoomRef.current = z;
    if (remember) preferredZoomRef.current = z;
    c.setZoom(z);
    c.setDimensions({ width: W() * z, height: H() * z });
    setZoomState(z);
  }, []);

  const fit = useCallback(() => {
    const el = wrapRef.current;
    if (!el || !proj.current) return;
    const z = Math.min((el.clientWidth - 48) / W(), (el.clientHeight - 48) / H());
    preferredZoomRef.current = z;
    applyZoom(z, false);
  }, [applyZoom]);

  const resizeCanvasViewport = useCallback(() => {
    const el = wrapRef.current;
    if (!el || !proj.current || !fc.current) return;
    const fitScale = Math.min((el.clientWidth - 48) / W(), (el.clientHeight - 48) / H());
    const nextZoom = Math.min(preferredZoomRef.current, fitScale);
    applyZoom(nextZoom, false);
    requestAnimationFrame(() => {
      const c = fc.current,
        canvas = canvasEl.current,
        workspace = wrapRef.current;
      if (!c || !canvas || !workspace) return;
      const selected = c.getActiveObject();
      if (!selected) {
        workspace.scrollLeft = Math.max(0, (canvas.offsetWidth - workspace.clientWidth) / 2);
        workspace.scrollTop = Math.max(0, (canvas.offsetHeight - workspace.clientHeight) / 2);
        return;
      }
      const bounds = selected.getBoundingRect?.();
      const canvasRect = canvas.getBoundingClientRect(),
        workspaceRect = workspace.getBoundingClientRect();
      if (!bounds) return;
      const targetX = canvasRect.left + (bounds.left + bounds.width / 2) * zoomRef.current;
      const targetY = canvasRect.top + (bounds.top + bounds.height / 2) * zoomRef.current;
      workspace.scrollLeft += targetX - (workspaceRect.left + workspace.clientWidth / 2);
      workspace.scrollTop += targetY - (workspaceRect.top + workspace.clientHeight / 2);
    });
  }, [applyZoom]);

  useEffect(() => {
    if (!ready) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(resizeCanvasViewport);
    };
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    update();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [ready, panelOpen, panelExpanded, resizeCanvasViewport]);

  const persist = useCallback(async () => {
    const c = fc.current,
      p = proj.current;
    if (!c || !p) return;
    const thumb = c.toDataURL({
      format: "png",
      multiplier: 320 / Math.max(W(), H()) / zoomRef.current,
    });
    const bg = c.backgroundColor;
    const next: Project = {
      ...p,
      background: typeof bg === "string" ? bg : p.background,
      json: c.toObject(PROPS),
      thumb,
      updatedAt: Date.now(),
    };
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
    timers.current.save = window.setTimeout(() => {
      void persist();
    }, 800);
  }, [persist]);

  const snapshot = useCallback(() => {
    const c = fc.current,
      h = hist.current;
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
    if (aiPreviewActive.current) return;
    clearTimeout(timers.current.snap);
    timers.current.snap = window.setTimeout(snapshot, 300);
    scheduleSave();
  }, [snapshot, scheduleSave]);

  const restore = useCallback(
    async (s: string) => {
      const c = fc.current,
        h = hist.current;
      h.lock = true;
      await c.loadFromJSON(JSON.parse(s));
      c.requestRenderAll();
      h.lock = false;
      force();
      scheduleSave();
    },
    [scheduleSave],
  );

  const undo = useCallback(() => {
    const h = hist.current;
    if (aiPreviewActive.current) return;
    if (h.i > 0) {
      h.i--;
      const s = h.stack[h.i];
      if (s) restore(s);
    }
  }, [restore]);
  const redo = useCallback(() => {
    const h = hist.current;
    if (aiPreviewActive.current) return;
    if (h.i < h.stack.length - 1) {
      h.i++;
      const s = h.stack[h.i];
      if (s) restore(s);
    }
  }, [restore]);

  // init
  useEffect(() => {
    let disposed = false;
    (async () => {
      const p = await getProject(id);
      if (!p) {
        setMissing(true);
        return;
      }
      proj.current = p;
      const f = await import("fabric");
      if (disposed || !canvasEl.current) return;
      fab.current = f;
      const c = new f.Canvas(canvasEl.current, {
        preserveObjectStacking: true,
        backgroundColor: p.background,
        width: p.width,
        height: p.height,
      });
      installDesignAdjustments(c);
      fc.current = c;
      if (p.json) {
        hist.current.lock = true;
        await c.loadFromJSON(p.json as object);
        hist.current.lock = false;
      }
      c.requestRenderAll();
      const onChange = () => {
        if (!hist.current.lock) {
          snapshot();
          scheduleSave();
        }
        force();
      };
      c.on("object:modified", () => {
        setAlignmentGuides([]);
        setDistanceMarkers([]);
        onChange();
      });
      c.on("object:added", onChange);
      c.on("object:removed", onChange);
      c.on("text:changed", onChange);
      const onSel = () => {
        const selected = c.getActiveObject();
        if (selected?.type === "image")
          setTab((current) => (current === "fill" ? "position" : current));
        setAlignmentGuides([]);
        setDistanceMarkers([]);
        force();
      };
      c.on("selection:created", onSel);
      c.on("selection:updated", onSel);
      c.on("selection:cleared", () => force());
      c.on("object:moving", ({ target }: { target?: Obj }) => {
        if (!target) return;
        target.setCoords();
        const movingBounds = boundsOf(target);
        if (!movingBounds) return;
        const isMultiObject = target.type === "activeselection" || target.type === "group";
        const members: Obj[] = isMultiObject ? (target.getObjects?.() ?? []) : [target];
        const memberSet = new Set([target, ...members]);
        const peerObjects = c
          .getObjects()
          .filter((object: Obj) => !memberSet.has(object) && object.visible !== false);
        const peerBounds = peerObjects
          .map(boundsOf)
          .filter((bounds): bounds is Bounds => bounds !== null);
        const alignment = calculateSmartAlignment(movingBounds, {
          canvasWidth: W(),
          canvasHeight: H(),
          objects: peerBounds,
          manualGuides: guidesRef.current,
          tolerance: 10 / zoomRef.current,
          snapEnabled: snapAlignRef.current,
          gridSpacing: gridSpacingRef.current,
          snapToGrid: snapToGridRef.current,
        });
        if (alignment.dx || alignment.dy)
          target.set({
            left: (target.left ?? 0) + alignment.dx,
            top: (target.top ?? 0) + alignment.dy,
          });
        target.setCoords();
        if (isMultiObject) for (const member of members) member.setCoords?.();
        setAlignmentGuides(alignment.guides);

        const movedBounds = boundsOf(target) ?? {
          ...movingBounds,
          left: movingBounds.left + alignment.dx,
          top: movingBounds.top + alignment.dy,
        };
        const memberBounds = members
          .map(boundsOf)
          .filter((bounds): bounds is Bounds => bounds !== null);
        const markers = [
          ...measureNearestDistances(movedBounds, peerBounds),
          ...(isMultiObject ? measureSelectionDistances(memberBounds) : []),
        ];
        const nearest = (orientation: DistanceMarker["orientation"]) =>
          markers
            .filter((marker) => marker.orientation === orientation)
            .sort((a, b) => a.distance - b.distance)[0];
        setDistanceMarkers(
          [nearest("horizontal"), nearest("vertical")].filter(
            (marker): marker is DistanceMarker => marker !== undefined,
          ),
        );
      });
      c.on("mouse:down", ({ target }: { target?: Obj }) => {
        if (!target) {
          tapRef.current = { target: null, count: 0 };
          setTab("bg");
          setPanelOpen(true);
          return;
        }
        if (tapRef.current.target === target) tapRef.current.count += 1;
        else tapRef.current = { target, count: 1 };
        if (tapRef.current.count < 3) closeVirtualKeyboard();
        if (tapRef.current.count === 1 && ["textbox", "i-text", "text"].includes(target.type)) {
          setPanelOpen(false);
        }
        setPanelOpen(tapRef.current.count >= 2);
        if (tapRef.current.count >= 2) setTab("props");
        force();
      });
      c.on("mouse:dblclick", ({ target }: { target?: Obj }) => {
        if (target && ["textbox", "i-text", "text"].includes(target.type)) {
          tapRef.current = { target, count: 2 };
          setPanelOpen(true);
          setTab("props");
          target.exitEditing?.();
          force();
        }
      });
      c.on("mouse:up", ({ target }: { target?: Obj }) => {
        setAlignmentGuides([]);
        setDistanceMarkers([]);
        if (
          target &&
          ["textbox", "i-text", "text"].includes(target.type) &&
          tapRef.current.target === target &&
          tapRef.current.count >= 3
        ) {
          target.enterEditing?.();
          target.selectAll?.();
          c.requestRenderAll();
        }
      });
      setReady(true);
      requestAnimationFrame(() => {
        fit();
        snapshot();
      });
      document.fonts?.ready.then(() => c.requestRenderAll());
    })();
    return () => {
      disposed = true;
      clearTimeout(timers.current.save);
      if (fc.current) {
        void persist();
        fc.current.dispose();
        fc.current = null;
      }
    };
  }, [id, fit, snapshot, scheduleSave, persist]);

  useEffect(() => {
    const c = fc.current,
      f = fab.current;
    if (!ready || !c || !f) return;
    const dash =
      strokeStyle === "dashed"
        ? [brushSize * 2, brushSize]
        : strokeStyle === "dotted"
          ? [1, brushSize * 1.6]
          : undefined;
    c.isDrawingMode = ["pen", "freehand", "brush", "eraser", "highlighter"].includes(
      drawingTool ?? "",
    );
    c.selection = !drawingTool;
    c.skipTargetFind = !!drawingTool;
    c.defaultCursor = drawingTool ? "crosshair" : "default";
    let line: Obj | null = null;
    const onLineDown = (event: Obj) => {
      if (drawingTool !== "line" || !event.scenePoint) return;
      const { x, y } = event.scenePoint;
      line = new f.Line([x, y, x, y], {
        stroke: drawColor,
        strokeWidth: brushSize,
        strokeDashArray: dash ?? null,
        selectable: false,
        evented: false,
        name: "Line",
      });
      c.add(line);
    };
    const onLineMove = (event: Obj) => {
      if (!line || !event.scenePoint) return;
      line.set({ x2: event.scenePoint.x, y2: event.scenePoint.y });
      line.setCoords();
      c.requestRenderAll();
    };
    const onLineUp = () => {
      if (!line) return;
      const finished = line;
      line = null;
      finished.set({ selectable: true, evented: true });
      c.setActiveObject(finished);
      commit();
    };
    const onPathCreated = (event: { path?: Obj }) => {
      if (drawingTool === "eraser" && event.path)
        event.path.set({ globalCompositeOperation: "destination-out", name: "Eraser stroke" });
      if (event.path && drawingTool === "highlighter")
        event.path.set({ name: "Highlighter stroke" });
      commit();
    };
    if (c.isDrawingMode) {
      const brush = new f.PencilBrush(c);
      brush.color =
        drawingTool === "eraser"
          ? "#ffffff"
          : drawingTool === "highlighter"
            ? withAlpha(drawColor, 0.38)
            : drawColor;
      brush.width = drawingTool === "brush" ? brushSize * 1.8 : brushSize;
      brush.strokeLineCap = drawingTool === "highlighter" ? "square" : "round";
      brush.strokeLineJoin = "round";
      brush.strokeDashArray = dash ?? null;
      c.freeDrawingBrush = brush;
      c.on("path:created", onPathCreated);
    }
    if (drawingTool === "line") {
      c.on("mouse:down", onLineDown);
      c.on("mouse:move", onLineMove);
      c.on("mouse:up", onLineUp);
    }
    c.requestRenderAll();
    return () => {
      c.off("path:created", onPathCreated);
      c.off("mouse:down", onLineDown);
      c.off("mouse:move", onLineMove);
      c.off("mouse:up", onLineUp);
      if (line) c.remove(line);
      c.isDrawingMode = false;
      c.selection = true;
      c.skipTargetFind = false;
      c.defaultCursor = "default";
    };
  }, [ready, drawingTool, drawColor, brushSize, strokeStyle, commit]);

  useEffect(() => {
    const c = fc.current,
      f = fab.current;
    if (!ready || !c || !f || !vectorMode) {
      vectorActionsRef.current = null;
      return;
    }
    c.isDrawingMode = false;
    c.selection = false;
    c.skipTargetFind = true;
    c.defaultCursor = "crosshair";
    let points: VectorPoint[] = vectorDraftRef.current;
    let draggingPoint = -1;
    const previewClosed = false;
    const setPoints = (next: VectorPoint[]) => {
      points = next;
      vectorDraftRef.current = next;
      setVectorDraft(next);
    };
    const finish = (closed = false) => {
      if (points.length < 2) return;
      const data = vectorPathData(points, closed);
      if (!data) return;
      const path = new f.Path(data, {
        fill: closed ? vectorFill : "",
        stroke: vectorColor,
        strokeWidth: vectorWidth,
        strokeDashArray:
          vectorStrokeStyle === "dashed"
            ? [vectorWidth * 2, vectorWidth]
            : vectorStrokeStyle === "dotted"
              ? [1, vectorWidth * 1.6]
              : null,
        strokeLineCap: "round",
        strokeLineJoin: "round",
        name: closed ? "Vector shape" : "Vector path",
      });
      path.set({ gridoraPoints: points.map((point) => ({ ...point })), gridoraClosed: closed });
      c.add(path);
      c.setActiveObject(path);
      c.requestRenderAll();
      setPoints([]);
      setVectorClosed(false);
      setVectorMode(false);
      setTab("vector");
      setPanelOpen(true);
      commit();
    };
    const undo = () => {
      if (points.length) setPoints(points.slice(0, -1));
    };
    vectorActionsRef.current = { finish, undo };
    const onDown = (event: Obj) => {
      const point = event.scenePoint;
      if (!point) return;
      if (
        points.length > 2 &&
        Math.hypot(point.x - points[0]!.x, point.y - points[0]!.y) < 14 / zoomRef.current
      ) {
        finish(true);
        return;
      }
      setPoints([...points, { x: point.x, y: point.y }]);
      draggingPoint = points.length;
    };
    const onMove = (event: Obj) => {
      if (draggingPoint < 0 || !event.scenePoint) return;
      const node = points[draggingPoint];
      if (!node) return;
      const dx = event.scenePoint.x - node.x;
      const dy = event.scenePoint.y - node.y;
      if (Math.hypot(dx, dy) < 2 / zoomRef.current) return;
      const next = points.map((point, index) =>
        index === draggingPoint
          ? {
              ...point,
              handleOut: { x: event.scenePoint.x, y: event.scenePoint.y },
              handleIn: { x: point.x - dx, y: point.y - dy },
            }
          : point,
      );
      setPoints(next);
    };
    const onUp = () => {
      draggingPoint = -1;
    };
    const onDoubleClick = () => finish(false);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        finish(false);
      } else if (event.key === "Escape") {
        event.preventDefault();
        setPoints([]);
        setVectorClosed(false);
        setVectorMode(false);
      } else if (event.key === "Backspace") {
        event.preventDefault();
        undo();
      }
    };
    c.on("mouse:down", onDown);
    c.on("mouse:move", onMove);
    c.on("mouse:up", onUp);
    c.on("mouse:dblclick", onDoubleClick);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      c.off("mouse:down", onDown);
      c.off("mouse:move", onMove);
      c.off("mouse:up", onUp);
      c.off("mouse:dblclick", onDoubleClick);
      window.removeEventListener("keydown", onKeyDown);
      vectorActionsRef.current = null;
      c.selection = true;
      c.skipTargetFind = false;
      c.defaultCursor = "default";
      c.requestRenderAll();
    };
  }, [ready, vectorMode, vectorColor, vectorWidth, vectorStrokeStyle, vectorFill, commit]);

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
    add(
      new f.Textbox("Double-click to edit", {
        width: W() * 0.6,
        fontSize: Math.round(Math.min(W(), H()) / 12),
        fontFamily: "Manrope",
        fill: "#111111",
        textAlign: "center",
        name: "Text",
      }),
    );
    setPanelOpen(true);
  };

  const addTextPreset = (preset: "heading" | "subheading" | "body") => {
    const f = fab.current;
    if (!f) return;
    const styles = {
      heading: { text: "Add a heading", size: 0.105, weight: "bold" },
      subheading: { text: "Add a subheading", size: 0.065, weight: "600" },
      body: { text: "Add body text", size: 0.042, weight: "normal" },
    } as const;
    const style = styles[preset];
    add(
      new f.Textbox(style.text, {
        width: W() * 0.82,
        fontSize: Math.max(16, Math.round(Math.min(W(), H()) * style.size)),
        fontFamily: "Manrope",
        fontWeight: style.weight,
        fill: "#111111",
        textAlign: "center",
        lineHeight: 1.16,
        name: preset[0]!.toUpperCase() + preset.slice(1),
      }),
    );
    setTab("textTools");
    setPanelOpen(true);
  };

  const addShape = (kind: string) => {
    const f = fab.current;
    if (!f) return;
    const s = Math.min(W(), H()) * 0.3;
    const fill = "#c6f432";
    let o: Obj;
    if (kind === "arrow")
      o = new f.Path(`M 0 0 L ${s} 0 M ${s * 0.72} ${-s * 0.2} L ${s} 0 L ${s * 0.72} ${s * 0.2}`, {
        fill: "",
        stroke: "#111111",
        strokeWidth: Math.max(4, s / 25),
        name: "Arrow",
      });
    else if (kind === "rect") o = new f.Rect({ width: s, height: s, fill, name: "Rectangle" });
    else if (kind === "rounded")
      o = new f.Rect({
        width: s,
        height: s * 0.7,
        rx: s * 0.12,
        ry: s * 0.12,
        fill,
        name: "Rounded rect",
      });
    else if (kind === "circle") o = new f.Circle({ radius: s / 2, fill, name: "Circle" });
    else if (kind === "ellipse") o = new f.Ellipse({ rx: s / 2, ry: s / 3, fill, name: "Ellipse" });
    else if (kind === "triangle")
      o = new f.Triangle({ width: s, height: s, fill, name: "Triangle" });
    else if (kind === "line")
      o = new f.Line([0, 0, s * 1.5, 0], {
        stroke: "#111111",
        strokeWidth: Math.max(4, s / 25),
        name: "Line",
      });
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
    const url = URL.createObjectURL(file),
      image = new Image();
    image.onload = () => {
      setPendingImage({
        file,
        url,
        target,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
      setCropRect({ x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight });
      setUseImageAsCanvas(false);
      setFitImportedImage(image.naturalWidth > W() || image.naturalHeight > H());
    };
    image.src = url;
  };
  const onFile = (file?: File) => previewImage(file, "element");
  const onBackgroundFile = (file?: File) => previewImage(file, "background");
  const importSvgFile = async (file?: File) => {
    const c = fc.current,
      f = fab.current;
    if (!file || !c || !f) return;
    try {
      const source = await file.text();
      if (!/<svg[\s>]/i.test(source)) throw new Error("Choose a valid SVG file.");
      const parsed = await f.loadSVGFromString(source);
      const objects: Obj[] = parsed.objects.filter(Boolean);
      if (!objects.length) throw new Error("No vector objects were found in this SVG.");
      const left = Math.min(...objects.map((object) => object.left ?? 0));
      const top = Math.min(...objects.map((object) => object.top ?? 0));
      const right = Math.max(
        ...objects.map(
          (object) => (object.left ?? 0) + (object.getScaledWidth?.() ?? object.width ?? 0),
        ),
      );
      const bottom = Math.max(
        ...objects.map(
          (object) => (object.top ?? 0) + (object.getScaledHeight?.() ?? object.height ?? 0),
        ),
      );
      const fitScale = Math.min(
        1,
        (W() * 0.8) / Math.max(1, right - left),
        (H() * 0.8) / Math.max(1, bottom - top),
      );
      for (const object of objects) {
        object.set({
          left: W() / 2 + ((object.left ?? 0) - left - (right - left) / 2) * fitScale,
          top: H() / 2 + ((object.top ?? 0) - top - (bottom - top) / 2) * fitScale,
          scaleX: (object.scaleX ?? 1) * fitScale,
          scaleY: (object.scaleY ?? 1) * fitScale,
          name: object.name || `SVG ${object.type}`,
        });
        object.setCoords();
      }
      c.add(...objects);
      if (objects.length === 1) c.setActiveObject(objects[0]!);
      else c.setActiveObject(new f.ActiveSelection(objects, { canvas: c }));
      c.requestRenderAll();
      setTab("vector");
      setPanelOpen(true);
      commit();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Couldn't import this SVG file.");
    }
  };
  const exportSvg = () => {
    const c = fc.current;
    if (!c) return;
    const blob = new Blob([c.toSVG()], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `${(proj.current?.name || "design").replace(/[^\w-]+/g, "_")}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const editVectorPoint = (
    index: number,
    key: "x" | "y" | "handleInX" | "handleInY" | "handleOutX" | "handleOutY",
    value: number,
  ) => {
    const c = fc.current,
      f = fab.current,
      path = active();
    const points = path?.gridoraPoints as VectorPoint[] | undefined;
    if (
      !c ||
      !f ||
      path?.type !== "path" ||
      !points?.[index] ||
      (path.angle ?? 0) !== 0 ||
      (path.scaleX ?? 1) !== 1 ||
      (path.scaleY ?? 1) !== 1
    )
      return;
    const originalBounds = points.reduce(
      (bounds, point) => ({
        left: Math.min(bounds.left, point.x),
        top: Math.min(bounds.top, point.y),
      }),
      { left: Infinity, top: Infinity },
    );
    const dx = (path.left ?? originalBounds.left) - originalBounds.left;
    const dy = (path.top ?? originalBounds.top) - originalBounds.top;
    const next = translateVectorPoints(points, dx, dy).map((point, pointIndex) => {
      if (pointIndex !== index) return point;
      if (key === "x" || key === "y") return { ...point, [key]: value };
      const side = key.startsWith("handleIn") ? "handleIn" : "handleOut";
      const axis = key.endsWith("X") ? "x" : "y";
      const handle = point[side] ?? { x: point.x, y: point.y };
      return { ...point, [side]: { ...handle, [axis]: value } };
    });
    const replacement = new f.Path(vectorPathData(next, !!path.gridoraClosed), {
      fill: path.fill ?? "",
      stroke: path.stroke ?? vectorColor,
      strokeWidth: path.strokeWidth ?? vectorWidth,
      strokeDashArray: path.strokeDashArray ?? null,
      strokeLineCap: path.strokeLineCap ?? "round",
      strokeLineJoin: path.strokeLineJoin ?? "round",
      opacity: path.opacity ?? 1,
      name: path.name ?? "Vector path",
      gridoraPoints: next,
      gridoraClosed: !!path.gridoraClosed,
    });
    const at = c.getObjects().indexOf(path);
    c.remove(path);
    c.insertAt(Math.max(0, at), replacement);
    c.setActiveObject(replacement);
    replacement.setCoords();
    c.requestRenderAll();
    commit();
  };
  const convertVectorToShape = () => {
    const c = fc.current,
      f = fab.current,
      path = active();
    const points = path?.gridoraPoints as VectorPoint[] | undefined;
    if (!c || !f || path?.type !== "path" || !points || points.length < 3) return;
    const bounds = points.reduce(
      (result, point) => ({
        left: Math.min(result.left, point.x),
        top: Math.min(result.top, point.y),
      }),
      { left: Infinity, top: Infinity },
    );
    const translated = translateVectorPoints(
      points,
      (path.left ?? bounds.left) - bounds.left,
      (path.top ?? bounds.top) - bounds.top,
    );
    const replacement = new f.Path(vectorPathData(translated, true), {
      fill: vectorFill,
      stroke: path.stroke ?? vectorColor,
      strokeWidth: path.strokeWidth ?? vectorWidth,
      strokeDashArray: path.strokeDashArray ?? null,
      name: "Vector shape",
    });
    replacement.set({ gridoraPoints: translated, gridoraClosed: true });
    const index = c.getObjects().indexOf(path);
    c.remove(path);
    c.insertAt(Math.max(0, index), replacement);
    c.setActiveObject(replacement);
    c.requestRenderAll();
    commit();
  };
  const importPendingImage = async () => {
    const pending = pendingImage,
      f = fab.current,
      c = fc.current;
    if (!pending || !f || !c) return;
    let fileToUpload = pending.file;
    if (
      cropRect.width > 0 &&
      (cropRect.x !== 0 ||
        cropRect.y !== 0 ||
        cropRect.width !== pending.width ||
        cropRect.height !== pending.height)
    ) {
      const source = new Image();
      source.src = pending.url;
      await new Promise<void>((resolve) => {
        source.onload = () => resolve();
      });
      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = cropRect.width;
      cropCanvas.height = cropRect.height;
      cropCanvas
        .getContext("2d")
        ?.drawImage(
          source,
          cropRect.x,
          cropRect.y,
          cropRect.width,
          cropRect.height,
          0,
          0,
          cropRect.width,
          cropRect.height,
        );
      const cropBlob = await new Promise<Blob | null>((resolve) =>
        cropCanvas.toBlob(resolve, pending.file.type || "image/png"),
      );
      if (cropBlob)
        fileToUpload = new File([cropBlob], pending.file.name, {
          type: pending.file.type || "image/png",
        });
    }
    if (pending.target === "background" && useImageAsCanvas && proj.current) {
      proj.current = { ...proj.current, width: cropRect.width, height: cropRect.height };
      c.setDimensions({ width: cropRect.width, height: cropRect.height });
    }
    const url = await uploadDesignAsset(fileToUpload, proj.current?.id);
    const img = await f.FabricImage.fromURL(url, { crossOrigin: "anonymous" });
    if (pending.target === "element") {
      img.set({ name: "Image" });
      if (fitImportedImage) {
        const max = Math.min(W(), H()) * 0.8;
        if (img.width > max || img.height > max) img.scale(max / Math.max(img.width, img.height));
      }
      add(img);
    } else {
      const scale = fitImportedImage
        ? Math.max(W() / Math.max(1, img.width), H() / Math.max(1, img.height))
        : 1;
      img.set({ left: 0, top: 0, originX: "left", originY: "top", scaleX: scale, scaleY: scale });
      c.backgroundColor = "";
      c.backgroundImage = img;
      c.requestRenderAll();
      commit();
    }
    URL.revokeObjectURL(pending.url);
    setPendingImage(null);
  };
  const eraseImageBackground = async (
    mode: "smart" | "auto" | "color",
    pickedColor?: string,
    tolerance = 40,
  ) => {
    const c = fc.current,
      f = fab.current,
      old = active();
    if (!c || !f || !old || old.type !== "image" || eraseBusy) return;
    const source = old.getElement?.() as HTMLImageElement | undefined;
    if (!source?.naturalWidth || !source?.naturalHeight) return;
    setEraseBusy(
      mode === "smart"
        ? "Removing background… (first use downloads the engine)"
        : "Removing background…",
    );
    try {
      const work = document.createElement("canvas");
      work.width = source.naturalWidth;
      work.height = source.naturalHeight;
      const ctx = work.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      let blob: Blob | null = null;
      if (mode === "smart") {
        ctx.drawImage(source, 0, 0);
        const input = await new Promise<Blob | null>((r) => work.toBlob(r, "image/png"));
        if (!input) return;
        const { removeBackground } = await import("@imgly/background-removal");
        blob = await removeBackground(input, { output: { format: "image/png" } });
      } else {
        ctx.drawImage(source, 0, 0);
        const W = work.width,
          H = work.height;
        const image = ctx.getImageData(0, 0, W, H),
          px = image.data;
        // tolerance 0-100 → colour distance; soft band for feathered edges
        const hard = 10 + tolerance * 1.6,
          soft = hard + 30;
        const dist = (i: number, r: number, g: number, b: number) =>
          Math.hypot((px[i] ?? 0) - r, (px[i + 1] ?? 0) - g, (px[i + 2] ?? 0) - b);
        const alphaFor = (d: number) =>
          d <= hard ? 0 : d >= soft ? 255 : Math.round(((d - hard) / (soft - hard)) * 255);
        if (mode === "color") {
          const hex = (pickedColor ?? "#ffffff").replace("#", "");
          const r = parseInt(hex.slice(0, 2), 16),
            g = parseInt(hex.slice(2, 4), 16),
            b = parseInt(hex.slice(4, 6), 16);
          for (let i = 0; i < px.length; i += 4)
            px[i + 3] = Math.min(px[i + 3] ?? 255, alphaFor(dist(i, r, g, b)));
        } else {
          // sample the border, average it into a few reference colours
          const border: number[][] = [];
          const step = Math.max(1, Math.floor((W + H) / 200));
          for (let x = 0; x < W; x += step) {
            border.push([x, 0], [x, H - 1]);
          }
          for (let y = 0; y < H; y += step) {
            border.push([0, y], [W - 1, y]);
          }
          const refs: number[][] = [];
          for (const [x = 0, y = 0] of border) {
            const i = (y * W + x) * 4;
            const col = [px[i] ?? 0, px[i + 1] ?? 0, px[i + 2] ?? 0];
            if (
              !refs.some((r) => Math.hypot(r[0]! - col[0]!, r[1]! - col[1]!, r[2]! - col[2]!) < 24)
            )
              refs.push(col);
            if (refs.length > 12) break;
          }
          const near = (n: number) => {
            let best = Infinity;
            for (const r of refs) {
              const d = dist(n * 4, r[0]!, r[1]!, r[2]!);
              if (d < best) best = d;
            }
            return best;
          };
          const visited = new Uint8Array(W * H),
            queue = new Int32Array(W * H);
          let qe = 0;
          const seed = (n: number) => {
            if (!visited[n] && near(n) < soft) {
              visited[n] = 1;
              queue[qe++] = n;
            }
          };
          for (let x = 0; x < W; x++) {
            seed(x);
            seed((H - 1) * W + x);
          }
          for (let y = 0; y < H; y++) {
            seed(y * W);
            seed(y * W + W - 1);
          }
          let qs = 0;
          while (qs < qe) {
            const n = queue[qs++]!;
            const d = near(n);
            px[n * 4 + 3] = Math.min(px[n * 4 + 3] ?? 255, alphaFor(d));
            if (d > hard) continue; // edge pixel: feather but don't spread past it
            const x = n % W;
            if (x > 0) seed(n - 1);
            if (x < W - 1) seed(n + 1);
            if (n >= W) seed(n - W);
            if (n < W * (H - 1)) seed(n + W);
          }
        }
        ctx.putImageData(image, 0, 0);
        blob = await new Promise<Blob | null>((r) => work.toBlob(r, "image/png"));
      }
      if (!blob) return;
      snapshot();
      const url = await uploadDesignAsset(
        new File([blob], "background-erased.png", { type: "image/png" }),
        proj.current?.id,
      );
      const next = await f.FabricImage.fromURL(url, { crossOrigin: "anonymous" });
      next.set({
        left: old.left,
        top: old.top,
        scaleX: (old.scaleX ?? 1) * (source.naturalWidth / (next.width || source.naturalWidth)),
        scaleY: (old.scaleY ?? 1) * (source.naturalHeight / (next.height || source.naturalHeight)),
        angle: old.angle,
        flipX: old.flipX,
        flipY: old.flipY,
        originX: old.originX,
        originY: old.originY,
        opacity: old.opacity,
        clipPath: old.clipPath,
        name: old.name,
      });
      const idx = c.getObjects().indexOf(old);
      c.remove(old);
      c.insertAt(Math.max(0, idx), next);
      c.setActiveObject(next);
      c.requestRenderAll();
      commit();
    } catch (err) {
      console.error(err);
      alert(
        "Couldn't remove the background from this photo. Try the Colour or Edges option instead.",
      );
    } finally {
      setEraseBusy(null);
    }
  };
  const pickColorFromCanvas = async () => {
    const EyeDropperCtor = (
      window as Window & { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } }
    ).EyeDropper;
    if (!EyeDropperCtor) return null;
    try {
      return (await new EyeDropperCtor().open()).sRGBHex;
    } catch {
      return null;
    }
  };
  const maskImage = (
    shape: "square" | "circle" | "rounded" | "triangle" | "star" | "heart" | "polygon",
  ) => {
    const c = fc.current,
      f = fab.current,
      o = active();
    if (!c || !f || !o || o.type !== "image") return;
    const w = o.width ?? 1,
      h = o.height ?? 1;
    if (shape === "square") o.clipPath = undefined;
    if (shape === "circle")
      o.clipPath = new f.Circle({
        radius: Math.min(w, h) / 2,
        originX: "center",
        originY: "center",
      });
    if (shape === "rounded")
      o.clipPath = new f.Rect({
        width: w,
        height: h,
        rx: Math.min(w, h) * 0.18,
        ry: Math.min(w, h) * 0.18,
        originX: "center",
        originY: "center",
      });
    if (shape === "triangle")
      o.clipPath = new f.Triangle({ width: w, height: h, originX: "center", originY: "center" });
    if (shape === "star" || shape === "polygon") {
      const n = shape === "star" ? 10 : 6,
        points = Array.from({ length: n }, (_, i) => {
          const a = (Math.PI * 2 * i) / n - Math.PI / 2,
            r = shape === "star" && i % 2 ? 0.22 : 0.5;
          return { x: w / 2 + Math.cos(a) * w * r, y: h / 2 + Math.sin(a) * h * r };
        });
      o.clipPath = new f.Polygon(points, { originX: "center", originY: "center" });
    }
    if (shape === "heart") {
      const heart = new f.Path(
        "M 50 88 C 42 78 10 60 10 35 C 10 12 38 8 50 28 C 62 8 90 12 90 35 C 90 60 58 78 50 88 Z",
        { originX: "center", originY: "center" },
      );
      heart.scaleX = w / 100;
      heart.scaleY = h / 100;
      o.clipPath = heart;
    }
    o.setCoords();
    c.requestRenderAll();
    commit();
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
    const c = fc.current,
      o = active();
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
  const copyObject = async () => {
    const o = active();
    if (o) objectClipboard.current = await o.clone(PROPS);
  };
  const pasteObject = async () => {
    const c = fc.current,
      source = objectClipboard.current;
    if (!c || !source) return;
    const pasted = await source.clone(PROPS);
    pasted.set({ left: (source.left ?? W() / 2) + 30, top: (source.top ?? H() / 2) + 30 });
    if (pasted.type === "activeselection" || pasted.type === "activeSelection") {
      pasted.canvas = c;
      pasted.forEachObject((child: Obj) => c.add(child));
      pasted.setCoords();
    } else c.add(pasted);
    c.setActiveObject(pasted);
    c.requestRenderAll();
    commit();
  };
  const order = (k: "up" | "down" | "top" | "bottom") => {
    const c = fc.current,
      o = active();
    if (!o) return;
    if (k === "up") c.bringObjectForward(o);
    if (k === "down") c.sendObjectBackwards(o);
    if (k === "top") c.bringObjectToFront(o);
    if (k === "bottom") c.sendObjectToBack(o);
    c.fire("object:modified", { target: o });
    commit();
  };
  const alignToCanvas = (edge: "left" | "centerX" | "right" | "top" | "centerY" | "bottom") => {
    const c = fc.current,
      o = active();
    if (!c || !o) return;
    const bounds = o.getBoundingRect();
    const dx =
      edge === "left"
        ? -bounds.left
        : edge === "centerX"
          ? W() / 2 - (bounds.left + bounds.width / 2)
          : edge === "right"
            ? W() - (bounds.left + bounds.width)
            : 0;
    const dy =
      edge === "top"
        ? -bounds.top
        : edge === "centerY"
          ? H() / 2 - (bounds.top + bounds.height / 2)
          : edge === "bottom"
            ? H() - (bounds.top + bounds.height)
            : 0;
    o.set({ left: (o.left ?? 0) + dx, top: (o.top ?? 0) + dy });
    o.setCoords();
    commit();
  };
  const spaceEvenly = (axis: "x" | "y") => {
    const c = fc.current,
      selected: Obj[] = c?.getActiveObjects?.() ?? [];
    if (!c || selected.length < 3) return;
    const bounds = (object: Obj) => object.getBoundingRect();
    const sorted = [...selected].sort((a, b) =>
      axis === "x" ? bounds(a).left - bounds(b).left : bounds(a).top - bounds(b).top,
    );
    const first = bounds(sorted[0]),
      last = bounds(sorted[sorted.length - 1]);
    const start = axis === "x" ? first.left : first.top;
    const end = axis === "x" ? last.left + last.width : last.top + last.height;
    const sizes = sorted.map((object) =>
      axis === "x" ? bounds(object).width : bounds(object).height,
    );
    const gap = (end - start - sizes.reduce((sum, size) => sum + size, 0)) / (sorted.length - 1);
    let cursor = start;
    sorted.forEach((object, index) => {
      const box = bounds(object),
        current = axis === "x" ? box.left : box.top;
      if (index > 0 && index < sorted.length - 1)
        object.set(
          axis === "x"
            ? { left: (object.left ?? 0) + cursor - current }
            : { top: (object.top ?? 0) + cursor - current },
        );
      cursor += sizes[index]! + gap;
      object.setCoords();
    });
    commit();
  };
  const clearCanvas = () => {
    const c = fc.current;
    if (!c) return;
    snapshot();
    c.discardActiveObject();
    c.remove(...c.getObjects());
    c.requestRenderAll();
    setClearOpen(false);
    commit();
  };
  const groupSelection = () => {
    const c = fc.current,
      f = fab.current,
      selection = active();
    if (!c || !f || selection?.type !== "activeselection") return;
    const children = selection.getObjects();
    if (children.length < 2) return;
    const index = Math.min(
      ...children.map((child: Obj) => c.getObjects().indexOf(child)).filter((i: number) => i >= 0),
    );
    c.discardActiveObject();
    const group = new f.Group(children);
    group.set("name", "Group");
    c.remove(...children);
    c.insertAt(Math.max(0, index), group);
    c.setActiveObject(group);
    c.requestRenderAll();
    commit();
  };
  const ungroupSelection = () => {
    const c = fc.current,
      f = fab.current,
      group = active();
    if (!c || !f || group?.type !== "group") return;
    const index = Math.max(0, c.getObjects().indexOf(group));
    const children = group.removeAll();
    c.remove(group);
    children.forEach((child: Obj, i: number) => c.insertAt(index + i, child));
    if (children.length > 0) c.setActiveObject(new f.ActiveSelection(children, { canvas: c }));
    c.requestRenderAll();
    commit();
  };
  const addGrid = () => {
    const c = fc.current,
      f = fab.current;
    if (!c || !f) return;
    const gap = Math.max(8, Math.min(W(), H()) * 0.015),
      cellW = W() * 0.34,
      cellH = H() * 0.34;
    const cells: Obj[] = [];
    for (let row = 0; row < 2; row++)
      for (let col = 0; col < 2; col++) {
        cells.push(
          new f.Rect({
            left: W() / 2 + ((col ? 1 : -1) * (cellW + gap)) / 2,
            top: H() / 2 + ((row ? 1 : -1) * (cellH + gap)) / 2,
            originX: "center",
            originY: "center",
            width: cellW,
            height: cellH,
            fill: "rgba(198,244,50,0.14)",
            stroke: "#c6f432",
            strokeWidth: 3,
            name: "Grid cell",
          }),
        );
      }
    c.add(...cells);
    c.setActiveObject(new f.ActiveSelection(cells, { canvas: c }));
    setTab("props");
    setPanelOpen(true);
    commit();
  };
  const addDecoration = () => {
    const f = fab.current;
    if (!f) return;
    add(
      new f.Textbox("✦  ✧  ✦", {
        width: W() * 0.65,
        fontSize: Math.round(Math.min(W(), H()) / 8),
        fontFamily: "Manrope",
        fill: "#c6f432",
        textAlign: "center",
        name: "Decorative stars",
      }),
    );
    setTab("textTools");
    setPanelOpen(true);
  };
  const applyAiAction = async (a: GeminiAction) => {
    const c = fc.current,
      f = fab.current;
    if (!c || !f) return;
    const fallback = active();
    const ref = a as Obj;
    const o =
      ref.targetIndex !== undefined
        ? c.getObjects()[ref.targetIndex]
        : ref.targetName
          ? c.getObjects().find((x: Obj) =>
              String(x.name ?? "")
                .toLowerCase()
                .includes(String(ref.targetName).toLowerCase()),
            )
          : fallback;
    if (o) c.setActiveObject(o);
    if (a.type === "addText") {
      rememberPaletteColor(a.fill);
      const text = new f.Textbox(a.text, {
        width: W() * 0.6,
        fontSize: a.fontSize ?? Math.round(Math.min(W(), H()) / 12),
        fill: a.fill ?? "#111111",
        fontWeight: a.fontWeight ?? "normal",
        fontFamily: a.fontFamily ?? "Manrope",
        textAlign: a.textAlign ?? "center",
        charSpacing: a.charSpacing ?? 0,
        lineHeight: a.lineHeight ?? 1.16,
        name: "AI text",
      });
      add(text);
      text.set({ left: a.x ?? W() / 2, top: a.y ?? H() / 2 });
      text.setCoords();
      commit();
      return;
    }
    if (a.type === "addIcon") {
      rememberPaletteColor(a.fill);
      addIcon(a.icon);
      const created = active();
      if (created) {
        created.set({ left: a.x ?? W() / 2, top: a.y ?? H() / 2, fill: a.fill ?? "#111111" });
        if (a.scale) {
          created.scaleX = (created.scaleX ?? 1) * a.scale;
          created.scaleY = (created.scaleY ?? 1) * a.scale;
        }
        created.setCoords();
        commit();
      }
      return;
    }
    if (a.type === "addShape") {
      rememberPaletteColor(a.fill);
      rememberPaletteColor(a.stroke);
      addShape(a.shape);
      const created = active();
      if (created) {
        created.set({
          left: a.x ?? W() / 2,
          top: a.y ?? H() / 2,
          fill: a.fill ?? created.fill,
          stroke: a.stroke ?? created.stroke,
          strokeWidth: a.strokeWidth ?? created.strokeWidth,
        });
        if (a.width) created.scaleToWidth(a.width);
        if (a.height) created.scaleToHeight(a.height);
        created.setCoords();
        commit();
      }
      return;
    }
    if (a.type === "setBackground") {
      c.backgroundImage = undefined;
      c.backgroundColor =
        a.gradientStart && a.gradientEnd
          ? makeGradient(f, a.gradientStart, a.gradientEnd, a.angle ?? 45, W(), H(), "pixels")
          : (a.color ?? "#ffffff");
      rememberPaletteColor(a.color);
      rememberPaletteColor(a.gradientStart);
      rememberPaletteColor(a.gradientEnd);
      c.requestRenderAll();
      commit();
      return;
    }
    if (a.type === "arrange") {
      const list = c.getObjects().filter((x: Obj) => x !== c.backgroundImage);
      if (a.alignment === "vertical")
        list.forEach((x: Obj, i: number) =>
          x.set({ left: W() / 2, top: (H() * (i + 1)) / (list.length + 1) }),
        );
      else if (a.alignment === "center")
        list.forEach((x: Obj) => x.set({ left: W() / 2, top: H() / 2 }));
      else
        list.forEach((x: Obj, i: number) =>
          x.set({ left: (W() * (i + 1)) / (list.length + 1), top: H() / 2 }),
        );
      list.forEach((x: Obj) => x.setCoords());
      c.requestRenderAll();
      commit();
      return;
    }
    const editable = o && o !== c.backgroundImage;
    if (!editable) return;
    if (a.type === "deleteSelected") {
      del();
      return;
    }
    if (a.type === "duplicateSelected") {
      c.setActiveObject(o);
      await dup();
      const copy = active();
      if (copy && (a.dx !== undefined || a.dy !== undefined)) {
        copy.set({ left: (copy.left ?? 0) + (a.dx ?? 0), top: (copy.top ?? 0) + (a.dy ?? 0) });
        copy.setCoords();
        commit();
      }
      return;
    }
    if (a.type === "moveSelected" && o) {
      o.set({ left: (o.left ?? 0) + a.dx, top: (o.top ?? 0) + a.dy });
      o.setCoords();
      commit();
      return;
    }
    if (a.type === "setOrder" && o) {
      order(
        a.direction === "front"
          ? "top"
          : a.direction === "forward"
            ? "up"
            : a.direction === "backward"
              ? "down"
              : "bottom",
      );
      return;
    }
    if (a.type === "updateSelected" && o) {
      const next: Record<string, unknown> = {};
      if (a.text !== undefined) next.text = a.text;
      if (a.fill) {
        next.fill = a.fill;
        rememberPaletteColor(a.fill);
      }
      if (a.fontSize) next.fontSize = a.fontSize;
      if (a.fontFamily) next.fontFamily = a.fontFamily;
      if (a.fontWeight) next.fontWeight = a.fontWeight;
      if (a.textAlign) next.textAlign = a.textAlign;
      if (a.charSpacing !== undefined) next.charSpacing = a.charSpacing;
      if (a.lineHeight !== undefined) next.lineHeight = a.lineHeight;
      if (a.left !== undefined) next.left = a.left;
      if (a.top !== undefined) next.top = a.top;
      if (a.angle !== undefined) next.angle = a.angle;
      if (a.scale !== undefined) {
        next.scaleX = a.scale;
        next.scaleY = a.scale;
      }
      if (a.opacity !== undefined) next.opacity = a.opacity;
      if (a.stroke) {
        next.stroke = a.stroke;
        rememberPaletteColor(a.stroke);
      }
      if (a.strokeWidth !== undefined) next.strokeWidth = a.strokeWidth;
      if (a.rx !== undefined) next.rx = a.rx;
      if (a.ry !== undefined) next.ry = a.ry;
      o.set(next);
      o.setCoords();
      commit();
      return;
    }
    if (a.type === "alignSelected" && o) {
      const w = o.getScaledWidth?.() ?? o.width ?? 0,
        h = o.getScaledHeight?.() ?? o.height ?? 0;
      o.set({
        left: a.alignment === "left" ? w / 2 : a.alignment === "right" ? W() - w / 2 : W() / 2,
        top: a.alignment === "top" ? h / 2 : a.alignment === "bottom" ? H() - h / 2 : H() / 2,
      });
      o.setCoords();
      commit();
      return;
    }
  };
  const runAssistant = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt || aiBusy || aiProposal || !fc.current) return;
    setAiPrompt("");
    setAiMessages((m) => [...m, { role: "user", text: prompt }]);
    setAiBusy(true);
    try {
      const selected = active();
      const result = await askAssistant({
        data: {
          prompt,
          canvas: {
            width: W(),
            height: H(),
            background: String(fc.current.backgroundColor ?? ""),
            selected: selected
              ? {
                  type: selected.type,
                  text: selected.text,
                  fontSize: selected.fontSize,
                  fontFamily: selected.fontFamily,
                  fontWeight: selected.fontWeight,
                  textAlign: selected.textAlign,
                  left: selected.left,
                  top: selected.top,
                  width: selected.getScaledWidth?.() ?? selected.width,
                  height: selected.getScaledHeight?.() ?? selected.height,
                  fill: typeof selected.fill === "string" ? selected.fill : undefined,
                  stroke: typeof selected.stroke === "string" ? selected.stroke : undefined,
                  strokeWidth: selected.strokeWidth,
                }
              : null,
            objects: fc.current
              .getObjects()
              .slice(0, 30)
              .map((x: Obj, index: number) => ({
                index,
                type: x.type,
                name: x.name,
                text: x.text,
                fontSize: x.fontSize,
                fontFamily: x.fontFamily,
                fontWeight: x.fontWeight,
                textAlign: x.textAlign,
                left: x.left,
                top: x.top,
                width: x.getScaledWidth?.() ?? x.width,
                height: x.getScaledHeight?.() ?? x.height,
                angle: x.angle,
                opacity: x.opacity,
                fill: typeof x.fill === "string" ? x.fill : undefined,
                stroke: typeof x.stroke === "string" ? x.stroke : undefined,
                strokeWidth: x.strokeWidth,
              })),
          },
        },
      });
      if (result.actions.length) {
        setAiProposal({
          prompt,
          reply: result.reply,
          actions: result.actions,
          status: "suggested",
        });
      } else {
        setAiMessages((m) => [...m, { role: "assistant", text: result.reply }]);
      }
    } catch (error) {
      setAiMessages((m) => [
        ...m,
        {
          role: "assistant",
          text:
            error instanceof Error
              ? error.message
              : "The assistant could not complete that request.",
        },
      ]);
    } finally {
      setAiBusy(false);
    }
  };
  const previewAiProposal = async () => {
    const proposal = aiProposal;
    const c = fc.current;
    if (!proposal || proposal.status !== "suggested" || !c || aiPreviewActive.current) return;

    const before = JSON.stringify(c.toObject(PROPS));
    clearTimeout(timers.current.snap);
    clearTimeout(timers.current.save);
    snapshot();
    aiPreviewBefore.current = before;
    aiPreviewActive.current = true;
    setAiProposal({ ...proposal, status: "preview" });
    try {
      for (const action of proposal.actions) await applyAiAction(action);
      c.requestRenderAll();
    } catch (error) {
      aiPreviewActive.current = false;
      aiPreviewBefore.current = null;
      await restore(before);
      setAiProposal({ ...proposal, status: "suggested" });
      setAiMessages((m) => [
        ...m,
        {
          role: "assistant",
          text:
            error instanceof Error
              ? `The preview could not be completed; the canvas was restored. ${error.message}`
              : "The preview could not be completed; the canvas was restored.",
        },
      ]);
    }
  };
  const acceptAiProposal = () => {
    if (!aiProposal || aiProposal.status !== "preview" || !aiPreviewActive.current) return;
    clearTimeout(timers.current.snap);
    aiPreviewActive.current = false;
    aiPreviewBefore.current = null;
    snapshot();
    scheduleSave();
    setAiProposal(null);
    setAiMessages((m) => [
      ...m,
      {
        role: "assistant",
        text: "Design changes accepted. You can undo them with the editor's Undo button.",
      },
    ]);
  };
  const rejectAiProposal = async () => {
    const before = aiPreviewBefore.current;
    aiPreviewActive.current = false;
    aiPreviewBefore.current = null;
    clearTimeout(timers.current.snap);
    clearTimeout(timers.current.save);
    if (before) await restore(before);
    setAiProposal(null);
    setAiMessages((m) => [
      ...m,
      {
        role: "assistant",
        text: before
          ? "Preview rejected; your original canvas is restored."
          : "Suggestion dismissed.",
      },
    ]);
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
      if (aiPreviewActive.current) {
        if (e.key === "Escape") {
          e.preventDefault();
          void rejectAiProposal();
        }
        return;
      }
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT") return;
      if (active()?.isEditing) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        dup();
      } else if (mod && e.key.toLowerCase() === "c") {
        e.preventDefault();
        void copyObject();
      } else if (mod && e.key.toLowerCase() === "v") {
        e.preventDefault();
        void pasteObject();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        del();
      }
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
      const pdf = new jsPDF({
        orientation: W() > H() ? "l" : "p",
        unit: "px",
        format: [W(), H()],
        hotfixes: ["px_scaling"],
      });
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

  const selectedPng = () => {
    const object = active();
    return object ? object.toCanvasElement({ multiplier: 2 }).toDataURL("image/png") : null;
  };
  const exportSelectedObject = () => {
    const data = selectedPng(),
      object = active();
    if (!data || !object) {
      alert("Select an object first to export it.");
      return;
    }
    const a = document.createElement("a");
    a.href = data;
    a.download = `${(proj.current?.name || "design").replace(/[^\w-]+/g, "_")}_${String(object.name || object.type).replace(/[^\w-]+/g, "_")}.png`;
    a.click();
  };
  const copyPng = async (selectedOnly: boolean) => {
    const c = fc.current;
    if (!c) return;
    const data = selectedOnly
      ? selectedPng()
      : c.toDataURL({ format: "png", multiplier: 1 / zoomRef.current });
    if (!data) {
      alert("Select an object first to copy it.");
      return;
    }
    const blob = await (await fetch(data)).blob();
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      alert(
        selectedOnly ? "Selected object copied as a PNG image." : "Design copied as a PNG image.",
      );
    } catch {
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = `${(proj.current?.name || "design").replace(/[^\w-]+/g, "_")}.png`;
      a.click();
      URL.revokeObjectURL(url);
      alert("Image clipboard access is unavailable, so the PNG was downloaded instead.");
    }
  };
  const shareDesign = async () => {
    const c = fc.current;
    if (!c) return;
    const name = (proj.current?.name || "Gridora design").replace(/[^\w-]+/g, "_");
    const blob = await (
      await fetch(c.toDataURL({ format: "png", multiplier: 1 / zoomRef.current })).catch(() => {
        throw new Error("Could not render this design.");
      })
    ).blob();
    const file = new File([blob], `${name}.png`, { type: "image/png" });
    try {
      if (navigator.share && navigator.canShare?.({ files: [file] }))
        await navigator.share({ title: proj.current?.name || "Gridora design", files: [file] });
      else await copyPng(false);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        alert(error instanceof Error ? error.message : "Could not share this design.");
    }
  };
  const exportLibraryPdf = async () => {
    const c = fc.current,
      f = fab.current,
      current = proj.current;
    if (!c || !f || !current) return;
    try {
      await persist();
      const pages = await listProjects();
      if (!pages.length) {
        alert("There are no saved designs to export.");
        return;
      }
      const { jsPDF } = await import("jspdf");
      let pdf: InstanceType<typeof jsPDF> | null = null;
      for (const page of pages) {
        let image: string;
        if (page.id === current.id) {
          image = c.toDataURL({ format: "png", multiplier: 1 / zoomRef.current });
        } else {
          const temp = new f.StaticCanvas(document.createElement("canvas"), {
            width: page.width,
            height: page.height,
            backgroundColor: page.background,
          });
          installDesignAdjustments(temp);
          if (page.json) await temp.loadFromJSON(page.json as object);
          temp.renderAll();
          image = temp.toDataURL({ format: "png", multiplier: 1 });
          await temp.dispose();
        }
        const orientation = page.width > page.height ? "l" : "p";
        if (!pdf)
          pdf = new jsPDF({
            orientation,
            unit: "px",
            format: [page.width, page.height],
            hotfixes: ["px_scaling"],
          });
        else pdf.addPage([page.width, page.height], orientation);
        pdf.addImage(image, "PNG", 0, 0, page.width, page.height);
      }
      pdf?.save(`${current.name.replace(/[^\w-]+/g, "_")}_all_designs.pdf`);
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? `Multi-page PDF export failed: ${error.message}`
          : "Multi-page PDF export failed.",
      );
    }
  };

  if (missing)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">This design could not be found.</p>
        <button
          className="rounded-lg bg-primary px-4 py-2 text-primary-foreground"
          onClick={() => nav({ to: "/" })}
        >
          Back to dashboard
        </button>
      </div>
    );

  const o = ready ? active() : null;
  const h = hist.current;
  const vectorObjectPoints = o?.gridoraPoints as VectorPoint[] | undefined;
  const vectorObjectBounds = vectorObjectPoints?.reduce(
    (bounds, point) => ({
      left: Math.min(bounds.left, point.x),
      top: Math.min(bounds.top, point.y),
    }),
    { left: Infinity, top: Infinity },
  );
  const vectorObjectOffset =
    vectorObjectPoints && vectorObjectBounds
      ? {
          x: (o?.left ?? vectorObjectBounds.left) - vectorObjectBounds.left,
          y: (o?.top ?? vectorObjectBounds.top) - vectorObjectBounds.top,
        }
      : { x: 0, y: 0 };
  const editableVectorPoints = vectorObjectPoints
    ? translateVectorPoints(vectorObjectPoints, vectorObjectOffset.x, vectorObjectOffset.y)
    : undefined;
  const activeVectorPoint =
    editableVectorPoints?.[
      Math.min(vectorPointIndex, Math.max(0, editableVectorPoints.length - 1))
    ];
  const vectorPointEditSupported =
    !!vectorObjectPoints &&
    (o?.angle ?? 0) === 0 &&
    (o?.scaleX ?? 1) === 1 &&
    (o?.scaleY ?? 1) === 1;
  const objects: Obj[] = ready && fc.current ? [...fc.current.getObjects()].reverse() : [];
  const openTab = (t: Tab) => {
    setTab(t);
    setPanelOpen(true);
  };
  const isTextSelected = !!o && ["textbox", "i-text", "text"].includes(o.type);
  const isImageSelected = !!o && o.type === "image";
  const isElementSelected = !!o;
  const standaloneTabs: Tab[] = [
    "add",
    "layers",
    "edit",
    "position",
    "shapes",
    "stickers",
    "icons",
    "textPresets",
    "frames",
    "grids",
    "decorations",
    "colors",
    "draw",
    "vector",
  ];
  const contextualTabs: Tab[] = standaloneTabs.includes(tab)
    ? [tab]
    : isTextSelected
      ? ["props", "textTools", "position", "fill", "stroke", "effects"]
      : isImageSelected
        ? ["props", "position", "stroke", "effects", "frames"]
        : isElementSelected
          ? ["props", "position", "fill", "stroke", "effects"]
          : ["bg", "layers", "edit"];
  const tabLabel: Record<Tab, string> = {
    add: "Add tools",
    props: "Properties",
    textTools: "Text tools",
    textPresets: "Text presets",
    position: "Position & align",
    fill: "Fill",
    stroke: "Outline",
    effects: "Effects",
    layers: "Layers",
    shapes: "Shapes",
    stickers: "Stickers",
    icons: "Icons & illustrations",
    frames: "Frames",
    grids: "Grids",
    decorations: "Decorations",
    bg: "Canvas",
    edit: "Adjustments",
    colors: "Color",
    draw: "Draw",
    vector: "Vector pen",
  };
  const tabIcon: Record<Tab, ReactNode> = {
    add: <Plus />,
    props: <SlidersHorizontal />,
    textTools: <Type />,
    textPresets: <Heading />,
    position: <Scan />,
    fill: <PaintBucket />,
    stroke: <SlidersHorizontal />,
    effects: <Star />,
    layers: <Layers />,
    shapes: <Shapes />,
    stickers: <Smile />,
    icons: <Star />,
    frames: <Frame />,
    grids: <Grid3X3 />,
    decorations: <Sparkles />,
    bg: <Grid2X2 />,
    edit: <Paintbrush />,
    colors: <PaintBucket />,
    draw: <Paintbrush />,
    vector: <Pencil />,
  };
  const chooseDrawingTool = (tool: DrawingTool) => {
    setHand(false);
    setDrawingTool(tool);
  };
  const selectionBounds = o?.getBoundingRect?.();
  const canvasBounds = canvasEl.current?.getBoundingClientRect();
  const wrapBounds = wrapRef.current?.getBoundingClientRect();
  const selectionInsideCanvas =
    !!selectionBounds &&
    !!canvasBounds &&
    selectionBounds.left < canvasBounds.width &&
    selectionBounds.top < canvasBounds.height &&
    selectionBounds.left + selectionBounds.width > 0 &&
    selectionBounds.top + selectionBounds.height > 0;
  const toolbarLeft =
    selectionBounds && canvasBounds && wrapBounds
      ? Math.max(
          8,
          Math.min(
            wrapBounds.width - 150,
            canvasBounds.left -
              wrapBounds.left +
              selectionBounds.left +
              selectionBounds.width / 2 -
              75,
          ),
        )
      : 12;
  const toolbarTop =
    selectionBounds && canvasBounds && wrapBounds
      ? Math.max(8, canvasBounds.top - wrapBounds.top + selectionBounds.top - 48)
      : 12;

  const addDate = () => {
    const f = fab.current;
    if (!f) return;
    add(
      new f.Textbox(
        new Date().toLocaleDateString(undefined, {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        {
          width: W() * 0.6,
          fontSize: Math.round(Math.min(W(), H()) / 18),
          fontFamily: "Manrope",
          fill: "#111111",
          textAlign: "center",
          name: "Date",
        },
      ),
    );
    setPanelOpen(true);
  };
  const addTools: {
    icon: ReactNode;
    label: string;
    category: "Media" | "Text" | "Elements";
    on: () => void;
  }[] = [
    {
      icon: <ImagePlus />,
      label: "Upload image",
      category: "Media",
      on: () => fileRef.current?.click(),
    },
    { icon: <Type />, label: "Add text", category: "Text", on: addText },
    { icon: <Heading />, label: "Heading", category: "Text", on: () => addTextPreset("heading") },
    {
      icon: <Type />,
      label: "Subheading",
      category: "Text",
      on: () => addTextPreset("subheading"),
    },
    { icon: <AlignLeft />, label: "Body text", category: "Text", on: () => addTextPreset("body") },
    { icon: <Type />, label: "Text styles", category: "Text", on: () => openTab("textPresets") },
    { icon: <CalendarDays />, label: "Date", category: "Text", on: addDate },
    { icon: <Shapes />, label: "Shapes", category: "Elements", on: () => openTab("shapes") },
    { icon: <Smile />, label: "Stickers", category: "Elements", on: () => openTab("stickers") },
    {
      icon: <Star />,
      label: "Icons & illustrations",
      category: "Elements",
      on: () => openTab("icons"),
    },
    { icon: <Frame />, label: "Frames", category: "Elements", on: () => openTab("frames") },
    { icon: <Grid3X3 />, label: "Grids", category: "Elements", on: () => openTab("grids") },
    {
      icon: <Sparkles />,
      label: "Decorations",
      category: "Elements",
      on: () => openTab("decorations"),
    },
  ];
  const addTabs: Tab[] = [
    "add",
    "textTools",
    "textPresets",
    "shapes",
    "stickers",
    "icons",
    "frames",
    "grids",
    "decorations",
    "vector",
  ];
  const mainTools: { icon: ReactNode; label: string; active: boolean; on: () => void }[] = [
    { icon: <Grid2X2 />, label: "Design", active: tab === "edit", on: () => openTab("edit") },
    {
      icon: <Shapes />,
      label: "Elements",
      active: ["add", "shapes", "stickers", "icons", "frames", "grids", "decorations"].includes(
        tab,
      ),
      on: () => openTab("add"),
    },
    {
      icon: <Type />,
      label: "Text",
      active: ["textTools", "textPresets"].includes(tab) || (isTextSelected && tab === "props"),
      on: () => openTab(isTextSelected ? "textTools" : "textPresets"),
    },
    {
      icon: <ImagePlus />,
      label: "Uploads",
      active: false,
      on: () => {
        setPanelOpen(false);
        fileRef.current?.click();
      },
    },
    { icon: <Paintbrush />, label: "Draw", active: tab === "draw", on: () => openTab("draw") },
    { icon: <Pencil />, label: "Vector", active: tab === "vector", on: () => openTab("vector") },
    {
      icon: <PaintBucket />,
      label: "Color",
      active: ["colors", "fill", "stroke"].includes(tab),
      on: () => openTab("colors"),
    },
    {
      icon: <Scan />,
      label: "Arrange",
      active: ["position", "props"].includes(tab) && !isTextSelected && !isImageSelected,
      on: () => openTab("position"),
    },
    { icon: <Layers />, label: "Layers", active: tab === "layers", on: () => openTab("layers") },
    {
      icon: <SlidersHorizontal />,
      label: "Effects",
      active: ["effects", "edit"].includes(tab),
      on: () => openTab(o ? "effects" : "edit"),
    },
    { icon: <FolderOpen />, label: "Projects", active: false, on: () => setSaveHomeOpen(true) },
    {
      icon: <WandSparkles />,
      label: "AI Tools",
      active: aiOpen,
      on: () => setAiOpen((value) => !value),
    },
    { icon: <Grid2X2 />, label: "Canvas", active: tab === "bg", on: () => openTab("bg") },
  ];
  const tools = mainTools;
  const requestHome = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setSaveHomeOpen(true);
  };
  const saveProjectAndHome = async () => {
    await persist();
    setSaveHomeOpen(false);
    nav({ to: "/" });
  };
  const exportAndHome = async (kind: "png" | "jpg" | "pdf") => {
    await exportAs(kind);
    setSaveHomeOpen(false);
    nav({ to: "/" });
  };

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      {/* top bar */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-2 sm:px-4">
        <Logo compact onClick={requestHome} />
        <input
          className="min-w-0 max-w-[40vw] rounded-md bg-transparent px-2 py-1 text-sm font-medium outline-none hover:bg-muted focus:bg-muted sm:max-w-xs"
          defaultValue={proj.current?.name}
          key={ready ? "r" : "n"}
          onBlur={(e) => {
            if (proj.current) {
              proj.current.name = e.target.value || "Untitled design";
              persist();
            }
          }}
        />
        <button
          title="Canvas settings"
          aria-label="Canvas settings"
          onClick={() => openTab("bg")}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
        >
          <Grid2X2 className="h-4 w-4" />
          <span className="hidden sm:inline">Canvas</span>
        </button>
        <button
          title="AI design assistant"
          aria-label="AI design assistant"
          onClick={() => setAiOpen((v) => !v)}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs ${aiOpen ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
        >
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">Assistant</span>
        </button>
        <span
          role="status"
          title={saved ? "All changes saved" : "Saving project changes"}
          className="hidden whitespace-nowrap text-xs text-muted-foreground sm:inline"
        >
          {saved ? "Saved" : "Saving…"}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <IconBtn label="Undo" disabled={h.i <= 0} onClick={undo}>
            <Undo2 />
          </IconBtn>
          <IconBtn label="Redo" disabled={h.i >= h.stack.length - 1} onClick={redo}>
            <Redo2 />
          </IconBtn>
          <div className="relative">
            <button
              onClick={() => setExportOpen((v) => !v)}
              className="ml-1 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              <Download className="h-4 w-4" /> <span className="hidden sm:inline">Export</span>
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-11 z-50 max-h-[70vh] w-64 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-xl">
                {(
                  [
                    ["png", "PNG"],
                    ["tpng", "Transparent PNG"],
                    ["jpg", "JPG"],
                    ["pdf", "PDF"],
                  ] as const
                ).map(([k, l]) => (
                  <button
                    key={k}
                    onClick={() => exportAs(k)}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    {l}
                  </button>
                ))}
                <div className="my-1 border-t border-border" />
                <button
                  disabled={!o}
                  onClick={exportSelectedObject}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-40"
                >
                  Export selected object (PNG)
                </button>
                <button
                  onClick={() => {
                    void exportLibraryPdf();
                    setExportOpen(false);
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  Export all saved designs as multi-page PDF
                </button>
                <button
                  onClick={() => {
                    void copyPng(!!o);
                    setExportOpen(false);
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  Copy image
                </button>
                <button
                  onClick={() => {
                    void copyPng(false);
                    setExportOpen(false);
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  Copy as PNG
                </button>
                <button
                  onClick={() => {
                    void shareDesign();
                    setExportOpen(false);
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  Share design image
                </button>
                <button
                  onClick={() => {
                    exportSvg();
                    setExportOpen(false);
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  Export design as SVG
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {aiProposal?.status === "preview" && (
        <div className="fixed inset-0 z-40 cursor-not-allowed bg-background/5" aria-hidden="true" />
      )}
      {aiOpen && (
        <section
          ref={aiPanelRef}
          role="dialog"
          aria-label="AI Design Director"
          aria-modal={aiProposal?.status === "preview"}
          tabIndex={-1}
          className="fixed inset-x-2 bottom-20 z-50 flex max-h-[65vh] flex-col overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur md:bottom-auto md:left-auto md:right-4 md:top-16 md:w-96"
        >
          <div className="flex items-center gap-2 border-b border-border p-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">AI Design Director</h2>
            <button
              className="ml-auto rounded p-1 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setAiOpen(false)}
              aria-label="Close assistant"
              disabled={aiProposal?.status === "preview"}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {aiMessages.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Ask for a design review or a direct edit. I’ll explain suggested changes first;
                nothing is applied until you preview and accept it.
              </p>
            )}
            {aiMessages.map((message, i) => (
              <div
                key={i}
                className={`rounded-lg p-2 text-sm ${message.role === "user" ? "ml-5 bg-primary/15" : "mr-5 bg-muted"}`}
              >
                {message.text}
              </div>
            ))}
            {aiProposal && (
              <div
                className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-3"
                aria-label="AI design proposal"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">Design proposal</span>
                  <span className="text-xs text-muted-foreground">
                    {aiProposal.actions.length}{" "}
                    {aiProposal.actions.length === 1 ? "change" : "changes"}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{aiProposal.reply}</p>
                <ol className="list-inside list-decimal space-y-1 text-xs text-muted-foreground">
                  {aiProposal.actions.map((action, index) => (
                    <li key={`${action.type}-${index}`}>{describeAiAction(action)}</li>
                  ))}
                </ol>
                <p className="text-xs text-muted-foreground">
                  {aiProposal.status === "preview"
                    ? "Preview only — the canvas is not saved. Accept to keep these edits or reject to restore your original design."
                    : "Your canvas is unchanged. Preview these edits before deciding."}
                </p>
                <div className="flex gap-2">
                  {aiProposal.status === "suggested" ? (
                    <button
                      type="button"
                      onClick={() => void previewAiProposal()}
                      className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                    >
                      Preview changes
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={acceptAiProposal}
                      className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                    >
                      Accept changes
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void rejectAiProposal()}
                    className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
                  >
                    {aiProposal.status === "preview" ? "Reject & restore" : "Dismiss"}
                  </button>
                </div>
              </div>
            )}
            {aiBusy && <p className="text-xs text-muted-foreground">Working on your design…</p>}
          </div>
          <form
            className="flex gap-2 border-t border-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void runAssistant();
            }}
          >
            <input
              className="field min-w-0 flex-1"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Ask for a design review…"
              disabled={aiBusy || !!aiProposal}
            />
            <button
              className="rounded-lg bg-primary p-2 text-primary-foreground disabled:opacity-50"
              disabled={aiBusy || !!aiProposal || !aiPrompt.trim()}
              aria-label="Ask the AI Design Director"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>
      )}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* tool rail desktop */}
        <nav
          aria-label="Design tools"
          className="hidden w-20 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border bg-card p-2 md:flex"
        >
          {tools.map((t) => (
            <Button
              variant="ghost"
              disabled={!ready && !["Projects", "AI Tools"].includes(t.label)}
              key={t.label}
              title={t.label}
              aria-pressed={t.active}
              onClick={t.on}
              className={`min-h-14 shrink-0 flex-col gap-1 px-0 text-[10px] leading-tight [&_svg]:size-5 ${t.active ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
            >
              {t.icon}
              {t.label}
            </Button>
          ))}
        </nav>

        {/* canvas area */}
        <div className="relative min-h-0 min-w-0 flex-1">
          <div
            ref={wrapRef}
            onWheel={onWheel}
            onPointerDown={(e) => {
              if (hand && wrapRef.current) {
                drag.current = {
                  x: e.clientX,
                  y: e.clientY,
                  sl: wrapRef.current.scrollLeft,
                  st: wrapRef.current.scrollTop,
                };
              }
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (d && wrapRef.current) {
                wrapRef.current.scrollLeft = d.sl - (e.clientX - d.x);
                wrapRef.current.scrollTop = d.st - (e.clientY - d.y);
              }
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerLeave={() => (drag.current = null)}
            onContextMenu={(event) => {
              event.preventDefault();
              const c = fc.current;
              const target = c?.findTarget?.(event.nativeEvent);
              if (target) c.setActiveObject(target);
              if (target) {
                force();
                setContextMenu({
                  x: Math.max(8, Math.min(event.clientX, window.innerWidth - 220)),
                  y: Math.max(
                    8,
                    Math.min(
                      event.clientY,
                      window.innerHeight - Math.min(500, window.innerHeight * 0.75),
                    ),
                  ),
                });
              } else setContextMenu(null);
            }}
            className={`workspace absolute inset-x-0 top-0 ${panelOpen ? (panelExpanded ? "bottom-[38dvh] md:bottom-0 md:left-[320px]" : "bottom-[26dvh] md:bottom-0 md:left-[320px]") : "bottom-36 md:bottom-0"} overflow-auto ${hand ? "cursor-grab active:cursor-grabbing" : ""}`}
          >
            <div
              className="flex min-h-full min-w-full items-center justify-center p-6"
              style={{ width: "max-content" }}
            >
              <div className={`checker relative shadow-2xl ${hand ? "pointer-events-none" : ""}`}>
                <canvas ref={canvasEl} />
                {vectorMode && vectorDraft.length > 0 && (
                  <svg
                    className="pointer-events-none absolute left-0 top-0 z-20 overflow-visible"
                    width={W() * zoom}
                    height={H() * zoom}
                    viewBox={`0 0 ${W()} ${H()}`}
                    aria-hidden="true"
                  >
                    <path
                      d={vectorPathData(vectorDraft, vectorClosed)}
                      fill={vectorClosed ? `${vectorFill}44` : "none"}
                      stroke={vectorColor}
                      strokeWidth={vectorWidth}
                      strokeDasharray={
                        vectorStrokeStyle === "dashed"
                          ? `${vectorWidth * 2} ${vectorWidth}`
                          : vectorStrokeStyle === "dotted"
                            ? `1 ${vectorWidth * 1.6}`
                            : undefined
                      }
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {vectorDraft.map((point, index) => (
                      <g key={index}>
                        {point.handleIn && (
                          <>
                            <line
                              x1={point.x}
                              y1={point.y}
                              x2={point.handleIn.x}
                              y2={point.handleIn.y}
                              stroke="#0ea5e9"
                              strokeWidth={1 / zoom}
                            />
                            <circle
                              cx={point.handleIn.x}
                              cy={point.handleIn.y}
                              r={4 / zoom}
                              fill="#fff"
                              stroke="#0ea5e9"
                              strokeWidth={1.5 / zoom}
                            />
                          </>
                        )}
                        {point.handleOut && (
                          <>
                            <line
                              x1={point.x}
                              y1={point.y}
                              x2={point.handleOut.x}
                              y2={point.handleOut.y}
                              stroke="#0ea5e9"
                              strokeWidth={1 / zoom}
                            />
                            <circle
                              cx={point.handleOut.x}
                              cy={point.handleOut.y}
                              r={4 / zoom}
                              fill="#fff"
                              stroke="#0ea5e9"
                              strokeWidth={1.5 / zoom}
                            />
                          </>
                        )}
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={5 / zoom}
                          fill="#fff"
                          stroke="#2563eb"
                          strokeWidth={2 / zoom}
                        />
                        <text
                          x={point.x + 7 / zoom}
                          y={point.y - 7 / zoom}
                          fontSize={10 / zoom}
                          fill="#1e40af"
                        >
                          {index + 1}
                        </text>
                      </g>
                    ))}
                  </svg>
                )}
                {showGrid && (
                  <div
                    className="pointer-events-none absolute inset-0 z-10"
                    aria-hidden="true"
                    style={{
                      backgroundImage:
                        "linear-gradient(to right, rgba(100,116,139,.23) 1px, transparent 1px), linear-gradient(to bottom, rgba(100,116,139,.23) 1px, transparent 1px)",
                      backgroundSize: `${Math.max(1, gridSpacing * zoom)}px ${Math.max(1, gridSpacing * zoom)}px`,
                    }}
                  />
                )}
                {guides.map((guide, index) => (
                  <div
                    key={`${guide.axis}-${index}`}
                    className="pointer-events-none absolute z-20 bg-fuchsia-500/80"
                    aria-hidden="true"
                    style={
                      guide.axis === "x"
                        ? { left: guide.value * zoom - 1, top: 0, bottom: 0, width: 2 }
                        : { top: guide.value * zoom - 1, left: 0, right: 0, height: 2 }
                    }
                  />
                ))}
                {alignmentGuides.map((guide, index) => {
                  const color =
                    guide.source === "canvas-center"
                      ? "#ef4444"
                      : guide.source === "manual"
                        ? "#d946ef"
                        : "#3b82f6";
                  return (
                    <div
                      key={`${guide.axis}-${guide.value}-${guide.source}-${index}`}
                      className="pointer-events-none absolute z-20"
                      aria-hidden="true"
                      style={{
                        backgroundColor: color,
                        boxShadow: `0 0 2px ${color}`,
                        ...(guide.axis === "x"
                          ? { left: guide.value * zoom - 1, top: 0, bottom: 0, width: 2 }
                          : { top: guide.value * zoom - 1, left: 0, right: 0, height: 2 }),
                      }}
                    />
                  );
                })}
                {distanceMarkers.map((marker, index) => {
                  const horizontal = marker.orientation === "horizontal";
                  const lineLength = marker.distance * zoom;
                  return (
                    <div
                      key={`${marker.orientation}-${marker.start}-${marker.position}-${index}`}
                      className="pointer-events-none absolute z-30"
                      aria-hidden="true"
                      style={
                        horizontal
                          ? {
                              left: marker.start * zoom,
                              top: marker.position * zoom,
                              width: lineLength,
                              height: 1,
                            }
                          : {
                              left: marker.position * zoom,
                              top: marker.start * zoom,
                              width: 1,
                              height: lineLength,
                            }
                      }
                    >
                      <div className="absolute inset-0 bg-slate-800 dark:bg-slate-100" />
                      <span
                        className={`absolute whitespace-nowrap rounded bg-slate-900 px-1 py-0.5 text-[9px] font-semibold text-white shadow ${horizontal ? "bottom-1 left-1/2 -translate-x-1/2" : "left-1 top-1/2 -translate-y-1/2"}`}
                      >
                        {Math.round(marker.distance)} px
                      </span>
                      <span
                        className={
                          horizontal
                            ? "absolute -left-px -top-1 h-2 w-px bg-slate-800 dark:bg-slate-100"
                            : "absolute -left-1 -top-px h-px w-2 bg-slate-800 dark:bg-slate-100"
                        }
                      />
                      <span
                        className={
                          horizontal
                            ? "absolute -right-px -top-1 h-2 w-px bg-slate-800 dark:bg-slate-100"
                            : "absolute -left-1 -bottom-px h-px w-2 bg-slate-800 dark:bg-slate-100"
                        }
                      />
                    </div>
                  );
                })}
                {showRulers && (
                  <div className="pointer-events-none absolute inset-0 z-30" aria-hidden="true">
                    <div className="absolute left-0 right-0 top-0 flex h-4 overflow-hidden border-b border-slate-500/40 bg-slate-100/85 text-[8px] text-slate-700">
                      {Array.from({ length: Math.ceil(W() / 50) }, (_, i) => (
                        <span
                          key={i}
                          className="relative h-full shrink-0 border-l border-slate-500/50 pl-0.5"
                          style={{ width: 50 * zoom }}
                        >
                          {i * 50}
                        </span>
                      ))}
                    </div>
                    <div className="absolute bottom-0 left-0 top-0 flex w-4 flex-col overflow-hidden border-r border-slate-500/40 bg-slate-100/85 text-[8px] text-slate-700">
                      {Array.from({ length: Math.ceil(H() / 50) }, (_, i) => (
                        <span
                          key={i}
                          className="relative w-full shrink-0 border-t border-slate-500/50"
                          style={{ height: 50 * zoom }}
                        >
                          <span className="absolute left-0 top-0">{i * 50}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          {o && selectionInsideCanvas && (
            <div
              className="pointer-events-auto absolute z-30 flex max-w-[calc(100%-1rem)] items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card/95 p-1 shadow-xl backdrop-blur"
              style={{ left: toolbarLeft, top: toolbarTop }}
            >
              <IconBtn
                label={
                  isTextSelected
                    ? "Edit text style"
                    : isImageSelected
                      ? "Crop and edit image"
                      : "Edit object"
                }
                onClick={() => openTab(isTextSelected ? "textTools" : "props")}
              >
                <Pencil />
              </IconBtn>
              {isTextSelected && (
                <>
                  <IconBtn
                    label="Toggle bold"
                    active={o.fontWeight === "bold"}
                    onClick={() => {
                      o.set("fontWeight", o.fontWeight === "bold" ? "normal" : "bold");
                      commit();
                    }}
                  >
                    <Bold />
                  </IconBtn>
                  <IconBtn
                    label="Toggle italic"
                    active={o.fontStyle === "italic"}
                    onClick={() => {
                      o.set("fontStyle", o.fontStyle === "italic" ? "normal" : "italic");
                      commit();
                    }}
                  >
                    <Italic />
                  </IconBtn>
                  <input
                    type="color"
                    aria-label="Text color"
                    title="Text color"
                    className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent"
                    value={toHex(o.fill, "#111111")}
                    onChange={(event) => {
                      o.set("fill", event.target.value);
                      rememberPaletteColor(event.target.value);
                      commit();
                    }}
                  />
                </>
              )}
              {isImageSelected && (
                <>
                  <IconBtn
                    label="Flip horizontal"
                    onClick={() => {
                      o.set("flipX", !o.flipX);
                      commit();
                    }}
                  >
                    <FlipHorizontal />
                  </IconBtn>
                  <IconBtn
                    label="Rotate left"
                    onClick={() => {
                      o.rotate((o.angle ?? 0) - 15);
                      commit();
                    }}
                  >
                    <RotateCcw />
                  </IconBtn>
                </>
              )}
              {isElementSelected && !isTextSelected && !isImageSelected && (
                <input
                  type="color"
                  aria-label="Shape fill color"
                  title="Shape fill color"
                  className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent"
                  value={toHex(o.fill, "#c6f432")}
                  onChange={(event) => {
                    o.set("fill", event.target.value);
                    rememberPaletteColor(event.target.value);
                    commit();
                  }}
                />
              )}
              {o.type === "activeselection" && (
                <IconBtn label="Group selected objects" onClick={groupSelection}>
                  <GroupIcon />
                </IconBtn>
              )}
              {o.type === "group" && (
                <IconBtn label="Ungroup objects" onClick={ungroupSelection}>
                  <Ungroup />
                </IconBtn>
              )}
              <IconBtn label="Bring forward" onClick={() => order("up")}>
                <ArrowUp />
              </IconBtn>
              <IconBtn
                label="Duplicate"
                onClick={() => {
                  void dup();
                }}
              >
                <Copy />
              </IconBtn>
              <IconBtn label="Delete" className="text-destructive" onClick={del}>
                <Trash2 />
              </IconBtn>
            </div>
          )}
          {/* zoom controls */}
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-card/95 px-2 py-1 shadow-lg backdrop-blur">
            <IconBtn label="Zoom out" onClick={() => applyZoom(zoom / 1.2)}>
              <ZoomOut />
            </IconBtn>
            <span className="w-12 text-center text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
            <IconBtn label="Zoom in" onClick={() => applyZoom(zoom * 1.2)}>
              <ZoomIn />
            </IconBtn>
            <IconBtn label="Fit to screen" onClick={fit}>
              <Maximize />
            </IconBtn>
            <IconBtn label="Pan" active={hand} onClick={() => setHand((v) => !v)}>
              <Hand />
            </IconBtn>
            {o && (
              <IconBtn
                label="Edit properties"
                className="md:hidden"
                onClick={() => openTab("props")}
              >
                <SlidersHorizontal />
              </IconBtn>
            )}
          </div>
        </div>

        {/* side panel */}
        <aside
          id="mobile-editor-panel"
          aria-label="Editing tools"
          className={`${panelOpen ? "flex" : "hidden"} fixed inset-x-0 bottom-36 z-40 ${panelExpanded ? "h-[38dvh]" : "h-[26dvh]"} max-h-none flex-col rounded-t-xl border-t border-border bg-card/95 shadow-2xl backdrop-blur transition-[height] duration-200 md:inset-x-auto md:bottom-0 md:left-20 md:top-14 md:h-auto md:w-[320px] md:rounded-none md:rounded-r-xl md:border-b-0 md:border-l md:border-t-0 md:shadow-xl`}
        >
          <div className="flex min-w-0 shrink-0 items-center gap-1 border-b border-border p-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              {contextualTabs.map((t) => (
                <Button
                  variant="ghost"
                  size="sm"
                  key={t}
                  title={tabLabel[t]}
                  aria-label={tabLabel[t]}
                  onClick={() => setTab(t)}
                  className={`min-w-0 basis-[calc(33.333%-0.25rem)] justify-center px-1 text-[10px] leading-tight md:basis-auto md:px-2 ${tab === t ? "bg-muted text-foreground" : "text-muted-foreground"}`}
                >
                  <span className="inline-flex min-w-0 items-center gap-1 [&_svg]:h-4 [&_svg]:w-4">
                    <span className="shrink-0">{tabIcon[t]}</span>
                    <span className="truncate">{tabLabel[t]}</span>
                  </span>
                </Button>
              ))}
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1 md:hidden">
              <button
                className="rounded p-1.5 hover:bg-muted"
                aria-controls="mobile-editor-panel"
                aria-expanded={panelExpanded}
                aria-label={panelExpanded ? "Shrink editing panel" : "Expand editing panel"}
                title={panelExpanded ? "Compact panel" : "Expand panel"}
                onClick={() => setPanelExpanded((value) => !value)}
              >
                {panelExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </button>
              <button
                className="rounded p-1.5 hover:bg-muted"
                aria-label="Minimize editing panel"
                title="Minimize panel"
                onClick={() => setPanelOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div
            ref={panelContentRef}
            className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-3 sm:p-4"
          >
            {ready && tab === "add" && (
              <div className="grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {(["Media", "Text", "Elements"] as const).map((category) => (
                  <section key={category} className="min-w-0 rounded-lg border border-border p-3">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {category}
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {addTools
                        .filter((item) => item.category === category)
                        .map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={item.on}
                            className="flex min-h-12 min-w-0 items-center gap-2 rounded-md border border-border px-2 py-2 text-left text-xs hover:bg-muted"
                          >
                            <span className="shrink-0 text-primary [&_svg]:h-4 [&_svg]:w-4">
                              {item.icon}
                            </span>
                            <span className="min-w-0 break-words">{item.label}</span>
                          </button>
                        ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
            {ready &&
              fab.current &&
              tab === "props" &&
              (o ? (
                <Properties
                  o={o}
                  f={fab.current}
                  commit={commit}
                  onPickColor={pickColorFromCanvas}
                  mode="legacy"
                  actions={{
                    dup,
                    del,
                    order,
                    toggleLock,
                    group: groupSelection,
                    ungroup: ungroupSelection,
                    align: alignToCanvas,
                  }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select an element on the canvas to edit it.
                </p>
              ))}
            {ready &&
              fab.current &&
              o &&
              ["textTools", "position", "fill", "stroke", "effects"].includes(tab) && (
                <ContextualTools
                  o={o}
                  f={fab.current}
                  mode={tab as EditMode}
                  commit={commit}
                  onEraseBackground={(mode, color, tol) => {
                    void eraseImageBackground(mode, color, tol);
                  }}
                  eraseBusy={eraseBusy}
                  onPickColor={pickColorFromCanvas}
                  onMaskImage={maskImage}
                  onAlign={alignToCanvas}
                />
              )}
            {ready && tab === "position" && !o && (
              <p className="text-sm text-muted-foreground">
                Select an object to position, resize, rotate, flip, or align it to the canvas.
              </p>
            )}
            {ready && tab === "textPresets" && (
              <Grid>
                {(
                  [
                    ["heading", "Heading", "Aa"],
                    ["subheading", "Subheading", "Ab"],
                    ["body", "Body text", "Ag"],
                  ] as const
                ).map(([preset, label, sample]) => (
                  <Tile key={preset} onClick={() => addTextPreset(preset)}>
                    <span className="font-display text-2xl font-bold">{sample}</span>
                    <span className="text-[10px]">{label}</span>
                  </Tile>
                ))}
              </Grid>
            )}
            {ready &&
              tab === "frames" &&
              (isImageSelected ? (
                <Grid>
                  {(
                    ["square", "circle", "rounded", "triangle", "star", "heart", "polygon"] as const
                  ).map((shape) => (
                    <Tile key={shape} onClick={() => maskImage(shape)}>
                      <Frame className="h-7 w-7 text-primary" />
                      <span className="text-[10px] capitalize">{shape}</span>
                    </Tile>
                  ))}
                </Grid>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select or upload an image, then choose a frame shape to crop it.
                </p>
              ))}
            {ready && tab === "grids" && (
              <Grid>
                <Tile onClick={addGrid}>
                  <Grid3X3 className="h-7 w-7 text-primary" />
                  <span className="text-[10px]">2 × 2 photo grid</span>
                </Tile>
              </Grid>
            )}
            {ready && tab === "decorations" && (
              <Grid>
                <Tile onClick={addDecoration}>
                  <Sparkles className="h-7 w-7 text-primary" />
                  <span className="text-[10px]">Star ornament</span>
                </Tile>
                <Tile onClick={() => addShape("star")}>
                  <Star className="h-7 w-7 text-primary" />
                  <span className="text-[10px]">Star shape</span>
                </Tile>
                <Tile onClick={() => addShape("line")}>
                  <span className="text-2xl text-primary">— — —</span>
                  <span className="text-[10px]">Divider</span>
                </Tile>
              </Grid>
            )}
            {ready && tab === "edit" && <DesignEdit c={fc.current} commit={commit} />}
            {ready && fc.current && fab.current && tab === "colors" && (
              <ColorTools
                c={fc.current}
                f={fab.current}
                selected={o}
                commit={commit}
                onPickColor={pickColorFromCanvas}
              />
            )}
            {ready && tab === "draw" && (
              <DrawingPanel
                tool={drawingTool}
                setTool={chooseDrawingTool}
                color={drawColor}
                setColor={setDrawColor}
                size={brushSize}
                setSize={setBrushSize}
                style={strokeStyle}
                setStyle={setStrokeStyle}
                onPickColor={pickColorFromCanvas}
              />
            )}
            {ready && tab === "vector" && (
              <div className="grid w-full max-w-5xl grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <Section title="Professional pen">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Click to add anchor points. Drag while placing a point to pull out opposing
                    Bézier handles and curve the segment. Double-click or press Enter to finish;
                    click the first point to close a shape. Escape cancels; Backspace removes the
                    last point.
                  </p>
                  {!vectorMode ? (
                    <button
                      type="button"
                      className="w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                      onClick={() => {
                        setDrawingTool(null);
                        vectorDraftRef.current = [];
                        setVectorDraft([]);
                        setVectorClosed(false);
                        setVectorMode(true);
                        setPanelOpen(true);
                      }}
                    >
                      Start vector path
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className="rounded-md bg-primary px-2 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
                        disabled={vectorDraft.length < 2}
                        onClick={() => vectorActionsRef.current?.finish(vectorClosed)}
                      >
                        Finish path
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-border px-2 py-2 text-xs hover:bg-muted"
                        onClick={() => vectorActionsRef.current?.undo()}
                      >
                        Undo anchor
                      </button>
                      <label className="col-span-2 flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={vectorClosed}
                          onChange={(event) => setVectorClosed(event.target.checked)}
                        />{" "}
                        Close and fill as a shape
                      </label>
                      <button
                        type="button"
                        className="col-span-2 rounded-md border border-border px-2 py-2 text-xs hover:bg-muted"
                        onClick={() => {
                          vectorActionsRef.current = null;
                          vectorDraftRef.current = [];
                          setVectorDraft([]);
                          setVectorClosed(false);
                          setVectorMode(false);
                        }}
                      >
                        Cancel path
                      </button>
                    </div>
                  )}
                  {vectorMode && (
                    <p className="text-xs font-medium text-primary">
                      Pen active · {vectorDraft.length} anchor{vectorDraft.length === 1 ? "" : "s"}
                    </p>
                  )}
                </Section>
                <Section title="Path appearance">
                  <Color
                    label="Stroke color"
                    value={vectorColor}
                    onChange={setVectorColor}
                    onPick={pickColorFromCanvas}
                  />
                  <Slider
                    label="Stroke thickness"
                    value={vectorWidth}
                    min={0.5}
                    max={40}
                    step={0.5}
                    onChange={setVectorWidth}
                  />
                  <label className="block text-xs text-muted-foreground">
                    Stroke style
                    <select
                      className="field mt-1 h-9"
                      value={vectorStrokeStyle}
                      onChange={(event) =>
                        setVectorStrokeStyle(event.target.value as typeof vectorStrokeStyle)
                      }
                    >
                      <option value="solid">Solid</option>
                      <option value="dashed">Dashed</option>
                      <option value="dotted">Dotted</option>
                    </select>
                  </label>
                  <Color
                    label="Closed path fill"
                    value={vectorFill}
                    onChange={setVectorFill}
                    onPick={pickColorFromCanvas}
                  />
                </Section>
                <Section title="SVG import and export">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Import SVG artwork as editable canvas objects, or export the entire current
                    design as SVG.
                  </p>
                  <button
                    type="button"
                    className="w-full rounded-md border border-border px-3 py-2 text-xs hover:bg-muted"
                    onClick={() => vectorFileRef.current?.click()}
                  >
                    Import SVG file
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-md border border-border px-3 py-2 text-xs hover:bg-muted"
                    onClick={exportSvg}
                  >
                    Export design as SVG
                  </button>
                </Section>
                {vectorObjectPoints && activeVectorPoint && (
                  <Section title="Edit vector anchor and Bézier handles">
                    {!vectorPointEditSupported && (
                      <p className="text-xs text-amber-600">
                        Point editing is available before rotating or scaling this path.
                      </p>
                    )}
                    {vectorObjectPoints.length >= 3 && !o?.gridoraClosed && (
                      <button
                        type="button"
                        className="w-full rounded-md border border-border px-2 py-2 text-xs hover:bg-muted"
                        onClick={convertVectorToShape}
                      >
                        Convert path to filled shape
                      </button>
                    )}
                    <label className="block text-xs text-muted-foreground">
                      Anchor point
                      <select
                        className="field mt-1 h-9"
                        value={Math.min(vectorPointIndex, vectorObjectPoints.length - 1)}
                        onChange={(event) => setVectorPointIndex(Number(event.target.value))}
                      >
                        {vectorObjectPoints.map((_, index) => (
                          <option key={index} value={index}>
                            Point {index + 1} of {vectorObjectPoints.length}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <NumberField
                        label="Anchor X"
                        value={activeVectorPoint.x}
                        onChange={(value) => editVectorPoint(vectorPointIndex, "x", value)}
                      />
                      <NumberField
                        label="Anchor Y"
                        value={activeVectorPoint.y}
                        onChange={(value) => editVectorPoint(vectorPointIndex, "y", value)}
                      />
                    </div>
                    <p className="pt-1 text-[11px] font-semibold text-muted-foreground">
                      Incoming Bézier handle
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <NumberField
                        label="Handle in X"
                        value={activeVectorPoint.handleIn?.x ?? activeVectorPoint.x}
                        onChange={(value) => editVectorPoint(vectorPointIndex, "handleInX", value)}
                      />
                      <NumberField
                        label="Handle in Y"
                        value={activeVectorPoint.handleIn?.y ?? activeVectorPoint.y}
                        onChange={(value) => editVectorPoint(vectorPointIndex, "handleInY", value)}
                      />
                    </div>
                    <p className="pt-1 text-[11px] font-semibold text-muted-foreground">
                      Outgoing Bézier handle
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <NumberField
                        label="Handle out X"
                        value={activeVectorPoint.handleOut?.x ?? activeVectorPoint.x}
                        onChange={(value) => editVectorPoint(vectorPointIndex, "handleOutX", value)}
                      />
                      <NumberField
                        label="Handle out Y"
                        value={activeVectorPoint.handleOut?.y ?? activeVectorPoint.y}
                        onChange={(value) => editVectorPoint(vectorPointIndex, "handleOutY", value)}
                      />
                    </div>
                  </Section>
                )}
              </div>
            )}
            {ready && tab === "layers" && (
              <div className="space-y-1">
                {objects.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No layers yet. Add text, images or shapes.
                  </p>
                )}
                {objects.map((x, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm ${o === x ? "border-primary bg-primary/10" : "border-border"}`}
                  >
                    <button
                      className="min-w-0 flex-1 truncate text-left"
                      onClick={() => {
                        if (!x.lockedLayer && x.visible) {
                          fc.current.setActiveObject(x);
                          fc.current.requestRenderAll();
                          force();
                        }
                      }}
                    >
                      {x.name || x.type}
                      {x.text ? `: ${x.text.slice(0, 18)}` : ""}
                    </button>
                    <IconBtn label={x.visible ? "Hide" : "Show"} onClick={() => toggleVis(x)}>
                      {x.visible ? <Eye /> : <EyeOff />}
                    </IconBtn>
                    <IconBtn
                      label={x.lockedLayer ? "Unlock" : "Lock"}
                      onClick={() => toggleLock(x)}
                    >
                      {x.lockedLayer ? <Lock /> : <Unlock />}
                    </IconBtn>
                  </div>
                ))}
                {o && (
                  <div className="grid grid-cols-4 gap-1 pt-3">
                    <IconBtn label="Bring to front" onClick={() => order("top")}>
                      <ChevronsUp />
                    </IconBtn>
                    <IconBtn label="Bring forward" onClick={() => order("up")}>
                      <ArrowUp />
                    </IconBtn>
                    <IconBtn label="Send backward" onClick={() => order("down")}>
                      <ArrowDown />
                    </IconBtn>
                    <IconBtn label="Send to back" onClick={() => order("bottom")}>
                      <ChevronsDown />
                    </IconBtn>
                  </div>
                )}
                {o?.type === "activeselection" &&
                  (fc.current?.getActiveObjects?.().length ?? 0) >= 3 && (
                    <div className="grid grid-cols-2 gap-1 pt-2">
                      <button
                        className="rounded-md border border-border px-2 py-1.5 text-xs hover:bg-muted"
                        onClick={() => spaceEvenly("x")}
                      >
                        Space evenly horizontally
                      </button>
                      <button
                        className="rounded-md border border-border px-2 py-1.5 text-xs hover:bg-muted"
                        onClick={() => spaceEvenly("y")}
                      >
                        Space evenly vertically
                      </button>
                    </div>
                  )}
              </div>
            )}
            {ready && fab.current && proj.current && tab === "bg" && (
              <CanvasPanel
                c={fc.current}
                f={fab.current}
                proj={proj.current}
                commit={commit}
                addImage={() => backgroundFileRef.current?.click()}
                resize={(w, hh) => {
                  if (!proj.current) return;
                  proj.current = { ...proj.current, width: w, height: hh };
                  fit();
                  commit();
                }}
                showGrid={showGrid}
                setShowGrid={setShowGrid}
                gridSpacing={gridSpacing}
                setGridSpacing={setGridSpacing}
                showRulers={showRulers}
                setShowRulers={setShowRulers}
                guides={guides}
                setGuides={setGuides}
                snapAlign={snapAlign}
                setSnapAlign={setSnapAlign}
                snapToGrid={snapToGrid}
                setSnapToGrid={setSnapToGrid}
                onClear={() => setClearOpen(true)}
              />
            )}
            {ready && tab === "shapes" && (
              <Grid>
                {[
                  "rect",
                  "rounded",
                  "circle",
                  "ellipse",
                  "triangle",
                  "pentagon",
                  "hexagon",
                  "star",
                  "line",
                  "arrow",
                ].map((k) => (
                  <Tile key={k} onClick={() => addShape(k)}>
                    <ShapeIcon k={k} />
                    <span className="text-[10px] capitalize">{k}</span>
                  </Tile>
                ))}
              </Grid>
            )}
            {ready && tab === "stickers" && (
              <Grid>
                {STICKERS.map((s) => (
                  <Tile key={s} onClick={() => addSticker(s)}>
                    <span className="text-3xl">{s}</span>
                  </Tile>
                ))}
              </Grid>
            )}
            {ready && tab === "icons" && (
              <Grid>
                {Object.keys(ICONS).map((n) => (
                  <Tile key={n} onClick={() => addIcon(n)}>
                    <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current">
                      <path d={ICONS[n]} />
                    </svg>
                    <span className="text-[10px]">{n}</span>
                  </Tile>
                ))}
              </Grid>
            )}
          </div>
        </aside>

        {/* mobile category navigation */}
        <div className="shrink-0 border-t border-border bg-card md:hidden">
          <nav
            aria-label="Design categories"
            className="grid h-44 grid-cols-4 grid-rows-4 gap-1 p-1"
          >
            {tools.map((t) => (
              <Button
                variant="ghost"
                disabled={!ready && !["Projects", "AI Tools"].includes(t.label)}
                key={t.label}
                title={t.label}
                aria-pressed={t.active}
                onClick={t.on}
                className={`h-full min-h-10 min-w-0 w-full flex-col gap-0.5 px-1 text-[9px] leading-tight [&_svg]:size-5 ${t.active ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
              >
                {t.icon}
                <span className="max-w-full text-center">{t.label}</span>
              </Button>
            ))}
          </nav>
        </div>
      </div>
      {contextMenu && o && (
        <>
          <button
            type="button"
            aria-label="Close object menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setContextMenu(null)}
          />
          <div
            role="menu"
            aria-label="Object actions"
            className="fixed z-50 max-h-[min(70vh,28rem)] w-52 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-2xl"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onContextMenu={(event) => event.preventDefault()}
          >
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {o.name || o.type}
            </p>
            <button
              role="menuitem"
              className="w-full rounded-md px-2 py-2 text-left text-xs hover:bg-muted"
              onClick={() => {
                setContextMenu(null);
                void copyObject();
              }}
            >
              Copy object
            </button>
            {objectClipboard.current && (
              <button
                role="menuitem"
                className="w-full rounded-md px-2 py-2 text-left text-xs hover:bg-muted"
                onClick={() => {
                  setContextMenu(null);
                  void pasteObject();
                }}
              >
                Paste object
              </button>
            )}
            <button
              role="menuitem"
              className="w-full rounded-md px-2 py-2 text-left text-xs hover:bg-muted"
              onClick={() => {
                setContextMenu(null);
                void dup();
              }}
            >
              Duplicate
            </button>
            <button
              role="menuitem"
              className="w-full rounded-md px-2 py-2 text-left text-xs hover:bg-muted"
              onClick={() => {
                setContextMenu(null);
                void copyPng(true);
              }}
            >
              Copy as PNG
            </button>
            <button
              role="menuitem"
              className="w-full rounded-md px-2 py-2 text-left text-xs hover:bg-muted"
              onClick={() => {
                setContextMenu(null);
                order("top");
              }}
            >
              Bring to front
            </button>
            <button
              role="menuitem"
              className="w-full rounded-md px-2 py-2 text-left text-xs hover:bg-muted"
              onClick={() => {
                setContextMenu(null);
                order("up");
              }}
            >
              Bring forward
            </button>
            <button
              role="menuitem"
              className="w-full rounded-md px-2 py-2 text-left text-xs hover:bg-muted"
              onClick={() => {
                setContextMenu(null);
                order("down");
              }}
            >
              Send backward
            </button>
            <button
              role="menuitem"
              className="w-full rounded-md px-2 py-2 text-left text-xs hover:bg-muted"
              onClick={() => {
                setContextMenu(null);
                order("bottom");
              }}
            >
              Send to back
            </button>
            <button
              role="menuitem"
              className="w-full rounded-md px-2 py-2 text-left text-xs hover:bg-muted"
              onClick={() => {
                setContextMenu(null);
                toggleLock(o);
              }}
            >
              {o.lockedLayer ? "Unlock object" : "Lock object"}
            </button>
            {o.type === "activeselection" && (
              <button
                role="menuitem"
                className="w-full rounded-md px-2 py-2 text-left text-xs hover:bg-muted"
                onClick={() => {
                  setContextMenu(null);
                  groupSelection();
                }}
              >
                Group objects
              </button>
            )}
            {o.type === "group" && (
              <button
                role="menuitem"
                className="w-full rounded-md px-2 py-2 text-left text-xs hover:bg-muted"
                onClick={() => {
                  setContextMenu(null);
                  ungroupSelection();
                }}
              >
                Ungroup objects
              </button>
            )}
            <button
              role="menuitem"
              className="w-full rounded-md px-2 py-2 text-left text-xs text-destructive hover:bg-muted"
              onClick={() => {
                setContextMenu(null);
                del();
              }}
            >
              Delete
            </button>
          </div>
        </>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={backgroundFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          onBackgroundFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={vectorFileRef}
        type="file"
        accept=".svg,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          void importSvgFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <AlertDialog
        open={!!pendingImage}
        onOpenChange={(open) => {
          if (!open && pendingImage) {
            URL.revokeObjectURL(pendingImage.url);
            setPendingImage(null);
          }
        }}
      >
        <AlertDialogContent className="fixed inset-0 left-0 top-0 flex h-[100svh] max-h-[100dvh] min-h-0 w-[100vw] max-w-none translate-x-0 translate-y-0 flex-col gap-2 overflow-y-auto overscroll-contain rounded-none border-0 bg-background p-3 sm:h-[100dvh] sm:p-8">
          <AlertDialogHeader>
            <AlertDialogTitle>Preview and crop image</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingImage
                ? `${cropRect.width} × ${cropRect.height}px crop · original ${pendingImage.width} × ${pendingImage.height}px`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingImage && (
            <div className="h-[42svh] min-h-0 shrink-0 overflow-auto rounded-lg border border-border bg-muted p-2 sm:h-auto sm:flex-1">
              <img
                src={pendingImage.url}
                alt="Fullscreen image preview"
                className="mx-auto h-full max-h-full max-w-full object-contain"
              />
            </div>
          )}
          {pendingImage && (
            <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
              <input
                className="field h-9"
                type="number"
                min="0"
                value={cropRect.x}
                onChange={(e) => setCropRect({ ...cropRect, x: +e.target.value })}
                aria-label="Crop left"
              />
              <input
                className="field h-9"
                type="number"
                min="0"
                value={cropRect.y}
                onChange={(e) => setCropRect({ ...cropRect, y: +e.target.value })}
                aria-label="Crop top"
              />
              <input
                className="field h-9"
                type="number"
                min="1"
                value={cropRect.width}
                onChange={(e) => setCropRect({ ...cropRect, width: +e.target.value })}
                aria-label="Crop width"
              />
              <input
                className="field h-9"
                type="number"
                min="1"
                value={cropRect.height}
                onChange={(e) => setCropRect({ ...cropRect, height: +e.target.value })}
                aria-label="Crop height"
              />
            </div>
          )}
          {pendingImage && (
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={fitImportedImage}
                  onChange={(e) => setFitImportedImage(e.target.checked)}
                />{" "}
                Fit image to current canvas
              </label>
              {pendingImage.target === "background" && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useImageAsCanvas}
                    onChange={(e) => setUseImageAsCanvas(e.target.checked)}
                  />{" "}
                  Use image crop as canvas size
                </label>
              )}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void importPendingImage();
              }}
            >
              Confirm import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={saveHomeOpen} onOpenChange={setSaveHomeOpen}>
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Save this project before leaving?</AlertDialogTitle>
            <AlertDialogDescription>
              Save it to your Gridora library to keep editing it later, or export a copy to your
              device. Leaving without saving may lose your latest changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              onClick={() => {
                void saveProjectAndHome();
              }}
            >
              Save project
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                void exportAndHome("png");
              }}
            >
              Export PNG
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                void exportAndHome("jpg");
              }}
            >
              Export JPG
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                void exportAndHome("pdf");
              }}
            >
              Export PDF
            </Button>
          </div>
          <button
            className="text-center text-xs text-destructive underline"
            onClick={() => {
              void deleteProject(id).finally(() => {
                setSaveHomeOpen(false);
                nav({ to: "/" });
              });
            }}
          >
            Discard project without saving
          </button>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all canvas objects?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes every object from this design. Your canvas background remains. You can
              undo the clear action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={clearCanvas}>Clear canvas</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------- UI bits ---------- */
function IconBtn({
  children,
  label,
  onClick,
  disabled,
  active,
  className = "",
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-md p-1.5 transition hover:bg-muted disabled:opacity-30 [&_svg]:h-4 [&_svg]:w-4 ${active ? "bg-primary text-primary-foreground hover:bg-primary" : ""} ${className}`}
    >
      {children}
    </button>
  );
}
const Grid = ({ children }: { children: ReactNode }) => (
  <div className="grid grid-cols-4 gap-2">{children}</div>
);
const Tile = ({ children, onClick }: { children: ReactNode; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-border hover:border-primary hover:bg-muted"
  >
    {children}
  </button>
);
function ShapeIcon({ k }: { k: string }) {
  const c = "h-7 w-7 fill-primary";
  if (k === "rect")
    return (
      <svg viewBox="0 0 24 24" className={c}>
        <rect x="3" y="3" width="18" height="18" />
      </svg>
    );
  if (k === "rounded")
    return (
      <svg viewBox="0 0 24 24" className={c}>
        <rect x="2" y="6" width="20" height="13" rx="3" />
      </svg>
    );
  if (k === "circle")
    return (
      <svg viewBox="0 0 24 24" className={c}>
        <circle cx="12" cy="12" r="9" />
      </svg>
    );
  if (k === "ellipse")
    return (
      <svg viewBox="0 0 24 24" className={c}>
        <ellipse cx="12" cy="12" rx="10" ry="6" />
      </svg>
    );
  if (k === "triangle")
    return (
      <svg viewBox="0 0 24 24" className={c}>
        <path d="M12 3l10 18H2z" />
      </svg>
    );
  if (k === "pentagon")
    return (
      <svg viewBox="0 0 24 24" className={c}>
        <path d="M12 2l10 7-4 12H6L2 9z" />
      </svg>
    );
  if (k === "hexagon")
    return (
      <svg viewBox="0 0 24 24" className={c}>
        <path d="M12 2l9 5v10l-9 5-9-5V7z" />
      </svg>
    );
  if (k === "star")
    return (
      <svg viewBox="0 0 24 24" className={c}>
        <path d={ICONS["Star"]} />
      </svg>
    );
  if (k === "arrow")
    return (
      <svg viewBox="0 0 24 24" className="h-7 w-7 stroke-primary" strokeWidth="3" fill="none">
        <path d="M2 12h17m-7-7 7 7-7 7" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 stroke-primary" strokeWidth="3">
      <path d="M2 12h20" />
    </svg>
  );
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="w-full min-w-0 max-w-[720px] rounded-lg border border-border bg-card/40 p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block text-xs">
      <div className="mb-1 flex justify-between text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{Math.round(value * 100) / 100}</span>
      </div>
      <input
        type="range"
        className="w-full accent-[var(--primary)]"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
      />
    </label>
  );
}
function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block text-[11px] text-muted-foreground">
      {label}
      <input
        type="number"
        className="field mt-1 h-8 px-2 text-xs"
        value={Math.round(value * 100) / 100}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
function rememberPaletteColor(value: unknown) {
  if (typeof window === "undefined" || typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value))
    return;
  try {
    const current = JSON.parse(
      window.localStorage.getItem("gridora-color-palette") || "[]",
    ) as string[];
    const colors = [
      value.toLowerCase(),
      ...current.filter((x) => x.toLowerCase() !== value.toLowerCase()),
    ].slice(0, 24);
    window.localStorage.setItem("gridora-color-palette", JSON.stringify(colors));
  } catch {
    /* storage can be unavailable */
  }
}
function Color({
  label,
  value,
  onChange,
  onPick,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onPick?: (() => Promise<string | null>) | undefined;
}) {
  const [draft, setDraft] = useState(value);
  const [palette, setPalette] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem("gridora-color-palette") || "[]") as string[];
    } catch {
      return [];
    }
  });
  useEffect(() => setDraft(value), [value]);
  const apply = (next: string) => {
    if (!/^#[0-9a-f]{6}$/i.test(next)) return;
    setDraft(next);
    onChange(next);
    const colors = [
      next.toLowerCase(),
      ...palette.filter((x) => x.toLowerCase() !== next.toLowerCase()),
    ].slice(0, 24);
    setPalette(colors);
    rememberPaletteColor(next);
  };
  const editHex = (next: string) => {
    setDraft(next);
    if (/^#[0-9a-f]{6}$/i.test(next)) apply(next);
  };
  const finishHex = () => {
    if (/^#[0-9a-f]{6}$/i.test(draft)) apply(draft);
    else setDraft(value);
  };
  return (
    <div className="min-w-0 space-y-1 text-xs text-muted-foreground">
      <span className="block min-w-0">{label}</span>
      <div className="flex min-w-0 items-center gap-2">
        <input
          type="color"
          aria-label={`${label} color picker`}
          value={toHex(draft, "#000000")}
          onChange={(e) => apply(e.target.value)}
          className="h-9 w-11 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0.5"
        />
        <input
          className="field h-9 min-w-0 flex-1 px-2 text-[11px] uppercase"
          value={draft}
          onChange={(e) => editHex(e.target.value)}
          onBlur={finishHex}
          placeholder="#000000"
          aria-label={`${label} hex code`}
        />
        {onPick && (
          <button
            type="button"
            className="min-h-9 shrink-0 rounded border border-border px-3 py-1.5 text-[11px] hover:bg-muted"
            onClick={async () => {
              const picked = await onPick();
              if (picked) apply(picked);
            }}
          >
            Pick
          </button>
        )}
      </div>
      {palette.length > 0 && (
        <div className="flex flex-wrap gap-1" aria-label="Saved colours">
          {palette.map((color) => (
            <button
              type="button"
              key={color}
              title={color}
              aria-label={`Use saved colour ${color}`}
              className="h-5 w-5 rounded-full border border-border"
              style={{ backgroundColor: color }}
              onClick={() => apply(color)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
const toHex = (v: unknown, d = "#000000") => {
  if (typeof v === "string") {
    if (/^#[0-9a-f]{6}$/i.test(v)) return v;
    const rgb = v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (rgb)
      return `#${rgb
        .slice(1, 4)
        .map((channel) =>
          Math.max(0, Math.min(255, Number(channel)))
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")}`;
  }
  if (v && typeof v === "object" && Array.isArray((v as Obj).colorStops))
    return toHex((v as Obj).colorStops[0]?.color, d);
  return d;
};
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

function makeGradient(
  f: Fab,
  a: string,
  b: string,
  angle: number,
  w = 1,
  h = 1,
  units: "percentage" | "pixels" = "percentage",
) {
  const r = (angle * Math.PI) / 180;
  const cx = w / 2,
    cy = h / 2,
    dx = (Math.cos(r) * w) / 2,
    dy = (Math.sin(r) * h) / 2;
  return new f.Gradient({
    type: "linear",
    gradientUnits: units,
    coords: { x1: cx - dx, y1: cy - dy, x2: cx + dx, y2: cy + dy },
    colorStops: [
      { offset: 0, color: a },
      { offset: 1, color: b },
    ],
  });
}

/* ---------- Properties ---------- */
function ShapeProperties({
  o,
  f,
  set,
  commit,
  onPickColor,
}: {
  o: Obj;
  f: Fab;
  set: (p: Record<string, unknown>) => void;
  commit: () => void;
  onPickColor?: (() => Promise<string | null>) | undefined;
}) {
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
        {isRect && (
          <Slider
            label="Radius (%)"
            value={Math.round(((o.rx ?? 0) / Math.max(1, o.width ?? width)) * 100)}
            min={0}
            max={50}
            onChange={(v) =>
              set({ rx: ((o.width ?? width) * v) / 100, ry: ((o.height ?? height) * v) / 100 })
            }
          />
        )}
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Width" value={width} onChange={(v) => setSize("width", v)} />
          <NumberField label="Height" value={height} onChange={(v) => setSize("height", v)} />
        </div>
      </Section>

      <Section title="Fill">
        <Slider
          label="Opacity (%)"
          value={Math.round(fillAlpha * 100)}
          min={0}
          max={100}
          onChange={(v) => set({ fill: withAlpha(o.fill, v / 100) })}
        />
        <div className="flex gap-1 text-xs">
          <button
            className={`flex-1 rounded-md py-1.5 ${typeof o.fill === "string" ? "bg-muted" : "border border-border"}`}
            onClick={() => set({ fill: toHex(o.fill, "#c6f432") })}
          >
            Colour
          </button>
          <button
            className={`flex-1 rounded-md py-1.5 ${typeof o.fill === "object" ? "bg-muted" : "border border-border"}`}
            onClick={setFillGradient}
          >
            Gradient
          </button>
        </div>
        {typeof o.fill === "string" && (
          <Color
            label="Fill colour"
            value={toHex(o.fill, "#c6f432")}
            onChange={(v) => set({ fill: withAlpha(v, fillAlpha) })}
            onPick={onPickColor}
          />
        )}
      </Section>

      <Section title="Stroke">
        <Slider
          label="Stroke width"
          value={o.strokeWidth ?? 0}
          min={0}
          max={100}
          onChange={(v) => set({ strokeWidth: v })}
        />
        <Slider
          label="Stroke opacity (%)"
          value={Math.round(strokeAlpha * 100)}
          min={0}
          max={100}
          onChange={(v) => set({ stroke: withAlpha(o.stroke, v / 100) })}
        />
        <div className="flex gap-1 text-xs">
          <button
            className={`flex-1 rounded-md py-1.5 ${typeof o.stroke === "string" ? "bg-muted" : "border border-border"}`}
            onClick={() => set({ stroke: toHex(o.stroke, "#111111") })}
          >
            Colour
          </button>
          <button
            className={`flex-1 rounded-md py-1.5 ${typeof o.stroke === "object" ? "bg-muted" : "border border-border"}`}
            onClick={setStrokeGradient}
          >
            Gradient
          </button>
        </div>
        {typeof o.stroke === "string" && (
          <Color
            label="Stroke colour"
            value={toHex(o.stroke, "#111111")}
            onChange={(v) => set({ stroke: withAlpha(v, strokeAlpha) })}
          />
        )}
      </Section>
    </>
  );
}

function Properties({
  o,
  f,
  commit,
  onPickColor,
  actions,
  mode = "general",
}: {
  o: Obj;
  f: Fab;
  commit: () => void;
  onPickColor?: (() => Promise<string | null>) | undefined;
  mode?: "general" | "legacy";
  actions: {
    dup: () => void;
    del: () => void;
    order: (k: "up" | "down" | "top" | "bottom") => void;
    toggleLock: (o: Obj) => void;
    group: () => void;
    ungroup: () => void;
    align: (edge: "left" | "centerX" | "right" | "top" | "centerY" | "bottom") => void;
  };
}) {
  const set = (p: Record<string, unknown>) => {
    o.set(p);
    o.setCoords();
    commit();
  };
  const isText = o instanceof f.IText || o instanceof f.Textbox || o instanceof f.FabricText;
  const isImg = o instanceof f.FabricImage;
  const isShape = !isText && !isImg;
  const isLine = o instanceof f.Line;
  const text3dDepth = Number(o.text3dDepth ?? 0);
  const textReflection = !!o.textReflection;
  const gradFill = o.fill && typeof o.fill === "object";
  const stops = gradFill ? o.fill.colorStops : null;
  const [g, setG] = useState({
    a: stops?.[0]?.color ?? "#ff4d6d",
    b: stops?.[1]?.color ?? "#ffb703",
    angle: 0,
  });
  const sh = o.shadow;
  const shadowSet = (
    p: Partial<{ color: string; blur: number; offsetX: number; offsetY: number }>,
  ) => {
    const cur = {
      color: sh?.color ?? "#000000",
      blur: sh?.blur ?? 10,
      offsetX: sh?.offsetX ?? 5,
      offsetY: sh?.offsetY ?? 5,
    };
    set({ shadow: new f.Shadow({ ...cur, ...p }) });
  };
  if (mode === "general")
    return (
      <div className="grid w-full max-w-[720px] grid-cols-3 gap-2 sm:grid-cols-5">
        <IconBtn label="Copy" onClick={actions.dup}>
          <Copy />
        </IconBtn>
        <IconBtn label="Bring forward" onClick={() => actions.order("up")}>
          <ArrowUp />
        </IconBtn>
        <IconBtn label="Send backward" onClick={() => actions.order("down")}>
          <ArrowDown />
        </IconBtn>
        <IconBtn label="Lock" onClick={() => actions.toggleLock(o)}>
          <Lock />
        </IconBtn>
        <IconBtn label="Delete" className="text-destructive" onClick={actions.del}>
          <Trash2 />
        </IconBtn>
      </div>
    );

  return (
    <div className="grid w-full max-w-6xl grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <div className="grid grid-cols-3 gap-1 rounded-lg border border-border p-3 sm:col-span-2 xl:col-span-3">
        <IconBtn label="Duplicate" onClick={actions.dup}>
          <Copy />
        </IconBtn>
        <IconBtn label="Bring forward" onClick={() => actions.order("up")}>
          <ArrowUp />
        </IconBtn>
        <IconBtn label="Send backward" onClick={() => actions.order("down")}>
          <ArrowDown />
        </IconBtn>
        <IconBtn label="Flip horizontal" onClick={() => set({ flipX: !o.flipX })}>
          <FlipHorizontal />
        </IconBtn>
        <IconBtn label="Flip vertical" onClick={() => set({ flipY: !o.flipY })}>
          <FlipVertical />
        </IconBtn>
        <IconBtn label="Align left to canvas" onClick={() => actions.align("left")}>
          <AlignHorizontalJustifyStart />
        </IconBtn>
        <IconBtn label="Center horizontally on canvas" onClick={() => actions.align("centerX")}>
          <AlignHorizontalJustifyCenter />
        </IconBtn>
        <IconBtn label="Align right to canvas" onClick={() => actions.align("right")}>
          <AlignHorizontalJustifyEnd />
        </IconBtn>
        <IconBtn label="Align top to canvas" onClick={() => actions.align("top")}>
          <AlignVerticalJustifyStart />
        </IconBtn>
        <IconBtn label="Center vertically on canvas" onClick={() => actions.align("centerY")}>
          <AlignVerticalJustifyCenter />
        </IconBtn>
        <IconBtn label="Align bottom to canvas" onClick={() => actions.align("bottom")}>
          <AlignVerticalJustifyEnd />
        </IconBtn>
        {o.type === "activeselection" && (
          <IconBtn label="Group selected objects" onClick={actions.group}>
            <GroupIcon />
          </IconBtn>
        )}
        {o.type === "group" && (
          <IconBtn label="Ungroup selected objects" onClick={actions.ungroup}>
            <Ungroup />
          </IconBtn>
        )}
        <IconBtn label={o.lockedLayer ? "Unlock" : "Lock"} onClick={() => actions.toggleLock(o)}>
          {o.lockedLayer ? <Unlock /> : <Lock />}
        </IconBtn>
        <IconBtn label="Delete" className="text-destructive" onClick={actions.del}>
          <Trash2 />
        </IconBtn>
      </div>

      {isText && (
        <>
          <Section title="Text tools">
            <div className="grid grid-cols-2 gap-2">
              <button
                className="rounded-md bg-primary px-2 py-2 text-xs font-semibold text-primary-foreground"
                onClick={() => {
                  (o as Obj).enterEditing?.();
                  (o as Obj).selectAll?.();
                  o.canvas?.requestRenderAll();
                }}
              >
                Edit text
              </button>
              <button
                className="rounded-md border border-border px-2 py-2 text-xs hover:bg-muted"
                onClick={actions.dup}
              >
                Copy
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="rounded-md border border-border px-2 py-2 text-xs hover:bg-muted"
                onClick={actions.del}
              >
                Delete
              </button>
              <button
                className="rounded-md border border-border px-2 py-2 text-xs hover:bg-muted"
                onClick={() => set({ backgroundColor: o.backgroundColor ? "" : "#fff3a3" })}
              >
                Background
              </button>
            </div>
          </Section>

          <Section title="Position">
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="X" value={o.left ?? 0} onChange={(v) => set({ left: v })} />
              <NumberField label="Y" value={o.top ?? 0} onChange={(v) => set({ top: v })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="Relative X %"
                value={((o.left ?? 0) / Math.max(1, o.canvas?.getWidth?.() ?? 1)) * 100}
                onChange={(v) => set({ left: (v / 100) * (o.canvas?.getWidth?.() ?? 1) })}
              />
              <NumberField
                label="Relative Y %"
                value={((o.top ?? 0) / Math.max(1, o.canvas?.getHeight?.() ?? 1)) * 100}
                onChange={(v) => set({ top: (v / 100) * (o.canvas?.getHeight?.() ?? 1) })}
              />
            </div>
          </Section>

          <Section title="Size & padding">
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="Width"
                value={o.getScaledWidth?.() ?? o.width ?? 0}
                onChange={(v) => set({ scaleX: Math.max(0.05, v / Math.max(1, o.width ?? 1)) })}
              />
              <NumberField
                label="Height"
                value={o.getScaledHeight?.() ?? o.height ?? 0}
                onChange={(v) => set({ scaleY: Math.max(0.05, v / Math.max(1, o.height ?? 1)) })}
              />
            </div>
            <NumberField
              label="Padding"
              value={o.padding ?? 0}
              onChange={(v) => set({ padding: Math.max(0, v) })}
            />
          </Section>

          {o instanceof f.Textbox && (
            <textarea
              className="field min-h-[60px]"
              value={o.text}
              onChange={(e) => set({ text: e.target.value })}
            />
          )}
          <Section title="Font & style">
            <FontPicker
              value={o.fontFamily}
              onChange={(v) => {
                set({ fontFamily: v });
                document.fonts?.load(`40px "${v}"`).then(() => {
                  o.set({ fontFamily: v });
                  o.initDimensions?.();
                  commit();
                });
              }}
            />
            <Slider
              label="Font size"
              value={o.fontSize}
              min={6}
              max={600}
              onChange={(v) => set({ fontSize: v })}
            />
            <div className="flex flex-wrap gap-1">
              <IconBtn
                label="Bold"
                active={o.fontWeight === "bold"}
                onClick={() => set({ fontWeight: o.fontWeight === "bold" ? "normal" : "bold" })}
              >
                <Bold />
              </IconBtn>
              <IconBtn
                label="Italic"
                active={o.fontStyle === "italic"}
                onClick={() => set({ fontStyle: o.fontStyle === "italic" ? "normal" : "italic" })}
              >
                <Italic />
              </IconBtn>
              <button
                className={`rounded-md px-2 text-xs ${o.underline ? "bg-muted" : "hover:bg-muted"}`}
                onClick={() => set({ underline: !o.underline })}
              >
                Underline
              </button>
              <button
                className={`rounded-md px-2 text-xs ${o.linethrough ? "bg-muted" : "hover:bg-muted"}`}
                onClick={() => set({ linethrough: !o.linethrough })}
              >
                Strike
              </button>
            </div>
            <div className="flex gap-1">
              <IconBtn
                label="Align left"
                active={o.textAlign === "left"}
                onClick={() => set({ textAlign: "left" })}
              >
                <AlignLeft />
              </IconBtn>
              <IconBtn
                label="Align center"
                active={o.textAlign === "center"}
                onClick={() => set({ textAlign: "center" })}
              >
                <AlignCenter />
              </IconBtn>
              <IconBtn
                label="Align right"
                active={o.textAlign === "right"}
                onClick={() => set({ textAlign: "right" })}
              >
                <AlignRight />
              </IconBtn>
            </div>
            <Slider
              label="Letter spacing"
              value={o.charSpacing ?? 0}
              min={-200}
              max={1000}
              onChange={(v) => set({ charSpacing: v })}
            />
            <Slider
              label="Line height"
              value={o.lineHeight ?? 1.16}
              min={0.5}
              max={3}
              step={0.05}
              onChange={(v) => set({ lineHeight: v })}
            />
          </Section>

          <Section title="Colour & texture">
            <Color
              label="Colour"
              value={toHex(o.fill, "#111111")}
              onChange={(v) => set({ fill: v })}
              onPick={onPickColor}
            />
            <div className="flex gap-1 text-xs">
              <button className="flex-1 rounded-md bg-muted py-1.5">Solid</button>
              <button
                className="flex-1 rounded-md border border-border py-1.5"
                onClick={() =>
                  set({ fill: makeGradient(f, toHex(o.fill, "#c6f432"), "#ffffff", 0) })
                }
              >
                Texture / gradient
              </button>
            </div>
          </Section>

          <Section title="3D text & reflection">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={text3dDepth > 0}
                onChange={(e) => {
                  const depth = e.target.checked ? 10 : 0;
                  set({
                    text3dDepth: depth,
                    shadow: e.target.checked
                      ? new f.Shadow({
                          color: "rgba(0,0,0,0.35)",
                          blur: 0,
                          offsetX: depth,
                          offsetY: depth,
                        })
                      : null,
                  });
                }}
              />
              3D text
            </label>
            {text3dDepth > 0 && (
              <Slider
                label="Depth"
                value={text3dDepth}
                min={1}
                max={40}
                onChange={(v) =>
                  set({
                    text3dDepth: v,
                    shadow: new f.Shadow({
                      color: "rgba(0,0,0,0.35)",
                      blur: 0,
                      offsetX: v,
                      offsetY: v,
                    }),
                  })
                }
              />
            )}
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={textReflection}
                onChange={(e) => set({ textReflection: e.target.checked })}
              />
              Reflection
            </label>
            {textReflection && (
              <p className="text-[11px] text-muted-foreground">
                Reflection is saved with this text layer.
              </p>
            )}
          </Section>
        </>
      )}

      {isShape && (
        <ShapeProperties o={o} f={f} set={set} commit={commit} onPickColor={onPickColor} />
      )}

      {!isImg && !isShape && (
        <Section title={isLine ? "Line color" : "Fill"}>
          {!isLine && (
            <div className="flex gap-1 text-xs">
              <button
                className={`flex-1 rounded-md py-1.5 ${!gradFill ? "bg-muted" : "text-muted-foreground"}`}
                onClick={() => set({ fill: g.a })}
              >
                Solid
              </button>
              <button
                className={`flex-1 rounded-md py-1.5 ${gradFill ? "bg-muted" : "text-muted-foreground"}`}
                onClick={() => set({ fill: makeGradient(f, g.a, g.b, g.angle) })}
              >
                Gradient
              </button>
            </div>
          )}
          {isLine ? (
            <Color label="Color" value={toHex(o.stroke)} onChange={(v) => set({ stroke: v })} />
          ) : gradFill ? (
            <>
              <Color
                label="Start"
                value={toHex(g.a)}
                onChange={(v) => {
                  const n = { ...g, a: v };
                  setG(n);
                  set({ fill: makeGradient(f, n.a, n.b, n.angle) });
                }}
              />
              <Color
                label="End"
                value={toHex(g.b)}
                onChange={(v) => {
                  const n = { ...g, b: v };
                  setG(n);
                  set({ fill: makeGradient(f, n.a, n.b, n.angle) });
                }}
              />
              <Slider
                label="Angle"
                value={g.angle}
                min={0}
                max={360}
                onChange={(v) => {
                  const n = { ...g, angle: v };
                  setG(n);
                  set({ fill: makeGradient(f, n.a, n.b, n.angle) });
                }}
              />
            </>
          ) : (
            <Color
              label="Color"
              value={toHex(o.fill)}
              onChange={(v) => set({ fill: v })}
              onPick={onPickColor}
            />
          )}
        </Section>
      )}

      {isImg && <ImageCrop o={o} set={set} />}

      <Section title={isLine ? "Thickness" : "Outline"}>
        {!isLine && (
          <Color
            label="Outline color"
            value={toHex(o.stroke, "#000000")}
            onChange={(v) => set({ stroke: v, strokeWidth: o.strokeWidth || 2 })}
          />
        )}
        <Slider
          label="Width"
          value={o.strokeWidth ?? 0}
          min={0}
          max={isLine ? 100 : 40}
          onChange={(v) =>
            set({
              strokeWidth: v,
              stroke: o.stroke || "#000000",
              paintFirst: isText ? "stroke" : "fill",
            })
          }
        />
      </Section>

      <Section title="Shadow">
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={!!sh}
            onChange={(e) => (e.target.checked ? shadowSet({}) : set({ shadow: null }))}
          />{" "}
          Enable shadow
        </label>
        {sh && (
          <>
            <Color
              label="Color"
              value={toHex(sh.color)}
              onChange={(v) => shadowSet({ color: v })}
            />
            <Slider
              label="Blur"
              value={sh.blur}
              min={0}
              max={100}
              onChange={(v) => shadowSet({ blur: v })}
            />
            <Slider
              label="Offset X"
              value={sh.offsetX}
              min={-100}
              max={100}
              onChange={(v) => shadowSet({ offsetX: v })}
            />
            <Slider
              label="Offset Y"
              value={sh.offsetY}
              min={-100}
              max={100}
              onChange={(v) => shadowSet({ offsetY: v })}
            />
          </>
        )}
      </Section>

      <Section title="Transform">
        <Slider
          label="Rotation"
          value={Math.round(o.angle ?? 0)}
          min={-180}
          max={180}
          onChange={(v) => {
            o.rotate(v);
            commit();
          }}
        />
        <Slider
          label="Scale"
          value={o.scaleX ?? 1}
          min={0.05}
          max={5}
          step={0.01}
          onChange={(v) => set({ scaleX: v, scaleY: v * ((o.scaleY ?? 1) / (o.scaleX || 1)) })}
        />
        <Slider
          label="Opacity"
          value={o.opacity ?? 1}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => set({ opacity: v })}
        />
        <div className="flex gap-1">
          <IconBtn label="Flip horizontal" onClick={() => set({ flipX: !o.flipX })}>
            <FlipHorizontal />
          </IconBtn>
          <IconBtn label="Flip vertical" onClick={() => set({ flipY: !o.flipY })}>
            <FlipVertical />
          </IconBtn>
        </div>
      </Section>
    </div>
  );
}

type EditMode = "textTools" | "position" | "fill" | "stroke" | "effects";
function ContextualTools({
  o,
  f,
  mode,
  commit,
  onEraseBackground,
  eraseBusy,
  onPickColor,
  onMaskImage,
  onAlign,
}: {
  o: Obj;
  f: Fab;
  mode: EditMode;
  commit: () => void;
  eraseBusy: string | null;
  onEraseBackground: (mode: "smart" | "auto" | "color", color?: string, tolerance?: number) => void;
  onPickColor: () => Promise<string | null>;
  onMaskImage: (
    shape: "square" | "circle" | "rounded" | "triangle" | "star" | "heart" | "polygon",
  ) => void;
  onAlign: (edge: "left" | "centerX" | "right" | "top" | "centerY" | "bottom") => void;
}) {
  const set = (p: Record<string, unknown>) => {
    o.set(p);
    o.setCoords();
    commit();
  };
  const isText = o.type === "textbox" || o.type === "i-text" || o.type === "text";
  const fillAlpha = alphaOf(o.fill),
    strokeAlpha = alphaOf(o.stroke);
  const shadow = o.shadow;
  const [eraseColor, setEraseColor] = useState("#ffffff");
  const [eraseMode, setEraseMode] = useState<"smart" | "auto" | "color">("smart");
  const [eraseTol, setEraseTol] = useState(40);
  const nudgeTimer = useRef<number | undefined>(undefined);
  const nudge = (dx: number, dy: number) =>
    set({ left: (o.left ?? 0) + dx, top: (o.top ?? 0) + dy });
  const startNudge = (dx: number, dy: number) => {
    nudge(dx, dy);
    window.clearTimeout(nudgeTimer.current);
    nudgeTimer.current = window.setTimeout(() => {
      nudgeTimer.current = window.setInterval(() => nudge(dx * 5, dy * 5), 140);
    }, 1000);
  };
  const stopNudge = () => {
    window.clearTimeout(nudgeTimer.current);
    window.clearInterval(nudgeTimer.current);
    nudgeTimer.current = undefined;
  };
  const setCurve = (amount: number) => {
    o.textCurve = amount;
    if (amount === 0) o.path = undefined;
    else
      o.path = new f.Path(`M 0 0 Q ${(o.width ?? 200) / 2} ${-amount} ${o.width ?? 200} 0`, {
        fill: "",
      });
    commit();
  };
  const shadowSet = (
    p: Partial<{ color: string; blur: number; offsetX: number; offsetY: number }>,
  ) =>
    set({
      shadow: new f.Shadow({
        color: shadow?.color ?? "#000000",
        blur: shadow?.blur ?? 10,
        offsetX: shadow?.offsetX ?? 5,
        offsetY: shadow?.offsetY ?? 5,
        ...p,
      }),
    });
  if (mode === "textTools")
    return (
      <Section title="Text tools">
        {o.type === "textbox" && (
          <textarea
            className="field min-h-[56px]"
            value={o.text ?? ""}
            onChange={(e) => set({ text: e.target.value })}
          />
        )}
        <FontPicker
          value={o.fontFamily ?? "Manrope"}
          onChange={(v) => {
            set({ fontFamily: v });
            document.fonts?.load(`40px "${v}"`).then(() => {
              o.set({ fontFamily: v });
              o.initDimensions?.();
              commit();
            });
          }}
        />
        <Slider
          label="Font size"
          value={o.fontSize ?? 24}
          min={6}
          max={600}
          onChange={(v) => set({ fontSize: v })}
        />
        <Color
          label="Colour"
          value={toHex(o.fill, "#111111")}
          onChange={(v) => set({ fill: v })}
          onPick={onPickColor}
        />
        <Slider
          label="Text curve"
          value={Number(o.textCurve ?? 0)}
          min={-160}
          max={160}
          onChange={setCurve}
        />
        <div className="flex flex-wrap gap-1">
          <IconBtn
            label="Bold"
            active={o.fontWeight === "bold"}
            onClick={() => set({ fontWeight: o.fontWeight === "bold" ? "normal" : "bold" })}
          >
            <Bold />
          </IconBtn>
          <IconBtn
            label="Italic"
            active={o.fontStyle === "italic"}
            onClick={() => set({ fontStyle: o.fontStyle === "italic" ? "normal" : "italic" })}
          >
            <Italic />
          </IconBtn>
          <button
            className="rounded-md border border-border px-2 py-1 text-xs"
            onClick={() => set({ underline: !o.underline })}
          >
            Underline
          </button>
          <button
            className="rounded-md border border-border px-2 py-1 text-xs"
            onClick={() => set({ linethrough: !o.linethrough })}
          >
            Strikethrough
          </button>
          <IconBtn label="Align left" onClick={() => set({ textAlign: "left" })}>
            <AlignLeft />
          </IconBtn>
          <IconBtn label="Align center" onClick={() => set({ textAlign: "center" })}>
            <AlignCenter />
          </IconBtn>
          <IconBtn label="Align right" onClick={() => set({ textAlign: "right" })}>
            <AlignRight />
          </IconBtn>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            className="rounded-md border border-border px-2 py-1.5 text-xs hover:bg-muted"
            onClick={() =>
              set({
                text: String(o.text ?? "")
                  .split("\n")
                  .map((line: string) => (line.startsWith("• ") ? line : `• ${line}`))
                  .join("\n"),
              })
            }
          >
            Add bullets
          </button>
          <button
            className="rounded-md border border-border px-2 py-1.5 text-xs hover:bg-muted"
            onClick={() =>
              set({
                text: String(o.text ?? "")
                  .split("\n")
                  .map((line: string, i: number) => `${i + 1}. ${line.replace(/^\d+\.\s*/, "")}`)
                  .join("\n"),
              })
            }
          >
            Numbered list
          </button>
        </div>
        <Slider
          label="Letter spacing"
          value={o.charSpacing ?? 0}
          min={-200}
          max={1000}
          onChange={(v) => set({ charSpacing: v })}
        />
        <Slider
          label="Line spacing"
          value={o.lineHeight ?? 1.16}
          min={0.5}
          max={3}
          step={0.05}
          onChange={(v) => set({ lineHeight: v })}
        />
        <Color
          label="Text background"
          value={toHex(o.backgroundColor, "#fff3a3")}
          onChange={(v) => set({ backgroundColor: v })}
        />
      </Section>
    );
  if (mode === "position")
    return (
      <Section title="Position & size">
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-[11px] text-muted-foreground">Align to canvas</span>
          <IconBtn label="Align left" onClick={() => onAlign("left")}>
            <AlignHorizontalJustifyStart />
          </IconBtn>
          <IconBtn label="Center horizontally" onClick={() => onAlign("centerX")}>
            <AlignHorizontalJustifyCenter />
          </IconBtn>
          <IconBtn label="Align right" onClick={() => onAlign("right")}>
            <AlignHorizontalJustifyEnd />
          </IconBtn>
          <IconBtn label="Align top" onClick={() => onAlign("top")}>
            <AlignVerticalJustifyStart />
          </IconBtn>
          <IconBtn label="Center vertically" onClick={() => onAlign("centerY")}>
            <AlignVerticalJustifyCenter />
          </IconBtn>
          <IconBtn label="Align bottom" onClick={() => onAlign("bottom")}>
            <AlignVerticalJustifyEnd />
          </IconBtn>
        </div>
        <div className="mx-auto grid w-28 grid-cols-3 gap-1">
          <span />
          <button
            className="rounded border border-border p-2"
            onPointerDown={() => startNudge(0, -1)}
            onPointerUp={stopNudge}
            onPointerCancel={stopNudge}
            onPointerLeave={stopNudge}
          >
            <ArrowUp className="mx-auto h-4 w-4" />
          </button>
          <span />
          <button
            className="rounded border border-border p-2"
            onPointerDown={() => startNudge(-1, 0)}
            onPointerUp={stopNudge}
            onPointerCancel={stopNudge}
            onPointerLeave={stopNudge}
          >
            <ArrowLeft className="mx-auto h-4 w-4" />
          </button>
          <span className="flex items-center justify-center text-[10px] text-muted-foreground">
            1px
          </span>
          <button
            className="rounded border border-border p-2"
            onPointerDown={() => startNudge(1, 0)}
            onPointerUp={stopNudge}
            onPointerCancel={stopNudge}
            onPointerLeave={stopNudge}
          >
            <ArrowRight className="mx-auto h-4 w-4" />
          </button>
          <span />
          <button
            className="rounded border border-border p-2"
            onPointerDown={() => startNudge(0, 1)}
            onPointerUp={stopNudge}
            onPointerCancel={stopNudge}
            onPointerLeave={stopNudge}
          >
            <ArrowDown className="mx-auto h-4 w-4" />
          </button>
          <span />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="X" value={o.left ?? 0} onChange={(v) => set({ left: v })} />
          <NumberField label="Y" value={o.top ?? 0} onChange={(v) => set({ top: v })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Width"
            value={o.getScaledWidth?.() ?? o.width ?? 0}
            onChange={(v) => set({ scaleX: v / Math.max(1, o.width ?? 1) })}
          />
          <NumberField
            label="Height"
            value={o.getScaledHeight?.() ?? o.height ?? 0}
            onChange={(v) => set({ scaleY: v / Math.max(1, o.height ?? 1) })}
          />
        </div>
        {isText && (
          <NumberField
            label="Padding"
            value={o.padding ?? 0}
            onChange={(v) => set({ padding: v })}
          />
        )}
        <Slider
          label="Rotation"
          value={o.angle ?? 0}
          min={-180}
          max={180}
          onChange={(v) => set({ angle: v })}
        />
        <Slider
          label="Layer transparency (%)"
          value={(o.opacity ?? 1) * 100}
          min={0}
          max={100}
          onChange={(v) => set({ opacity: v / 100 })}
        />
        <div className="flex gap-1">
          <IconBtn label="Flip horizontal" onClick={() => set({ flipX: !o.flipX })}>
            <FlipHorizontal />
          </IconBtn>
          <IconBtn label="Flip vertical" onClick={() => set({ flipY: !o.flipY })}>
            <FlipVertical />
          </IconBtn>
          <button
            className="rounded-md border border-border px-2 py-1 text-xs"
            onClick={() => set({ angle: 0 })}
          >
            Reset rotation
          </button>
        </div>
      </Section>
    );
  if (mode === "fill")
    return (
      <Section title="Fill">
        <Slider
          label="Opacity (%)"
          value={fillAlpha * 100}
          min={0}
          max={100}
          onChange={(v) => set({ fill: withAlpha(o.fill, v / 100) })}
        />
        <div className="flex gap-1 text-xs">
          <button
            className="flex-1 rounded-md bg-muted py-1.5"
            onClick={() => set({ fill: toHex(o.fill, "#c6f432") })}
          >
            Colour
          </button>
          <button
            className="flex-1 rounded-md border border-border py-1.5"
            onClick={() => set({ fill: makeGradient(f, "#c6f432", "#ffffff", 0) })}
          >
            Gradient
          </button>
        </div>
        {typeof o.fill === "string" && (
          <Color
            label="Fill colour"
            value={toHex(o.fill, "#c6f432")}
            onChange={(v) => set({ fill: withAlpha(v, fillAlpha) })}
            onPick={onPickColor}
          />
        )}
      </Section>
    );
  if (mode === "stroke")
    return (
      <Section title="Outline / stroke">
        <Slider
          label="Width"
          value={o.strokeWidth ?? 0}
          min={0}
          max={100}
          onChange={(v) => set({ strokeWidth: v, stroke: o.stroke ?? "#111111" })}
        />
        <Slider
          label="Opacity (%)"
          value={strokeAlpha * 100}
          min={0}
          max={100}
          onChange={(v) => set({ stroke: withAlpha(o.stroke, v / 100) })}
        />
        <div className="flex gap-1 text-xs">
          <button
            className="flex-1 rounded-md bg-muted py-1.5"
            onClick={() => set({ stroke: toHex(o.stroke, "#111111") })}
          >
            Colour
          </button>
          <button
            className="flex-1 rounded-md border border-border py-1.5"
            onClick={() => set({ stroke: makeGradient(f, "#111111", "#c6f432", 0) })}
          >
            Gradient
          </button>
        </div>
        {typeof o.stroke === "string" && (
          <Color
            label="Stroke colour"
            value={toHex(o.stroke, "#111111")}
            onChange={(v) => set({ stroke: withAlpha(v, strokeAlpha) })}
            onPick={onPickColor}
          />
        )}
      </Section>
    );
  return (
    <Section title="Effects">
      <div className="grid grid-cols-2 gap-1">
        <button
          className="rounded-md border border-border px-2 py-1.5 text-xs hover:bg-muted"
          onClick={() => shadowSet({ color: "#c6f432", blur: 24, offsetX: 0, offsetY: 0 })}
        >
          Glow
        </button>
        <button
          className="rounded-md border border-border px-2 py-1.5 text-xs hover:bg-muted"
          onClick={() => shadowSet({ color: "rgba(0,0,0,0.28)", blur: 18, offsetX: 0, offsetY: 8 })}
        >
          Lift
        </button>
      </div>
      {o.type === "image" && (
        <>
          <p className="text-xs font-semibold">Background effects / removal</p>
          <div className="flex gap-1 text-xs">
            {(
              [
                ["smart", "Smart AI"],
                ["auto", "Edges"],
                ["color", "Colour"],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                disabled={!!eraseBusy}
                className={`flex-1 rounded-md py-1.5 ${eraseMode === k ? "bg-primary text-primary-foreground" : "border border-border"}`}
                onClick={() => setEraseMode(k)}
              >
                {l}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {eraseMode === "smart"
              ? "Best for people, products and pets. Detects the subject and removes everything else."
              : eraseMode === "auto"
                ? "Removes the plain background touching the photo edges."
                : "Removes one colour everywhere in the photo."}
          </p>
          {eraseMode === "color" && (
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={eraseColor}
                onChange={(e) => setEraseColor(e.target.value)}
                className="h-8 w-10 rounded border border-border"
              />
              <button
                type="button"
                className="rounded-md border border-border px-2 py-1.5 text-[11px] hover:bg-muted"
                onClick={async () => {
                  const c = await onPickColor();
                  if (c) setEraseColor(c);
                }}
              >
                Pick from canvas
              </button>
            </div>
          )}
          {eraseMode !== "smart" && (
            <Slider label="Strength" value={eraseTol} min={0} max={100} onChange={setEraseTol} />
          )}
          <button
            disabled={!!eraseBusy}
            className="w-full rounded-md bg-primary py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
            onClick={() => onEraseBackground(eraseMode, eraseColor, eraseTol)}
          >
            {eraseBusy ?? "Erase background"}
          </button>
          <div className="grid grid-cols-4 gap-1">
            <button
              className="rounded-md border border-border px-1 py-1 text-[11px]"
              onClick={() => onMaskImage("square")}
            >
              Square
            </button>
            <button
              className="rounded-md border border-border px-1 py-1 text-[11px]"
              onClick={() => onMaskImage("circle")}
            >
              Circle
            </button>
            <button
              className="rounded-md border border-border px-1 py-1 text-[11px]"
              onClick={() => onMaskImage("rounded")}
            >
              Rounded
            </button>
            <button
              className="rounded-md border border-border px-1 py-1 text-[11px]"
              onClick={() => onMaskImage("triangle")}
            >
              Triangle
            </button>
            <button
              className="rounded-md border border-border px-1 py-1 text-[11px]"
              onClick={() => onMaskImage("star")}
            >
              Star
            </button>
            <button
              className="rounded-md border border-border px-1 py-1 text-[11px]"
              onClick={() => onMaskImage("heart")}
            >
              Heart
            </button>
            <button
              className="rounded-md border border-border px-1 py-1 text-[11px]"
              onClick={() => onMaskImage("polygon")}
            >
              Polygon
            </button>
          </div>
        </>
      )}
      {o.type === "image" && (
        <ImageFilters
          key={o.canvas?.getObjects?.().indexOf(o) ?? "selected-image"}
          o={o}
          f={f}
          commit={commit}
        />
      )}
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={!!shadow}
          onChange={(e) => (e.target.checked ? shadowSet({}) : set({ shadow: null }))}
        />{" "}
        Shadow
      </label>
      {shadow && (
        <>
          <Color
            label="Shadow colour"
            value={toHex(shadow.color)}
            onChange={(v) => shadowSet({ color: v })}
          />
          <Slider
            label="Blur"
            value={shadow.blur}
            min={0}
            max={100}
            onChange={(v) => shadowSet({ blur: v })}
          />
        </>
      )}
      {isText && (
        <>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={Number(o.text3dDepth ?? 0) > 0}
              onChange={(e) => {
                const depth = e.target.checked ? 10 : 0;
                set({
                  text3dDepth: depth,
                  shadow: e.target.checked
                    ? new f.Shadow({
                        color: "rgba(0,0,0,0.4)",
                        blur: 0,
                        offsetX: depth,
                        offsetY: depth,
                      })
                    : null,
                });
              }}
            />{" "}
            3D text
          </label>
          {Number(o.text3dDepth ?? 0) > 0 && (
            <Slider
              label="3D depth"
              value={Number(o.text3dDepth)}
              min={1}
              max={40}
              onChange={(v) =>
                set({
                  text3dDepth: v,
                  shadow: new f.Shadow({
                    color: "rgba(0,0,0,0.4)",
                    blur: 0,
                    offsetX: v,
                    offsetY: v,
                  }),
                })
              }
            />
          )}
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={!!o.textReflection}
              onChange={(e) => set({ textReflection: e.target.checked })}
            />{" "}
            Reflection
          </label>
        </>
      )}
    </Section>
  );
}

function ImageFilters({ o, f, commit }: { o: Obj; f: Fab; commit: () => void }) {
  type FilterOptions = Record<string, unknown>;
  type FilterConstructor = new (options?: FilterOptions) => Obj;
  const filters = f.filters as unknown as Record<string, FilterConstructor>;
  const [duotoneColor, setDuotoneColor] = useState("#c6f432");
  const [duotoneStrength, setDuotoneStrength] = useState(0.55);
  const existing = (name: string, property: string) =>
    Number((o.filters ?? []).find((filter: Obj) => filter.type === name)?.[property] ?? 0);
  const replaceFilter = (name: string, property: string, value: number) => {
    const next = (o.filters ?? []).filter((filter: Obj) => filter.type !== name);
    if (value !== 0) {
      const Constructor = filters[name];
      if (Constructor) next.push(new Constructor({ [property]: value }));
    }
    o.filters = next;
    o.applyFilters();
    commit();
  };
  const preset = (name: "Original" | "Mono" | "Sepia" | "Vintage") => {
    const presetName = name === "Mono" ? "Grayscale" : name;
    const PresetFilter = name === "Original" ? undefined : filters[presetName];
    o.filters = PresetFilter ? [new PresetFilter()] : [];
    o.applyFilters();
    commit();
  };
  const sharpen = () => {
    const next = (o.filters ?? []).filter((filter: Obj) => filter.type !== "Convolute");
    const SharpenFilter = filters["Convolute"];
    if (!next.some((filter: Obj) => filter.type === "Convolute") && SharpenFilter)
      next.push(new SharpenFilter({ matrix: [0, -1, 0, -1, 5, -1, 0, -1, 0] }));
    o.filters = next;
    o.applyFilters();
    commit();
  };
  const applyDuotone = (color: string, alpha: number) => {
    const Gray = filters["Grayscale"],
      Blend = filters["BlendColor"];
    if (!Gray || !Blend) return;
    o.filters = [new Gray(), new Blend({ color, mode: "tint", alpha })];
    o.applyFilters();
    commit();
  };
  const duotoneActive = (o.filters ?? []).some((filter: Obj) => filter.type === "BlendColor");
  const duotone = () => applyDuotone(duotoneColor, duotoneStrength);
  return (
    <Section title="Color effects & image filters">
      <div className="grid grid-cols-5 gap-1">
        {(["Original", "Mono", "Sepia", "Vintage"] as const).map((name) => (
          <button
            key={name}
            className="rounded-md border border-border px-1 py-1.5 text-[11px] hover:bg-muted"
            onClick={() => preset(name)}
          >
            {name}
          </button>
        ))}
        <button
          className="rounded-md border border-border px-1 py-1.5 text-[11px] hover:bg-muted"
          onClick={duotone}
        >
          Duotone
        </button>
      </div>
      <Color
        label="Duotone tint"
        value={duotoneColor}
        onChange={(color) => {
          setDuotoneColor(color);
          if (duotoneActive) applyDuotone(color, duotoneStrength);
        }}
      />
      <Slider
        label="Duotone strength"
        value={duotoneStrength}
        min={0}
        max={1}
        step={0.01}
        onChange={(strength) => {
          setDuotoneStrength(strength);
          if (duotoneActive) applyDuotone(duotoneColor, strength);
        }}
      />
      <Slider
        label="Brightness"
        value={existing("Brightness", "brightness")}
        min={-1}
        max={1}
        step={0.01}
        onChange={(v) => replaceFilter("Brightness", "brightness", v)}
      />
      <Slider
        label="Contrast"
        value={existing("Contrast", "contrast")}
        min={-1}
        max={1}
        step={0.01}
        onChange={(v) => replaceFilter("Contrast", "contrast", v)}
      />
      <Slider
        label="Saturation"
        value={existing("Saturation", "saturation")}
        min={-1}
        max={1}
        step={0.01}
        onChange={(v) => replaceFilter("Saturation", "saturation", v)}
      />
      <Slider
        label="Blur"
        value={existing("Blur", "blur")}
        min={0}
        max={0.5}
        step={0.01}
        onChange={(v) => replaceFilter("Blur", "blur", v)}
      />
      <Slider
        label="Temperature / tint"
        value={existing("HueRotation", "rotation")}
        min={-1}
        max={1}
        step={0.01}
        onChange={(v) => replaceFilter("HueRotation", "rotation", v)}
      />
      <button
        className="w-full rounded-md border border-border py-1.5 text-xs hover:bg-muted"
        onClick={sharpen}
      >
        Sharpen image
      </button>
    </Section>
  );
}

function colorsInDocument(c: Obj): string[] {
  const found = new Set<string>(["#c6f432", "#111111", "#ffffff"]);
  const add = (value: unknown) => {
    if (typeof value === "string") {
      if (/^#[0-9a-f]{6}$/i.test(value)) found.add(value.toLowerCase());
      const match = value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
      if (match)
        found.add(
          `#${[1, 2, 3]
            .map((i) =>
              Math.max(0, Math.min(255, Number(match[i])))
                .toString(16)
                .padStart(2, "0"),
            )
            .join("")}`,
        );
    } else if (value && typeof value === "object" && Array.isArray((value as Obj).colorStops)) {
      for (const stop of (value as Obj).colorStops) add(stop.color);
    }
  };
  add(c.backgroundColor);
  for (const object of c.getObjects?.() ?? []) {
    add(object.fill);
    add(object.stroke);
    add(object.shadow?.color);
  }
  return [...found].slice(0, 24);
}

function ColorTools({
  c,
  f,
  selected,
  commit,
  onPickColor,
}: {
  c: Obj;
  f: Fab;
  selected: Obj | null;
  commit: () => void;
  onPickColor: () => Promise<string | null>;
}) {
  const [target, setTarget] = useState<"fill" | "stroke" | "background">("fill");
  const [gradient, setGradient] = useState({ a: "#0f172a", b: "#c6f432", angle: 45 });
  const colors = colorsInDocument(c);
  const effectiveTarget = selected ? target : "background";
  const base =
    effectiveTarget === "background"
      ? toHex(c.backgroundColor, "#ffffff")
      : toHex(selected?.[effectiveTarget], "#111111");
  const apply = (color: string) => {
    if (effectiveTarget === "background") {
      c.backgroundImage = undefined;
      c.backgroundColor = color;
    } else if (effectiveTarget === "fill" && selected)
      selected.set({ fill: withAlpha(color, alphaOf(selected.fill)) });
    else if (selected) selected.set({ stroke: color, strokeWidth: selected.strokeWidth || 2 });
    commit();
  };
  const applyGradient = () => {
    c.backgroundImage = undefined;
    c.backgroundColor = makeGradient(
      f,
      gradient.a,
      gradient.b,
      gradient.angle,
      c.getWidth(),
      c.getHeight(),
      "pixels",
    );
    commit();
  };
  return (
    <div className="grid w-full max-w-5xl grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      <Section title="Color picker">
        <div className="flex gap-1">
          {(["fill", "stroke", "background"] as const).map((kind) => (
            <button
              key={kind}
              aria-pressed={effectiveTarget === kind}
              disabled={!selected && kind !== "background"}
              className={`min-w-0 flex-1 rounded-md border border-border px-2 py-1.5 text-xs capitalize disabled:cursor-not-allowed disabled:opacity-40 ${effectiveTarget === kind ? "bg-muted text-foreground" : "text-muted-foreground"}`}
              onClick={() => setTarget(kind)}
            >
              {kind}
            </button>
          ))}
        </div>
        <Color
          label={
            effectiveTarget === "background"
              ? "Canvas background color"
              : `${effectiveTarget} color`
          }
          value={base}
          onChange={apply}
          onPick={onPickColor}
        />
        {!selected && (
          <p className="text-[11px] text-muted-foreground">
            No object selected — the background is being edited. Select an object to edit its fill
            or stroke.
          </p>
        )}
        {selected && (
          <Slider
            label="Layer transparency (%)"
            value={(selected.opacity ?? 1) * 100}
            min={0}
            max={100}
            onChange={(v) => {
              selected.set({ opacity: v / 100 });
              commit();
            }}
          />
        )}
      </Section>
      <Section title="Document colors">
        {colors.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Add colors to the canvas to build this palette.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                title={color}
                aria-label={`Apply document color ${color}`}
                className="h-7 w-7 rounded-full border border-border shadow-sm"
                style={{ backgroundColor: color }}
                onClick={() => apply(color)}
              />
            ))}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          Colors sampled from this design's background, fills, outlines, and shadows.
        </p>
      </Section>
      <Section title="Gradient colors">
        <Color
          label="Start color"
          value={gradient.a}
          onChange={(a) => setGradient({ ...gradient, a })}
          onPick={onPickColor}
        />
        <Color
          label="End color"
          value={gradient.b}
          onChange={(b) => setGradient({ ...gradient, b })}
          onPick={onPickColor}
        />
        <Slider
          label="Gradient angle"
          value={gradient.angle}
          min={0}
          max={360}
          onChange={(angle) => setGradient({ ...gradient, angle })}
        />
        <button
          className="w-full rounded-md border border-border px-2 py-1.5 text-xs hover:bg-muted"
          onClick={() => {
            setTarget("background");
            applyGradient();
          }}
        >
          Apply gradient to background
        </button>
      </Section>
    </div>
  );
}

function DrawingPanel({
  tool,
  setTool,
  color,
  setColor,
  size,
  setSize,
  style,
  setStyle,
  onPickColor,
}: {
  tool: DrawingTool;
  setTool: (tool: DrawingTool) => void;
  color: string;
  setColor: (color: string) => void;
  size: number;
  setSize: (size: number) => void;
  style: "solid" | "dashed" | "dotted";
  setStyle: (style: "solid" | "dashed" | "dotted") => void;
  onPickColor: () => Promise<string | null>;
}) {
  const tools: { id: DrawingTool; label: string }[] = [
    { id: "pen", label: "Pen" },
    { id: "freehand", label: "Freehand draw" },
    { id: "brush", label: "Brush" },
    { id: "line", label: "Line tool" },
    { id: "highlighter", label: "Highlighter" },
    { id: "eraser", label: "Eraser" },
  ];
  return (
    <div className="grid w-full max-w-4xl grid-cols-1 gap-3 md:grid-cols-2">
      <Section title="Drawing tools">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {tools.map(({ id, label }) => (
            <button
              key={id}
              aria-pressed={tool === id}
              className={`min-h-10 rounded-md border border-border px-2 py-2 text-xs ${tool === id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              onClick={() => setTool(tool === id ? null : id)}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          className={`w-full rounded-md border border-border py-1.5 text-xs ${tool === null ? "bg-muted" : "hover:bg-muted"}`}
          onClick={() => setTool(null)}
        >
          Done drawing
        </button>
      </Section>
      <Section title="Brush settings">
        <Color label="Drawing color" value={color} onChange={setColor} onPick={onPickColor} />
        <Slider label="Brush size" value={size} min={1} max={100} onChange={setSize} />
        <label className="block text-xs text-muted-foreground">
          Stroke style
          <select
            className="field mt-1 h-8"
            value={style}
            onChange={(e) => setStyle(e.target.value as "solid" | "dashed" | "dotted")}
          >
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
            <option value="dotted">Dotted</option>
          </select>
        </label>
      </Section>
    </div>
  );
}

function DesignEdit({ c, commit }: { c: Obj; commit: () => void }) {
  const a: DesignAdjustments = c.designAdjustments;
  const set = (key: keyof DesignAdjustments, value: number) => {
    c.designAdjustments = { ...a, [key]: value };
    commit();
  };
  return (
    <Section title="Whole design">
      <Slider
        label="Saturation"
        value={a.saturation}
        min={-100}
        max={100}
        onChange={(v) => set("saturation", v)}
      />
      <Slider
        label="Contrast"
        value={a.contrast}
        min={-100}
        max={100}
        onChange={(v) => set("contrast", v)}
      />
      <Slider
        label="Brightness"
        value={a.brightness}
        min={-100}
        max={100}
        onChange={(v) => set("brightness", v)}
      />
      <Slider
        label="Blur"
        value={a.blur}
        min={0}
        max={30}
        step={0.5}
        onChange={(v) => set("blur", v)}
      />
      <Slider label="Grain" value={a.grain} min={0} max={100} onChange={(v) => set("grain", v)} />
      <Slider
        label="Warmth"
        value={a.warmth}
        min={0}
        max={100}
        onChange={(v) => set("warmth", v)}
      />
      <Slider
        label="Highlights"
        value={a.highlights}
        min={-100}
        max={100}
        onChange={(v) => set("highlights", v)}
      />
      <Slider
        label="Shadows"
        value={a.shadows}
        min={-100}
        max={100}
        onChange={(v) => set("shadows", v)}
      />
      <Slider
        label="Vignette"
        value={a.vignette}
        min={0}
        max={100}
        onChange={(v) => set("vignette", v)}
      />
      <Button
        variant="outline"
        className="mt-3 w-full"
        onClick={() => {
          c.designAdjustments = { ...DEFAULT_ADJUSTMENTS };
          commit();
        }}
      >
        <RotateCcw /> Reset adjustments
      </Button>
    </Section>
  );
}

function ImageCrop({ o, set }: { o: Obj; set: (p: Record<string, unknown>) => void }) {
  const el = o.getElement();
  const ow = el.naturalWidth || el.width,
    oh = el.naturalHeight || el.height;
  const l = o.cropX || 0,
    t = o.cropY || 0;
  const r = Math.max(0, ow - l - o.width),
    b = Math.max(0, oh - t - o.height);
  const apply = (nl: number, nt: number, nr: number, nb: number) => {
    const w = Math.max(10, ow - nl - nr),
      h = Math.max(10, oh - nt - nb);
    set({ cropX: Math.min(nl, ow - 10), cropY: Math.min(nt, oh - 10), width: w, height: h });
  };
  return (
    <Section title="Crop image">
      <Slider
        label="Left"
        value={l}
        min={0}
        max={ow - 10}
        onChange={(v) => apply(v, t, Math.min(r, ow - v - 10), b)}
      />
      <Slider
        label="Right"
        value={r}
        min={0}
        max={ow - 10}
        onChange={(v) => apply(Math.min(l, ow - v - 10), t, v, b)}
      />
      <Slider
        label="Top"
        value={t}
        min={0}
        max={oh - 10}
        onChange={(v) => apply(l, v, r, Math.min(b, oh - v - 10))}
      />
      <Slider
        label="Bottom"
        value={b}
        min={0}
        max={oh - 10}
        onChange={(v) => apply(l, Math.min(t, oh - v - 10), r, v)}
      />
      <button
        className="w-full rounded-md border border-border py-1.5 text-xs hover:bg-muted"
        onClick={() => apply(0, 0, 0, 0)}
      >
        Reset crop
      </button>
    </Section>
  );
}

/* ---------- Canvas panel ---------- */
function CanvasPanel({
  c,
  f,
  proj,
  commit,
  addImage,
  resize,
  showGrid,
  setShowGrid,
  gridSpacing,
  setGridSpacing,
  showRulers,
  setShowRulers,
  guides,
  setGuides,
  snapAlign,
  setSnapAlign,
  snapToGrid,
  setSnapToGrid,
  onClear,
}: {
  c: Obj;
  f: Fab;
  proj: Project;
  commit: () => void;
  addImage: () => void;
  resize: (w: number, h: number) => void;
  showGrid: boolean;
  setShowGrid: (value: boolean) => void;
  gridSpacing: number;
  setGridSpacing: (value: number) => void;
  showRulers: boolean;
  setShowRulers: (value: boolean) => void;
  guides: Guide[];
  setGuides: (value: Guide[]) => void;
  snapAlign: boolean;
  setSnapAlign: (value: boolean) => void;
  snapToGrid: boolean;
  setSnapToGrid: (value: boolean) => void;
  onClear: () => void;
}) {
  const bg = c.backgroundColor;
  const bgImage = c.backgroundImage;
  const mode = !bg ? "none" : typeof bg === "string" ? "solid" : "gradient";
  const [g, setG] = useState({ a: "#0f172a", b: "#c6f432", angle: 45 });
  const [w, setW] = useState(proj.width);
  const [h, setH] = useState(proj.height);
  const grad = (n: typeof g) => {
    setG(n);
    c.backgroundColor = makeGradient(f, n.a, n.b, n.angle, proj.width, proj.height, "pixels");
    commit();
  };
  return (
    <div className="grid w-full max-w-5xl grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      <Section title="Background">
        <div className="flex items-center gap-2 rounded-lg border border-border p-2">
          {bgImage ? (
            <img
              className="h-10 w-10 rounded object-cover"
              src={bgImage.getElement?.()?.src}
              alt="Current background"
            />
          ) : (
            <span
              className="h-10 w-10 rounded border border-border"
              style={{ background: typeof bg === "string" && bg ? bg : "#ffffff" }}
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium">Current background</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {bgImage ? "Image" : mode === "none" ? "White / transparent" : mode}
            </p>
          </div>
          <button
            className="rounded-md border border-border px-2 py-1 text-xs text-destructive hover:bg-muted"
            onClick={() => {
              c.backgroundImage = undefined;
              c.backgroundColor = "#ffffff";
              commit();
            }}
          >
            Delete
          </button>
        </div>
        <button
          className="flex w-full items-center justify-center gap-2 rounded-md border border-border py-2 text-xs hover:bg-muted"
          onClick={addImage}
        >
          <ImagePlus className="h-4 w-4" /> Add background image
        </button>
        <div className="flex gap-1 text-xs">
          {(["solid", "gradient", "none"] as const).map((m) => (
            <button
              key={m}
              className={`flex-1 rounded-md py-1.5 capitalize ${mode === m ? "bg-muted" : "text-muted-foreground"}`}
              onClick={() => {
                c.backgroundImage = undefined;
                if (m === "solid") c.backgroundColor = "#ffffff";
                else if (m === "none") c.backgroundColor = "";
                else return grad(g);
                commit();
              }}
            >
              {m === "none" ? "Transparent" : m}
            </button>
          ))}
        </div>
        {mode === "solid" && (
          <Color
            label="Color"
            value={toHex(bg, "#ffffff")}
            onChange={(v) => {
              c.backgroundColor = v;
              commit();
            }}
          />
        )}
        {mode === "gradient" && (
          <>
            <Color label="Start" value={g.a} onChange={(v) => grad({ ...g, a: v })} />
            <Color label="End" value={g.b} onChange={(v) => grad({ ...g, b: v })} />
            <Slider
              label="Angle"
              value={g.angle}
              min={0}
              max={360}
              onChange={(v) => grad({ ...g, angle: v })}
            />
          </>
        )}
      </Section>
      <Section title="Canvas size">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            className="field"
            value={w}
            onChange={(e) => setW(+e.target.value)}
            aria-label="Width"
          />
          <input
            type="number"
            className="field"
            value={h}
            onChange={(e) => setH(+e.target.value)}
            aria-label="Height"
          />
        </div>
        <button
          className="w-full rounded-md bg-secondary py-2 text-xs font-medium hover:opacity-90"
          onClick={() => resize(Math.min(5000, Math.max(50, w)), Math.min(5000, Math.max(50, h)))}
        >
          Apply size
        </button>
      </Section>
      <Section title="Canvas tools">
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={snapAlign}
            onChange={(e) => setSnapAlign(e.target.checked)}
          />{" "}
          Smart snapping
        </label>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Aligns to the canvas center and edges, other object edges and centers, and your guides.
          Center lines are red; object and edge matches are blue. Distances appear while you drag.
          Grid snapping is separate.
        </p>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(e) => setShowGrid(e.target.checked)}
          />{" "}
          Show grid
        </label>
        <Slider
          label={`Grid spacing (${gridSpacing} px)`}
          value={gridSpacing}
          min={5}
          max={100}
          step={5}
          onChange={setGridSpacing}
        />
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={snapToGrid}
            onChange={(e) => setSnapToGrid(e.target.checked)}
          />{" "}
          Snap to grid
        </label>
        <p className="text-[11px] text-muted-foreground">
          Grid snapping follows the spacing above, even if Smart snapping is off.
        </p>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={showRulers}
            onChange={(e) => setShowRulers(e.target.checked)}
          />{" "}
          Show rulers
        </label>
        <div className="grid grid-cols-2 gap-1">
          <button
            className="rounded-md border border-border px-2 py-1.5 text-[11px] hover:bg-muted"
            onClick={() => setGuides([...guides, { axis: "x", value: proj.width / 2 }])}
          >
            Add vertical guide
          </button>
          <button
            className="rounded-md border border-border px-2 py-1.5 text-[11px] hover:bg-muted"
            onClick={() => setGuides([...guides, { axis: "y", value: proj.height / 2 }])}
          >
            Add horizontal guide
          </button>
        </div>
        {guides.map((guide, index) => (
          <div key={`${guide.axis}-${index}`} className="flex items-end gap-2">
            <div className="flex-1">
              <NumberField
                label={`${guide.axis === "x" ? "Vertical" : "Horizontal"} guide position`}
                value={guide.value}
                onChange={(value) =>
                  setGuides(
                    guides.map((item, i) =>
                      i === index
                        ? {
                            ...item,
                            value: Math.max(
                              0,
                              Math.min(guide.axis === "x" ? proj.width : proj.height, value),
                            ),
                          }
                        : item,
                    ),
                  )
                }
              />
            </div>
            <button
              className="mb-1 rounded border border-border px-2 py-1 text-xs text-destructive"
              aria-label="Remove guide"
              onClick={() => setGuides(guides.filter((_, i) => i !== index))}
            >
              Remove
            </button>
          </div>
        ))}
        <Button variant="outline" className="w-full text-destructive" onClick={onClear}>
          <Trash2 /> Clear canvas
        </Button>
      </Section>
    </div>
  );
}
