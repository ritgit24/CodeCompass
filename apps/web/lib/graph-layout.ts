export interface Point {
  x: number;
  y: number;
}

export interface LayoutNode {
  id: string;
  label: string;
}

export interface LayoutEdge {
  source: string;
  target: string;
}

export interface LayoutOptions {
  direction?: "LR" | "TB";
  nodeWidth?: number;
  nodeHeight?: number;
  layerGap?: number;
  siblingGap?: number;
}

export interface LayoutResult {
  positions: Map<string, Point>;
  layers: Map<string, number>;
  width: number;
  height: number;
  layerCount: number;
}

/**
 * Layered "Sugiyama-lite" layout:
 *  1. topological layering (Kahn) so dependencies always flow one way
 *  2. barycentre ordering to reduce edge crossings
 *  3. every layer centred on the cross axis (no more left-aligned staircase)
 *  4. isolated nodes spread evenly across layers so no column becomes a tower
 *
 * Runs in roughly O(V + E + passes·V log V), so large repos stay fast.
 */
export function layoutGraph(
  graph: { nodes: LayoutNode[]; edges: LayoutEdge[] },
  options: LayoutOptions = {},
): LayoutResult {
  const direction = options.direction ?? "LR";
  const nodeWidth = options.nodeWidth ?? 208;
  const nodeHeight = options.nodeHeight ?? 64;
  const layerGap = options.layerGap ?? (direction === "LR" ? 96 : 84);
  const siblingGap = options.siblingGap ?? (direction === "LR" ? 24 : 30);

  const ids = graph.nodes.map((n) => n.id);
  const idSet = new Set(ids);
  const labelOf = new Map(graph.nodes.map((n) => [n.id, n.label]));
  const byLabel = (a: string, b: string) =>
    (labelOf.get(a) ?? a).localeCompare(labelOf.get(b) ?? b);

  const outgoing = new Map<string, string[]>(ids.map((id) => [id, []]));
  const incoming = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const edge of graph.edges) {
    if (!idSet.has(edge.source) || !idSet.has(edge.target) || edge.source === edge.target) continue;
    outgoing.get(edge.source)!.push(edge.target);
    incoming.get(edge.target)!.push(edge.source);
  }

  // 1. Kahn layering
  const layer = new Map<string, number>();
  const indeg = new Map<string, number>(ids.map((id) => [id, incoming.get(id)!.length]));
  const queue: string[] = ids.filter((id) => (indeg.get(id) ?? 0) === 0);
  for (const id of queue) layer.set(id, 0);

  const settled = new Set<string>();
  while (queue.length) {
    const id = queue.shift()!;
    settled.add(id);
    for (const next of outgoing.get(id) ?? []) {
      layer.set(next, Math.max(layer.get(next) ?? 0, (layer.get(id) ?? 0) + 1));
      indeg.set(next, (indeg.get(next) ?? 0) - 1);
      if ((indeg.get(next) ?? 0) === 0) queue.push(next);
    }
  }

  // Nodes stuck in cycles: place just after their furthest known parent.
  for (const id of ids) {
    if (settled.has(id)) continue;
    const parents = (incoming.get(id) ?? [])
      .map((p) => layer.get(p))
      .filter((v): v is number => v !== undefined);
    layer.set(id, parents.length ? Math.max(...parents) + 1 : 0);
  }

  // 2. Spread isolated nodes (no imports either direction) across layers.
  const isolated = ids.filter(
    (id) => outgoing.get(id)!.length === 0 && incoming.get(id)!.length === 0,
  );
  let maxLayer = 0;
  for (const value of layer.values()) maxLayer = Math.max(maxLayer, value);
  if (isolated.length) {
    const span = Math.max(1, maxLayer + 1);
    isolated.sort(byLabel).forEach((id, i) => layer.set(id, i % span));
  }

  // 3. Barycentre ordering within each layer (two down/up passes).
  const rawLayers = [...new Set(layer.values())].sort((a, b) => a - b);
  const remap = new Map(rawLayers.map((raw, index) => [raw, index]));
  const order: string[][] = rawLayers.map(() => []);
  for (const id of ids) order[remap.get(layer.get(id) ?? 0)!].push(id);
  for (const row of order) row.sort(byLabel);

  const barycentre = (id: string, ref: Map<string, number>, dir: "in" | "out") => {
    const neighbours = dir === "in" ? (incoming.get(id) ?? []) : (outgoing.get(id) ?? []);
    const values = neighbours.map((n) => ref.get(n)).filter((v): v is number => v !== undefined);
    if (!values.length) return Number.POSITIVE_INFINITY;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  };

  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i < order.length; i++) {
      const ref = new Map(order[i - 1].map((id, index) => [id, index]));
      order[i].sort((a, b) => barycentre(a, ref, "in") - barycentre(b, ref, "in") || byLabel(a, b));
    }
    for (let i = order.length - 2; i >= 0; i--) {
      const ref = new Map(order[i + 1].map((id, index) => [id, index]));
      order[i].sort(
        (a, b) => barycentre(a, ref, "out") - barycentre(b, ref, "out") || byLabel(a, b),
      );
    }
  }

  // 4. Positions — centre every layer on the cross axis.
  const mainSize = direction === "LR" ? nodeWidth : nodeHeight;
  const crossSize = direction === "LR" ? nodeHeight : nodeWidth;
  const step = crossSize + siblingGap;

  const crossTotals = order.map(
    (row) => row.length * crossSize + Math.max(0, row.length - 1) * siblingGap,
  );
  const maxCross = Math.max(crossSize, ...crossTotals, 0);

  const positions = new Map<string, Point>();
  const layers = new Map<string, number>();
  order.forEach((row, layerIndex) => {
    const total = crossTotals[layerIndex] ?? 0;
    const start = -total / 2 + crossSize / 2;
    const main = layerIndex * (mainSize + layerGap);
    row.forEach((id, index) => {
      const cross = start + index * step;
      positions.set(id, direction === "LR" ? { x: main, y: cross } : { x: cross, y: main });
      layers.set(id, layerIndex);
    });
  });

  const layerCount = order.length;
  const width =
    direction === "LR" ? layerCount * nodeWidth + Math.max(0, layerCount - 1) * layerGap : maxCross;
  const height =
    direction === "LR"
      ? maxCross
      : layerCount * nodeHeight + Math.max(0, layerCount - 1) * layerGap;

  return { positions, layers, width, height, layerCount };
}
