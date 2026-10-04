# CodeCompass

**Understand any codebase. Ship your first PR.**

Paste a GitHub URL and CodeCompass maps the architecture, answers your questions with cited
sources, ranks open issues by difficulty, and walks you through a **reviewable** first
contribution — plan first, diff second, apply last.

> Human-in-the-loop by design: every change is shown as a plan and a diff before it is kept, and
> **nothing is ever pushed to GitHub**.

---

## Quick start

```bash
npm install
npm run dev
```

Both apps start together:

| App | URL                   | Description                         |
| --- | --------------------- | ----------------------------------- |
| Web | http://localhost:3000 | Next.js 14 (App Router) UI          |
| API | http://localhost:4000 | Express + TypeScript, SSE streaming |

Open http://localhost:3000 and click **Load demo repo** (the `offline` chip) — it works with
**no network and no API keys**.

> Optional: `cp .env.example .env` to add a `GITHUB_TOKEN` (higher GitHub rate limits) or to switch
> the agent provider.

---

## The 60-second tour

1. **Landing** — paste a URL, or hit the bundled **demo repo** chip.
2. **Analysis** — a live SSE stepper: clone → scan → parse → map → summarise.
3. **Dashboard**
   - **Overview** — AI summary, tech stack, how to run it, folder map, key files to read first.
   - **Map** — an interactive React Flow module graph, colour-coded by language, with a node drawer.
   - **Ask the Repo** — streaming chat; every answer cites **source chips** that open the file.
   - **Issues** — open issues ranked for your skill level with difficulty + time estimates.
4. **Guided fix** — Understand → Plan (editable) → Changes (per-file diff, Accept/Reject) →
   Verify (real tests in a sandbox + downloadable patch and draft PR).

---

## Agent providers

The agent layer sits behind a single `AgentService` interface; nothing else imports an LLM SDK.

```ts
interface AgentService {
  explain(input): AsyncIterable<AgentEvent>;
  planFix(input): AsyncIterable<AgentEvent>;
  applyPlan(input): AsyncIterable<AgentEvent>;
  summarizeRepo(input): Promise<RepoAnalysis>;
  scoreIssue(input): Promise<IssueScore>;
  draftPR(input): Promise<PRDraft>;
}
```

Set `AGENT_PROVIDER` in `.env`:

| Provider         | What it does                                                                   | Needs keys?         |
| ---------------- | ------------------------------------------------------------------------------ | ------------------- |
| `mock` (default) | Deterministic, repo-aware canned output. Full UI demo.                         | No                  |
| `cline`          | Real **Cline SDK** (`@cline/sdk`): `Agent` + `createTool` for sandboxed edits. | Yes (`LLM_API_KEY`) |
| `direct`         | Plain OpenAI-compatible chat completions.                                      | Yes (`LLM_API_KEY`) |

```ini
AGENT_PROVIDER=cline
CLINE_PROVIDER_ID=anthropic
CLINE_MODEL_ID=claude-sonnet-4-6
LLM_API_KEY=sk-ant-...
```

---

## Repository layout

```
codecompass/
  apps/
    web/                 Next.js 14 app (App Router, Tailwind, shadcn-style UI)
      app/               / , /repo/[id]/loading , /repo/[id] , /repo/[id]/fix/[sessionId]
      components/        ui/ · repo/ · fix/ · landing/
      lib/               api client, graph layout, utils
    api/                 Express + TypeScript (run with tsx)
      src/
        routes/          repos, chat, fix  (REST + SSE)
        services/        analysis, issues, fix, testRunner, eventBus
        agent/           AgentService · Mock · Cline · Direct · tools · prompts
        analysis/        clone, scan, parse, graph
        db/              SQLite (better-sqlite3 → node:sqlite fallback)
      fixtures/demo-repo Bundled offline demo project
  packages/shared/       Zod schemas + shared types (used by web and api)
  docs/DEMO.md           3-minute demo script
```

---

## Scripts

| Command             | What it does                                               |
| ------------------- | ---------------------------------------------------------- |
| `npm run dev`       | Run API + web together                                     |
| `npm run typecheck` | TypeScript over both apps                                  |
| `npm test`          | Vitest unit tests (parsing, graph, scoring, agent, safety) |
| `npm run lint`      | ESLint (flat config)                                       |
| `npm run format`    | Prettier                                                   |
| `npm run test:e2e`  | Playwright smoke test (`apps/web/e2e`)                     |
| `npm run build`     | Bundle the API (esbuild) + build the web app               |

---

## API surface

```
POST /api/repos                         { url } -> { id }
GET  /api/repos/:id/status              SSE: analysis progress
GET  /api/repos/:id                     repo + summary + stats
GET  /api/repos/:id/graph               { nodes, edges }
GET  /api/repos/:id/files?path=         file tree, or file content
GET  /api/repos/:id/chat                chat history
POST /api/repos/:id/chat                SSE: streamed answer + sources
GET  /api/repos/:id/issues?skill=       issues ranked for a skill level
POST /api/repos/:id/fix                 { issue } -> { session }
GET  /api/fix/:sessionId/stream         SSE: plan + edit activity
POST /api/fix/:sessionId/approve        apply the (edited) plan
POST /api/fix/:sessionId/files/:id/decision   accept | reject a file change
POST /api/fix/:sessionId/test           run the repo's tests in the sandbox
GET  /api/fix/:sessionId/patch          { patch, pr }
```

All request/response shapes are Zod schemas in `packages/shared`, so the web app and API can't drift.

---

## Safety model

- Fixes run in a **throwaway copy** of the clone, on a branch `codecompass/fix-<n>`.
- Shell commands are **allow-listed** (`npm`, `npx`, `pytest`, `node`, `python`, `git diff/status/…`)
  and reject chaining/metacharacters. Paths are confined to the workspace.
- Tests have a timeout; secrets are redacted before being logged or stored.
- **No pushing, no real PRs** — you download a `.patch` and copy a draft PR description.

---

## What's real vs. mocked

**Real:** repo validation, shallow clone, file scan + limits, static parsing, module graph,
SQLite persistence, GitHub issue fetch, difficulty scoring, SSE streaming, unified diffs, per-file
accept/reject, test execution, patch + PR drafting, chat history.

**Mocked by default:** the agent's reasoning (`AGENT_PROVIDER=mock`) so the demo needs no keys. The
`cline` and `direct` providers are implemented against the real APIs and need a key to run.

**Notes / limitations:** the mock agent makes an intentionally inert change (an explanatory comment)
so the demo's test run passes. `direct` can describe edits but cannot apply them (a plain chat model
has no tools); use `cline` for applied edits.
