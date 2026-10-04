import fs from "node:fs";
import type { Repo, TreeEntry } from "@codecompass/shared";
import { getFileByPath, getFiles, getRepo, insertRepo, listRepos } from "../db/repoStore";
import { listChat } from "../db/chatIssueStore";
import { paths } from "../utils/paths";
import { parseRepoUrl } from "../utils/url";
import { runAnalysis } from "./analysisService";
import { logger } from "../utils/logger";

export function createRepoFromUrl(url: string): Repo {
  const parsed = parseRepoUrl(url);
  if (!parsed) throw new Error("Could not parse a GitHub owner/repo from that URL");
  const repo = insertRepo({ url: parsed.url, name: parsed.name, owner: parsed.owner });
  // Kick off analysis without blocking the HTTP response.
  void runAnalysis(repo.id, repo.url).catch((err) =>
    logger.error("background analysis crashed", err),
  );
  return repo;
}

export function getRepoDetail(id: string): Repo | undefined {
  return getRepo(id);
}

export { listRepos, getFiles, getFileByPath, listChat };

/** Flat file tree derived from scanned files (dirs are synthesised). */
export function buildTree(repoId: string): TreeEntry[] {
  const files = getFiles(repoId);
  const entries = new Map<string, TreeEntry>();
  for (const file of files) {
    entries.set(file.path, {
      path: file.path,
      type: "file",
      size: file.size,
      language: file.language,
    });
    const parts = file.path.split("/");
    for (let i = 1; i < parts.length; i++) {
      const dir = parts.slice(0, i).join("/");
      if (!entries.has(dir)) entries.set(dir, { path: dir, type: "dir" });
    }
  }
  return [...entries.values()].sort((a, b) => a.path.localeCompare(b.path));
}

const MAX_FILE_BYTES = 200_000;

export function readFileContent(repoId: string, relPath: string) {
  const file = getFileByPath(repoId, relPath);
  const abs = `${paths.repoDir(repoId)}/${relPath}`;
  let content: string;
  try {
    content = fs.readFileSync(abs, "utf8");
  } catch (err) {
    throw new Error(`Could not read ${relPath}: ${(err as Error).message}`);
  }
  const truncated = content.length > MAX_FILE_BYTES;
  return {
    file: file ?? null,
    content: truncated ? content.slice(0, MAX_FILE_BYTES) : content,
    truncated,
    language: file?.language ?? "Other",
  };
}
