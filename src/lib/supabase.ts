import { supabase } from "@/integrations/supabase/client";
export { supabase };
export const STORAGE_BUCKET = "design-assets";

export function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.");
  }
  return supabase;
}

export async function requireUser() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("Please sign in to use Gridora Studio.");
  return data.user;
}

export async function uploadDesignAsset(file: File, projectId?: string) {
  const client = requireSupabase();
  const user = await requireUser();
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-") || "image";
  const path = `${user.id}/${projectId ?? "uploads"}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await client.storage.from(STORAGE_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || "application/octet-stream",
    cacheControl: "31536000",
  });
  if (error) throw error;
  return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Could not read uploaded image")); reader.readAsDataURL(file); });
}
