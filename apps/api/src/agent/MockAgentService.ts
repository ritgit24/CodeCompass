import type { AgentEvent, FixPlan, PRDraft, SourceRef } from "@codecompass/shared";
import type {
  AgentService,
  ApplyPlanInput,
  DraftPRInput,
  ExplainInput,
  IssueScore,
  PlanFixInput,
  RepoAnalysis,
  ScoreInput,
  SummarizeInput,
} from "./AgentService";
import { clamp, streamText } from "./util";
import { collectDiffs } from "./gitDiff";
import { matchPaths } from "../utils/fileMatch";
import {
  applyInertEdit,
  composeAnswer,
  describeDir,
  pickFiles,
  pickKeyFiles,
  reasonFor,
  resolveTargets,
  sleep,
} from "./mockHelpers";

/**
 * Deterministic, keyless agent. Produces believable streamed output derived
 * from the real repository so the whole UI can be demoed without any API keys.
 */
export class MockAgentService implements AgentService {
  readonly name = "mock" as const;

  async *explain(input: ExplainInput): AsyncIterable<AgentEvent> {
    const picks = pickFiles(input.question, input.context ?? [], 3);
    const answer = composeAnswer(input.question, picks);
    for await (const chunk of streamText(answer, 8)) {
      yield { type: "text_delta", text: chunk };
    }
    const sources: SourceRef[] = picks.map((p) => ({ path: p, startLine: 1, endLine: 40 }));
    yield { type: "sources", sources };
    yield { type: "done", text: answer };
  }

  async *planFix(input: PlanFixInput): AsyncIterable<AgentEvent> {
    const targets = input.fileHints?.length ? input.fileHints.slice(0, 3) : ["README.md"];
    const steps = [
      {
        id: "s1",
        title: "Locate the relevant code",
        detail: `Search ${targets[0]} for the behaviour described in the issue.`,
      },
      {
        id: "s2",
        title: "Make a minimal change",
        detail: `Apply the smallest correct edit to ${targets.join(", ")}.`,
      },
      {
        id: "s3",
        title: "Keep the public API stable",
        detail: "Avoid changing exported signatures; prefer additive changes.",
      },
      {
        id: "s4",
        title: "Verify with the test suite",
        detail: "Run the project's tests to confirm nothing regressed.",
      },
    ];
    for (const step of steps) {
      yield { type: "text_delta", text: `• ${step.title}\n` };
      yield { type: "plan_step", step: step.title };
      await sleep(120);
    }
    const plan: FixPlan = {
      summary: `Address "${input.issue.title}" with a focused change to ${targets[0]}.`,
      steps: steps.map((s) => ({ ...s, done: false })),
      filesToChange: targets,
      risks: ["Mock agent: the change is illustrative and intentionally inert."],
    };
    yield { type: "plan", plan };
    yield { type: "done" };
  }

  async *applyPlan(input: ApplyPlanInput): AsyncIterable<AgentEvent> {
    const targets = resolveTargets(input.repoPath, input.plan.filesToChange);
    for (const target of targets) {
      yield { type: "file_read", path: target };
      await sleep(120);
    }
    for (const target of targets) {
      try {
        applyInertEdit(input.repoPath, target);
        yield { type: "message", text: `Updated ${target}` };
      } catch (err) {
        yield { type: "error", message: `Could not edit ${target}: ${(err as Error).message}` };
      }
    }
    yield { type: "command_run", command: "git diff --stat", output: "" };
    await sleep(150);
    const diffs = await collectDiffs(input.repoPath);
    for (const d of diffs) {
      yield {
        type: "file_edit",
        path: d.path,
        diff: d.diff,
        additions: d.additions,
        deletions: d.deletions,
      };
    }
    yield { type: "done" };
  }

  async summarizeRepo(input: SummarizeInput): Promise<RepoAnalysis> {
    const languages = new Map<string, number>();
    for (const f of input.files) languages.set(f.language, (languages.get(f.language) ?? 0) + 1);
    const ranked = [...languages.entries()].sort((a, b) => b[1] - a[1]);
    const primary = ranked[0]?.[0] ?? "code";
    const readme = input.files.find((f) => /^readme/i.test(f.path));
    return {
      what: `A ${primary} project with ${input.files.length} source files across ${input.topDirs.length} top-level directories (${input.topDirs.slice(0, 4).join(", ")}).`,
      techStack: ranked.slice(0, 5).map(([lang, count]) => `${lang} (${count} files)`),
      howToRun: [
        readme
          ? `Read ${readme.path} for setup instructions.`
          : "Check the README for setup steps.",
        "Install dependencies with the project's package manager.",
        "Run the test suite before making changes.",
      ],
      folderStructure: input.topDirs.slice(0, 8).map((dir) => ({
        path: dir,
        description: describeDir(
          dir,
          input.files.filter((f) => f.path.startsWith(dir + "/")),
        ),
      })),
      keyFiles: pickKeyFiles(input.files, 5).map((f) => ({
        path: f.path,
        reason: reasonFor(f.path),
        language: f.language,
      })),
      moduleSummaries: Object.fromEntries(
        input.topDirs
          .slice(0, 10)
          .map((dir) => [
            dir,
            `${input.files.filter((f) => f.path.startsWith(dir + "/")).length} files.`,
          ]),
      ),
    };
  }

  async scoreIssue(input: ScoreInput): Promise<IssueScore> {
    const score = clamp(input.heuristic.score, 1, 5);
    const files = matchPaths(input.issue.body + " " + input.issue.title, input.knownPaths, 3);
    const difficulty = score <= 2 ? "Easy" : score === 3 ? "Medium" : "Hard";
    return {
      difficulty,
      difficultyScore: score,
      estMinutes: [30, 45, 90, 180, 300][score - 1] ?? 90,
      files,
      reason: input.heuristic.reasons.join(" "),
    };
  }

  async draftPR(input: DraftPRInput): Promise<PRDraft> {
    const files = input.changedFiles.map((f) => f.path);
    return {
      title: `Fix: ${input.issue.title}`.slice(0, 72),
      body: [
        "## Summary",
        input.plan.summary || `Addresses #${input.issue.number}.`,
        "",
        "## Changes",
        ...files.map((f) => `- \`${f}\``),
        "",
        "## Testing",
        "Ran the project's test suite locally in an isolated clone.",
        "",
        `Closes #${input.issue.number}`,
      ].join("\n"),
    };
  }
}
