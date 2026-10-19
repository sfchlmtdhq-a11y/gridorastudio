import { useRef, useState, type PointerEvent } from "react";
import { Droplet, Pencil, Pipette } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  colorToHex,
  colorToRgbString,
  hslToColorString,
  hslToRgb,
  parseColor,
  type HslColor,
} from "@/lib/color-picker";

const RECENT_COLORS_KEY = "gridora-color-palette";

function loadRecentColors(): string[] {
  try {
    const value = localStorage.getItem(RECENT_COLORS_KEY);
    const parsed: unknown = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((color): color is string => typeof color === "string").slice(0, 12) : [];
  } catch {
    return [];
  }
}

function normalizeHexInput(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

function validHexInput(value: string) {
  return /^#?(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(value.trim());
}

function ColorWheel({ color, onChange }: { color: HslColor; onChange: (next: HslColor) => void }) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const rgb = hslToRgb(color);
  const markerAngle = ((color.h - 90) * Math.PI) / 180;
  const markerDistance = (color.s / 100) * 46;
  const markerX = 50 + Math.cos(markerAngle) * markerDistance;
  const markerY = 50 + Math.sin(markerAngle) * markerDistance;

  const readPointer = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = wheelRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const x = event.clientX - bounds.left - bounds.width / 2;
    const y = event.clientY - bounds.top - bounds.height / 2;
    const radius = Math.min(bounds.width, bounds.height) / 2;
    const distance = Math.min(radius, Math.hypot(x, y));
    const hue = (Math.atan2(y, x) * (180 / Math.PI) + 450) % 360;
    onChange({ ...color, h: hue, s: (distance / radius) * 100 });
  };

  return (
    <div className="flex min-h-0 items-center justify-center overflow-hidden">
      <div
        ref={wheelRef}
        role="slider"
        tabIndex={0}
        aria-label="Hue and saturation"
        aria-valuetext={`Hue ${Math.round(color.h)} degrees, saturation ${Math.round(color.s)} percent`}
        className="relative aspect-square h-full max-h-full min-h-0 w-auto max-w-full touch-none rounded-full border-2 border-border shadow-inner outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{
          backgroundImage:
            "radial-gradient(circle at center, rgb(255 255 255 / 100%) 0%, rgb(255 255 255 / 0%) 79%), conic-gradient(#ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
          touchAction: "none",
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          readPointer(event);
        }}
        onPointerMove={(event) => {
          if (event.buttons > 0) readPointer(event);
        }}
        onKeyDown={(event) => {
          const delta = event.shiftKey ? 10 : 1;
          if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
            event.preventDefault();
            onChange({ ...color, h: (color.h - delta + 360) % 360 });
          } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
            event.preventDefault();
            onChange({ ...color, h: (color.h + delta) % 360 });
          }
        }}
      >
        <span
          className="pointer-events-none absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_1px_6px_rgba(0,0,0,0.7)]"
          style={{ left: `${markerX}%`, top: `${markerY}%`, backgroundColor: `rgba(${rgb.r},${rgb.g},${rgb.b},${color.a})` }}
        />
      </div>
    </div>
  );
}

function ColorRange({ label, value, background, onChange }: { label: string; value: number; background: string; onChange: (value: number) => void }) {
  return (
    <label className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
      <span className="w-[4.25rem] shrink-0">{label}</span>
      <span className="relative h-6 min-w-0 flex-1 overflow-hidden rounded-full border border-border" style={{ background }}>
        <input className="color-picker-range absolute inset-0 h-full w-full cursor-pointer" type="range" min={0} max={100} value={Math.round(value)} onChange={(event) => onChange(Number(event.target.value))} aria-label={label} />
      </span>
      <span className="w-8 text-right tabular-nums">{Math.round(value)}%</span>
    </label>
  );
}

export function ColorPickerField({
  label,
  value,
  onChange,
  onPreview,
  onPickColor,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
  onPreview?: ((color: string) => void) | undefined;
  onPickColor?: (() => Promise<string | null>) | undefined;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState<HslColor>(() => parseColor(value));
  const [hexInput, setHexInput] = useState(colorToHex(value).toUpperCase());
  const [editingHex, setEditingHex] = useState(false);
  const [message, setMessage] = useState("");
  const [recent, setRecent] = useState<string[]>(loadRecentColors);
  const initialValue = useRef(value);
  const serialized = hslToColorString(color);
  const rgb = hslToRgb(color);
  const currentHex = colorToHex(serialized).toUpperCase();
  const hueColor = `hsl(${color.h} ${color.s}% 50%)`;
  const lightnessGradient = `linear-gradient(90deg, hsl(${color.h} ${color.s}% 0%), hsl(${color.h} ${color.s}% 50%), hsl(${color.h} ${color.s}% 100%))`;
  const saturationGradient = `linear-gradient(90deg, hsl(${color.h} 0% ${color.l}%), hsl(${color.h} 100% ${color.l}%))`;
  const opacityGradient = `linear-gradient(90deg, rgba(${rgb.r},${rgb.g},${rgb.b},0), rgba(${rgb.r},${rgb.g},${rgb.b},1))`;

  const begin = () => {
    initialValue.current = value;
    setColor(parseColor(value));
    setHexInput(colorToHex(value).toUpperCase());
    setEditingHex(false);
    setMessage("");
    setOpen(true);
  };

  const update = (next: HslColor) => {
    setColor(next);
    const nextValue = hslToColorString(next);
    setHexInput(colorToHex(nextValue).toUpperCase());
    setMessage("");
    onPreview?.(nextValue);
  };

  const cancel = () => {
    onPreview?.(initialValue.current);
    setColor(parseColor(initialValue.current));
    setOpen(false);
  };

  const apply = () => {
    const nextValue = hslToColorString(color);
    onChange(nextValue);
    const nextRecent = [colorToHex(nextValue).toUpperCase(), ...recent.filter((item) => item.toUpperCase() !== colorToHex(nextValue).toUpperCase())].slice(0, 12);
    setRecent(nextRecent);
    try {
      localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(nextRecent));
    } catch {
      // Color selection still works when browser storage is unavailable.
    }
    setOpen(false);
  };

  const pickFromScreen = async () => {
    try {
      const eyeDropper = (window as Window & { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper;
      const picked = eyeDropper ? (await new eyeDropper().open()).sRGBHex : await onPickColor?.();
      if (!picked) {
        setMessage("The eyedropper is not available in this browser.");
        return;
      }
      update(parseColor(picked, color));
    } catch {
      setMessage("Color sampling was cancelled.");
    }
  };

  const applyHexInput = () => {
    if (!validHexInput(hexInput)) {
      setMessage("Enter a valid 3, 4, 6 or 8 digit HEX value.");
      return;
    }
    update(parseColor(normalizeHexInput(hexInput), color));
  };

  return (
    <div className="flex min-w-0 items-center justify-between gap-2">
      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={begin}
        aria-label={`Choose ${label.toLowerCase()} color`}
        className="flex min-w-0 max-w-[min(65%,13rem)] items-center gap-2 rounded-lg border border-border px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="h-5 w-5 shrink-0 rounded-full border border-border" style={{ backgroundColor: value }} />
        <span className="truncate font-mono uppercase">{colorToHex(value)}</span>
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) begin();
          else if (open) cancel();
        }}
      >
        <DialogContent className="grid h-[min(92dvh,50rem)] w-[min(calc(100vw-1.5rem),34rem)] max-w-none grid-rows-[auto_auto_auto_minmax(0,1fr)_auto_auto_auto] gap-2 overflow-hidden overscroll-contain rounded-2xl p-3 sm:gap-3 sm:p-5">
          <DialogHeader className="flex min-w-0 flex-row items-center justify-between space-y-0 pr-7 text-left">
            <div className="min-w-0">
              <DialogTitle className="truncate text-base">{label}</DialogTitle>
              <p className="text-[11px] text-muted-foreground">Choose a color, enter a HEX value, or sample from the screen.</p>
            </div>
          </DialogHeader>

          <div className="flex items-center justify-center">
            <span className="h-12 w-12 rounded-full border-2 border-border shadow-sm sm:h-14 sm:w-14" style={{ backgroundColor: serialized }} aria-label={`Current color ${currentHex}`} />
          </div>

          <div className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-muted/40 p-1.5">
            <div className="min-w-0 flex-1">
              {editingHex ? (
                <input
                  autoFocus
                  value={hexInput}
                  onChange={(event) => {
                    const next = event.target.value;
                    setHexInput(next);
                    if (validHexInput(next)) update(parseColor(normalizeHexInput(next), color));
                  }}
                  onKeyDown={(event) => { if (event.key === "Enter") applyHexInput(); }}
                  onBlur={applyHexInput}
                  aria-label={`${label} HEX value`}
                  className="field h-9 w-full min-w-0 px-2 text-center font-mono text-xs uppercase"
                  maxLength={9}
                />
              ) : (
                <button type="button" className="block w-full min-w-0 truncate text-left font-mono text-xs" onClick={() => setEditingHex(true)} title={`${currentHex} ${colorToRgbString(serialized)}`}>
                  {currentHex} <span className="text-muted-foreground">— {colorToRgbString(serialized)}</span>
                </button>
              )}
            </div>
            <button type="button" onClick={() => void pickFromScreen()} aria-label="Pick a color from the screen" title="Eyedropper" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-foreground hover:bg-accent">
              <Pipette className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setEditingHex((editing) => !editing)} aria-label="Edit HEX color" title="Edit HEX" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-foreground hover:bg-accent">
              <Pencil className="h-4 w-4" />
            </button>
          </div>

          <ColorWheel color={color} onChange={update} />

          <div className="grid min-w-0 gap-2">
            <ColorRange label="Saturation" value={color.s} background={saturationGradient} onChange={(s) => update({ ...color, s })} />
            <ColorRange label="Lightness" value={color.l} background={lightnessGradient} onChange={(l) => update({ ...color, l })} />
            <ColorRange label="Opacity" value={color.a * 100} background={`linear-gradient(90deg, rgba(${rgb.r},${rgb.g},${rgb.b},0), rgba(${rgb.r},${rgb.g},${rgb.b},1)), repeating-conic-gradient(#bbb 0% 25%, #fff 0% 50%)`} onChange={(a) => update({ ...color, a: a / 100 })} />
          </div>

          <div className="flex min-w-0 items-center gap-2 overflow-x-auto py-1" aria-label="Recent colors">
            <span className="shrink-0 text-[10px] text-muted-foreground">Recent</span>
            {recent.length ? recent.map((recentColor) => (
              <button key={recentColor} type="button" aria-label={`Preview ${recentColor}`} title={recentColor} className="h-6 w-6 shrink-0 rounded-full border border-border" style={{ backgroundColor: recentColor }} onClick={() => update(parseColor(recentColor, color))} />
            )) : <span className="text-[10px] text-muted-foreground">Your applied colors appear here.</span>}
          </div>

          <div className="flex min-w-0 items-center justify-between gap-3 border-t border-border pt-2">
            <p role="status" className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">{message}</p>
            <div className="flex shrink-0 gap-2">
              <Button type="button" variant="ghost" onClick={cancel}>Cancel</Button>
              <Button type="button" onClick={apply}><Droplet className="mr-2 h-4 w-4" />OK</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
