import fs from "node:fs";
import path from "node:path";

const EXT_LANG: Record<string, string> = {
  js: "JavaScript",
  jsx: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  ts: "TypeScript",
  tsx: "TypeScript",
  mts: "TypeScript",
  cts: "TypeScript",
  py: "Python",
  pyi: "Python",
  rb: "Ruby",
  go: "Go",
  rs: "Rust",
  java: "Java",
  kt: "Kotlin",
  kts: "Kotlin",
  c: "C",
  h: "C",
  cc: "C++",
  cpp: "C++",
  cxx: "C++",
  hpp: "C++",
  hh: "C++",
  cs: "C#",
  php: "PHP",
  swift: "Swift",
  scala: "Scala",
  dart: "Dart",
  sh: "Shell",
  bash: "Shell",
  zsh: "Shell",
  fish: "Shell",
  yml: "YAML",
  yaml: "YAML",
  json: "JSON",
  jsonc: "JSON",
  md: "Markdown",
  mdx: "Markdown",
  rst: "Markdown",
  txt: "Text",
  css: "CSS",
  scss: "SCSS",
  sass: "SCSS",
  less: "Less",
  html: "HTML",
  htm: "HTML",
  vue: "Vue",
  svelte: "Svelte",
  sql: "SQL",
  r: "R",
  ex: "Elixir",
  exs: "Elixir",
  erl: "Erlang",
  hs: "Haskell",
  lua: "Lua",
  pl: "Perl",
  clj: "Clojure",
  proto: "Protobuf",
  graphql: "GraphQL",
  gql: "GraphQL",
  toml: "TOML",
  ini: "INI",
  cfg: "Config",
};

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".hg",
  ".svn",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  "coverage",
  "vendor",
  "__pycache__",
  ".venv",
  "venv",
  "env",
  ".tox",
  "target",
  ".mypy_cache",
  ".pytest_cache",
  ".ruff_cache",
  ".gradle",
  ".idea",
  ".cache",
  "tmp",
  "temp",
  ".terraform",
  "Pods",
  ".dart_tool",
  "bower_components",
]);

const IGNORE_FILES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "pnpm-lock.yml",
  "poetry.lock",
  "Pipfile.lock",
  "Cargo.lock",
  "composer.lock",
  "Gemfile.lock",
  "mix.lock",
  "go.sum",
  "bun.lockb",
]);

const BINARY_EXT = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "bmp",
  "ico",
  "webp",
  "svg",
  "pdf",
  "zip",
  "gz",
  "tar",
  "tgz",
  "bz2",
  "7z",
  "rar",
  "woff",
  "woff2",
  "ttf",
  "otf",
  "eot",
  "mp3",
  "mp4",
  "mov",
  "avi",
  "wav",
  "ogg",
  "webm",
  "so",
  "dylib",
  "dll",
  "exe",
  "bin",
  "o",
  "a",
  "class",
  "jar",
  "pyc",
  "wasm",
  "db",
  "sqlite",
  "sqlite3",
  "lock",
]);

export interface ScannedFile {
  path: string;
  language: string;
  size: number;
}

export interface ScanResult {
  files: ScannedFile[];
  topDirs: string[];
  languages: { language: string; files: number; bytes: number }[];
  totalBytes: number;
}

export function detectLanguage(relPath: string): string {
  const base = relPath.split("/").pop() ?? relPath;
  const ext = base.includes(".") ? base.split(".").pop()!.toLowerCase() : "";
  if (base.toLowerCase() === "dockerfile") return "Docker";
  if (base.toLowerCase() === "makefile") return "Makefile";
  return EXT_LANG[ext] ?? "Other";
}

function isBinary(relPath: string): boolean {
  const ext = relPath.split(".").pop()?.toLowerCase() ?? "";
  return BINARY_EXT.has(ext);
}

/** Walk a cloned repository into a bounded, language-tagged file list. */
export function scanRepo(root: string, maxFiles: number): ScanResult {
  const files: ScannedFile[] = [];

  const walk = (dir: string) => {
    if (files.length >= maxFiles) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (files.length >= maxFiles) return;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (IGNORE_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
        walk(abs);
      } else if (entry.isFile()) {
        if (IGNORE_FILES.has(entry.name) || entry.name.startsWith(".")) continue;
        const rel = path.relative(root, abs).split(path.sep).join("/");
        if (isBinary(rel)) continue;
        let size = 0;
        try {
          size = fs.statSync(abs).size;
        } catch {
          continue;
        }
        if (size > 1_500_000) continue; // skip very large text blobs
        files.push({ path: rel, language: detectLanguage(rel), size });
      }
    }
  };

  walk(root);

  const langMap = new Map<string, { files: number; bytes: number }>();
  for (const f of files) {
    const entry = langMap.get(f.language) ?? { files: 0, bytes: 0 };
    entry.files += 1;
    entry.bytes += f.size;
    langMap.set(f.language, entry);
  }
  const languages = [...langMap.entries()]
    .map(([language, v]) => ({ language, ...v }))
    .sort((a, b) => b.files - a.files);

  const topDirSet = new Set<string>();
  for (const f of files) {
    const top = f.path.includes("/") ? f.path.split("/")[0] : "/";
    topDirSet.add(top);
  }

  return {
    files,
    topDirs: [...topDirSet].sort(),
    languages,
    totalBytes: files.reduce((sum, f) => sum + f.size, 0),
  };
}

export function readReadme(root: string, files: ScannedFile[]): string | undefined {
  const readme = files.find((f) => /^readme(\.|$)/i.test(f.path.split("/").pop() ?? ""));
  if (!readme) return undefined;
  try {
    return fs.readFileSync(path.join(root, readme.path), "utf8").slice(0, 6000);
  } catch {
    return undefined;
  }
}
