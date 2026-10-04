import { nanoid } from "nanoid";
import type { ChatMessage, IssueInfo, SourceRef } from "@codecompass/shared";
import { all, get, run } from "./index";
import { mapChatRow, mapIssueRow } from "./mappers";

// --- chat ------------------------------------------------------------------

export function addChatMessage(input: {
  repoId: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceRef[];
}): ChatMessage {
  const id = nanoid(12);
  const now = new Date().toISOString();
  run(
    `INSERT INTO chat_messages (id, repo_id, role, content, sources_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    id,
    input.repoId,
    input.role,
    input.content,
    JSON.stringify(input.sources ?? []),
    now,
  );
  return {
    id,
    repoId: input.repoId,
    role: input.role,
    content: input.content,
    sources: input.sources ?? [],
    createdAt: now,
  };
}

export function listChat(repoId: string): ChatMessage[] {
  return all("SELECT * FROM chat_messages WHERE repo_id = ? ORDER BY created_at", repoId).map(
    mapChatRow,
  );
}

export function clearChat(repoId: string) {
  run("DELETE FROM chat_messages WHERE repo_id = ?", repoId);
}

// --- issues ----------------------------------------------------------------

export function replaceIssues(repoId: string, issues: IssueInfo[]) {
  run("DELETE FROM issues WHERE repo_id = ?", repoId);
  for (const issue of issues) {
    run(
      `INSERT INTO issues (id, repo_id, number, title, body, url, labels_json, comments, created_at,
        difficulty, difficulty_score, est_minutes, files_json, reason, heuristic_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      issue.id || `${repoId}:${issue.number}`,
      repoId,
      issue.number,
      issue.title,
      issue.body,
      issue.url,
      JSON.stringify(issue.labels),
      issue.comments,
      issue.createdAt,
      issue.difficulty,
      issue.difficultyScore,
      issue.estMinutes,
      JSON.stringify(issue.files),
      issue.reason,
      JSON.stringify(issue.heuristic),
    );
  }
}

export function listIssues(repoId: string): IssueInfo[] {
  return all(
    "SELECT * FROM issues WHERE repo_id = ? ORDER BY difficulty_score, number",
    repoId,
  ).map(mapIssueRow);
}

export function getIssueByNumber(repoId: string, number: number): IssueInfo | undefined {
  const row = get("SELECT * FROM issues WHERE repo_id = ? AND number = ?", repoId, number);
  return row ? mapIssueRow(row) : undefined;
}
