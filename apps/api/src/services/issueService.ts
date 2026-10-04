import { Octokit } from "@octokit/rest";
import type { IssueInfo, Repo, SkillLevel } from "@codecompass/shared";
import { getAgentService } from "../agent";
import { isDemoUrl } from "../analysis/clone";
import { env } from "../utils/env";
import { listIssues, replaceIssues } from "../db/chatIssueStore";
import { getCachedFiles } from "./analysisService";
import { heuristicScore } from "./difficulty";
import { logger } from "../utils/logger";

const MAX_SCORED_ISSUES = 15;

/** Canned issues for the bundled demo repo so the matcher is never empty. */
function demoIssues(): RawIssue[] {
  const now = Date.now();
  const daysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString();
  return [
    {
      number: 14,
      title: "Route parameters are not URL-decoded",
      body: "In `src/router.js` the captured params are used as-is. `src/utils.js` should decode them so `/users/a%20b` resolves to `a b`. Looks like a small fix in the matcher.",
      labels: ["bug", "good first issue"],
      comments: 3,
      createdAt: daysAgo(4),
      url: "https://github.com/codecompass/demo-repo/issues/14",
    },
    {
      number: 13,
      title: "Document the middleware pattern in the README",
      body: "README.md explains setup but never shows how `createAuth().requireAuth` wraps a handler. A short example would help newcomers.",
      labels: ["documentation", "good first issue"],
      comments: 1,
      createdAt: daysAgo(9),
      url: "https://github.com/codecompass/demo-repo/issues/13",
    },
    {
      number: 12,
      title: "normalisePath strips encoded slashes incorrectly",
      body: "The `replace(/\\/{2,}/g, '/')` call in `src/utils.js` runs before decoding, so `%2F` sequences break. Needs a careful change plus tests.",
      labels: ["bug"],
      comments: 7,
      createdAt: daysAgo(6),
      url: "https://github.com/codecompass/demo-repo/issues/12",
    },
    {
      number: 11,
      title: "Support wildcard routes such as /files/*",
      body: "We should add a wildcard segment to `src/router.js` and update `compilePath` in `src/utils.js`. This is a bigger design change.",
      labels: ["enhancement", "help wanted"],
      comments: 14,
      createdAt: daysAgo(20),
      url: "https://github.com/codecompass/demo-repo/issues/11",
    },
    {
      number: 10,
      title: "Migrate the project to TypeScript",
      body: "Convert `src/*.js` to TypeScript, add a tsconfig, and wire the build. Large refactor touching every file.",
      labels: ["enhancement", "refactor"],
      comments: 22,
      createdAt: daysAgo(35),
      url: "https://github.com/codecompass/demo-repo/issues/10",
    },
  ];
}

function scoreToDifficulty(score: number): "Easy" | "Medium" | "Hard" {
  if (score <= 2) return "Easy";
  if (score === 3) return "Medium";
  return "Hard";
}

interface RawIssue {
  number: number;
  title: string;
  body: string;
  labels: string[];
  comments: number;
  createdAt: string;
  url: string;
}

/** Fetch open issues (excluding PRs). Returns an empty list if unavailable. */
export async function fetchOpenIssues(repo: Repo): Promise<RawIssue[]> {
  if (isDemoUrl(repo.url)) return demoIssues();
  try {
    const octokit = new Octokit(env.githubToken ? { auth: env.githubToken } : {});
    const { data } = await octokit.issues.listForRepo({
      owner: repo.owner,
      repo: repo.name,
      state: "open",
      per_page: 40,
      sort: "created",
      direction: "desc",
    });
    return data
      .filter((issue) => !("pull_request" in issue && issue.pull_request))
      .map((issue) => ({
        number: issue.number,
        title: issue.title,
        body: issue.body ?? "",
        labels: issue.labels
          .map((l) => (typeof l === "string" ? l : (l.name ?? "")))
          .filter(Boolean),
        comments: issue.comments,
        createdAt: issue.created_at,
        url: issue.html_url,
      }));
  } catch (err) {
    logger.warn(
      `GitHub issues fetch failed for ${repo.owner}/${repo.name}`,
      (err as Error).message,
    );
    return [];
  }
}

/** Score issues (heuristic + LLM) and persist them for the repo. */
export async function loadIssues(repo: Repo): Promise<IssueInfo[]> {
  const raw = await fetchOpenIssues(repo);
  if (!raw.length) {
    replaceIssues(repo.id, []);
    return [];
  }
  const agent = await getAgentService();
  const knownPaths = getCachedFiles(repo.id).map((f) => f.path);
  const candidates = raw.slice(0, MAX_SCORED_ISSUES);

  const scored: IssueInfo[] = [];
  for (const issue of candidates) {
    const heuristic = heuristicScore(issue);
    let refined = {
      difficulty: scoreToDifficulty(heuristic.score),
      difficultyScore: heuristic.score,
      estMinutes: [30, 45, 90, 180, 300][heuristic.score - 1] ?? 90,
      files: [] as string[],
      reason: heuristic.reasons.join(" "),
    };
    try {
      const judgement = await agent.scoreIssue({
        issue: {
          number: issue.number,
          title: issue.title,
          body: issue.body,
          labels: issue.labels,
          comments: issue.comments,
        },
        heuristic,
        knownPaths,
      });
      refined = {
        difficulty: judgement.difficulty,
        difficultyScore: judgement.difficultyScore,
        estMinutes: judgement.estMinutes,
        files: judgement.files?.slice(0, 5) ?? [],
        reason: judgement.reason || heuristic.reasons.join(" "),
      };
    } catch (err) {
      logger.warn("agent issue scoring failed; using heuristic only", (err as Error).message);
    }

    scored.push({
      id: `${repo.id}:${issue.number}`,
      repoId: repo.id,
      number: issue.number,
      title: issue.title,
      body: issue.body,
      url: issue.url,
      labels: issue.labels,
      comments: issue.comments,
      createdAt: issue.createdAt,
      difficulty: refined.difficulty,
      difficultyScore: refined.difficultyScore,
      estMinutes: refined.estMinutes,
      files: refined.files,
      reason: refined.reason,
      heuristic: { ...heuristic },
    });
  }

  replaceIssues(repo.id, scored);
  return scored;
}

/** Re-rank a stored issue list for a skill level (cheap, no network). */
export function rankForSkill(issues: IssueInfo[], skill: SkillLevel): IssueInfo[] {
  const target = skill === "beginner" ? 1 : skill === "intermediate" ? 3 : 5;
  return [...issues].sort((a, b) => {
    const da = Math.abs(a.difficultyScore - target);
    const db = Math.abs(b.difficultyScore - target);
    if (da !== db) return da - db;
    return a.comments - b.comments;
  });
}

export function getStoredIssues(repoId: string): IssueInfo[] {
  return listIssues(repoId);
}
