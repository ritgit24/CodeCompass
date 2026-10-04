import type { FixPlan, IssueInfo } from "@codecompass/shared";

export const EXPLAIN_SYSTEM = `You are CodeCompass, an expert developer who explains unfamiliar codebases to newcomers.
Answer with concrete references to files and line ranges. Prefer short paragraphs, then a short
list of the exact files that matter. Never invent file paths — only cite files that appear in the
provided context. When you are unsure, say so.`;

export function explainPrompt(question: string, context: string[]): string {
  return [
    "Question: " + question,
    "",
    "Repository context (file paths you may cite):",
    context.slice(0, 200).join("\n") || "(no file list available)",
    "",
    "Answer the question for a newcomer. Finish with a line starting with 'SOURCES:' listing the",
    "most relevant 'path:startLine-endLine' citations, comma separated.",
  ].join("\n");
}

export const SUMMARIZE_SYSTEM = `You are a staff engineer writing onboarding notes for a repository.
Return STRICT JSON only — no prose, no markdown fences.`;

export function summarizePrompt(
  files: { path: string; language: string; size: number }[],
  topDirs: string[],
  readme?: string,
): string {
  const fileList = files
    .slice(0, 400)
    .map((f) => `${f.path} (${f.language})`)
    .join("\n");
  return [
    "Analyse this repository and return JSON with this exact shape:",
    `{ "what": string, "techStack": string[], "howToRun": string[],`,
    `  "folderStructure": [{ "path": string, "description": string }],`,
    `  "keyFiles": [{ "path": string, "reason": string, "language": string }],`,
    `  "moduleSummaries": { "<top-level-dir>": string } }`,
    "",
    "Top-level directories: " + topDirs.join(", "),
    readme ? "\nREADME excerpt:\n" + readme.slice(0, 2000) : "",
    "\nFiles:\n" + fileList,
    "\nReturn 3-6 key files, 3-6 how-to-run steps, and a one-line summary per top-level directory.",
  ].join("\n");
}

export const PLAN_SYSTEM = `You are a careful senior engineer planning a minimal, reviewable fix.
Return STRICT JSON only — no prose, no markdown fences.`;

export function planPrompt(issue: IssueInfo, fileHints: string[]): string {
  return [
    "Issue:",
    `#${issue.number} ${issue.title}`,
    issue.body.slice(0, 4000) || "(no description)",
    issue.labels.length ? `Labels: ${issue.labels.join(", ")}` : "",
    fileHints.length ? `\nLikely relevant files:\n${fileHints.join("\n")}` : "",
    "",
    "Return JSON with this exact shape:",
    `{ "summary": string,`,
    `  "steps": [{ "id": string, "title": string, "detail": string }],`,
    `  "filesToChange": string[],`,
    `  "risks": string[] }`,
    "\nKeep it to 3-6 small steps. Do not include code in the plan.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function applyPrompt(issue: IssueInfo, plan: FixPlan): string {
  return [
    `Implement this plan for issue #${issue.number}: ${issue.title}`,
    "",
    "Plan:",
    plan.steps.map((s, i) => `${i + 1}. ${s.title} — ${s.detail}`).join("\n"),
    "",
    "Files to change: " + plan.filesToChange.join(", "),
    "",
    "Make the smallest correct change. Then summarise what you changed in one sentence.",
  ].join("\n");
}

export const PR_SYSTEM = `You write concise pull request descriptions for open-source contributors.
Return STRICT JSON only with keys "title" and "body". The body uses markdown with a short summary,
a bulleted list of changes, and a testing note.`;

export function prPrompt(issue: IssueInfo, plan: FixPlan, changed: string[]): string {
  return [
    `Write a draft PR for issue #${issue.number}: ${issue.title}`,
    "",
    "Plan summary: " + plan.summary,
    "Changed files: " + changed.join(", "),
    "",
    'Return JSON: { "title": string, "body": string }',
  ].join("\n");
}
