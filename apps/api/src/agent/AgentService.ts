import type { AgentEvent, FixPlan, IssueInfo, PRDraft, SourceRef } from "@codecompass/shared";

/**
 * The single seam between the app and any agent backend. Nothing outside this
 * folder imports the Cline SDK (or any LLM client) directly.
 */
export interface ExplainInput {
  repoPath: string;
  question: string;
  context?: string[];
  history?: { role: "user" | "assistant"; content: string }[];
}

export interface SummarizeInput {
  repoPath: string;
  files: { path: string; language: string; size: number }[];
  topDirs: string[];
  readme?: string;
}

export interface RepoAnalysis {
  what: string;
  techStack: string[];
  howToRun: string[];
  folderStructure: { path: string; description: string }[];
  keyFiles: { path: string; reason: string; language?: string }[];
  moduleSummaries: Record<string, string>;
}

export interface ScoreInput {
  issue: {
    number: number;
    title: string;
    body: string;
    labels: string[];
    comments: number;
  };
  heuristic: { score: number; reasons: string[] };
  knownPaths: string[];
}

export interface IssueScore {
  difficulty: "Easy" | "Medium" | "Hard";
  difficultyScore: number;
  estMinutes: number;
  files: string[];
  reason: string;
}

export interface PlanFixInput {
  repoPath: string;
  issue: IssueInfo;
  fileHints?: string[];
}

export interface ApplyPlanInput {
  repoPath: string;
  sessionId: string;
  issue: IssueInfo;
  plan: FixPlan;
}

export interface DraftPRInput {
  issue: IssueInfo;
  plan: FixPlan;
  changedFiles: { path: string; diff: string }[];
}

export interface AgentService {
  readonly name: "mock" | "cline" | "direct";
  explain(input: ExplainInput): AsyncIterable<AgentEvent>;
  planFix(input: PlanFixInput): AsyncIterable<AgentEvent>;
  applyPlan(input: ApplyPlanInput): AsyncIterable<AgentEvent>;
  summarizeRepo(input: SummarizeInput): Promise<RepoAnalysis>;
  scoreIssue(input: ScoreInput): Promise<IssueScore>;
  draftPR(input: DraftPRInput): Promise<PRDraft>;
}

export type { AgentEvent, FixPlan, IssueInfo, PRDraft, SourceRef };
