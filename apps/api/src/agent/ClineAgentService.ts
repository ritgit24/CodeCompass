import type { AgentEvent, FixPlan, PRDraft } from "@codecompass/shared";
import { env } from "../utils/env";
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
import { eventBridge } from "./bridge";
import { extractJson, parseSources } from "./util";
import { describeError } from "./llmClient";
import { collectDiffs } from "./gitDiff";
import { createWorkspaceTools } from "./clineTools";
import {
  EXPLAIN_SYSTEM,
  PLAN_SYSTEM,
  PR_SYSTEM,
  SUMMARIZE_SYSTEM,
  applyPrompt,
  explainPrompt,
  planPrompt,
  prPrompt,
  summarizePrompt,
} from "./prompts";

type Sdk = typeof import("@cline/sdk");
const EMPTY_ANALYSIS: RepoAnalysis = {
  what: "Summary unavailable.",
  techStack: [],
  howToRun: [],
  folderStructure: [],
  keyFiles: [],
  moduleSummaries: {},
};

/**
 * Primary agent. Wraps the real Cline SDK (`@cline/sdk`): `Agent` for streaming
 * completions and `createTool` for sandboxed workspace editing. The SDK is
 * imported lazily so the mock/direct providers never load it.
 */
export class ClineAgentService implements AgentService {
  readonly name = "cline" as const;
  private sdkPromise: Promise<Sdk> | null = null;

  private get sdk(): Promise<Sdk> {
    this.sdkPromise ??= import("@cline/sdk");
    return this.sdkPromise;
  }

  private baseConfig() {
    return {
      providerId: env.clineProviderId,
      modelId: env.clineModelId,
      apiKey: env.llmApiKey,
      maxIterations: 1,
    };
  }

  async *explain(input: ExplainInput): AsyncIterable<AgentEvent> {
    const { Agent } = await this.sdk;
    const bridge = eventBridge();
    const agent = new Agent({ ...this.baseConfig(), systemPrompt: EXPLAIN_SYSTEM });
    agent.subscribe((event: any) => {
      if (event?.type === "assistant-text-delta") {
        bridge.push({ type: "text_delta", text: event.text ?? "" });
      }
    });
    void agent
      .run(explainPrompt(input.question, input.context ?? []))
      .then((res: any) => {
        const text = res?.outputText ?? "";
        bridge.push({ type: "sources", sources: parseSources(text) });
        bridge.push({ type: "done", text });
      })
      .catch((err: unknown) => bridge.push({ type: "error", message: msgOf(err) }))
      .finally(() => bridge.close());
    yield* bridge.iterable;
  }

  async *planFix(input: PlanFixInput): AsyncIterable<AgentEvent> {
    const { Agent } = await this.sdk;
    const bridge = eventBridge();
    const agent = new Agent({ ...this.baseConfig(), systemPrompt: PLAN_SYSTEM });
    let buffer = "";
    agent.subscribe((event: any) => {
      if (event?.type === "assistant-text-delta") {
        buffer += event.text ?? "";
        bridge.push({ type: "text_delta", text: event.text ?? "" });
      }
    });
    void agent
      .run(planPrompt(input.issue, input.fileHints ?? []))
      .then((res: any) => {
        const text = res?.outputText ?? buffer;
        const plan = extractJson<FixPlan>(text);
        if (plan) {
          plan.steps = (plan.steps ?? []).map((s, i) => ({
            ...s,
            id: s.id || `s${i + 1}`,
            done: false,
          }));
          bridge.push({ type: "plan", plan });
        } else {
          bridge.push({ type: "error", message: "Agent did not return a valid plan" });
        }
        bridge.push({ type: "done" });
      })
      .catch((err: unknown) => bridge.push({ type: "error", message: msgOf(err) }))
      .finally(() => bridge.close());
    yield* bridge.iterable;
  }

  async *applyPlan(input: ApplyPlanInput): AsyncIterable<AgentEvent> {
    const { Agent, createTool } = await this.sdk;
    const bridge = eventBridge();
    const { readFile, writeFile, runCommand } = createWorkspaceTools(
      createTool as (def: unknown) => unknown,
      input.repoPath,
      {
        onRead: (path) => bridge.push({ type: "file_read", path }),
        onWrite: (path) => bridge.push({ type: "message", text: `Edited ${path}` }),
        onCommand: (command, output, exitCode) =>
          bridge.push({ type: "command_run", command, output: output.slice(0, 4000), exitCode }),
      },
    );

    const agent = new Agent({
      ...this.baseConfig(),
      maxIterations: 14,
      systemPrompt: `You are a careful senior engineer editing a repository in place.
Use read_file to inspect code, then write_file to apply minimal edits. Never run destructive
commands. When finished, reply with a one-sentence summary.`,
      tools: [readFile, writeFile, runCommand] as any[],
      toolPolicies: {
        read_file: { autoApprove: true },
        write_file: { autoApprove: true },
        run_command: { autoApprove: true },
      },
    });
    agent.subscribe((event: any) => {
      if (event?.type === "assistant-text-delta") {
        bridge.push({ type: "text_delta", text: event.text ?? "" });
      }
    });

    void agent
      .run(applyPrompt(input.issue, input.plan))
      .catch((err: unknown) => bridge.push({ type: "error", message: msgOf(err) }))
      .finally(async () => {
        const diffs = await collectDiffs(input.repoPath).catch(() => []);
        for (const d of diffs) {
          bridge.push({
            type: "file_edit",
            path: d.path,
            diff: d.diff,
            additions: d.additions,
            deletions: d.deletions,
          });
        }
        bridge.push({ type: "done" });
        bridge.close();
      });
    yield* bridge.iterable;
  }

  async summarizeRepo(input: SummarizeInput): Promise<RepoAnalysis> {
    const text = await this.complete(
      SUMMARIZE_SYSTEM,
      summarizePrompt(input.files, input.topDirs, input.readme),
    );
    return extractJson<RepoAnalysis>(text) ?? EMPTY_ANALYSIS;
  }

  async scoreIssue(input: ScoreInput): Promise<IssueScore> {
    const text = await this.complete(
      "Return STRICT JSON only.",
      [
        `Issue: ${input.issue.title}\n${input.issue.body.slice(0, 3000)}`,
        `Labels: ${input.issue.labels.join(", ")}`,
        `Heuristic score (1-5): ${input.heuristic.score}`,
        `Known paths: ${input.knownPaths.slice(0, 120).join(", ")}`,
        'Return {"difficulty":"Easy|Medium|Hard","difficultyScore":number,"estMinutes":number,"files":string[],"reason":string}',
      ].join("\n"),
    );
    return (
      extractJson<IssueScore>(text) ?? {
        difficulty: input.heuristic.score <= 2 ? "Easy" : "Medium",
        difficultyScore: input.heuristic.score,
        estMinutes: 90,
        files: [],
        reason: "",
      }
    );
  }

  async draftPR(input: DraftPRInput): Promise<PRDraft> {
    const text = await this.complete(
      PR_SYSTEM,
      prPrompt(
        input.issue,
        input.plan,
        input.changedFiles.map((f) => f.path),
      ),
    );
    return (
      extractJson<PRDraft>(text) ?? { title: `Fix: ${input.issue.title}`, body: input.plan.summary }
    );
  }

  private async complete(systemPrompt: string, userPrompt: string): Promise<string> {
    const { Agent } = await this.sdk;
    const agent = new Agent({ ...this.baseConfig(), systemPrompt });
    const result: any = await agent.run(userPrompt);
    return result?.outputText ?? "";
  }
}

function msgOf(err: unknown): string {
  return err instanceof Error ? describeError(err) : String(err);
}

export { EMPTY_ANALYSIS, type Sdk };
