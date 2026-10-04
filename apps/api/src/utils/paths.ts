import fs from "node:fs";
import path from "node:path";
import { env } from "./env";

/** Filesystem locations used by the ingest + fix pipeline. */
export const paths = {
  get workspaceRoot() {
    return env.workspaceDir;
  },
  get dataDir() {
    return env.dataDir;
  },
  repoDir(repoId: string) {
    return path.join(env.workspaceDir, "repos", repoId);
  },
  fixDir(sessionId: string) {
    return path.join(env.workspaceDir, "fixes", sessionId);
  },
  dbFile() {
    return path.join(env.dataDir, "codecompass.sqlite");
  },
};

export function ensureDirs() {
  for (const dir of [paths.workspaceRoot, paths.dataDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/** Guard: ensure a resolved path stays inside the given root. */
export function isInside(root: string, target: string): boolean {
  const rel = path.relative(root, target);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

export function safeJoin(root: string, relative: string): string {
  const target = path.resolve(root, relative);
  if (!isInside(root, target)) {
    throw new Error(`Path escapes workspace: ${relative}`);
  }
  return target;
}
