import { z } from "zod";
import { SourceRefSchema, FixPlanSchema } from "./entities";

/**
 * Server-Sent Event payloads. Every streaming endpoint serialises one of these
 * as the `data:` field of an SSE message named by `channel`.
 */

// --- Analysis progress (GET /api/repos/:id/status) --------------------------
export const AnalysisStepSchema = z.enum([
  "cloning",
  "scanning",
  "parsing",
  "mapping",
  "summarising",
  "ready",
]);
export type AnalysisStep = z.infer<typeof AnalysisStepSchema>;

export const AnalysisEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("step"),
    step: AnalysisStepSchema,
    status: z.enum(["started", "done", "error"]),
    message: z.string().optional(),
    detail: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({ type: z.literal("log"), message: z.string() }),
  z.object({ type: z.literal("error"), message: z.string() }),
  z.object({ type: z.literal("done"), repoId: z.string() }),
]);
export type AnalysisEvent = z.infer<typeof AnalysisEventSchema>;

// --- Agent events (normalised across mock / cline / direct) -----------------
export const AgentEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text_delta"), text: z.string() }),
  z.object({ type: z.literal("message"), text: z.string() }),
  z.object({ type: z.literal("sources"), sources: z.array(SourceRefSchema) }),
  z.object({ type: z.literal("plan_step"), step: z.string() }),
  z.object({ type: z.literal("plan"), plan: FixPlanSchema }),
  z.object({ type: z.literal("file_read"), path: z.string() }),
  z.object({
    type: z.literal("file_edit"),
    path: z.string(),
    diff: z.string(),
    additions: z.number().default(0),
    deletions: z.number().default(0),
  }),
  z.object({
    type: z.literal("command_run"),
    command: z.string(),
    output: z.string().optional(),
    exitCode: z.number().optional(),
  }),
  z.object({ type: z.literal("done"), text: z.string().optional() }),
  z.object({ type: z.literal("error"), message: z.string() }),
]);
export type AgentEvent = z.infer<typeof AgentEventSchema>;

// --- Chat stream (POST /api/repos/:id/chat) ---------------------------------
export const ChatStreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("start"), messageId: z.string() }),
  z.object({ type: z.literal("token"), text: z.string() }),
  z.object({ type: z.literal("sources"), sources: z.array(SourceRefSchema) }),
  z.object({ type: z.literal("end"), messageId: z.string(), content: z.string() }),
  z.object({ type: z.literal("error"), message: z.string() }),
]);
export type ChatStreamEvent = z.infer<typeof ChatStreamEventSchema>;

// --- Fix stream (GET /api/fix/:sessionId/stream) ----------------------------
export const FixStreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("status"), status: z.string() }),
  z.object({ type: z.literal("understand"), text: z.string() }),
  z.object({ type: z.literal("token"), text: z.string() }),
  z.object({ type: z.literal("plan"), plan: FixPlanSchema }),
  z.object({ type: z.literal("activity"), event: AgentEventSchema }),
  z.object({ type: z.literal("file_change"), changeId: z.string(), path: z.string() }),
  z.object({ type: z.literal("test_result"), passed: z.boolean(), output: z.string() }),
  z.object({ type: z.literal("error"), message: z.string() }),
  z.object({ type: z.literal("done") }),
]);
export type FixStreamEvent = z.infer<typeof FixStreamEventSchema>;
