import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { simpleGit } from "simple-git";
import { env } from "../utils/env";
import { paths } from "../utils/paths";
import { logger } from "../utils/logger";

export interface CloneResult {
  repoPath: string;
  defaultBranch: string;
  bytes: number;
}

/** Sentinel URL that maps to the bundled offline demo repository. */
export const DEMO_REPO_URL = "codecompass/demo-repo";

function fixtureDir(): string {
  return fileURLToPath(new URL("../../fixtures/demo-repo", import.meta.url));
}

export function isDemoUrl(url: string): boolean {
  const cleaned = url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/github\.com\//, "");
  return cleaned === "codecompass/demo-repo" || cleaned === "demo";
}

/** Copy the bundled fixture and make it a real git repo (offline demo). */
async function materialiseDemoRepo(dest: string): Promise<void> {
  const source = fixtureDir();
  if (!fs.existsSync(source)) throw new Error(`Demo fixture missing at ${source}`);
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(source, dest, { recursive: true });
  const git = simpleGit(dest);
  await git.init();
  await git.addConfig("user.email", "demo@codecompass.dev").catch(() => undefined);
  await git.addConfig("user.name", "CodeCompass Demo").catch(() => undefined);
  await git.add(["-A"]);
  await git.commit("chore: seed demo repository");
}

function dirSize(dir: string): number {
  let total = 0;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(abs);
      else if (entry.isFile()) {
        try {
          total += fs.statSync(abs).size;
        } catch {
          /* ignore */
        }
      }
    }
  }
  return total;
}

/**
 * Shallow-clone a GitHub repo into the workspace. Enforces a size cap so a huge
 * repository can't fill the disk.
 */
export async function cloneRepo(
  url: string,
  repoId: string,
  onProgress?: (message: string) => void,
): Promise<CloneResult> {
  const dest = paths.repoDir(repoId);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  if (isDemoUrl(url)) {
    onProgress?.("Loading the bundled demo repository (offline)");
    await materialiseDemoRepo(dest);
    return { repoPath: dest, defaultBranch: "main", bytes: dirSize(dest) };
  }

  onProgress?.(`Cloning ${url} (shallow)`);
  const git = simpleGit({ timeout: { block: 180_000 } });
  const cloneUrl = env.githubToken
    ? url.replace("https://github.com/", `https://${env.githubToken}@github.com/`)
    : url;

  await git.clone(cloneUrl, dest, ["--depth", "1", "--single-branch", "--no-tags"]);

  const bytes = dirSize(dest);
  const limit = env.maxRepoMb * 1024 * 1024;
  if (bytes > limit) {
    fs.rmSync(dest, { recursive: true, force: true });
    throw new Error(
      `Repository is ${Math.round(bytes / 1024 / 1024)}MB which exceeds the ${env.maxRepoMb}MB limit`,
    );
  }

  const local = simpleGit(dest);
  let defaultBranch = "main";
  try {
    defaultBranch = (await local.revparse(["--abbrev-ref", "HEAD"])).trim();
  } catch {
    /* keep default */
  }

  logger.info(`cloned ${url} -> ${dest} (${Math.round(bytes / 1024)}KB, ${defaultBranch})`);
  return { repoPath: dest, defaultBranch, bytes };
}

/** Make a throwaway copy of a clone for a fix session (never touches origin). */
export async function createWorkingCopy(repoPath: string, sessionId: string): Promise<string> {
  const dest = paths.fixDir(sessionId);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(repoPath, dest, { recursive: true });
  return dest;
}
