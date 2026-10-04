import type {
  ChatMessage,
  FileChange,
  FileNode,
  FixPlan,
  FixSession,
  IssueInfo,
  PRDraft,
  Repo,
  RepoSummary,
  SourceRef,
} from "@codecompass/shared";
import { parseJson } from "./index";

export function mapRepoRow(row: any): Repo {
  return {
    id: row.id,
    url: row.url,
    name: row.name,
    owner: row.owner,
    defaultBranch: row.default_branch,
    status: row.status,
    error: row.error ?? null,
    summary: parseJson<RepoSummary | null>(row.summary_json, null),
    stats: parseJson<Repo["stats"]>(row.stats_json, null),
    createdAt: row.created_at,
  };
}

export function mapFileRow(row: any): FileNode {
  return {
    id: row.id,
    repoId: row.repo_id,
    path: row.path,
    language: row.language,
    size: row.size,
    summary: row.summary ?? null,
  };
}

export function mapChatRow(row: any): ChatMessage {
  return {
    id: row.id,
    repoId: row.repo_id,
    role: row.role,
    content: row.content,
    sources: parseJson<SourceRef[]>(row.sources_json, []),
    createdAt: row.created_at,
  };
}

export function mapIssueRow(row: any): IssueInfo {
  return {
    id: row.id,
    repoId: row.repo_id,
    number: row.number,
    title: row.title,
    body: row.body ?? "",
    url: row.url ?? "",
    labels: parseJson<string[]>(row.labels_json, []),
    comments: row.comments ?? 0,
    createdAt: row.created_at ?? "",
    difficulty: row.difficulty ?? "Medium",
    difficultyScore: row.difficulty_score ?? 3,
    estMinutes: row.est_minutes ?? 60,
    files: parseJson<string[]>(row.files_json, []),
    reason: row.reason ?? "",
    heuristic: parseJson<Record<string, unknown>>(row.heuristic_json, {}),
  };
}

export function mapChangeRow(row: any): FileChange {
  return {
    id: row.id,
    sessionId: row.session_id,
    path: row.path,
    diff: row.diff,
    decision: row.decision,
    additions: row.additions ?? 0,
    deletions: row.deletions ?? 0,
  };
}

export function mapSessionRow(row: any, changes: FileChange[] = []): FixSession {
  return {
    id: row.id,
    repoId: row.repo_id,
    issueNumber: row.issue_number ?? null,
    issueTitle: row.issue_title,
    issueBody: row.issue_body ?? "",
    status: row.status,
    branch: row.branch,
    plan: parseJson<FixPlan | null>(row.plan_json, null),
    understand: row.understand ?? "",
    testOutput: row.test_output ?? null,
    testPassed: row.test_passed == null ? null : Boolean(row.test_passed),
    patch: row.patch ?? null,
    pr: parseJson<PRDraft | null>(row.pr_json, null),
    fileChanges: changes,
    createdAt: row.created_at,
  };
}
