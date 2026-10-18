import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { responseSchema, type GeminiResult } from "./design-actions";
export { action, responseSchema } from "./design-actions";
export type { GeminiAction, GeminiResult } from "./design-actions";

type AssistantInput = {
  prompt: string;
  history: Array<{ role: "user" | "assistant"; text: string }>;
  preview?: string;
  attachments: Array<{ url: string; name: string }>;
  canvas: { width: number; height: number; background: string; selected: Record<string, unknown> | null; objects: Array<Record<string, unknown>> };
};

const validator = (data: AssistantInput) => z.object({ prompt: z.string().min(1).max(4000), history: z.array(z.object({role: z.enum(["user", "assistant"]), text: z.string()})), preview: z.string().optional(), attachments: z.array(z.object({url: z.string().regex(/^data:image\/(png|jpeg|webp);base64,/).max(15000000), name: z.string()})).max(4), canvas: z.object({width: z.number().positive(), height: z.number().positive(), background: z.string(), selected: z.record(z.unknown()).nullable(), objects: z.array(z.record(z.unknown()))}) }).parse(data);

export const askGeminiDesignAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validator)
  .handler(async ({ data }): Promise<GeminiResult> => {
    const apiKey = process.env["GEMINI_API_KEY"];
    if (!apiKey) throw new Error("The design assistant is not configured yet.");
    const modelListResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
    if (!modelListResponse.ok) throw new Error("Gemini could not access the configured account. Check the Gemini configuration in project settings.");
    const modelList = await modelListResponse.json() as { models?: Array<{ baseModelId?: string; name?: string; supportedGenerationMethods?: string[] }> };
    const available = new Set((modelList.models ?? []).filter((item) => item.supportedGenerationMethods?.includes("generateContent")).flatMap((item) => [item.baseModelId, item.name?.replace(/^models\//, "")]).filter((item): item is string => Boolean(item)));
    const requested = process.env["GEMINI_MODEL"];
    const models = [requested, "gemini-3.8-flash", "gemini-3.6-flash", "gemini-2.5-flash", "gemini-2.0-flash"].filter((candidate, index, all): candidate is string => Boolean(candidate) && all.indexOf(candidate) === index && available.has(candidate as string));
    if (models.length === 0) throw new Error("No compatible Gemini generateContent model is available for this API key.");
    const instruction = `You are the Gridora Studio design assistant. Translate natural-language design instructions into validated structured actions for the existing Fabric.js canvas. Never return code, HTML, CSS, URLs, or arbitrary commands. Return exactly one JSON object with this shape: {"reply":"short explanation","actions":[...]} and no markdown fences. Use only these action types: addText, addIcon, addShape, updateSelected, deleteSelected, duplicateSelected, moveSelected, setOrder, alignSelected, arrange, setBackground, attachImage, generateImage, adjustDesign. attachImage uses zero-based attachmentIndex. generateImage uses prompt and edit:true with targetIndex for editing an existing image; use edit:false to create a new image. Use generateImage for pixel restyling, camera perspective changes, and new image creation. updateSelected supports skewX/skewY for affine perspective, fontStyle, flipX/flipY, visible and shadow:{color,blur,offsetX,offsetY}. adjustDesign changes saturation/brightness/contrast/blur/grain/hue. Use only supported actions from the schema below. Return no actions and ask a clarification question if the object or instruction is ambiguous. Use targetIndex only for objects already listed; omit it for a just-created object to use the current selection. Never claim an action succeeded; the editor reports execution results. Do not invent event details. groupSelected groups the current multiple selection; ungroupSelected ungroups a group. updateSelected also supports locked, width and height in displayed pixels. alignSelected supports corner names like top-right. Give helpful specific design ideas in reply with no actions unless changes are requested. Never suggest templates. Do not delete or replace unrequested elements. Objects are listed with zero-based indexes; use targetIndex when the user refers to a named or positioned existing object. Existing images may be moved, resized, rotated, duplicated, reordered, or have opacity changed, and edited through generateImage; do not invent image URLs. Use setBackground for solid colours or gradients. Support multiple requested operations in one response. If a request is ambiguous or unsupported, return no action for that part and explain it briefly. Coordinates are canvas pixels; keep new objects inside the canvas when possible.\n\nAction schema (validate all parameters):\n${JSON.stringify((await import("zod-to-json-schema")).zodToJsonSchema(responseSchema))}\n\nCanvas context:\n${JSON.stringify(data.canvas)}\n\nUser request:\n${data.prompt}`;
    const imagePart = (url: string) => { const [header, encoded] = url.split(","); return { inlineData: { mimeType: header?.match(/data:([^;]+)/)?.[1] ?? "image/png", data: encoded } }; };
    const contents = data.history.map((m) => ({role: m.role === "assistant" ? "model" : "user", parts: [{text: m.text}]}));
    contents.push({role: "user", parts: [{text: instruction}, ...(data.preview ? [imagePart(data.preview)] : []), ...data.attachments.map((x) => imagePart(x.url))] } as typeof contents[number]);
    let response: Response | undefined;
    for (const model of models) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ contents, generationConfig: { temperature: 0.15, responseMimeType: "application/json" } }),
        });
        if (response?.ok) break;
        if (![404, 429, 500, 502, 503, 504].includes(response.status)) break;
        if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 350));
      }
      if (response?.ok) break;
    }
    if (!response?.ok) { const errorBody = await response?.json().catch(() => null) as {error?: {message?: string}} | null; throw new Error(errorBody?.error?.message ?? "The design assistant is unavailable."); }
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("The design assistant returned no response.");
    const parsed = JSON.parse(text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
    return responseSchema.parse(parsed);
  });
