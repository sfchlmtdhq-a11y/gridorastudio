import { describe, expect, it } from "vitest";

import { translateVectorPoints, vectorPathData } from "./vector-paths";

describe("vector path geometry", () => {
  it("builds a straight editable path from anchor points", () => {
    expect(
      vectorPathData([
        { x: 10, y: 20 },
        { x: 50, y: 60 },
      ]),
    ).toBe("M 10 20 L 50 60");
  });

  it("serializes outgoing and incoming handles into a cubic Bezier segment", () => {
    expect(
      vectorPathData([
        { x: 10, y: 20, handleOut: { x: 20, y: 0 } },
        { x: 50, y: 60, handleIn: { x: 40, y: 80 } },
      ]),
    ).toBe("M 10 20 C 20 0 40 80 50 60");
  });

  it("closes a path to support conversion into a filled shape", () => {
    expect(
      vectorPathData(
        [
          { x: 0, y: 0 },
          { x: 30, y: 0 },
          { x: 20, y: 20 },
        ],
        true,
      ),
    ).toBe("M 0 0 L 30 0 L 20 20 Z");
  });

  it("translates anchors and handles together without mutating the source", () => {
    const source = [{ x: 10, y: 20, handleIn: { x: 8, y: 18 }, handleOut: { x: 15, y: 20 } }];
    expect(translateVectorPoints(source, 5, -3)).toEqual([
      { x: 15, y: 17, handleIn: { x: 13, y: 15 }, handleOut: { x: 20, y: 17 } },
    ]);
    expect(source[0]?.x).toBe(10);
  });
});
