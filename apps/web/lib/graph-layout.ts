import type { Graph } from "@codecompass/shared";

export interface Point {
  x: number;
  y: number;
}

/**
 * Simple layered (left-to-right) layout: nodes with no incoming edges start in
 * column 0, everything else is placed one column right of its furthest parent.
 * Cycles are broken after a bounded number of passes.
 */
export function layoutGraph(graph: Graph, colGap = 260, rowGap = 110): Map<string, Point> {
  const ids = graph.nodes.map((n) => n.id);
  const incoming = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const edge of graph.edges) {
    if (incoming.has(edge.target) && incoming.has(edge.source)) {
      incoming.get(edge.target)!.push(edge.source);
    }
  }

  const depth = new Map<string, number>(ids.map((id) => [id, 0]));
  for (let pass = 0; pass < ids.length; pass++) {
    let changed = false;
    for (const id of ids) {
      const parents = incoming.get(id) ?? [];
      if (!parents.length) continue;
      const next = Math.max(...parents.map((p) => (depth.get(p) ?? 0) + 1));
      if (next !== depth.get(id) && next < ids.length) {
        depth.set(id, next);
        changed = true;
      }
    }
    if (!changed) break;
  }

  const columns = new Map<number, string[]>();
  for (const id of ids) {
    const d = depth.get(id) ?? 0;
    columns.set(d, [...(columns.get(d) ?? []), id]);
  }

  const positions = new Map<string, Point>();
  for (const [col, members] of columns) {
    members.forEach((id, row) => {
      positions.set(id, { x: col * colGap, y: row * rowGap });
    });
  }
  return positions;
}
