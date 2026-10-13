import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Clock, LayoutGrid } from "lucide-react";
import { NewDesignDialog } from "@/components/NewDesignDialog";
import { Logo } from "@/components/Logo";
import { SIZE_PRESETS, deleteProject, listProjects, saveProject, type Project } from "@/lib/projects";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gridora Studio — Blank-canvas graphic design editor" },
      { name: "description", content: "Design from scratch with powerful typography, image editing, layers and export tools." },
      { property: "og:title", content: "Gridora Studio" },
      { property: "og:description", content: "A professional blank-canvas graphic design editor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Thumb({ p }: { p: Project }) {
  return (
    <div className="checker flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg">
      {p.thumb ? (
        <img src={p.thumb} alt={p.name} className="max-h-full max-w-full object-contain" />
      ) : (
        <div className="border border-border" style={{ aspectRatio: `${p.width}/${p.height}`, height: "70%", background: p.background || "transparent" }} />
      )}
    </div>
  );
}

function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
  const [initial, setInitial] = useState<{ w: number; h: number }>();
  const refresh = () => setProjects(listProjects());
  useEffect(refresh, []);
  const recent = projects.slice(0, 4);
  const openNew = (s?: { w: number; h: number }) => {
    setInitial(s);
    setOpen(true);
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Logo />
          <button onClick={() => openNew()} className="hidden items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground sm:inline-flex">
            <Plus className="h-4 w-4" /> New design
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 sm:p-12">
          <div className="grid-bg absolute inset-0 opacity-40" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Blank canvas. Your rules.</p>
            <h1 className="mt-3 max-w-2xl font-display text-4xl font-bold leading-tight sm:text-6xl">Design anything, from nothing.</h1>
            <p className="mt-4 max-w-lg text-muted-foreground">Typography, images, shapes, layers and pro exports — all on a clean canvas you build yourself.</p>
            <button onClick={() => openNew()} className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-primary px-7 py-4 text-lg font-bold text-primary-foreground shadow-glow transition hover:scale-[1.02]">
              <Plus className="h-6 w-6" /> Create New Design
            </button>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="mb-4 font-display text-xl font-bold">Canvas sizes</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {SIZE_PRESETS.map((s) => (
              <button key={s.label} onClick={() => openNew({ w: s.w, h: s.h })} className="flex min-w-[140px] flex-col items-center gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-primary">
                <div className="flex h-16 items-center justify-center">
                  <div className="rounded-sm border-2 border-muted-foreground" style={{ width: s.w >= s.h ? 64 : (64 * s.w) / s.h, height: s.h >= s.w ? 64 : (64 * s.h) / s.w }} />
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.w}×{s.h}</div>
                </div>
              </button>
            ))}
            <button onClick={() => openNew()} className="flex min-w-[140px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-4 hover:border-primary">
              <Plus className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">Custom size</span>
            </button>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold"><Clock className="h-5 w-5 text-primary" /> Recently edited</h2>
          {recent.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">No projects yet. Start with a blank canvas.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {recent.map((p) => (
                <Link key={p.id} to="/editor/$id" params={{ id: p.id }} className="rounded-xl border border-border bg-card p-3 transition hover:border-primary">
                  <Thumb p={p} />
                  <div className="mt-2 truncate text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{new Date(p.updatedAt).toLocaleString()}</div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="mt-12">
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold"><LayoutGrid className="h-5 w-5 text-primary" /> My Designs <span className="text-sm font-normal text-muted-foreground">({projects.length})</span></h2>
          {projects.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {projects.map((p) => (
                <div key={p.id} className="group rounded-xl border border-border bg-card p-3">
                  <Link to="/editor/$id" params={{ id: p.id }}><Thumb p={p} /></Link>
                  <div className="mt-2 flex items-center justify-between gap-1">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.width}×{p.height}</div>
                    </div>
                    <div className="flex shrink-0">
                      <button aria-label="Rename" className="rounded p-1.5 hover:bg-muted" onClick={() => {
                        const n = prompt("Rename design", p.name);
                        if (n) { saveProject({ ...p, name: n }); refresh(); }
                      }}><Pencil className="h-4 w-4" /></button>
                      <button aria-label="Delete" className="rounded p-1.5 text-destructive hover:bg-muted" onClick={() => {
                        if (confirm(`Delete "${p.name}"?`)) { deleteProject(p.id); refresh(); }
                      }}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <button onClick={() => openNew()} aria-label="Create New Design" className="fixed bottom-5 right-5 rounded-full bg-primary p-4 text-primary-foreground shadow-glow sm:hidden"><Plus className="h-6 w-6" /></button>
      <NewDesignDialog open={open} onClose={() => setOpen(false)} initial={initial} />
    </div>
  );
}
