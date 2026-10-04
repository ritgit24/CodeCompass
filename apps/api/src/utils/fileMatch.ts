/** Rank repo paths by how many words in `text` they match. Shared by chat + fix. */
export function matchPaths(text: string, paths: string[], n: number): string[] {
  const words = text.toLowerCase().match(/[a-z0-9_.-]{3,}/g) ?? [];
  const scored = paths
    .map((p) => {
      const lower = p.toLowerCase();
      const base = lower.split("/").pop() ?? lower;
      let score = 0;
      for (const w of words) if (lower.includes(w) || base.startsWith(w)) score += 1;
      return { p, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, n).map((s) => s.p);
}
