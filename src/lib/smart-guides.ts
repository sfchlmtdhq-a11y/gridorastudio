export type Axis = "x" | "y";

export type Bounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type ManualGuide = { axis: Axis; value: number };

export type SmartGuideSource = "canvas-center" | "canvas-edge" | "object" | "manual" | "grid";

export type SmartGuide = {
  axis: Axis;
  value: number;
  source: SmartGuideSource;
};

export type SmartAlignment = {
  dx: number;
  dy: number;
  guides: SmartGuide[];
};

export type DistanceMarker = {
  orientation: "horizontal" | "vertical";
  start: number;
  end: number;
  position: number;
  distance: number;
};

type AlignmentOptions = {
  canvasWidth: number;
  canvasHeight: number;
  objects: Bounds[];
  manualGuides: ManualGuide[];
  tolerance: number;
  snapEnabled: boolean;
  gridSpacing?: number;
  snapToGrid?: boolean;
};

const sourcePriority: Record<SmartGuideSource, number> = {
  "canvas-center": 0,
  manual: 1,
  object: 2,
  "canvas-edge": 3,
  grid: 4,
};

function anchors(bounds: Bounds, axis: Axis) {
  const start = axis === "x" ? bounds.left : bounds.top;
  const size = axis === "x" ? bounds.width : bounds.height;
  return [start, start + size / 2, start + size];
}

function closestAlignment(
  bounds: Bounds,
  axis: Axis,
  options: AlignmentOptions,
): { delta: number; guide: SmartGuide } | null {
  const length = axis === "x" ? options.canvasWidth : options.canvasHeight;
  const targets: SmartGuide[] = [
    { axis, value: 0, source: "canvas-edge" },
    { axis, value: length / 2, source: "canvas-center" },
    { axis, value: length, source: "canvas-edge" },
    ...options.manualGuides
      .filter((guide) => guide.axis === axis)
      .map((guide) => ({ ...guide, source: "manual" as const })),
    ...options.objects.flatMap((object) =>
      anchors(object, axis).map((value) => ({ axis, value, source: "object" as const })),
    ),
  ];

  if (options.snapToGrid && options.gridSpacing && options.gridSpacing > 0) {
    const spacing = options.gridSpacing;
    for (const value of anchors(bounds, axis)) {
      const gridValue = Math.round(value / spacing) * spacing;
      targets.push({ axis, value: gridValue, source: "grid" });
    }
  }

  const candidates = anchors(bounds, axis)
    .flatMap((anchor) => targets.map((guide) => ({ delta: guide.value - anchor, guide })))
    .filter(({ delta }) => Math.abs(delta) <= options.tolerance)
    .sort(
      (a, b) =>
        Math.abs(a.delta) - Math.abs(b.delta) ||
        sourcePriority[a.guide.source] - sourcePriority[b.guide.source],
    );
  const activeCandidate = candidates.find(({ guide }) =>
    guide.source === "grid" ? options.snapToGrid : options.snapEnabled,
  );
  return activeCandidate ?? candidates[0] ?? null;
}

/** Find the closest alignment target on each axis, optionally applying its magnetic offset. */
export function calculateSmartAlignment(bounds: Bounds, options: AlignmentOptions): SmartAlignment {
  const x = closestAlignment(bounds, "x", options);
  const y = closestAlignment(bounds, "y", options);
  const xIsActive = x && (x.guide.source === "grid" ? options.snapToGrid : options.snapEnabled);
  const yIsActive = y && (y.guide.source === "grid" ? options.snapToGrid : options.snapEnabled);
  return {
    dx: xIsActive ? (x?.delta ?? 0) : 0,
    dy: yIsActive ? (y?.delta ?? 0) : 0,
    guides: [x?.guide, y?.guide].filter((guide): guide is SmartGuide => guide !== undefined),
  };
}

function measurePair(a: Bounds, b: Bounds): DistanceMarker[] {
  const aRight = a.left + a.width;
  const bRight = b.left + b.width;
  const aBottom = a.top + a.height;
  const bBottom = b.top + b.height;
  const overlapLeft = Math.max(a.left, b.left);
  const overlapRight = Math.min(aRight, bRight);
  const overlapTop = Math.max(a.top, b.top);
  const overlapBottom = Math.min(aBottom, bBottom);
  const markers: DistanceMarker[] = [];

  if (overlapBottom > overlapTop) {
    const gap = b.left >= aRight ? b.left - aRight : a.left >= bRight ? a.left - bRight : -1;
    if (gap > 0) {
      const start = a.left >= bRight ? bRight : aRight;
      markers.push({
        orientation: "horizontal",
        start,
        end: start + gap,
        position: (overlapTop + overlapBottom) / 2,
        distance: gap,
      });
    }
  }

  if (overlapRight > overlapLeft) {
    const gap = b.top >= aBottom ? b.top - aBottom : a.top >= bBottom ? a.top - bBottom : -1;
    if (gap > 0) {
      const start = a.top >= bBottom ? bBottom : aBottom;
      markers.push({
        orientation: "vertical",
        start,
        end: start + gap,
        position: (overlapLeft + overlapRight) / 2,
        distance: gap,
      });
    }
  }

  return markers;
}

/** Return the nearest positive horizontal and vertical gaps to nearby peer objects. */
export function measureNearestDistances(bounds: Bounds, peers: Bounds[]): DistanceMarker[] {
  const candidates = peers.flatMap((peer) => measurePair(bounds, peer));
  const nearest = (orientation: DistanceMarker["orientation"]) =>
    candidates
      .filter((marker) => marker.orientation === orientation)
      .sort((a, b) => a.distance - b.distance)[0];
  return [nearest("horizontal"), nearest("vertical")].filter(
    (marker): marker is DistanceMarker => marker !== undefined,
  );
}

/** Return the two shortest clear gaps among a multi-selection's individual objects. */
export function measureSelectionDistances(objects: Bounds[]): DistanceMarker[] {
  const candidates: DistanceMarker[] = [];
  for (let i = 0; i < objects.length; i++) {
    for (let j = i + 1; j < objects.length; j++)
      candidates.push(...measurePair(objects[i]!, objects[j]!));
  }
  const nearest = (orientation: DistanceMarker["orientation"]) =>
    candidates
      .filter((marker) => marker.orientation === orientation)
      .sort((a, b) => a.distance - b.distance)[0];
  return [nearest("horizontal"), nearest("vertical")].filter(
    (marker): marker is DistanceMarker => marker !== undefined,
  );
}
