import fs from "node:fs";
import path from "node:path";
import type { ScannedFile } from "./scan";

/**
 * Lightweight, dependency-free static analysis. Extracts imports, exports and
 * top-level symbols with language-aware regexes. This is the fallback the
 * brief allows ("simple regex import parsing") and works with zero native deps.
 */

export interface ParsedFile {
  path: string;
  language: string;
  imports: string[]; // raw module specifiers
  exports: string[];
  symbols: string[]; // top-level functions / classes
  lines: number;
}

const IMPORT_PATTERNS: Record<string, RegExp[]> = {
  JavaScript: [
    /import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g,
    /export\s+[^'"]*?\s+from\s+['"]([^'"]+)['"]/g,
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
    /import\(\s*['"]([^'"]+)['"]\s*\)/g,
  ],
  Python: [/^\s*from\s+([.\w]+)\s+import\s+/gm, /^\s*import\s+([.\w]+)/gm],
  Ruby: [/^\s*require(_relative)?\s+['"]([^'"]+)['"]/gm],
  Go: [/^\s*"([^"]+)"\s*$/gm],
  Rust: [/^\s*use\s+([\w:]+)/gm, /^\s*(?:pub\s+)?mod\s+(\w+)/gm],
  Java: [/^\s*import\s+([\w.]+);/gm],
  Kotlin: [/^\s*import\s+([\w.]+)/gm],
};
// TypeScript reuses the JavaScript patterns (same import syntax).
IMPORT_PATTERNS.TypeScript = IMPORT_PATTERNS.JavaScript;

const EXPORT_PATTERNS: Record<string, RegExp[]> = {
  JavaScript: [
    /export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+(\w+)/g,
    /export\s*\{([^}]+)\}/g,
  ],
  Python: [/^\s*__all__\s*=\s*\[([^\]]*)\]/gm],
};
EXPORT_PATTERNS.TypeScript = EXPORT_PATTERNS.JavaScript;

const SYMBOL_PATTERNS: Record<string, RegExp[]> = {
  JavaScript: [
    /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g,
    /(?:export\s+)?class\s+(\w+)/g,
    /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(/g,
  ],
  TypeScript: [
    /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g,
    /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/g,
    /(?:export\s+)?(?:interface|type|enum)\s+(\w+)/g,
    /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(/g,
  ],
  Python: [/^\s*def\s+(\w+)/gm, /^\s*class\s+(\w+)/gm],
  Ruby: [/^\s*(?:def|class|module)\s+([\w:]+)/gm],
  Go: [/^func\s+(?:\([^)]*\)\s*)?(\w+)/gm, /^type\s+(\w+)/gm],
  Rust: [/^\s*(?:pub\s+)?fn\s+(\w+)/gm, /^\s*(?:pub\s+)?struct\s+(\w+)/gm],
};

function collect(code: string, patterns: RegExp[] | undefined, groupIndex = 1): string[] {
  if (!patterns) return [];
  const out = new Set<string>();
  for (const pattern of patterns) {
    const re = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(code)) !== null) {
      const raw = match[groupIndex] ?? match[0];
      if (!raw) continue;
      if (raw.includes(",")) {
        for (const part of raw.split(",")) {
          const name = part
            .trim()
            .split(/\s+as\s+/)
            .pop()
            ?.trim();
          if (name) out.add(name);
        }
      } else {
        out.add(raw.trim());
      }
      if (out.size > 400) break;
    }
  }
  return [...out];
}

export function parseFile(root: string, file: ScannedFile): ParsedFile {
  let code = "";
  try {
    code = fs.readFileSync(path.join(root, file.path), "utf8");
  } catch {
    return {
      path: file.path,
      language: file.language,
      imports: [],
      exports: [],
      symbols: [],
      lines: 0,
    };
  }
  const lines = code.split("\n").length;
  return {
    path: file.path,
    language: file.language,
    imports: collect(code, IMPORT_PATTERNS[file.language]),
    exports: collect(code, EXPORT_PATTERNS[file.language]),
    symbols: collect(code, SYMBOL_PATTERNS[file.language]),
    lines,
  };
}

export function parseFiles(root: string, files: ScannedFile[], maxFiles = 800): ParsedFile[] {
  // Prefer source files (skip pure docs/config for symbol extraction).
  const codeFiles = files
    .filter((f) => !["Markdown", "JSON", "YAML", "Text", "Other"].includes(f.language))
    .slice(0, maxFiles);
  return codeFiles.map((f) => parseFile(root, f));
}
