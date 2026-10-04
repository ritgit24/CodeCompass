import fs from "node:fs";
import path from "node:path";
import { runAllowedCommand } from "../agent/clineTools";

export interface TestRunResult {
  passed: boolean;
  output: string;
  command: string;
  durationMs: number;
}

/** Decide how to test a repository, based on the files it ships. */
export function detectTestCommand(repoPath: string): string | null {
  const pkgPath = path.join(repoPath, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      if (pkg.scripts?.test && !/no test specified/i.test(pkg.scripts.test)) {
        return "npm test --silent";
      }
    } catch {
      /* fall through */
    }
  }
  const pyMarkers = [
    "pyproject.toml",
    "setup.py",
    "setup.cfg",
    "tox.ini",
    "pytest.ini",
    "tests",
    "test",
  ];
  if (pyMarkers.some((m) => fs.existsSync(path.join(repoPath, m)))) {
    return "pytest -q";
  }
  const makefile = path.join(repoPath, "Makefile");
  if (fs.existsSync(makefile)) {
    try {
      if (/^test\s*:/m.test(fs.readFileSync(makefile, "utf8"))) return "make test";
    } catch {
      /* ignore */
    }
  }
  return null;
}

function ensureJsDeps(repoPath: string): string | null {
  const pkgPath = path.join(repoPath, "package.json");
  if (!fs.existsSync(pkgPath)) return null;
  if (fs.existsSync(path.join(repoPath, "node_modules"))) return null;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const hasDeps =
      Object.keys(pkg.dependencies ?? {}).length + Object.keys(pkg.devDependencies ?? {}).length >
      0;
    if (!hasDeps) return null; // nothing to install
  } catch {
    /* fall through and attempt install */
  }
  // Best-effort dependency install so `npm test` has a chance of running.
  const { output, exitCode } = runAllowedCommand(
    repoPath,
    "npm install --no-audit --no-fund --prefer-offline",
    180_000,
  );
  return exitCode === 0 ? null : `Dependency install failed:\n${output}`;
}

/** Run the project's own test suite inside the sandboxed working copy. */
export async function runTests(repoPath: string): Promise<TestRunResult> {
  const command = detectTestCommand(repoPath);
  if (!command) {
    return {
      passed: false,
      command: "(none detected)",
      output:
        "No test command could be detected for this repository (looked for package.json scripts.test, pytest config, and a Makefile test target).",
      durationMs: 0,
    };
  }

  const started = Date.now();
  const installNote = ensureJsDeps(repoPath);
  const { output, exitCode } = runAllowedCommand(repoPath, command);
  const prefix = installNote ? `${installNote}\n\n` : "";
  return {
    passed: exitCode === 0,
    command,
    output: (prefix + (output || "(no output)")).slice(0, 20_000),
    durationMs: Date.now() - started,
  };
}
