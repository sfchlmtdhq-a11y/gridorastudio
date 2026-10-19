import { z } from "zod";
const color = z.string().regex(/^#(?:[0-9a-f]{3}){1,2}$/i).optional();
const target = { targetIndex: z.number().int().min(0).max(100).optional(), targetName: z.string().max(120).optional() };
export const action = z.discriminatedUnion("type", [
  z.object({ type: z.literal("addText"), text: z.string().min(1).max(500), x: z.number().finite().min(-10000).max(10000).optional(), y: z.number().finite().min(-10000).max(10000).optional(), fontSize: z.number().min(6).max(600).optional(), fontFamily: z.string().max(80).optional(), fill: color, fontWeight: z.enum(["normal", "bold"]).optional(), textAlign: z.enum(["left", "center", "right", "justify"]).optional(), charSpacing: z.number().min(-200).max(2000).optional(), lineHeight: z.number().min(0.5).max(5).optional() }),
  z.object({ type: z.literal("addIcon"), icon: z.enum(["Heart", "Star", "Bolt", "Check", "Arrow", "Pin", "Chat", "Phone", "Mail", "Music", "Home", "Crown"]), x: z.number().finite().min(-10000).max(10000).optional(), y: z.number().finite().min(-10000).max(10000).optional(), fill: color, scale: z.number().min(0.05).max(5).optional() }),
  z.object({ type: z.literal("addShape"), shape: z.enum(["rect", "rounded", "circle", "ellipse", "triangle", "line", "pentagon", "hexagon", "star"]), x: z.number().finite().min(-10000).max(10000).optional(), y: z.number().finite().min(-10000).max(10000).optional(), width: z.number().min(1).max(10000).optional(), height: z.number().min(1).max(10000).optional(), fill: color, stroke: color, strokeWidth: z.number().min(0).max(100).optional() }),
  z.object({ type: z.literal("updateSelected"), ...target, fill: color, fontSize: z.number().min(6).max(600).optional(), fontFamily: z.string().max(80).optional(), fontStyle: z.enum(["normal", "italic"]).optional(), skewX: z.number().min(-80).max(80).optional(), skewY: z.number().min(-80).max(80).optional(), flipX: z.boolean().optional(), flipY: z.boolean().optional(), visible: z.boolean().optional(), locked: z.boolean().optional(), width: z.number().positive().max(10000).optional(), height: z.number().positive().max(10000).optional(), shadow: z.object({color: z.string().regex(/^#(?:[0-9a-f]{3}){1,2}$/i), blur: z.number().min(0).max(100), offsetX: z.number(), offsetY: z.number()}).optional(), fontWeight: z.enum(["normal", "bold"]).optional(), text: z.string().max(500).optional(), textAlign: z.enum(["left", "center", "right", "justify"]).optional(), charSpacing: z.number().min(-200).max(2000).optional(), lineHeight: z.number().min(0.5).max(5).optional(), left: z.number().finite().min(-10000).max(10000).optional(), top: z.number().finite().min(-10000).max(10000).optional(), angle: z.number().min(-360).max(360).optional(), scale: z.number().min(0.05).max(5).optional(), opacity: z.number().min(0).max(1).optional(), stroke: color, strokeWidth: z.number().min(0).max(100).optional(), rx: z.number().min(0).max(5000).optional(), ry: z.number().min(0).max(5000).optional() }),
  z.object({ type: z.literal("deleteSelected"), ...target }),
  z.object({ type: z.literal("duplicateSelected"), ...target, dx: z.number().min(-10000).max(10000).optional(), dy: z.number().min(-10000).max(10000).optional() }),
  z.object({ type: z.literal("moveSelected"), ...target, dx: z.number().min(-10000).max(10000), dy: z.number().min(-10000).max(10000) }),
  z.object({ type: z.literal("setOrder"), ...target, direction: z.enum(["front", "forward", "backward", "back"]) }),
  z.object({ type: z.literal("alignSelected"), ...target, alignment: z.enum(["center", "left", "right", "top", "bottom", "top-right", "top-left", "bottom-right", "bottom-left"]) }),
  z.object({ type: z.literal("arrange"), alignment: z.enum(["horizontal", "vertical", "center"]).optional() }),
  z.object({ type: z.literal("groupSelected") }),
  z.object({ type: z.literal("ungroupSelected"), ...target }),
  z.object({ type: z.literal("attachImage"), attachmentIndex: z.number().int().min(0).max(3), x: z.number().finite().min(-10000).max(10000).optional(), y: z.number().finite().min(-10000).max(10000).optional() }),
  z.object({ type: z.literal("generateImage"), prompt: z.string().min(1).max(4000), ...target, edit: z.boolean().optional() }),
  z.object({ type: z.literal("adjustDesign"), saturation: z.number().min(-100).max(100).optional(), brightness: z.number().min(-100).max(100).optional(), contrast: z.number().min(-100).max(100).optional(), blur: z.number().min(0).max(30).optional(), grain: z.number().min(0).max(100).optional(), hue: z.number().min(-180).max(180).optional() }),
  z.object({ type: z.literal("setBackground"), color, gradientStart: color, gradientEnd: color, angle: z.number().min(0).max(360).optional() }),
]);

export const responseSchema = z.object({
  reply: z.string().min(1).max(600),
  actions: z.array(action).max(12),
});

export type GeminiAction = z.infer<typeof action>;
export type GeminiResult = z.infer<typeof responseSchema>;

