import path from "node:path";
import type { Graph, GraphEdge, GraphNode } from "@codecompass/shared";
import type { ParsedFile } from "./parse";

const RESOLVE_EXTENSIONS = [
  "",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".rb",
  ".go",
  ".rs",
  ".java",
  ".kt",
];
const INDEX_FILES = ["index", "__init__", "mod", "main"];

function normalize(p: string): string {
  return p.split(path.sep).join("/").replace(/^\.\//, "");
}

/** Try to resolve a relative import specifier to a real file in the repo. */
function resolveImport(fromFile: string, spec: string, known: Set<string>): string | null {
  if (!spec.startsWith(".")) return null; // only local imports create edges
  const fromDir = path.posix.dirname(fromFile);
  const raw = path.posix.normalize(path.posix.join(fromDir, spec));
  const candidates: string[] = [];
  for (const ext of RESOLVE_EXTENSIONS) candidates.push(raw + ext);
  for (const index of INDEX_FILES) {
    for (const ext of [".ts", ".tsx", ".js", ".jsx", ".py", ""]) {
      candidates.push(path.posix.join(raw, index + ext));
    }
  }
  for (const candidate of candidates) {
    if (known.has(candidate)) return candidate;
  }
  return null;
}

function moduleOf(filePath: string): string {
  const dir = path.posix.dirname(filePath);
  return dir === "." ? "" : dir;
}

const LANG_COLOR: Record<string, string> = {
  TypeScript: "#3178C6",
  JavaScript: "#F7DF1E",
  Python: "#3776AB",
  Ruby: "#CC342D",
  Go: "#00ADD8",
  Rust: "#DEA584",
  Java: "#B07219",
};

/**
 * Build a folder-level module graph: nodes are directories, edges are import
 * relationships weighted by the number of imports crossing them.
 */
export function buildGraph(files: ParsedFile[]): Graph {
  const known = new Set(files.map((f) => normalize(f.path)));

  const nodeFiles = new Map<string, string[]>();
  const nodeLangs = new Map<string, Map<string, number>>();
  for (const f of files) {
    const mod = moduleOf(normalize(f.path));
    nodeFiles.set(mod, [...(nodeFiles.get(mod) ?? []), normalize(f.path)]);
    const langs = nodeLangs.get(mod) ?? new Map<string, number>();
    langs.set(f.language, (langs.get(f.language) ?? 0) + 1);
    nodeLangs.set(mod, langs);
  }

  const edges = new Map<string, number>();
  for (const file of files) {
    const from = moduleOf(normalize(file.path));
    for (const spec of file.imports) {
      const target = resolveImport(normalize(file.path), spec, known);
      if (!target) continue;
      const to = moduleOf(target);
      if (to === from) continue;
      const key = `${from}\u0000${to}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }

  const nodes: GraphNode[] = [...nodeFiles.entries()].map(([mod, paths]) => {
    const langs = nodeLangs.get(mod) ?? new Map();
    const language = [...langs.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Other";
    return {
      id: mod || ".",
      label: mod === "" ? "(root)" : mod.split("/").slice(-1)[0],
      kind: "module" as const,
      language,
      files: paths,
      meta: { fullPath: mod || ".", fileCount: paths.length, color: LANG_COLOR[language] },
    };
  });

  const graphEdges: GraphEdge[] = [...edges.entries()].map(([key, weight]) => {
    const [source, target] = key.split("\u0000");
    return { id: `${source}->${target}`, source: source || ".", target: target || ".", weight };
  });

  return { nodes, edges: graphEdges };
}
