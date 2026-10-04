import fs from "node:fs";
import path from "node:path";
import { matchPaths } from "../utils/fileMatch";

const COMMENT_STYLE: Record<string, { open: string; close: string }> = {
  py: { open: "# ", close: "" },
  rb: { open: "# ", close: "" },
  sh: { open: "# ", close: "" },
  yml: { open: "# ", close: "" },
  yaml: { open: "# ", close: "" },
  md: { open: "<!-- ", close: " -->" },
  css: { open: "/* ", close: " */" },
  default: { open: "// ", close: "" },
};

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function composeAnswer(question: string, picks: string[]): string {
  const q = question.toLowerCase();
  const focus = picks[0] ?? "the entry point";
  const lines: string[] = [];
  if (q.includes("request") || q.includes("entry")) {
    lines.push(
      `Requests enter through ${focus}. From there the code routes outward to the modules listed below.`,
    );
  } else if (q.includes("auth")) {
    lines.push(
      `Authentication logic lives close to ${focus}. Look for the middleware or decorator that wraps handlers.`,
    );
  } else if (q.includes("test")) {
    lines.push(`Tests are organised alongside the code; start with ${focus} to see the pattern.`);
  } else {
    lines.push(
      `Here's how "${question}" maps onto the code. The most relevant starting point is ${focus}.`,
    );
  }
  lines.push("", "Files worth reading first:");
  for (const p of picks) lines.push(`- \`${p}\``);
  lines.push("", "Follow the imports outward from these files to build the full picture.");
  return lines.join("\n");
}

export function pickFiles(question: string, files: string[], n: number): string[] {
  const matched = matchPaths(question, files, n);
  if (matched.length >= n) return matched;
  const preferred = files.filter((f) => /(index|main|app|server|core)\./i.test(f));
  return [...new Set([...matched, ...preferred, ...files])].slice(0, n);
}

export function resolveTargets(repoPath: string, planFiles: string[]): string[] {
  const existing = planFiles.filter((f) => {
    try {
      return fs.statSync(path.join(repoPath, f)).isFile();
    } catch {
      return false;
    }
  });
  if (existing.length) return existing.slice(0, 3);
  for (const candidate of [
    "README.md",
    "readme.md",
    "package.json",
    "setup.py",
    "pyproject.toml",
  ]) {
    if (fs.existsSync(path.join(repoPath, candidate))) return [candidate];
  }
  return [];
}

export function applyInertEdit(repoPath: string, relPath: string): void {
  const target = path.join(repoPath, relPath);
  const ext = relPath.split(".").pop()?.toLowerCase() ?? "";
  const style = COMMENT_STYLE[ext] ?? COMMENT_STYLE.default;
  const note = "CodeCompass guided fix (mock agent): review this change before keeping it.";
  const line = `${style.open}${note}${style.close}\n`;
  const current = fs.readFileSync(target, "utf8");
  if (current.includes(line.trim())) return; // idempotent
  const separator = current.endsWith("\n") || current === "" ? "" : "\n";
  fs.writeFileSync(target, `${current}${separator}${line}`);
}

export function describeDir(dir: string, files: { path: string }[]): string {
  const sample = files.slice(0, 2).map((f) => f.path.split("/").pop());
  return `Contains ${files.length} file(s)${sample.length ? `, e.g. ${sample.join(", ")}` : ""}.`;
}

export function reasonFor(p: string): string {
  const base = p.split("/").pop()?.toLowerCase() ?? p;
  if (base.startsWith("readme")) return "Start here — project overview and setup.";
  if (/^(index|main|app|server)\./.test(base)) return "Entry point: wires everything together.";
  if (/config|settings/.test(base)) return "Configuration that shapes runtime behaviour.";
  if (/test|spec/.test(base)) return "Tests reveal expected behaviour.";
  return "Frequently imported, so it sits on the critical path.";
}

export function pickKeyFiles(
  files: { path: string; language: string; size: number }[],
  n: number,
): { path: string; language: string }[] {
  const preferred = files.filter((f) => /(readme|index|main|app|server)\./i.test(f.path));
  const rest = files.filter((f) => !preferred.includes(f));
  return [...preferred, ...rest].slice(0, n).map((f) => ({ path: f.path, language: f.language }));
}
