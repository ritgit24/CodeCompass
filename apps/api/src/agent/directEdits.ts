import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { isInside } from "../utils/paths";

/** Caps that keep a chat model from rewriting an entire repository. */
export const MAX_EDIT_FILES = 5;
export const MAX_READ_BYTES = 8_000;
export const MAX_TOTAL_WRITE_BYTES = 256_000;
export const EDIT_MAX_TOKENS = 8_000;
export const EDIT_TIMEOUT_MS = 240_000;

/** The only shape a chat model is allowed to answer with. */
export const EditPayloadSchema = z.object({
  summary: z.string().optional(),
  files: z
    .array(
      z.object({
        path: z.string(),
        content: z.string(),
      }),
    )
    .optional(),
});
export type EditPayload = z.infer<typeof EditPayloadSchema>;

export interface EditableFile {
  path: string;
  content: string;
}

export interface PlannedWrite {
  path: string;
  absolutePath: string;
  content: string;
}

function normaliseRel(input: string): string {
  return input.replace(/^\.\//, "").replace(/^\/+/, "").trim();
}

/**
 * Pick the files we can safely hand to the model: they must exist, live inside
 * the repo, and fit within the read cap (a truncated file must never be
 * rewritten from a partial view).
 */
export function collectEditableFiles(
  repoPath: string,
  candidates: string[],
): { files: EditableFile[]; skipped: string[] } {
  const files: EditableFile[] = [];
  const skipped: string[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    if (files.length >= MAX_EDIT_FILES) break;
    const rel = normaliseRel(candidate);
    if (!rel || seen.has(rel)) continue;
    seen.add(rel);

    const absolute = path.resolve(repoPath, rel);
    if (!isInside(repoPath, absolute)) {
      skipped.push(`${rel} (outside the repository)`);
      continue;
    }
    let stats: fs.Stats;
    try {
      stats = fs.statSync(absolute);
    } catch {
      skipped.push(`${rel} (does not exist)`);
      continue;
    }
    if (!stats.isFile()) {
      skipped.push(`${rel} (not a file)`);
      continue;
    }
    if (stats.size > MAX_READ_BYTES) {
      skipped.push(`${rel} (${Math.round(stats.size / 1024)}KB exceeds the editable size cap)`);
      continue;
    }
    try {
      files.push({ path: rel, content: fs.readFileSync(absolute, "utf8") });
    } catch {
      skipped.push(`${rel} (unreadable)`);
    }
  }
  return { files, skipped };
}

/**
 * Validate model output *before* anything touches the disk. This is the safety
 * boundary: absolute paths, escapes, blanking an existing file and no-op writes
 * are all rejected here.
 */
export function planWrites(
  repoPath: string,
  payload: unknown,
): { writes: PlannedWrite[]; rejected: string[] } {
  const parsed = EditPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { writes: [], rejected: ["model output did not match the expected JSON shape"] };
  }

  const writes: PlannedWrite[] = [];
  const rejected: string[] = [];
  let totalBytes = 0;

  for (const file of parsed.data.files ?? []) {
    if (writes.length >= MAX_EDIT_FILES) {
      rejected.push(`more than ${MAX_EDIT_FILES} files were proposed`);
      break;
    }
    const rel = normaliseRel(file.path);
    if (!rel) {
      rejected.push("a file with an empty path");
      continue;
    }
    if (path.isAbsolute(file.path) || /^[a-zA-Z]:/.test(file.path)) {
      rejected.push(`${rel} (absolute paths are not allowed)`);
      continue;
    }
    const absolute = path.resolve(repoPath, rel);
    if (!isInside(repoPath, absolute)) {
      rejected.push(`${rel} (escapes the repository)`);
      continue;
    }
    if (typeof file.content !== "string" || file.content.trim() === "") {
      rejected.push(`${rel} (empty content)`);
      continue;
    }

    try {
      const existing = fs.readFileSync(absolute, "utf8");
      if (file.content === existing) {
        rejected.push(`${rel} (no change)`);
        continue;
      }
    } catch {
      /* new file — fine */
    }

    totalBytes += Buffer.byteLength(file.content, "utf8");
    if (totalBytes > MAX_TOTAL_WRITE_BYTES) {
      rejected.push("the total write size cap was exceeded");
      break;
    }
    writes.push({ path: rel, absolutePath: absolute, content: file.content });
  }

  return { writes, rejected };
}

export function writeFiles(writes: PlannedWrite[]): void {
  for (const write of writes) {
    fs.mkdirSync(path.dirname(write.absolutePath), { recursive: true });
    fs.writeFileSync(write.absolutePath, write.content);
  }
}
