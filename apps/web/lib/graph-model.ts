import type { Graph, GraphEdge, GraphNode } from "@codecompass/shared";

/** Distinct, theme-agnostic colours for top-level module groups. */
export const GROUP_PALETTE = [
  "#14B8A6",
  "#3B82F6",
  "#8B5CF6",
  "#F59E0B",
  "#EC4899",
  "#22C55E",
  "#06B6D4",
  "#EF4444",
  "#A855F7",
  "#84CC16",
  "#F97316",
  "#0EA5E9",
];

export const ROOT_GROUP = "(root)";
export const ROOT_COLOR = "#8A93A6";

export interface ModelNode extends GraphNode {
  group: string;
  color: string;
  fileCount: number;
  inDegree: number;
  outDegree: number;
}

export interface ModelGroup {
  name: string;
  color: string;
  count: number;
}

export interface ModelGraph {
  nodes: ModelNode[];
  edges: GraphEdge[];
  groups: ModelGroup[];
  totalNodes: number;
  totalEdges: number;
  shownNodes: number;
  shownEdges: number;
  isolatedCount: number;
}

export function topLevelOf(id: string): string {
  if (!id || id === ".") return ROOT_GROUP;
  const first = id.split("/").filter(Boolean)[0];
  return first || ROOT_GROUP;
}

/** Collapse a folder path to at most `maxDepth` segments. */
export function keyAtDepth(id: string, maxDepth: number): string {
  if (!id || id === ".") return ".";
  const parts = id.split("/").filter(Boolean);
  if (!parts.length) return ".";
  return parts.slice(0, Math.max(1, maxDepth)).join("/");
}

export interface AggregateOptions {
  maxDepth: number;
  minEdgeWeight?: number;
}

/**
 * Roll deep folders up into their ancestor at `maxDepth` so a large repository
 * becomes a readable module map instead of hundreds of leaf folders.
 * Import edges are merged and their weights summed; self-edges are dropped.
 */
export function aggregateGraph(graph: Graph, options: AggregateOptions): ModelGraph {
  const { maxDepth, minEdgeWeight = 1 } = options;

  const nodeAcc = new Map<string, { files: string[]; langs: Map<string, number> }>();
  for (const node of graph.nodes) {
    const key = keyAtDepth(node.id, maxDepth);
    const acc = nodeAcc.get(key) ?? { files: [], langs: new Map<string, number>() };
    const files = node.files ?? [];
    acc.files.push(...files);
    const language = node.language ?? "Other";
    acc.langs.set(language, (acc.langs.get(language) ?? 0) + Math.max(1, files.length));
    nodeAcc.set(key, acc);
  }

  const edgeAcc = new Map<string, number>();
  for (const edge of graph.edges) {
    const source = keyAtDepth(edge.source, maxDepth);
    const target = keyAtDepth(edge.target, maxDepth);
    if (source === target) continue;
    const key = `${source}\u0000${target}`;
    edgeAcc.set(key, (edgeAcc.get(key) ?? 0) + (edge.weight || 1));
  }

  let edges: GraphEdge[] = [...edgeAcc.entries()].map(([key, weight]) => {
    const [source, target] = key.split("\u0000");
    return { id: `${source}->${target}`, source, target, weight };
  });

  const keptEdgeCount = edges.length;
  if (minEdgeWeight > 1) {
    edges = edges.filter((edge) => edge.weight >= minEdgeWeight);
  }

  const nodes: ModelNode[] = [...nodeAcc.entries()].map(([id, acc]) => ({
    id,
    label: id === "." ? "(root)" : id.split("/").slice(-1)[0],
    kind: "module" as const,
    language: [...acc.langs.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Other",
    files: acc.files,
    meta: { fullPath: id, fileCount: acc.files.length },
    group: topLevelOf(id),
    color: ROOT_COLOR,
    fileCount: acc.files.length,
    inDegree: 0,
    outDegree: 0,
  }));

  const byId = new Map(nodes.map((node) => [node.id, node]));
  for (const edge of edges) {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (source) source.outDegree += 1;
    if (target) target.inDegree += 1;
  }

  // Stable, collision-free colours: palette index follows sorted group name.
  const groupNames = [...new Set(nodes.map((node) => node.group))].sort();
  const groups: ModelGroup[] = groupNames.map((name, index) => ({
    name,
    color: name === ROOT_GROUP ? ROOT_COLOR : GROUP_PALETTE[index % GROUP_PALETTE.length],
    count: nodes.filter((node) => node.group === name).length,
  }));
  const colorOf = new Map(groups.map((group) => [group.name, group.color]));
  for (const node of nodes) node.color = colorOf.get(node.group) ?? ROOT_COLOR;

  return {
    nodes,
    edges,
    groups,
    totalNodes: graph.nodes.length,
    totalEdges: graph.edges.length,
    shownNodes: nodes.length,
    shownEdges: keptEdgeCount,
    isolatedCount: nodes.filter((node) => node.inDegree === 0 && node.outDegree === 0).length,
  };
}

/** Sentinel depth meaning "show every folder". */
export const ALL_DEPTH = 99;

/**
 * Pick a readable default aggregation depth: prefer the *deepest* level that
 * still fits comfortably on screen, so a large repo opens with real structure
 * rather than a single unreadable wall.
 */
export function suggestDepth(graph: Graph, maxNodes = 120): number {
  const countAt = (depth: number) =>
    new Set(graph.nodes.map((node) => keyAtDepth(node.id, depth))).size;

  const total = graph.nodes.length;
  const c1 = countAt(1);
  if (total <= 25 || c1 <= 4) return ALL_DEPTH; // tiny repo — just show it all

  const c2 = countAt(2);
  const c3 = countAt(3);
  if (c3 <= maxNodes && c3 > c2) return 3;
  if (c2 <= maxNodes && c2 > c1) return 2;
  return 1;
}

/** Depth presets offered in the UI. */
export const DEPTH_PRESETS = [
  { id: 1, label: "Top level" },
  { id: 2, label: "2 levels" },
  { id: 3, label: "3 levels" },
  { id: Number.POSITIVE_INFINITY, label: "Everything" },
] as const;
