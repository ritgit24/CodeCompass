import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { env } from "../utils/env";
import { isInside, safeJoin } from "../utils/paths";
import { redactSecrets } from "../utils/logger";

export interface ToolHooks {
  onRead?: (path: string) => void;
  onWrite?: (path: string) => void;
  onCommand?: (command: string, output: string, exitCode?: number) => void;
}

const ALLOWED_BINARIES = new Set([
  "npm",
  "npx",
  "pytest",
  "node",
  "python",
  "python3",
  "git",
  "make",
]);

/** Reject anything that could escape the sandbox or chain commands. */
export function isCommandAllowed(command: string): boolean {
  const trimmed = command.trim();
  if (!trimmed) return false;
  if (/[;&|><`$(){}\n]/.test(trimmed)) return false;
  const binary = trimmed.split(/\s+/)[0];
  if (!ALLOWED_BINARIES.has(binary)) return false;
  if (binary === "git") {
    const sub = trimmed.split(/\s+/)[1];
    return ["diff", "status", "log", "show", "add"].includes(sub);
  }
  return true;
}

export function runAllowedCommand(
  cwd: string,
  command: string,
  timeoutMs = env.testTimeoutMs,
): { output: string; exitCode: number } {
  if (!isCommandAllowed(command)) {
    return { output: `Blocked: "${command}" is not on the allow-list.`, exitCode: 126 };
  }
  const [binary, ...args] = command.trim().split(/\s+/);
  try {
    const output = execFileSync(binary, args, {
      cwd,
      timeout: timeoutMs,
      maxBuffer: 4 * 1024 * 1024,
      env: { ...process.env, CI: "1" },
    });
    return { output: redactSecrets(output.toString()), exitCode: 0 };
  } catch (err: any) {
    const stdout = err?.stdout?.toString?.() ?? "";
    const stderr = err?.stderr?.toString?.() ?? "";
    return {
      output: redactSecrets(`${stdout}${stderr}${err?.message ?? ""}`),
      exitCode: err?.status ?? 1,
    };
  }
}

function readWithinRoot(root: string, rel: string, limit = 200_000): string {
  const abs = safeJoin(root, rel);
  if (!isInside(root, abs)) throw new Error("Path escapes workspace");
  const content = fs.readFileSync(abs, "utf8");
  return content.length > limit ? content.slice(0, limit) + "\n…(truncated)" : content;
}

/**
 * Build the workspace tools handed to the Cline SDK `Agent`. `createTool` is
 * injected so this module never imports the (ESM-only) SDK directly.
 */
export function createWorkspaceTools(
  createTool: (def: unknown) => unknown,
  repoPath: string,
  hooks: ToolHooks = {},
): { readFile: any; writeFile: any; runCommand: any } {
  const readFile = createTool({
    name: "read_file",
    description: "Read a UTF-8 text file from the repository. Path is relative to the repo root.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string", description: "Repo-relative file path" } },
      required: ["path"],
    },
    async execute(input: { path: string }) {
      hooks.onRead?.(input.path);
      return readWithinRoot(repoPath, input.path);
    },
  });

  const writeFile = createTool({
    name: "write_file",
    description: "Overwrite a file with new full contents. Path is relative to the repo root.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Repo-relative file path" },
        content: { type: "string", description: "The complete new file contents" },
      },
      required: ["path", "content"],
    },
    async execute(input: { path: string; content: string }) {
      const abs = safeJoin(repoPath, input.path);
      if (!isInside(repoPath, abs)) throw new Error("Path escapes workspace");
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, input.content);
      hooks.onWrite?.(input.path);
      return `Wrote ${input.path}`;
    },
  });

  const runCommand = createTool({
    name: "run_command",
    description:
      "Run an allow-listed shell command inside the repository (npm, npx, pytest, node, python, git diff/status).",
    inputSchema: {
      type: "object",
      properties: { command: { type: "string", description: "The command to run" } },
      required: ["command"],
    },
    async execute(input: { command: string }) {
      const { output, exitCode } = runAllowedCommand(repoPath, input.command);
      hooks.onCommand?.(input.command, output, exitCode);
      return output || "(no output)";
    },
  });

  return { readFile, writeFile, runCommand };
}
