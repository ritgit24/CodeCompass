import { nanoid } from "nanoid";
import type { FileChange, FixPlan, FixSession, FixStatus, PRDraft } from "@codecompass/shared";
import { all, get, run } from "./index";
import { mapChangeRow, mapSessionRow } from "./mappers";

export function countFixSessions(repoId: string): number {
  const row = get<{ n: number }>(
    "SELECT COUNT(*) as n FROM fix_sessions WHERE repo_id = ?",
    repoId,
  );
  return row?.n ?? 0;
}

export function createFixSession(input: {
  repoId: string;
  issueNumber: number | null;
  issueTitle: string;
  issueBody: string;
  branch: string;
}): FixSession {
  const id = nanoid(12);
  const now = new Date().toISOString();
  run(
    `INSERT INTO fix_sessions (id, repo_id, issue_number, issue_title, issue_body, status, branch, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.repoId,
    input.issueNumber,
    input.issueTitle,
    input.issueBody,
    "understanding",
    input.branch,
    now,
  );
  return getFixSession(id)!;
}

export function getFixSession(id: string): FixSession | undefined {
  const row = get("SELECT * FROM fix_sessions WHERE id = ?", id);
  if (!row) return undefined;
  return mapSessionRow(row, listFileChanges(id));
}

export function listFileChanges(sessionId: string): FileChange[] {
  return all("SELECT * FROM file_changes WHERE session_id = ? ORDER BY path", sessionId).map(
    mapChangeRow,
  );
}

export function updateSession(
  id: string,
  patch: Partial<{
    status: FixStatus;
    plan: FixPlan;
    understand: string;
    testOutput: string;
    testPassed: boolean;
    patch: string;
    pr: PRDraft;
  }>,
) {
  const fields: string[] = [];
  const values: unknown[] = [];
  const push = (col: string, value: unknown) => {
    fields.push(`${col} = ?`);
    values.push(value);
  };
  if (patch.status !== undefined) push("status", patch.status);
  if (patch.plan !== undefined) push("plan_json", JSON.stringify(patch.plan));
  if (patch.understand !== undefined) push("understand", patch.understand);
  if (patch.testOutput !== undefined) push("test_output", patch.testOutput);
  if (patch.testPassed !== undefined) push("test_passed", patch.testPassed ? 1 : 0);
  if (patch.patch !== undefined) push("patch", patch.patch);
  if (patch.pr !== undefined) push("pr_json", JSON.stringify(patch.pr));
  if (!fields.length) return;
  run(`UPDATE fix_sessions SET ${fields.join(", ")} WHERE id = ?`, ...values, id);
}

export function upsertFileChange(input: {
  sessionId: string;
  path: string;
  diff: string;
  additions: number;
  deletions: number;
}): FileChange {
  const existing = get<{ id: string }>(
    "SELECT id FROM file_changes WHERE session_id = ? AND path = ?",
    input.sessionId,
    input.path,
  );
  if (existing) {
    run(
      "UPDATE file_changes SET diff = ?, additions = ?, deletions = ? WHERE id = ?",
      input.diff,
      input.additions,
      input.deletions,
      existing.id,
    );
    return mapChangeRow(get("SELECT * FROM file_changes WHERE id = ?", existing.id));
  }
  const id = nanoid(12);
  run(
    `INSERT INTO file_changes (id, session_id, path, diff, decision, additions, deletions)
     VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
    id,
    input.sessionId,
    input.path,
    input.diff,
    input.additions,
    input.deletions,
  );
  return mapChangeRow(get("SELECT * FROM file_changes WHERE id = ?", id));
}

export function setChangeDecision(
  sessionId: string,
  changeId: string,
  decision: "accepted" | "rejected",
) {
  run(
    "UPDATE file_changes SET decision = ? WHERE id = ? AND session_id = ?",
    decision,
    changeId,
    sessionId,
  );
}
