/** Small helpers shared by every agent implementation. */

/** Pull the first JSON object/array out of a model response (tolerant). */
export function extractJson<T = unknown>(text: string): T | null {
  if (!text) return null;
  const fenced =
    text.match(/```json\s*([\s\S]*?)```/i)?.[1] ?? text.match(/```\s*([\s\S]*?)```/)?.[1];
  const candidates = [fenced, text].filter(Boolean) as string[];
  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    // Find the outermost { ... } or [ ... ]
    const start = trimmed.search(/[[{]/);
    if (start === -1) continue;
    const open = trimmed[start];
    const close = open === "{" ? "}" : "]";
    const end = trimmed.lastIndexOf(close);
    if (end <= start) continue;
    try {
      return JSON.parse(trimmed.slice(start, end + 1)) as T;
    } catch {
      /* try next */
    }
  }
  return null;
}

/** Stream a string in word-sized chunks so UIs feel like a live model. */
export async function* streamText(
  text: string,
  delayMs = 12,
): AsyncGenerator<string, void, unknown> {
  const tokens = text.match(/\S+\s*/g) ?? [text];
  for (const token of tokens) {
    yield token;
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Parse a trailing "SOURCES: path:start-end, ..." line into source refs. */
export function parseSources(
  text: string,
): { path: string; startLine?: number; endLine?: number }[] {
  if (!text) return [];
  const line = text
    .split("\n")
    .reverse()
    .find((l) => l.toUpperCase().includes("SOURCES:"));
  if (!line) return [];
  const after = line.slice(line.toUpperCase().indexOf("SOURCES:") + "SOURCES:".length);
  return after
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [path, range = ""] =
        chunk.split(":").length > 1
          ? [chunk.split(":")[0], chunk.split(":").slice(1).join(":")]
          : [chunk, ""];
      const [start, end] = range.includes("-") ? range.split("-") : [range, range];
      return {
        path: path.trim(),
        startLine: start ? Number(start) : undefined,
        endLine: end ? Number(end) : undefined,
      };
    })
    .filter((s) => Boolean(s.path));
}
