import { requireSupabase, requireUser, STORAGE_BUCKET } from "./supabase";

export type Project = {
  id: string;
  name: string;
  width: number;
  height: number;
  background: string;
  json?: unknown;
  thumb?: string;
  thumbPath?: string;
  createdAt: number;
  updatedAt: number;
};

type ProjectRow = {
  id: string;
  name: string;
  width: number;
  height: number;
  background: string;
  canvas_json: unknown;
  thumbnail_path: string | null;
  created_at: string;
  updated_at: string;
};

async function privateAssetUrl(path: string) {
  const { data, error } = await requireSupabase().storage.from(STORAGE_BUCKET).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

async function fromRow(row: ProjectRow): Promise<Project> {
  const project: Project = {
    id: row.id,
    name: row.name,
    width: row.width,
    height: row.height,
    background: row.background,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
  if (row.canvas_json !== null) project.json = row.canvas_json;
  if (row.thumbnail_path) {
    project.thumbPath = row.thumbnail_path;
    project.thumb = await privateAssetUrl(row.thumbnail_path);
  }
  return project;
}

export async function listProjects(): Promise<Project[]> {
  const client = requireSupabase();
  const user = await requireUser();
  const { data, error } = await client
    .from("projects")
    .select("id,name,width,height,background,canvas_json,thumbnail_path,created_at,updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return Promise.all((data as ProjectRow[]).map(fromRow));
}

export async function getProject(id: string): Promise<Project | undefined> {
  const client = requireSupabase();
  const user = await requireUser();
  const { data, error } = await client
    .from("projects")
    .select("id,name,width,height,background,canvas_json,thumbnail_path,created_at,updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as ProjectRow) : undefined;
}

function dataUrlToBlob(dataUrl: string) {
  const [header = "data:image/png;base64", encoded = ""] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);base64/)?.[1] || "image/png";
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

async function saveThumbnail(project: Project, userId: string) {
  if (!project.thumb?.startsWith("data:")) return project.thumbPath ?? null;
  const path = `${userId}/${project.id}/thumbnail.png`;
  const { error } = await requireSupabase().storage.from(STORAGE_BUCKET).upload(path, dataUrlToBlob(project.thumb), {
    upsert: true,
    contentType: "image/png",
    cacheControl: "31536000",
  });
  if (error) throw error;
  return path;
}

export async function saveProject(project: Project): Promise<Project> {
  const client = requireSupabase();
  const user = await requireUser();
  const thumbnailPath = await saveThumbnail(project, user.id);
  const { data, error } = await client
    .from("projects")
    .upsert({
      id: project.id,
      user_id: user.id,
      name: project.name,
      width: project.width,
      height: project.height,
      background: project.background,
      canvas_json: project.json ?? null,
      thumbnail_path: thumbnailPath,
    })
    .select("id,name,width,height,background,canvas_json,thumbnail_path,created_at,updated_at")
    .single();
  if (error) throw error;
  return fromRow(data as ProjectRow);
}

export async function createProject(o: { name: string; width: number; height: number; background: string }) {
  const client = requireSupabase();
  const user = await requireUser();
  const { data, error } = await client
    .from("projects")
    .insert({ user_id: user.id, ...o })
    .select("id,name,width,height,background,canvas_json,thumbnail_path,created_at,updated_at")
    .single();
  if (error) throw error;
  return fromRow(data as ProjectRow);
}

export async function deleteProject(id: string) {
  const client = requireSupabase();
  const user = await requireUser();
  const project = await getProject(id);
  const { error } = await client.from("projects").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
  if (project?.thumbPath) await client.storage.from(STORAGE_BUCKET).remove([project.thumbPath]);
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
