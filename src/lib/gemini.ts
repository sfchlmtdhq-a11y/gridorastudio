import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const color = z.string().regex(/^#(?:[0-9a-f]{3}){1,2}$/i).optional();
const action = z.discriminatedUnion("type", [
  z.object({ type: z.literal("addText"), text: z.string().min(1).max(500), x: z.number().optional(), y: z.number().optional(), fontSize: z.number().min(6).max(600).optional(), fill: color, fontWeight: z.enum(["normal", "bold"]).optional() }),
  z.object({ type: z.literal("addShape"), shape: z.enum(["rect", "rounded", "circle", "ellipse", "triangle", "pentagon", "hexagon", "star"]), x: z.number().optional(), y: z.number().optional(), width: z.number().min(1).max(10000).optional(), height: z.number().min(1).max(10000).optional(), fill: color, stroke: color, strokeWidth: z.number().min(0).max(100).optional() }),
  z.object({ type: z.literal("updateSelected"), fill: color, fontSize: z.number().min(6).max(600).optional(), fontWeight: z.enum(["normal", "bold"]).optional(), text: z.string().max(500).optional(), left: z.number().optional(), top: z.number().optional(), angle: z.number().min(-360).max(360).optional(), scale: z.number().min(0.05).max(5).optional(), opacity: z.number().min(0).max(1).optional(), stroke: color, strokeWidth: z.number().min(0).max(100).optional() }),
  z.object({ type: z.literal("deleteSelected") }),
  z.object({ type: z.literal("duplicateSelected") }),
  z.object({ type: z.literal("moveSelected"), dx: z.number().min(-10000).max(10000), dy: z.number().min(-10000).max(10000) }),
  z.object({ type: z.literal("setOrder"), direction: z.enum(["front", "forward", "backward", "back"]) }),
  z.object({ type: z.literal("setBackground"), color: color, gradientStart: color, gradientEnd: color }),
  z.object({ type: z.literal("alignSelected"), alignment: z.enum(["center", "left", "right", "top", "bottom"]) }),
  z.object({ type: z.literal("arrange") }),
]);

const responseSchema = z.object({
  reply: z.string().min(1).max(600),
  actions: z.array(action).max(12),
});

export type GeminiAction = z.infer<typeof action>;
export type GeminiResult = z.infer<typeof responseSchema>;

type AssistantInput = {
  prompt: string;
  canvas: { width: number; height: number; background: string; selected: Record<string, unknown> | null; objects: Array<Record<string, unknown>> };
};

const validator = (data: AssistantInput) => data;

export const askGeminiDesignAssistant = createServerFn({ method: "POST" })
  .validator(validator)
  .handler(async ({ data }): Promise<GeminiResult> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("The design assistant is not configured yet.");
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const instruction = `You are the Gridora Studio design assistant. Translate the user's natural-language request into safe, validated canvas actions. Never return code, HTML, CSS, URLs, or arbitrary commands. Use only the action types and fields described by the JSON schema. If the request is unclear or unsupported, return an empty actions array and ask a short clarification in reply. Coordinates are canvas pixels; keep new objects inside the canvas when possible.\n\nCanvas context:\n${JSON.stringify(data.canvas)}\n\nUser request:\n${data.prompt}`;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: instruction }] }],
        generationConfig: { temperature: 0.15, responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { reply: { type: "STRING" }, actions: { type: "ARRAY", items: { type: "OBJECT", properties: { type: { type: "STRING" }, text: { type: "STRING" }, shape: { type: "STRING" }, x: { type: "NUMBER" }, y: { type: "NUMBER" }, width: { type: "NUMBER" }, height: { type: "NUMBER" }, fill: { type: "STRING" }, stroke: { type: "STRING" }, strokeWidth: { type: "NUMBER" }, fontSize: { type: "NUMBER" }, fontWeight: { type: "STRING" }, dx: { type: "NUMBER" }, dy: { type: "NUMBER" }, direction: { type: "STRING" }, alignment: { type: "STRING" }, left: { type: "NUMBER" }, top: { type: "NUMBER" }, angle: { type: "NUMBER" }, scale: { type: "NUMBER" }, opacity: { type: "NUMBER" }, gradientStart: { type: "STRING" }, gradientEnd: { type: "STRING" } }, required: ["type"] } } }, required: ["reply", "actions"] } },
      }),
    });
    if (!response.ok) throw new Error(`Design assistant request failed (${response.status}).`);
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("The design assistant returned no response.");
    const parsed = JSON.parse(text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
    return responseSchema.parse(parsed);
  });
