import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseFile } from "./parse";
import { buildGraph } from "./graph";
import { detectLanguage, scanRepo } from "./scan";
import type { ParsedFile } from "./parse";

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "codecompass-"));
}

describe("detectLanguage", () => {
  it("maps common extensions", () => {
    expect(detectLanguage("src/app.tsx")).toBe("TypeScript");
    expect(detectLanguage("main.py")).toBe("Python");
    expect(detectLanguage("a/b/c.js")).toBe("JavaScript");
    expect(detectLanguage("Dockerfile")).toBe("Docker");
    expect(detectLanguage("assets/logo.png")).toBe("Other");
  });
});

describe("parseFile", () => {
  it("extracts imports, exports and symbols from TypeScript", () => {
    const dir = tempDir();
    fs.writeFileSync(
      path.join(dir, "a.ts"),
      [
        'import x from "./b";',
        'import { z } from "zod";',
        "export function foo() {}",
        "export class Bar {}",
        "export interface Baz {}",
        "const local = () => {};",
      ].join("\n"),
    );
    const parsed = parseFile(dir, { path: "a.ts", language: "TypeScript", size: 10 });
    expect(parsed.imports).toContain("./b");
    expect(parsed.imports).toContain("zod");
    expect(parsed.symbols).toEqual(expect.arrayContaining(["foo", "Bar", "Baz"]));
    expect(parsed.exports).toEqual(expect.arrayContaining(["foo"]));
    expect(parsed.lines).toBeGreaterThan(0);
  });

  it("handles Python imports and defs", () => {
    const dir = tempDir();
    fs.writeFileSync(
      path.join(dir, "m.py"),
      "import os\nfrom .util import helper\n\ndef run():\n    pass\n",
    );
    const parsed = parseFile(dir, { path: "m.py", language: "Python", size: 10 });
    expect(parsed.imports).toEqual(expect.arrayContaining(["os", ".util"]));
    expect(parsed.symbols).toContain("run");
  });
});

describe("scanRepo", () => {
  it("ignores dependency and binary files", () => {
    const dir = tempDir();
    fs.mkdirSync(path.join(dir, "node_modules", "leftpad"), { recursive: true });
    fs.mkdirSync(path.join(dir, "src"), { recursive: true });
    fs.writeFileSync(path.join(dir, "src", "index.js"), "export const a = 1;");
    fs.writeFileSync(path.join(dir, "node_modules", "leftpad", "index.js"), "module.exports = 1;");
    fs.writeFileSync(path.join(dir, "logo.png"), "binary");
    fs.writeFileSync(path.join(dir, "package-lock.json"), "{}");

    const result = scanRepo(dir, 100);
    const paths = result.files.map((f) => f.path);
    expect(paths).toContain("src/index.js");
    expect(paths).not.toContain("node_modules/leftpad/index.js");
    expect(paths).not.toContain("logo.png");
    expect(paths).not.toContain("package-lock.json");
  });
});

describe("buildGraph", () => {
  it("creates folder-level nodes and weighted import edges", () => {
    const files: ParsedFile[] = [
      {
        path: "src/index.ts",
        language: "TypeScript",
        imports: ["./router", "../lib/utils"],
        exports: [],
        symbols: [],
        lines: 5,
      },
      {
        path: "src/router.ts",
        language: "TypeScript",
        imports: ["../lib/utils"],
        exports: [],
        symbols: [],
        lines: 5,
      },
      {
        path: "lib/utils.ts",
        language: "TypeScript",
        imports: [],
        exports: [],
        symbols: [],
        lines: 5,
      },
    ];
    const graph = buildGraph(files);
    expect(graph.nodes.map((n) => n.id).sort()).toEqual(["lib", "src"]);
    const srcToLib = graph.edges.find((e) => e.source === "src" && e.target === "lib");
    expect(srcToLib?.weight).toBe(2);
    // No self-edges for same-folder imports.
    expect(graph.edges.every((e) => e.source !== e.target)).toBe(true);
  });
});
