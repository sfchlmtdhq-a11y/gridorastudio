export type Project = {
  id: string;
  name: string;
  width: number;
  height: number;
  background: string; // "" = transparent
  json?: unknown;
  thumb?: string;
  createdAt: number;
  updatedAt: number;
};

const KEY = "gridora.projects.v1";

function read(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
function write(list: Project[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

export const listProjects = () => read().sort((a, b) => b.updatedAt - a.updatedAt);
export const getProject = (id: string) => read().find((p) => p.id === id);
export function saveProject(p: Project) {
  const list = read().filter((x) => x.id !== p.id);
  list.push(p);
  return write(list);
}
export const deleteProject = (id: string) => write(read().filter((p) => p.id !== id));
export function createProject(o: { name: string; width: number; height: number; background: string }) {
  const now = Date.now();
  const p: Project = { id: Math.random().toString(36).slice(2, 10), ...o, createdAt: now, updatedAt: now };
  saveProject(p);
  return p;
}

export const SIZE_PRESETS = [
  { label: "Square post", w: 1080, h: 1080 },
  { label: "Portrait post", w: 1080, h: 1350 },
  { label: "Story / Reel", w: 1080, h: 1920 },
  { label: "YouTube thumbnail", w: 1280, h: 720 },
  { label: "Facebook cover", w: 1640, h: 624 },
  { label: "A4 portrait", w: 2480, h: 3508 },
  { label: "Business card", w: 1050, h: 600 },
  { label: "Presentation 16:9", w: 1920, h: 1080 },
];
