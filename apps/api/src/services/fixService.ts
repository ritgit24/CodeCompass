import { simpleGit } from "simple-git";
import type { FixPlan, FixSession, IssueInfo } from "@codecompass/shared";
import { getAgentService } from "../agent";
import { createWorkingCopy } from "../analysis/clone";
import { getRepo } from "../db/repoStore";
import {
  createFixSession,
  countFixSessions,
  getFixSession,
  listFileChanges,
  setChangeDecision,
  updateSession,
  upsertFileChange,
} from "../db/fixStore";
import { getCachedFiles } from "./analysisService";
import { bus, fixChannel } from "./eventBus";
import { runTests } from "./testRunner";
import { paths } from "../utils/paths";
import { matchPaths } from "../utils/fileMatch";
import { logger } from "../utils/logger";

export function workingCopyPath(sessionId: string): string {
  return paths.fixDir(sessionId);
}

function toIssueInfo(session: FixSession): IssueInfo {
  return {
    id: session.id,
    repoId: session.repoId,
    number: session.issueNumber ?? 0,
    title: session.issueTitle,
    body: session.issueBody,
    url: "",
    labels: [],
    comments: 0,
    createdAt: session.createdAt,
    difficulty: "Medium",
    difficultyScore: 3,
    estMinutes: 60,
    files: session.plan?.filesToChange ?? [],
    reason: "",
    heuristic: {},
  } as IssueInfo;
}

function likelyFiles(repoId: string, text: string): string[] {
  const all = getCachedFiles(repoId).map((f) => f.path);
  const matched = matchPaths(text, all, 6);
  return matched.length
    ? matched
    : all.filter((p) => /(readme|index|main|app)\./i.test(p)).slice(0, 5);
}

/** Create a fix session on a scratch branch inside a throwaway working copy. */
export async function createSession(
  repoId: string,
  issue: { number?: number | null; title: string; body?: string },
): Promise<FixSession> {
  if (!getRepo(repoId)) throw new Error("Repo not found");
  const branch = `codecompass/fix-${countFixSessions(repoId) + 1}`;
  const session = createFixSession({
    repoId,
    issueNumber: issue.number ?? null,
    issueTitle: issue.title,
    issueBody: issue.body ?? "",
    branch,
  });
  const work = await createWorkingCopy(paths.repoDir(repoId), session.id);
  try {
    await simpleGit(work).checkoutLocalBranch(branch);
  } catch (err) {
    logger.warn(`could not create ${branch}`, (err as Error).message);
  }
  bus.reset(fixChannel(session.id));
  return getFixSession(session.id)!;
}

/** Phase 1: agent produces a structured plan (no edits yet). */
export async function startPlan(sessionId: string): Promise<void> {
  const session = getFixSession(sessionId);
  if (!session) throw new Error("Session not found");
  const channel = fixChannel(sessionId);
  const agent = await getAgentService();

  updateSession(sessionId, { status: "planning" });
  bus.publish(channel, { type: "status", status: "planning" });
  bus.publish(channel, {
    type: "understand",
    text: `Working on "${session.issueTitle}" in a throwaway clone on branch ${session.branch}.`,
  });

  const hints = likelyFiles(session.repoId, `${session.issueTitle} ${session.issueBody}`);
  try {
    for await (const event of agent.planFix({
      repoPath: workingCopyPath(sessionId),
      issue: toIssueInfo(session),
      fileHints: hints,
    })) {
      if (event.type === "text_delta") bus.publish(channel, { type: "token", text: event.text });
      else if (event.type === "plan") {
        updateSession(sessionId, { plan: event.plan, status: "awaiting_approval" });
        bus.publish(channel, { type: "plan", plan: event.plan });
        bus.publish(channel, { type: "status", status: "awaiting_approval" });
      } else if (event.type === "error")
        bus.publish(channel, { type: "error", message: event.message });
    }
    bus.publish(channel, { type: "done" });
  } catch (err) {
    updateSession(sessionId, { status: "error" });
    bus.publish(channel, {
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

/** Phase 2: user approved the plan — agent edits the working copy. */
export async function approveAndApply(sessionId: string, plan?: FixPlan): Promise<FixSession> {
  let session = getFixSession(sessionId);
  if (!session) throw new Error("Session not found");
  if (plan) {
    updateSession(sessionId, { plan });
    session = getFixSession(sessionId)!;
  }
  const channel = fixChannel(sessionId);
  const agent = await getAgentService();

  updateSession(sessionId, { status: "applying" });
  bus.publish(channel, { type: "status", status: "applying" });

  for await (const event of agent.applyPlan({
    repoPath: workingCopyPath(sessionId),
    sessionId,
    issue: toIssueInfo(session),
    plan: session.plan ?? { summary: "", steps: [], filesToChange: [], risks: [] },
  })) {
    bus.publish(channel, { type: "activity", event });
    if (event.type === "file_edit") {
      const change = upsertFileChange({
        sessionId,
        path: event.path,
        diff: event.diff,
        additions: event.additions,
        deletions: event.deletions,
      });
      bus.publish(channel, { type: "file_change", changeId: change.id, path: change.path });
    }
  }

  updateSession(sessionId, { status: "reviewing" });
  bus.publish(channel, { type: "status", status: "reviewing" });
  bus.publish(channel, { type: "done" });
  return getFixSession(sessionId)!;
}

/** Accept or reject a single file change; rejecting reverts it in the copy. */
export async function decideChange(
  sessionId: string,
  changeId: string,
  decision: "accepted" | "rejected",
): Promise<FixSession> {
  setChangeDecision(sessionId, changeId, decision);
  if (decision === "rejected") {
    const change = listFileChanges(sessionId).find((c) => c.id === changeId);
    if (change) {
      try {
        await simpleGit(workingCopyPath(sessionId)).checkout(["--", change.path]);
      } catch (err) {
        logger.warn(`could not revert ${change.path}`, (err as Error).message);
      }
    }
  }
  return getFixSession(sessionId)!;
}

const EMPTY_PLAN: FixPlan = { summary: "", steps: [], filesToChange: [], risks: [] };

/** Phase 3: run the project's tests, then draft the PR + build the patch. */
export async function runSessionTests(sessionId: string) {
  const channel = fixChannel(sessionId);
  updateSession(sessionId, { status: "testing" });
  bus.publish(channel, { type: "status", status: "testing" });

  const result = await runTests(workingCopyPath(sessionId));
  updateSession(sessionId, {
    testOutput: result.output,
    testPassed: result.passed,
    status: "done",
  });
  bus.publish(channel, { type: "test_result", passed: result.passed, output: result.output });

  await finalize(sessionId);
  bus.publish(channel, { type: "done" });
  return { session: getFixSession(sessionId)!, result };
}

/** Build the downloadable patch and a draft PR from accepted changes. */
export async function finalize(sessionId: string) {
  const session = getFixSession(sessionId);
  if (!session) throw new Error("Session not found");

  const accepted = session.fileChanges.filter((c) => c.decision !== "rejected");
  const used = accepted.length ? accepted : session.fileChanges;
  const patch = used.map((c) => c.diff).join("\n");

  let pr = session.pr ?? undefined;
  try {
    const agent = await getAgentService();
    pr = await agent.draftPR({
      issue: toIssueInfo(session),
      plan: session.plan ?? EMPTY_PLAN,
      changedFiles: used.map((c) => ({ path: c.path, diff: c.diff })),
    });
  } catch (err) {
    logger.warn("PR draft generation failed", (err as Error).message);
  }

  updateSession(sessionId, { patch, ...(pr ? { pr } : {}) });
  return { patch, pr: pr ?? { title: "", body: "" } };
}
