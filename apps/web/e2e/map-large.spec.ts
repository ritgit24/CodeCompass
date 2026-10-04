import { expect, test } from "@playwright/test";

/** Deterministic PRNG so the synthetic repository is reproducible. */
function makePrng(seed: number) {
  let state = seed;
  return () => (state = (state * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
}

/** 373 folders across 12 packages, 3 levels deep + ~900 import edges. */
function bigGraph() {
  const rnd = makePrng(7);
  const ids: string[] = ["."];
  for (let t = 0; t < 12; t++) {
    const top = `pkg${t}`;
    ids.push(top);
    for (let a = 0; a < 6; a++) {
      const l2 = `${top}/mod${a}`;
      ids.push(l2);
      for (let b = 0; b < 4; b++) ids.push(`${l2}/sub${b}`);
    }
  }
  const nodes = ids.map((id) => ({
    id,
    label: id === "." ? "(root)" : id.split("/").slice(-1)[0],
    kind: "module",
    language: "TypeScript",
    files: [`${id === "." ? "index.ts" : `${id}/index.ts`}`],
    meta: {},
  }));
  const edges: { id: string; source: string; target: string; weight: number }[] = [];
  for (let i = 0; i < 900; i++) {
    const source = ids[Math.floor(rnd() * ids.length)];
    const target = ids[Math.floor(rnd() * ids.length)];
    if (source !== target) {
      edges.push({ id: `${source}->${target}`, source, target, weight: 1 + Math.floor(rnd() * 3) });
    }
  }
  return { nodes, edges };
}

test("a large repository renders as an aggregated, non-overlapping map", async ({ page }) => {
  const graph = bigGraph();
  const repo = {
    id: "synthetic",
    url: "https://github.com/synthetic/big",
    name: "big",
    owner: "synthetic",
    defaultBranch: "main",
    status: "ready",
    error: null,
    summary: {
      what: "Synthetic repository used to exercise the map at scale.",
      techStack: ["TypeScript"],
      howToRun: ["npm test"],
      folderStructure: [],
      keyFiles: [],
      moduleSummaries: {},
    },
    stats: {
      files: 373,
      bytes: 1_000_000,
      languages: [{ language: "TypeScript", files: 373, bytes: 1_000_000 }],
    },
    createdAt: new Date().toISOString(),
  };

  // Hermetic: serve canned API responses so the test needs no clone or network.
  await page.route(
    (url) => url.pathname.startsWith("/api/repos"),
    async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname.endsWith("/graph")) return route.fulfill({ json: { graph } });
      if (pathname.endsWith("/issues"))
        return route.fulfill({ json: { issues: [], source: "none" } });
      if (pathname.endsWith("/chat")) return route.fulfill({ json: { messages: [] } });
      if (/\/api\/repos\/[^/]+$/.test(pathname)) return route.fulfill({ json: { repo } });
      return route.fulfill({ json: {} });
    },
  );

  await page.goto("/repo/synthetic");
  await page.getByRole("tab", { name: "Map" }).click();

  const nodes = page.locator(".react-flow__node");
  await expect(nodes.first()).toBeVisible();

  const count = await nodes.count();
  // Rolled up from 373 raw folders, and still small enough to read.
  expect(count).toBeGreaterThan(10);
  expect(count).toBeLessThan(120);

  // Every node must sit at a unique position (no stacking).
  const transforms = await nodes.evaluateAll((elements) =>
    elements.map((element) => (element as HTMLElement).style.transform),
  );
  expect(new Set(transforms).size).toBe(transforms.length);

  // Layout must span multiple layers in both axes (real structure, not a line).
  const boxes = await nodes.evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { x: Math.round(rect.x), y: Math.round(rect.y) };
    }),
  );
  expect(new Set(boxes.map((b) => b.x)).size).toBeGreaterThan(1);
  expect(new Set(boxes.map((b) => b.y)).size).toBeGreaterThan(3);

  // The legend explains the colour grouping.
  await expect(page.getByRole("button", { name: "Modules" })).toBeVisible();
  await expect(page.getByRole("button", { name: /pkg0/ }).first()).toBeVisible();
});
