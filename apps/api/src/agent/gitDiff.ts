import { simpleGit } from "simple-git";
import { redactSecrets } from "../utils/logger";

export interface FileDiff {
  path: string;
  diff: string;
  additions: number;
  deletions: number;
}

/** Split a combined `git diff` into per-file chunks. */
export function splitUnifiedDiff(combined: string): FileDiff[] {
  if (!combined.trim()) return [];
  const chunks = combined.split(/^diff --git /m).filter(Boolean);
  const results: FileDiff[] = [];
  for (const chunk of chunks) {
    const header = chunk.split("\n")[0] ?? "";
    const match = header.match(/a\/(.+?) b\/(.+)$/);
    const path = (match?.[2] ?? header).trim();
    if (!path) continue;
    const diff = "diff --git " + chunk.replace(/\s+$/, "") + "\n";
    const additions = (diff.match(/^\+(?!\+\+)/gm) ?? []).length;
    const deletions = (diff.match(/^-(?!--)/gm) ?? []).length;
    results.push({ path, diff: redactSecrets(diff), additions, deletions });
  }
  return results;
}

/**
 * Capture everything currently changed in the working tree (tracked edits plus
 * intent-to-add new files) as per-file unified diffs.
 */
export async function collectDiffs(repoPath: string): Promise<FileDiff[]> {
  const git = simpleGit(repoPath);
  try {
    await git.add(["-N", "."]);
  } catch {
    /* best effort — repo may be empty */
  }
  const combined = await git.diff();
  return splitUnifiedDiff(combined);
}

export async function changedPaths(repoPath: string): Promise<string[]> {
  const diffs = await collectDiffs(repoPath);
  return diffs.map((d) => d.path);
}
