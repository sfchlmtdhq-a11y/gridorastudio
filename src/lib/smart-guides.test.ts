import { describe, expect, it } from "vitest";

import {
  calculateSmartAlignment,
  measureNearestDistances,
  measureSelectionDistances,
  type Bounds,
} from "./smart-guides";

const baseOptions = {
  canvasWidth: 500,
  canvasHeight: 400,
  objects: [] as Bounds[],
  manualGuides: [],
  tolerance: 10,
  snapEnabled: true,
};

describe("smart alignment", () => {
  it("magnetically aligns objects to the canvas center and edges", () => {
    const centered = calculateSmartAlignment(
      { left: 141, top: 100, width: 20, height: 20 },
      { ...baseOptions, canvasWidth: 300 },
    );
    expect(centered.dx).toBeCloseTo(-1);
    expect(centered.guides).toContainEqual({ axis: "x", value: 150, source: "canvas-center" });

    const atEdge = calculateSmartAlignment(
      { left: 7, top: 100, width: 20, height: 20 },
      baseOptions,
    );
    expect(atEdge.dx).toBe(-7);
    expect(atEdge.guides).toContainEqual({ axis: "x", value: 0, source: "canvas-edge" });
  });

  it("aligns any object edge or center to another object's edge or center", () => {
    const result = calculateSmartAlignment(
      { left: 97, top: 40, width: 25, height: 20 },
      { ...baseOptions, objects: [{ left: 125, top: 40, width: 40, height: 30 }] },
    );
    expect(result.dx).toBe(3);
    expect(result.guides).toContainEqual({ axis: "x", value: 125, source: "object" });
  });

  it("snaps to user-placed guides and adjustable grid intervals", () => {
    const manual = calculateSmartAlignment(
      { left: 140, top: 100, width: 20, height: 20 },
      { ...baseOptions, canvasWidth: 600, manualGuides: [{ axis: "x", value: 150 }] },
    );
    expect(manual.dx).toBe(0);
    expect(manual.guides).toContainEqual({ axis: "x", value: 150, source: "manual" });

    const grid = calculateSmartAlignment(
      { left: 43, top: 37, width: 24, height: 20 },
      { ...baseOptions, canvasWidth: 500, canvasHeight: 500, gridSpacing: 20, snapToGrid: true },
    );
    expect(grid.dx).toBe(-3);
    expect(grid.dy).toBe(3);
    expect(grid.guides).toContainEqual({ axis: "x", value: 40, source: "grid" });
    expect(grid.guides).toContainEqual({ axis: "y", value: 40, source: "grid" });
  });

  it("keeps alignment previews visible while magnetic movement is switched off", () => {
    const result = calculateSmartAlignment(
      { left: 142, top: 40, width: 20, height: 20 },
      { ...baseOptions, canvasWidth: 300, snapEnabled: false },
    );
    expect(result.dx).toBe(0);
    expect(result.guides).toContainEqual({ axis: "x", value: 150, source: "canvas-center" });
  });

  it("keeps grid snapping independent from smart object snapping", () => {
    const result = calculateSmartAlignment(
      { left: 43, top: 37, width: 24, height: 20 },
      {
        ...baseOptions,
        canvasWidth: 500,
        canvasHeight: 500,
        snapEnabled: false,
        gridSpacing: 20,
        snapToGrid: true,
      },
    );
    expect(result.dx).toBe(-3);
    expect(result.dy).toBe(3);
    expect(result.guides).toContainEqual({ axis: "x", value: 40, source: "grid" });
  });
});

describe("distance measurements", () => {
  it("shows the nearest clear horizontal and vertical gaps", () => {
    const marker = { left: 0, top: 0, width: 20, height: 20 };
    const peers = [
      { left: 36, top: 0, width: 20, height: 20 },
      { left: 0, top: 31, width: 20, height: 20 },
      { left: 60, top: 0, width: 20, height: 20 },
    ];
    expect(measureNearestDistances(marker, peers)).toEqual([
      { orientation: "horizontal", start: 20, end: 36, position: 10, distance: 16 },
      { orientation: "vertical", start: 20, end: 31, position: 10, distance: 11 },
    ]);
  });

  it("measures spacing between objects in a multi-selection", () => {
    const markers = measureSelectionDistances([
      { left: 0, top: 0, width: 20, height: 20 },
      { left: 25, top: 0, width: 20, height: 20 },
      { left: 0, top: 27, width: 20, height: 20 },
    ]);
    expect(markers.find((marker) => marker.orientation === "horizontal")?.distance).toBe(5);
    expect(markers.find((marker) => marker.orientation === "vertical")?.distance).toBe(7);
  });
});
