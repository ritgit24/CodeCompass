import { describe, expect, it } from "vitest";
import { heuristicScore } from "./difficulty";

describe("heuristicScore", () => {
  it("treats beginner + documentation labels as easiest", () => {
    const result = heuristicScore({
      title: "Fix a typo",
      body: "Small docs fix in README.md",
      labels: ["good first issue", "documentation"],
      comments: 1,
    });
    expect(result.score).toBe(1);
    expect(result.reasons.join(" ")).toMatch(/beginner|Documentation/i);
  });

  it("treats big refactors with long threads as hardest", () => {
    const result = heuristicScore({
      title: "Migrate the project to TypeScript",
      body: "x".repeat(3000),
      labels: ["enhancement", "refactor"],
      comments: 25,
    });
    expect(result.score).toBe(5);
  });

  it("stays within 1..5 for any input", () => {
    for (const comments of [0, 5, 50]) {
      const result = heuristicScore({ title: "t", body: "b", labels: [], comments });
      expect(result.score).toBeGreaterThanOrEqual(1);
      expect(result.score).toBeLessThanOrEqual(5);
    }
  });

  it("always explains itself", () => {
    const result = heuristicScore({ title: "t", body: "b", labels: [], comments: 0 });
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("rewards issues that name specific files", () => {
    const vague = heuristicScore({
      title: "Something is broken",
      body: "please fix",
      labels: [],
      comments: 0,
    });
    const specific = heuristicScore({
      title: "Broken",
      body: "src/router.js drops params",
      labels: [],
      comments: 0,
    });
    expect(specific.score).toBeLessThanOrEqual(vague.score);
  });
});
