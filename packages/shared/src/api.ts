import { z } from "zod";
import {
  IssueInfoSchema,
  FixSessionSchema,
  ChatMessageSchema,
  RepoSchema,
  GraphSchema,
  FileNodeSchema,
} from "./entities";

/** Request bodies and response envelopes for the REST API. */

export const CreateRepoSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "Enter a GitHub URL")
    .refine(
      (v) =>
        /github\.com[/:][\w.-]+\/[\w.-]+/i.test(v) ||
        /^(demo|codecompass\/demo-repo)$/i.test(v.trim()),
      { message: "Only github.com repository URLs are supported" },
    ),
});
export type CreateRepoInput = z.infer<typeof CreateRepoSchema>;

export const CreateRepoResponseSchema = z.object({ id: z.string() });
export type CreateRepoResponse = z.infer<typeof CreateRepoResponseSchema>;

export const RepoResponseSchema = z.object({ repo: RepoSchema });
export type RepoResponse = z.infer<typeof RepoResponseSchema>;

export const GraphResponseSchema = z.object({ graph: GraphSchema });
export type GraphResponse = z.infer<typeof GraphResponseSchema>;

export const TreeEntrySchema = z.object({
  path: z.string(),
  type: z.enum(["file", "dir"]),
  size: z.number().optional(),
  language: z.string().optional(),
});
export type TreeEntry = z.infer<typeof TreeEntrySchema>;

export const FilesResponseSchema = z.object({
  tree: z.array(TreeEntrySchema).default([]),
  file: FileNodeSchema.nullable().optional(),
  content: z.string().nullable().optional(),
  truncated: z.boolean().optional(),
  language: z.string().optional(),
});
export type FilesResponse = z.infer<typeof FilesResponseSchema>;

export const ChatRequestSchema = z.object({
  question: z.string().trim().min(1).max(4000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .default([]),
  context: z.array(z.string()).default([]),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const ChatHistoryResponseSchema = z.object({
  messages: z.array(ChatMessageSchema),
});
export type ChatHistoryResponse = z.infer<typeof ChatHistoryResponseSchema>;

export const IssuesResponseSchema = z.object({
  issues: z.array(IssueInfoSchema),
  source: z.enum(["github", "none"]).default("github"),
});
export type IssuesResponse = z.infer<typeof IssuesResponseSchema>;

export const CreateFixSchema = z.object({
  issue: IssueInfoSchema.partial({ id: true, repoId: true }).extend({
    title: z.string().trim().min(1),
    number: z.number().nullable().optional(),
    body: z.string().default(""),
    url: z.string().default(""),
  }),
});
export type CreateFixInput = z.infer<typeof CreateFixSchema>;

export const FixResponseSchema = z.object({ session: FixSessionSchema });
export type FixResponse = z.infer<typeof FixResponseSchema>;

export const FileDecisionSchema = z.object({
  decision: z.enum(["accepted", "rejected"]),
});
export type FileDecisionInput = z.infer<typeof FileDecisionSchema>;

export const TestResultSchema = z.object({
  passed: z.boolean(),
  output: z.string(),
  command: z.string().optional(),
  durationMs: z.number().optional(),
});
export type TestResult = z.infer<typeof TestResultSchema>;

export const PatchResponseSchema = z.object({
  patch: z.string(),
  pr: z.object({ title: z.string(), body: z.string() }),
});
export type PatchResponse = z.infer<typeof PatchResponseSchema>;
