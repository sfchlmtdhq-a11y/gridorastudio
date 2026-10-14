import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import { SIZE_PRESETS, createProject } from "@/lib/projects";

export function NewDesignDialog({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: { w: number; h: number };
}) {
  const nav = useNavigate();
  const [name, setName] = useState("Untitled design");
  const [w, setW] = useState(1080);
  const [h, setH] = useState(1080);
  const [bg, setBg] = useState("#ffffff");
  const [transparent, setTransparent] = useState(false);

  useEffect(() => {
    if (open && initial) {
      setW(initial.w);
      setH(initial.h);
    }
  }, [open, initial]);

  if (!open) return null;
  const create = async () => {
    const p = await createProject({
      name: name.trim() || "Untitled design",
      width: Math.min(5000, Math.max(50, w || 1080)),
      height: Math.min(5000, Math.max(50, h || 1080)),
      background: transparent ? "" : bg,
    });
    nav({ to: "/editor/$id", params: { id: p.id } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-border bg-card p-6 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">New blank canvas</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</label>
        <input className="field mt-1 mb-4" value={name} onChange={(e) => setName(e.target.value)} />

        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Size presets</p>
        <div className="mt-2 mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SIZE_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => {
                setW(p.w);
                setH(p.h);
              }}
              className={`rounded-lg border px-2 py-2 text-left text-xs transition ${w === p.w && h === p.h ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground"}`}
            >
              <div className="font-medium">{p.label}</div>
              <div className="text-muted-foreground">{p.w}×{p.h}</div>
            </button>
          ))}
        </div>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Width (px)</label>
            <input type="number" className="field mt-1" value={w} onChange={(e) => setW(+e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Height (px)</label>
            <input type="number" className="field mt-1" value={h} onChange={(e) => setH(+e.target.value)} />
          </div>
        </div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Background</p>
        <div className="mt-2 mb-6 flex flex-wrap items-center gap-3">
          <input type="color" value={bg} disabled={transparent} onChange={(e) => setBg(e.target.value)} className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent disabled:opacity-40" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} />
            Transparent background
          </label>
        </div>
        <button onClick={create} className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition hover:opacity-90">
          Create blank canvas
        </button>
      </div>
    </div>
  );
}
