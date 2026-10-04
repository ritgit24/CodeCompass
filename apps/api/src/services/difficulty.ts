import { clamp } from "../agent/util";

export interface HeuristicInput {
  title: string;
  body: string;
  labels: string[];
  comments: number;
}

export interface HeuristicResult {
  score: number;
  reasons: string[];
}

const EASY_LABELS = [
  "good first issue",
  "good-first-issue",
  "first-timers-only",
  "beginner",
  "easy",
  "starter",
];
const DOCS_LABELS = ["documentation", "docs"];
const HARD_LABELS = [
  "enhancement",
  "feature",
  "refactor",
  "performance",
  "breaking change",
  "architecture",
];

/**
 * Cheap, deterministic difficulty signal (1 = easiest, 5 = hardest). The LLM
 * pass refines this, but the heuristic alone is already useful and testable.
 */
export function heuristicScore(input: HeuristicInput): HeuristicResult {
  let score = 3;
  const reasons: string[] = [];
  const labels = input.labels.map((l) => l.toLowerCase());

  if (labels.some((l) => EASY_LABELS.includes(l))) {
    score -= 2;
    reasons.push("Labeled as a beginner-friendly issue.");
  }
  if (labels.some((l) => DOCS_LABELS.includes(l))) {
    score -= 1;
    reasons.push("Documentation change.");
  }
  if (labels.some((l) => HARD_LABELS.includes(l))) {
    score += 1;
    reasons.push("Involves feature or refactor work.");
  }
  if (input.comments >= 20) {
    score += 1;
    reasons.push("Long discussion thread suggests ambiguity.");
  } else if (input.comments >= 10) {
    score += 0.5;
    reasons.push("Active discussion.");
  }

  const bodyLength = input.body.trim().length;
  if (bodyLength > 2500) {
    score += 1;
    reasons.push("Detailed but long description.");
  } else if (bodyLength > 0 && bodyLength < 150) {
    score -= 0.5;
    reasons.push("Short description with a clear ask.");
  }

  const mentionsFiles = /[\w./-]+\.(ts|tsx|js|jsx|py|rb|go|rs|java|md|json|yml|yaml)\b/i.test(
    input.title + " " + input.body,
  );
  if (mentionsFiles) {
    score -= 1;
    reasons.push("Names specific files, so scope is clear.");
  }

  if (reasons.length === 0) reasons.push("No strong signals; scored as average difficulty.");
  return { score: clamp(Math.round(score), 1, 5), reasons };
}
