export type DesignAdjustments = {
  saturation: number;
  contrast: number;
  brightness: number;
  hue: number;
  blur: number;
  grain: number;
  warmth: number;
  highlights: number;
  shadows: number;
  vignette: number;
};
export const DEFAULT_ADJUSTMENTS: DesignAdjustments = {
  saturation: 0,
  contrast: 0,
  brightness: 0,
  hue: 0,
  blur: 0,
  grain: 0,
  warmth: 0,
  highlights: 0,
  shadows: 0,
  vignette: 0,
};

// Fabric is intentionally passed in after hydration; this module has no browser-only imports.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function installDesignAdjustments(canvas: any) {
  canvas.designAdjustments = { ...DEFAULT_ADJUSTMENTS };
  const render = canvas.renderCanvas.bind(canvas);
  const serialize = canvas.toObject.bind(canvas);
  const load = canvas.loadFromJSON.bind(canvas);
  canvas.toObject = (props?: string[]) => ({
    ...serialize(props),
    designAdjustments: { ...canvas.designAdjustments },
  });
  canvas.loadFromJSON = async (json: unknown, ...args: unknown[]) => {
    const data = typeof json === "string" ? JSON.parse(json) : json;
    canvas.designAdjustments = {
      ...DEFAULT_ADJUSTMENTS,
      ...(data as { designAdjustments?: DesignAdjustments })?.designAdjustments,
    };
    return load(data, ...args);
  };
  const buffer = document.createElement("canvas");
  canvas.renderCanvas = (ctx: CanvasRenderingContext2D, objects: unknown[]) => {
    const a: DesignAdjustments = canvas.designAdjustments;
    if (!Object.values(a).some(Boolean)) {
      render(ctx, objects);
      return;
    }
    const skipControls = canvas.skipControlsDrawing;
    canvas.skipControlsDrawing = true;
    try {
      render(ctx, objects);
    } finally {
      canvas.skipControlsDrawing = skipControls;
    }
    buffer.width = ctx.canvas.width;
    buffer.height = ctx.canvas.height;
    const copy = buffer.getContext("2d");
    if (!copy) return;
    copy.drawImage(ctx.canvas, 0, 0);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, buffer.width, buffer.height);
    const scale = buffer.width / (canvas.width / canvas.getZoom());
    ctx.filter = `saturate(${1 + a.saturation / 100}) contrast(${1 + a.contrast / 100}) brightness(${1 + a.brightness / 100}) hue-rotate(${a.hue}deg) blur(${a.blur * scale}px) sepia(${a.warmth / 100})`;
    ctx.drawImage(buffer, 0, 0);
    ctx.restore();
    if (a.grain || a.highlights || a.shadows) {
      const pixels = ctx.getImageData(0, 0, buffer.width, buffer.height);
      for (let i = 0; i < pixels.data.length; i += 4) {
        const red = pixels.data[i] ?? 0,
          green = pixels.data[i + 1] ?? 0,
          blue = pixels.data[i + 2] ?? 0;
        const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
        const tonalLift =
          ((a.shadows / 100) * (1 - luminance) ** 2 + (a.highlights / 100) * luminance ** 2) * 90;
        const noise = a.grain ? (((i * 16807) % 127) / 126 - 0.5) * a.grain * 1.5 : 0;
        for (let c = 0; c < 3; c++)
          pixels.data[i + c] = Math.max(
            0,
            Math.min(255, (pixels.data[i + c] ?? 0) + tonalLift + noise),
          );
      }
      ctx.putImageData(pixels, 0, 0);
    }
    if (a.vignette) {
      const radius = Math.hypot(buffer.width, buffer.height) / 2;
      const gradient = ctx.createRadialGradient(
        buffer.width / 2,
        buffer.height / 2,
        radius * 0.28,
        buffer.width / 2,
        buffer.height / 2,
        radius,
      );
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(0.62, "rgba(0,0,0,0)");
      gradient.addColorStop(1, `rgba(0,0,0,${Math.min(0.75, a.vignette / 130)})`);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, buffer.width, buffer.height);
      ctx.restore();
    }
    if (!skipControls) canvas.drawControls(ctx);
  };
}
