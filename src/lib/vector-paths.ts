export type VectorPoint = {
  x: number;
  y: number;
  handleIn?: { x: number; y: number };
  handleOut?: { x: number; y: number };
};

const number = (value: number) => Number(value.toFixed(3));

/** Serialize scene-coordinate anchors and handles as a standards-compliant SVG path. */
export function vectorPathData(points: VectorPoint[], closed = false): string {
  if (!points.length) return "";
  const commands = [`M ${number(points[0]!.x)} ${number(points[0]!.y)}`];
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1]!;
    const current = points[index]!;
    if (previous.handleOut || current.handleIn) {
      const out = previous.handleOut ?? { x: previous.x, y: previous.y };
      const inside = current.handleIn ?? { x: current.x, y: current.y };
      commands.push(
        `C ${number(out.x)} ${number(out.y)} ${number(inside.x)} ${number(inside.y)} ${number(current.x)} ${number(current.y)}`,
      );
    } else {
      commands.push(`L ${number(current.x)} ${number(current.y)}`);
    }
  }
  if (closed && points.length > 2) {
    const previous = points.at(-1)!;
    const first = points[0]!;
    if (previous.handleOut || first.handleIn) {
      const out = previous.handleOut ?? { x: previous.x, y: previous.y };
      const inside = first.handleIn ?? { x: first.x, y: first.y };
      commands.push(
        `C ${number(out.x)} ${number(out.y)} ${number(inside.x)} ${number(inside.y)} ${number(first.x)} ${number(first.y)}`,
      );
    }
    commands.push("Z");
  }
  return commands.join(" ");
}

export function translateVectorPoints(
  points: VectorPoint[],
  dx: number,
  dy: number,
): VectorPoint[] {
  return points.map((point) => ({
    x: point.x + dx,
    y: point.y + dy,
    ...(point.handleIn ? { handleIn: { x: point.handleIn.x + dx, y: point.handleIn.y + dy } } : {}),
    ...(point.handleOut
      ? { handleOut: { x: point.handleOut.x + dx, y: point.handleOut.y + dy } }
      : {}),
  }));
}
