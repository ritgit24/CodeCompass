import type { AgentEvent, FixPlan, PRDraft } from "@codecompass/shared";
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
import { LLMClient, type ChatMessage } from "./llmClient";
import { extractJson, parseSources } from "./util";
import { collectDiffs } from "./gitDiff";
import {
  EDIT_MAX_TOKENS,
  EDIT_TIMEOUT_MS,
  EditPayloadSchema,
  collectEditableFiles,
  planWrites,
  writeFiles,
} from "./directEdits";
import {
  EDIT_SYSTEM,
  EXPLAIN_SYSTEM,
  PLAN_SYSTEM,
  PR_SYSTEM,
  SUMMARIZE_SYSTEM,
  editPrompt,
  explainPrompt,
  planPrompt,
  prPrompt,
  summarizePrompt,
} from "./prompts";

const EMPTY_ANALYSIS: RepoAnalysis = {
  what: "Summary unavailable.",
  techStack: [],
  howToRun: [],
  folderStructure: [],
  keyFiles: [],
  moduleSummaries: {},
};

/**
 * A plain OpenAI-compatible chat implementation of AgentService. No agent
 * framework — just streaming completions plus our own JSON parsing.
 */
export class DirectLLMAgentService implements AgentService {
  readonly name = "direct" as const;
  private llm = new LLMClient();

  async *explain(input: ExplainInput): AsyncIterable<AgentEvent> {
    const messages: ChatMessage[] = [
      { role: "system", content: EXPLAIN_SYSTEM },
      ...(input.history ?? []).map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
      { role: "user", content: explainPrompt(input.question, input.context ?? []) },
    ];
    let full = "";
    try {
      for await (const delta of this.llm.stream(messages)) {
        full += delta;
        yield { type: "text_delta", text: delta };
      }
    } catch (err) {
      yield { type: "error", message: (err as Error).message };
      return;
    }
    yield { type: "sources", sources: parseSources(full) };
    yield { type: "done", text: full };
  }

  async *planFix(input: PlanFixInput): AsyncIterable<AgentEvent> {
    const messages: ChatMessage[] = [
      { role: "system", content: PLAN_SYSTEM },
      { role: "user", content: planPrompt(input.issue, input.fileHints ?? []) },
    ];
    let full = "";
    try {
      for await (const delta of this.llm.stream(messages)) {
        full += delta;
        yield { type: "text_delta", text: delta };
      }
    } catch (err) {
      yield { type: "error", message: (err as Error).message };
      return;
    }
    const plan = extractJson<FixPlan>(full);
    if (plan) {
      plan.steps = (plan.steps ?? []).map((s, i) => ({
        ...s,
        id: s.id || `s${i + 1}`,
        done: false,
      }));
      yield { type: "plan", plan };
    } else {
      yield { type: "error", message: "Model did not return a valid plan" };
    }
    yield { type: "done" };
  }

  /**
   * A chat model has no tools, so instead of asking it to *call* an editor we
   * ask it to return full file contents as JSON, validate that payload against
   * a strict schema, and write the files ourselves. The resulting `git diff` is
   * then captured exactly like any other provider, so the review UI is unchanged.
   */
  async *applyPlan(input: ApplyPlanInput): AsyncIterable<AgentEvent> {
    const { repoPath, plan, issue } = input;

    const { files, skipped } = collectEditableFiles(repoPath, plan.filesToChange ?? []);
    for (const file of files) yield { type: "file_read", path: file.path };

    if (files.length === 0) {
      yield {
        type: "message",
        text:
          skipped.length > 0
            ? `No editable files: ${skipped.join(", ")}`
            : "No editable files were identified for this change.",
      };
      yield { type: "done" };
      return;
    }

    let raw: string;
    try {
      raw = await this.llm.complete(
        [
          { role: "system", content: EDIT_SYSTEM },
          { role: "user", content: editPrompt(issue, plan, files, skipped) },
        ],
        { maxTokens: EDIT_MAX_TOKENS, timeoutMs: EDIT_TIMEOUT_MS },
      );
    } catch (err) {
      yield { type: "error", message: err instanceof Error ? err.message : String(err) };
      yield { type: "done" };
      return;
    }

    const payload = extractJson(raw);
    if (!payload) {
      yield { type: "error", message: "The model did not return valid edit JSON." };
      yield { type: "done" };
      return;
    }

    const summary = EditPayloadSchema.safeParse(payload).data?.summary?.trim();
    if (summary) yield { type: "message", text: summary };

    const { writes, rejected } = planWrites(repoPath, payload);
    if (rejected.length) yield { type: "message", text: `Skipped: ${rejected.join("; ")}` };

    if (writes.length === 0) {
      yield { type: "message", text: "The model proposed no applicable file changes." };
      yield { type: "done" };
      return;
    }

    try {
      writeFiles(writes);
      for (const write of writes) yield { type: "message", text: `Updated ${write.path}` };
    } catch (err) {
      yield {
        type: "error",
        message: `Could not write files: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    yield { type: "command_run", command: "git diff --stat", output: "" };
    const diffs = await collectDiffs(repoPath);
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
    const text = await this.llm.complete(
      [
        { role: "system", content: SUMMARIZE_SYSTEM },
        { role: "user", content: summarizePrompt(input.files, input.topDirs, input.readme) },
      ],
      { timeoutMs: 45_000 },
    );
    return extractJson<RepoAnalysis>(text) ?? EMPTY_ANALYSIS;
  }

  async scoreIssue(input: ScoreInput): Promise<IssueScore> {
    const text = await this.llm.complete(
      [
        { role: "system", content: "Return STRICT JSON only." },
        {
          role: "user",
          content: [
            `Issue: ${input.issue.title}\n${input.issue.body.slice(0, 3000)}`,
            `Labels: ${input.issue.labels.join(", ")}`,
            `Heuristic score (1-5): ${input.heuristic.score}`,
            `Known paths: ${input.knownPaths.slice(0, 120).join(", ")}`,
            'Return {"difficulty":"Easy|Medium|Hard","difficultyScore":number,"estMinutes":number,"files":string[],"reason":string}',
          ].join("\n"),
        },
      ],
      { timeoutMs: 30_000, maxTokens: 600 },
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
    const text = await this.llm.complete([
      { role: "system", content: PR_SYSTEM },
      {
        role: "user",
        content: prPrompt(
          input.issue,
          input.plan,
          input.changedFiles.map((f) => f.path),
        ),
      },
    ]);
    return (
      extractJson<PRDraft>(text) ?? { title: `Fix: ${input.issue.title}`, body: input.plan.summary }
    );
  }
}
