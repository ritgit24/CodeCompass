import type { AnalysisEvent, AnalysisStep, LanguageStat, RepoSummary } from "@codecompass/shared";
import type { ScannedFile } from "../analysis/scan";
import { getAgentService } from "../agent";
import { MockAgentService } from "../agent/MockAgentService";
import { cloneRepo } from "../analysis/clone";
import { buildGraph } from "../analysis/graph";
import { parseFiles } from "../analysis/parse";
import { readReadme, scanRepo } from "../analysis/scan";
import {
  saveStats,
  saveSummary,
  setDefaultBranch,
  setFileSummaries,
  getRepo,
  replaceFiles,
  replaceGraph,
  updateRepoStatus,
} from "../db/repoStore";
import { bus, repoChannel } from "./eventBus";
import { logger } from "../utils/logger";
import { env } from "../utils/env";

function emit(repoId: string, event: AnalysisEvent) {
  bus.publish(repoChannel(repoId), event);
}

/** Cached scan result so chat/issue steps can reuse the file list. */
const fileCache = new Map<string, ScannedFile[]>();

export function getCachedFiles(repoId: string): ScannedFile[] {
  return fileCache.get(repoId) ?? [];
}

export function cacheFiles(repoId: string, files: ScannedFile[]) {
  fileCache.set(repoId, files);
}

/**
 * Full ingest pipeline: clone -> scan -> parse -> map -> summarise. Progress is
 * streamed on the repo channel; results are persisted so reloads are instant.
 */
export async function runAnalysis(repoId: string, url: string): Promise<void> {
  const started = Date.now();
  try {
    const step = async <T>(
      name: AnalysisStep,
      fn: () => Promise<T>,
      detail?: (result: T) => Record<string, unknown>,
    ): Promise<T> => {
      emit(repoId, { type: "step", step: name, status: "started" });
      const result = await fn();
      emit(repoId, { type: "step", step: name, status: "done", detail: detail?.(result) });
      return result;
    };

    // 1. Clone
    updateRepoStatus(repoId, "cloning");
    const clone = await step(
      "cloning",
      () => cloneRepo(url, repoId, (m) => emit(repoId, { type: "log", message: m })),
      (c) => ({ bytes: c.bytes, branch: c.defaultBranch }),
    );
    setDefaultBranch(repoId, clone.defaultBranch);

    // 2. Scan
    updateRepoStatus(repoId, "scanning");
    const scan = await step(
      "scanning",
      async () => scanRepo(clone.repoPath, env.maxFiles),
      (s) => ({ files: s.files.length, languages: s.languages.length }),
    );
    replaceFiles(repoId, scan.files);
    cacheFiles(repoId, scan.files);
    const stats = {
      files: scan.files.length,
      bytes: scan.totalBytes,
      languages: scan.languages as LanguageStat[],
    };
    saveStats(repoId, stats);

    // 3. Parse
    updateRepoStatus(repoId, "parsing");
    const parsed = await step(
      "parsing",
      async () => parseFiles(clone.repoPath, scan.files),
      (p) => ({ parsed: p.length }),
    );

    // 4. Map
    updateRepoStatus(repoId, "mapping");
    await step(
      "mapping",
      async () => {
        const graph = buildGraph(parsed);
        replaceGraph(repoId, graph);
        return graph;
      },
      (g) => {
        emit(repoId, {
          type: "log",
          message: `Graph: ${g.nodes.length} nodes, ${g.edges.length} edges`,
        });
        return { nodes: g.nodes.length, edges: g.edges.length };
      },
    );

    // 5. Summarise
    updateRepoStatus(repoId, "summarising");
    // Best effort: the files, graph and stats are already persisted, so an
    // unreachable or misconfigured agent must not make the repository unusable.
    emit(repoId, { type: "step", step: "summarising", status: "started" });
    let summary: RepoSummary;
    try {
      const agent = await getAgentService();
      const analysis = await agent.summarizeRepo({
        repoPath: clone.repoPath,
        files: scan.files.map((f) => ({ path: f.path, language: f.language, size: f.size })),
        topDirs: scan.topDirs,
        readme: readReadme(clone.repoPath, scan.files),
      });
      summary = {
        what: analysis.what,
        techStack: analysis.techStack,
        howToRun: analysis.howToRun,
        folderStructure: analysis.folderStructure,
        keyFiles: analysis.keyFiles,
        moduleSummaries: analysis.moduleSummaries,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(`agent summarise failed for ${repoId}; using a local summary`, message);
      emit(repoId, {
        type: "log",
        message: `Agent unavailable (${message}) — using a locally generated summary.`,
      });
      // Deterministic, offline summary built from the real file list.
      const local = new MockAgentService();
      const fallback = await local.summarizeRepo({
        repoPath: clone.repoPath,
        files: scan.files.map((f) => ({ path: f.path, language: f.language, size: f.size })),
        topDirs: scan.topDirs,
        readme: readReadme(clone.repoPath, scan.files),
      });
      summary = {
        what: fallback.what,
        techStack: fallback.techStack,
        howToRun: fallback.howToRun,
        folderStructure: fallback.folderStructure,
        keyFiles: fallback.keyFiles,
        moduleSummaries: fallback.moduleSummaries,
      };
    }
    saveSummary(repoId, summary);
    setFileSummaries(repoId, summary.moduleSummaries);
    emit(repoId, {
      type: "step",
      step: "summarising",
      status: "done",
      detail: { modules: Object.keys(summary.moduleSummaries).length },
    });

    updateRepoStatus(repoId, "ready");
    emit(repoId, { type: "step", step: "ready", status: "done" });
    emit(repoId, { type: "done", repoId });
    logger.info(`analysis complete for ${repoId} in ${Date.now() - started}ms`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`analysis failed for ${repoId}`, message);
    updateRepoStatus(repoId, "error", message);
    emit(repoId, { type: "error", message });
  }
}

export function isAnalysed(repoId: string): boolean {
  const repo = getRepo(repoId);
  return repo?.status === "ready";
}
