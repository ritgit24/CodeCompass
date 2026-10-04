import { z } from "zod";

/**
 * Shared domain entities. These mirror the SQLite tables in apps/api and are
 * used by both the API (validation + row decoding) and the web app (types).
 */

export const RepoStatusSchema = z.enum([
  "queued",
  "cloning",
  "scanning",
  "parsing",
  "mapping",
  "summarising",
  "ready",
  "error",
]);
export type RepoStatus = z.infer<typeof RepoStatusSchema>;

export const LanguageStatSchema = z.object({
  language: z.string(),
  files: z.number(),
  bytes: z.number(),
});
export type LanguageStat = z.infer<typeof LanguageStatSchema>;

export const KeyFileSchema = z.object({
  path: z.string(),
  reason: z.string(),
  language: z.string().optional(),
});
export type KeyFile = z.infer<typeof KeyFileSchema>;

export const RepoSummarySchema = z.object({
  what: z.string().default(""),
  techStack: z.array(z.string()).default([]),
  howToRun: z.array(z.string()).default([]),
  folderStructure: z.array(z.object({ path: z.string(), description: z.string() })).default([]),
  keyFiles: z.array(KeyFileSchema).default([]),
  moduleSummaries: z.record(z.string(), z.string()).default({}),
});
export type RepoSummary = z.infer<typeof RepoSummarySchema>;

export const RepoSchema = z.object({
  id: z.string(),
  url: z.string(),
  name: z.string(),
  owner: z.string(),
  defaultBranch: z.string(),
  status: RepoStatusSchema,
  error: z.string().nullable().optional(),
  summary: RepoSummarySchema.nullable().optional(),
  stats: z
    .object({
      files: z.number(),
      bytes: z.number(),
      languages: z.array(LanguageStatSchema),
    })
    .nullable()
    .optional(),
  createdAt: z.string(),
});
export type Repo = z.infer<typeof RepoSchema>;

export const FileNodeSchema = z.object({
  id: z.string(),
  repoId: z.string(),
  path: z.string(),
  language: z.string(),
  size: z.number(),
  summary: z.string().nullable().optional(),
});
export type FileNode = z.infer<typeof FileNodeSchema>;

export const GraphNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  kind: z.enum(["module", "file"]).default("module"),
  language: z.string().optional(),
  files: z.array(z.string()).default([]),
  meta: z.record(z.string(), z.unknown()).default({}),
});
export type GraphNode = z.infer<typeof GraphNodeSchema>;

export const GraphEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  weight: z.number().default(1),
});
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;

export const GraphSchema = z.object({
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
});
export type Graph = z.infer<typeof GraphSchema>;

export const SourceRefSchema = z.object({
  path: z.string(),
  startLine: z.number().optional(),
  endLine: z.number().optional(),
  snippet: z.string().optional(),
});
export type SourceRef = z.infer<typeof SourceRefSchema>;

export const ChatRoleSchema = z.enum(["user", "assistant"]);
export type ChatRole = z.infer<typeof ChatRoleSchema>;

export const ChatMessageSchema = z.object({
  id: z.string(),
  repoId: z.string(),
  role: ChatRoleSchema,
  content: z.string(),
  sources: z.array(SourceRefSchema).default([]),
  createdAt: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const SkillLevelSchema = z.enum(["beginner", "intermediate", "advanced"]);
export type SkillLevel = z.infer<typeof SkillLevelSchema>;

export const DifficultySchema = z.enum(["Easy", "Medium", "Hard"]);
export type Difficulty = z.infer<typeof DifficultySchema>;

export const IssueInfoSchema = z.object({
  id: z.string(),
  repoId: z.string().default(""),
  number: z.number(),
  title: z.string(),
  body: z.string().default(""),
  url: z.string().default(""),
  labels: z.array(z.string()).default([]),
  comments: z.number().default(0),
  createdAt: z.string().default(""),
  difficulty: DifficultySchema.default("Medium"),
  difficultyScore: z.number().default(3),
  estMinutes: z.number().default(60),
  files: z.array(z.string()).default([]),
  reason: z.string().default(""),
  heuristic: z.record(z.string(), z.unknown()).default({}),
});
export type IssueInfo = z.infer<typeof IssueInfoSchema>;

export const FixStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  detail: z.string().default(""),
  done: z.boolean().default(false),
});
export type FixStep = z.infer<typeof FixStepSchema>;

export const FixPlanSchema = z.object({
  summary: z.string().default(""),
  steps: z.array(FixStepSchema).default([]),
  filesToChange: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
});
export type FixPlan = z.infer<typeof FixPlanSchema>;

export const FixStatusSchema = z.enum([
  "understanding",
  "planning",
  "awaiting_approval",
  "applying",
  "reviewing",
  "testing",
  "done",
  "error",
]);
export type FixStatus = z.infer<typeof FixStatusSchema>;

export const FileChangeSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  path: z.string(),
  diff: z.string(),
  decision: z.enum(["pending", "accepted", "rejected"]).default("pending"),
  additions: z.number().default(0),
  deletions: z.number().default(0),
});
export type FileChange = z.infer<typeof FileChangeSchema>;

export const PRDraftSchema = z.object({
  title: z.string().default(""),
  body: z.string().default(""),
});
export type PRDraft = z.infer<typeof PRDraftSchema>;

export const FixSessionSchema = z.object({
  id: z.string(),
  repoId: z.string(),
  issueNumber: z.number().nullable().optional(),
  issueTitle: z.string(),
  issueBody: z.string().default(""),
  status: FixStatusSchema,
  branch: z.string(),
  plan: FixPlanSchema.nullable().optional(),
  understand: z.string().default(""),
  testOutput: z.string().nullable().optional(),
  testPassed: z.boolean().nullable().optional(),
  patch: z.string().nullable().optional(),
  pr: PRDraftSchema.nullable().optional(),
  fileChanges: z.array(FileChangeSchema).default([]),
  createdAt: z.string(),
});
export type FixSession = z.infer<typeof FixSessionSchema>;
