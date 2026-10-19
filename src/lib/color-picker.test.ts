import { describe, expect, it } from "vitest";
import {
  colorToHex,
  colorToRgbString,
  hslToColorString,
  hslToRgb,
  parseColor,
  rgbToHsl,
} from "./color-picker";

describe("shared color picker color math", () => {
  it("parses and normalizes short and full HEX colors", () => {
    expect(colorToHex("#f00")).toBe("#ff0000");
    expect(colorToHex("#6ac4ef")).toBe("#6ac4ef");
    expect(hslToColorString(parseColor("#f00"))).toBe("#ff0000");
  });

  it("round trips hue, saturation, and lightness through RGB", () => {
    const source = { h: 210, s: 72, l: 48, a: 1 };
    const converted = rgbToHsl(hslToRgb(source));
    expect(converted.h).toBeCloseTo(source.h, 0);
    expect(converted.s).toBeCloseTo(source.s, 0);
    expect(converted.l).toBeCloseTo(source.l, 0);
  });

  it("preserves alpha in HEX8 and rgba inputs", () => {
    expect(parseColor("#ff000080").a).toBeCloseTo(128 / 255, 3);
    expect(parseColor("rgba(255, 0, 0, 0.5)").a).toBe(0.5);
    expect(hslToColorString(parseColor("rgba(255, 0, 0, 0.5)"))).toBe("rgba(255, 0, 0, 0.5)");
  });

  it("formats the RGB values displayed next to the HEX field", () => {
    expect(colorToRgbString("#ff0000")).toBe("(255, 0, 0, 255)");
  });
});
