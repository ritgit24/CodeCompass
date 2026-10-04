import { nanoid } from "nanoid";
import type { Graph, Repo, RepoStatus, RepoSummary } from "@codecompass/shared";
import type { ScannedFile } from "../analysis/scan";
import { all, get, run } from "./index";
import { mapFileRow, mapRepoRow } from "./mappers";

export function insertRepo(input: { url: string; name: string; owner: string }): Repo {
  const id = nanoid(10);
  const now = new Date().toISOString();
  run(
    `INSERT INTO repos (id, url, name, owner, default_branch, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.url,
    input.name,
    input.owner,
    "main",
    "queued",
    now,
  );
  return mapRepoRow(get("SELECT * FROM repos WHERE id = ?", id));
}

export function getRepo(id: string): Repo | undefined {
  const row = get("SELECT * FROM repos WHERE id = ?", id);
  return row ? mapRepoRow(row) : undefined;
}

export function listRepos(limit = 20): Repo[] {
  return all("SELECT * FROM repos ORDER BY created_at DESC LIMIT ?", limit).map(mapRepoRow);
}

export function updateRepoStatus(id: string, status: RepoStatus, error?: string | null) {
  run("UPDATE repos SET status = ?, error = ? WHERE id = ?", status, error ?? null, id);
}

export function setDefaultBranch(id: string, branch: string) {
  run("UPDATE repos SET default_branch = ? WHERE id = ?", branch, id);
}

export function saveSummary(id: string, summary: RepoSummary) {
  run("UPDATE repos SET summary_json = ? WHERE id = ?", JSON.stringify(summary), id);
}

export function saveStats(id: string, stats: Repo["stats"]) {
  run("UPDATE repos SET stats_json = ? WHERE id = ?", JSON.stringify(stats), id);
}

// --- files -----------------------------------------------------------------

export function replaceFiles(repoId: string, files: ScannedFile[]) {
  run("DELETE FROM files WHERE repo_id = ?", repoId);
  for (const file of files) {
    run(
      "INSERT INTO files (id, repo_id, path, language, size) VALUES (?, ?, ?, ?, ?)",
      `${repoId}:${file.path}`,
      repoId,
      file.path,
      file.language,
      file.size,
    );
  }
}

export function getFiles(repoId: string) {
  return all("SELECT * FROM files WHERE repo_id = ? ORDER BY path", repoId).map(mapFileRow);
}

export function getFileByPath(repoId: string, path: string) {
  const row = get("SELECT * FROM files WHERE repo_id = ? AND path = ?", repoId, path);
  return row ? mapFileRow(row) : undefined;
}

export function setFileSummaries(repoId: string, summaries: Record<string, string>) {
  for (const [path, summary] of Object.entries(summaries)) {
    run("UPDATE files SET summary = ? WHERE repo_id = ? AND path = ?", summary, repoId, path);
  }
}

// --- graph -----------------------------------------------------------------

export function replaceGraph(repoId: string, graph: Graph) {
  run("DELETE FROM graph_nodes WHERE repo_id = ?", repoId);
  run("DELETE FROM graph_edges WHERE repo_id = ?", repoId);
  for (const node of graph.nodes) {
    run(
      "INSERT INTO graph_nodes (id, repo_id, label, kind, meta_json) VALUES (?, ?, ?, ?, ?)",
      `${repoId}:${node.id}`,
      repoId,
      node.label,
      node.kind,
      JSON.stringify({ ...node.meta, files: node.files, language: node.language }),
    );
  }
  for (const edge of graph.edges) {
    run(
      "INSERT INTO graph_edges (id, repo_id, source, target, weight) VALUES (?, ?, ?, ?, ?)",
      `${repoId}:${edge.id}`,
      repoId,
      edge.source,
      edge.target,
      edge.weight,
    );
  }
}

export function getGraph(repoId: string): Graph {
  const nodeRows = all("SELECT * FROM graph_nodes WHERE repo_id = ?", repoId);
  const edgeRows = all("SELECT * FROM graph_edges WHERE repo_id = ?", repoId);
  const prefix = `${repoId}:`;
  return {
    nodes: nodeRows.map((r: any) => {
      const meta = JSON.parse(r.meta_json ?? "{}");
      const id =
        typeof r.id === "string" && r.id.startsWith(prefix) ? r.id.slice(prefix.length) : r.label;
      return {
        id,
        label: r.label,
        kind: r.kind,
        language: meta.language,
        files: meta.files ?? [],
        meta,
      };
    }),
    edges: edgeRows.map((r: any) => ({
      id: r.id,
      source: r.source,
      target: r.target,
      weight: r.weight,
    })),
  };
}
