# CodeCompass

**Understand any codebase. Ship your first PR.**

Paste a GitHub URL. CodeCompass maps the architecture, explains the code with cited sources,
ranks open issues by difficulty, and walks you through a **reviewable** first contribution.

```
   GitHub URL  ──▶  architecture map  ──▶  ask the repo  ──▶  pick an issue  ──▶  plan ──▶ diff ──▶ tests ──▶ patch
```

> **Human in the loop by design.** Every change is shown as a plan and a diff _before_ it is kept,
> and **nothing is ever pushed to GitHub**. You download a `.patch` and copy a draft PR description.

Built for students and early-career developers, new hires at small teams, and maintainers who want
better first-time contributions.

---

## Table of contents

- [What it does](#what-it-does)
- [Quick start](#quick-start)
- [Using it on your own repository](#using-it-on-your-own-repository)
- [Features in detail](#features-in-detail)
  - [1. Ingest & analysis](#1-ingest--analysis)
  - [2. Overview tab](#2-overview-tab)
  - [3. Architecture map](#3-architecture-map)
  - [4. Ask the Repo](#4-ask-the-repo)
  - [5. Issue matcher](#5-issue-matcher)
  - [6. Guided fix](#6-guided-fix)
- [Configuration](#configuration)
- [Agent providers](#agent-providers)
- [How it works internally](#how-it-works-internally)
- [Project structure](#project-structure)
- [Scripts](#scripts)
- [API reference](#api-reference)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [What's real vs. mocked](#whats-real-vs-mocked)
- [Limitations & roadmap](#limitations--roadmap)

---

## What it does

| Stage     | What happens                                                           | Where it lives                      |
| --------- | ---------------------------------------------------------------------- | ----------------------------------- |
| **Map**   | Shallow-clone, scan, statically analyse and draw the module graph      | `/repo/[id]/loading` → `/repo/[id]` |
| **Ask**   | Chat with the codebase; answers cite the exact files they used         | `Ask the Repo` tab                  |
| **Match** | Open issues ranked by difficulty + estimated time for your skill level | `Issues` tab                        |
| **Ship**  | Plan → per-file diff → sandboxed tests → downloadable patch + draft PR | `/repo/[id]/fix/[sessionId]`        |

---

## Quick start

**Requirements:** Node.js **22+** (developed on Node 26), npm 10+.

```bash
git clone <your-fork-url> codecompass
cd codecompass
npm install
npm run dev
```

Both apps start together:

| App | URL                   | Description                            |
| --- | --------------------- | -------------------------------------- |
| Web | http://localhost:3000 | Next.js 14 (App Router) UI             |
| API | http://localhost:4000 | Express + TypeScript, streams over SSE |

Then open **http://localhost:3000** and click the **`offline` "Load demo repo"** chip.

**No API keys and no network are required for the demo.** `AGENT_PROVIDER` defaults to `mock`, and
the demo repository is bundled inside the API at `apps/api/fixtures/demo-repo`, so the full flow
(clone → map → chat → issues → plan → diff → tests → patch) runs entirely on your machine.

### Optional configuration

```bash
cp .env.example .env
```

Add a `GITHUB_TOKEN` to raise GitHub rate limits, or switch the agent provider (see
[Agent providers](#agent-providers)). Everything works without it.

---

## Using it on your own repository

1. **Paste a URL** on the landing page (`https://github.com/owner/repo`, `owner/repo`, or a
   `git@github.com:owner/repo.git` remote all work) and press **Analyze repo**.
   Only `github.com` URLs are accepted, plus the bundled `codecompass/demo-repo`.

2. **Watch the analysis** on `/repo/<id>/loading`. A live SSE stepper runs
   `Cloning → Scanning → Parsing → Building map → Summarising`, with a progress bar and log. When it
   finishes you are redirected to the dashboard automatically.

3. **Read the Overview** — what the project does, its tech stack, how to run it, a folder-by-folder
   breakdown, and the **key files to read first** (click any of them to open the source).

4. **Explore the Map** — an interactive module graph. See
   [Architecture map](#3-architecture-map) for how to read it.

5. **Ask questions** in the `Ask the Repo` tab. Answers stream in token by token and end with
   **source chips** (`path:line`) that open the file. History is saved per repository.

6. **Pick an issue** in the `Issues` tab. Choose your skill level (**Beginner / Intermediate /
   Advanced**) and the list re-ranks. Each card shows a difficulty badge, an estimated time, the
   files likely to be touched, and _why_ it was scored that way. If the repo has no usable issues,
   describe the change yourself in the manual box.

7. **Ship the fix** — press **Start guided fix** and follow the four phases
   ([Guided fix](#6-guided-fix)).

### Budgets and safety when pointing at real repositories

- clones are **shallow** (`--depth 1 --single-branch --no-tags`) and capped at `MAX_REPO_MB` (default
  100 MB); `node_modules`, `dist`, lockfiles and binaries are skipped, and scanning stops at
  `MAX_FILES` (default 4000).
- Fixtures' own test suites are executed in a **throwaway copy** inside `WORKSPACE_DIR`, never in
  your checkout, and never with push access.

---

## Features in detail

### 1. Ingest & analysis

A single background pipeline, streamed live over Server-Sent Events:

| Step             | What it does                                                                                                                                                                                                                        |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cloning**      | Validates the URL, shallow-clones into `WORKSPACE_DIR/repos/<id>`, enforces the size cap, records the default branch.                                                                                                               |
| **Scanning**     | Walks the tree, skipping `node_modules`, `.git`, `dist`, `build`, `.next`, `venv`, `target`, … plus lockfiles, minified/binary assets and anything over 1.5 MB. Detects the language of every file and builds a language histogram. |
| **Parsing**      | Extracts imports, exports and top-level functions/classes per file with language-aware patterns for JS/TS, Python, Ruby, Go, Rust, Java and Kotlin.                                                                                 |
| **Building map** | Resolves relative imports to real files and rolls them up into a **folder-level module graph** with weighted edges.                                                                                                                 |
| **Summarising**  | Asks the agent for a project summary, tech stack, run instructions, folder explanations and the key files to read first.                                                                                                            |

Every result is persisted in SQLite, so **reloads are instant** — nothing is re-analysed and no API
calls are repeated. Progress is buffered per repository, so a client that reconnects mid-analysis
still receives the whole history.

### 2. Overview tab

- **What this project does** — a short AI-written summary.
- **Tech stack** — inferred from the file/language mix.
- **How to run it** — numbered setup steps.
- **Folder structure** — a one-line description per top-level directory.
- **Key files to read first** — each with the reason it matters; click to open the source viewer.

### 3. Architecture map

An interactive module graph (`@xyflow/react`) that stays readable even on large repositories.

**How to read it**

- Each node is a **module** (a folder). The coloured stripe and dot encode the module's **top-level
  group**; the accent colour is its dominant language.
- Arrows point in the direction of the import: `A → B` means _A imports B_. Edge thickness scales
  with the number of imports crossing that boundary.
- Nodes are arranged in **dependency layers** along the chosen axis — entry points on the left/top,
  leaf modules on the right/bottom, so information flows one way.
- The badge on every node shows the file count plus `↓ imports in` / `↑ imports out`. `∅` marks a
  module that neither imports nor is imported (a script, a fixture, a dead end).

**Controls**

| Control                                          | Purpose                                                                                                    |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| **Top level / 2 levels / 3 levels / Everything** | How deeply folders are rolled up. A 373-folder repo shows as 85 nodes at `2 levels` and 13 at `Top level`. |
| **Left → right / Top → bottom**                  | Layout axis. Use `Top → bottom` for tall, reading-order review.                                            |
| **Strong links only**                            | Hides single-import edges (auto-enabled on dense graphs) to remove visual noise.                           |
| **Search**                                       | Highlights matching modules and dims everything else. Matches paths, names and languages.                  |
| **Fit / Reset**                                  | Fit the whole graph to the viewport, or clear selection and search.                                        |
| **Legend**                                       | The colour key: every top-level group with its module count. Hover a group to isolate it.                  |

**Interaction**

- **Click a module** to highlight it and its direct neighbours; unrelated nodes and edges fade out so
  the local structure reads clearly. Click the background to clear.
- The **drawer** shows the module's path, language, file count, in/out degree, what it imports, what
  imports it, and the files inside. Dependencies are clickable, so you can walk the graph.
- **Break this module down** increases the aggregation depth around that folder — drill from
  `src` into `src/components`, then `src/components/ui`.
- Drag nodes to rearrange; pan/zoom with the mouse, the minimap or the controls.

**Why it's readable**

- Nodes are laid out in topological layers with **barycentre ordering** to reduce edge crossings, and
  **every layer is centred** on the cross axis (no left-aligned staircase).
- Folders with no imports at all are **spread across layers** instead of forming one enormous column.
- The default depth is chosen automatically: the deepest level that still fits under ~120 nodes, so
  a large repo opens with structure instead of a wall of boxes.
- Node positions are unique by construction, and edges are drawn as routed steps with arrowheads.
- Highlight/dim is applied without recomputing layout, so your dragged positions survive.

**Driving it from the demo repo:** `src` and `test` are the two modules, and `test → src` (weight 2)
shows the test suite importing `src/index.js` and `src/utils.js`. For the big-repo behaviour, the
e2e test in `apps/web/e2e/map-large.spec.ts` renders a synthetic 373-folder repository and asserts
the aggregation, the unique positions and the multi-layer layout.

### 4. Ask the Repo

Streaming chat over the codebase.

- Answers arrive **token by token** with a typing cursor, rendered as markdown with
  syntax-highlighted code blocks.
- Every answer ends with **source chips** (`src/router.js:12-40`); clicking one opens that file in the
  side drawer.
- **Suggested starter questions** appear on an empty conversation: _"Where does a request enter the
  app?"_, _"How is auth handled?"_, _"What should I read first to get productive?"_,
  _"Where are the tests and what do they cover?"_.
- **History is persisted per repository** in SQLite and restored when you come back. **Clear** wipes it.
- `Enter` sends, `Shift+Enter` adds a newline.
- From the **Map**, the drawer's **Ask about this** button jumps here with the question pre-filled.

### 5. Issue matcher

Fetches open issues from GitHub (PRs excluded) and scores each one twice:

1. **Heuristic signals** — labels (`good first issue`, `documentation` lower the score;
   `enhancement`, `refactor`, `breaking change` raise it), comment count, description length, and
   whether the text names specific files (which means the scope is already clear).
2. **Agent pass** — returns `{ difficulty, difficultyScore, estMinutes, files, reason }` as strict JSON,
   validated with Zod. If the agent is unavailable the heuristic alone is used.

The list is then **re-ranked for the chosen skill level** (Beginner targets the easiest issues,
Advanced the hardest), and each card shows the difficulty badge, the estimated time, the files likely
to be touched, the labels, the age, the comment count and the reasoning.

If a repo has **no usable issues**, the tab falls back to a **manual box** where you describe the
change yourself — the guided fix works exactly the same way.

### 6. Guided fix

A four-phase wizard at `/repo/<id>/fix/<sessionId>`, streamed over SSE.

**Understand** — the issue beside the files that are in play, plus the agent's plain-language read of
the task. Working happens in a **throwaway copy** of the clone, on a branch `codecompass/fix-<n>`.

**Plan** — the agent returns a structured plan (summary, steps, files to change, risks). It is an
**editable checklist**: tick steps off, rename them, then **Approve plan & apply**. Nothing is edited
until you approve.

**Changes** — a live **activity log** (files read, files edited, commands run) beside **per-file
side-by-side diffs**, with **Accept / Reject** on each file. Rejecting a file reverts it in the working
copy. You control exactly what survives. How the edits are produced depends on the provider: `cline`
drives the Cline SDK's `read_file` / `write_file` tools, while `direct` asks the model for complete
file contents as JSON and writes them itself after validating the payload.

**Verify** — runs the project's own test suite in the sandbox (`npm test` for JS projects — installing
dependencies first if needed and if the project has any — `pytest -q` for Python, or `make test`),
with a timeout, and shows the real output. Then it generates a **draft PR title + description** with a
**copy** button and a **Download patch** button that saves a real unified diff.

**Safety rules**

- Shell commands are **allow-listed** (`npm`, `npx`, `pytest`, `node`, `python`, `make`, and
  `git diff/status/log/show/add`) and reject chaining, pipes, redirection and substitutions — so
  `npm test && rm -rf /` is blocked and unit-tested.
- File paths are confined to the workspace; secrets are redacted from logs and stored output.
- Tests run with a timeout and a bounded output buffer.
- **Never pushes, never opens a real PR.** You export a patch; you open the PR yourself.

---

## Configuration

Copy `.env.example` to `.env`. Everything has a working default — the file is only needed to switch
providers or add a token.

| Variable              | Default                     | Purpose                                                                                                 |
| --------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------- |
| `GITHUB_TOKEN`        | _(empty)_                   | Optional. Raises GitHub API rate limits for issue metadata. Cloning public repos works without it.      |
| `AGENT_PROVIDER`      | `mock`                      | `mock` \| `cline` \| `direct` — see [Agent providers](#agent-providers).                                |
| `CLINE_PROVIDER_ID`   | `anthropic`                 | Provider id passed to the Cline SDK (`anthropic`, `openai`, `openai-compatible`, …).                    |
| `CLINE_MODEL_ID`      | `claude-sonnet-4-6`         | Model id passed to the Cline SDK.                                                                       |
| `LLM_API_KEY`         | _(empty)_                   | API key for `cline` (the provider's key) and for `direct`.                                              |
| `LLM_BASE_URL`        | `https://api.openai.com/v1` | OpenAI-compatible base URL used by `direct`.                                                            |
| `LLM_MODEL`           | `gpt-4o-mini`               | Model used by `direct`.                                                                                 |
| `LLM_TIMEOUT_MS`      | `60000`                     | Give up on a provider request after this long. Sandboxed agent edits use a longer timeout of their own. |
| `PORT`                | `4000`                      | API port.                                                                                               |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000`     | Base URL the web app uses to reach the API.                                                             |
| `WORKSPACE_DIR`       | `./workspace`               | Where shallow clones and fix-session copies live.                                                       |
| `DATA_DIR`            | `./data`                    | Where the SQLite database lives.                                                                        |
| `MAX_REPO_MB`         | `100`                       | Repositories larger than this are rejected after cloning.                                               |
| `MAX_FILES`           | `4000`                      | Scan cap.                                                                                               |
| `TEST_TIMEOUT_MS`     | `120000`                    | Timeout for test runs and sandboxed commands.                                                           |
| `MOCK_SEED`           | `codecompass`               | Seed for deterministic mock output.                                                                     |

---

## Agent providers

The whole app talks to one interface, so no feature code knows which provider is active:

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

| Provider           | Class                   | What it does                                                                                                                                                                                                                                  | Keys? |
| ------------------ | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `mock` _(default)_ | `MockAgentService`      | Deterministic, repo-aware output derived from the real file list. Every feature works; the change it applies is deliberately inert (an explanatory comment) so the demo's test run still passes.                                              | No    |
| `cline`            | `ClineAgentService`     | The real **Cline SDK** (`@cline/sdk`). Uses `Agent` for streaming completions and `createTool` to expose sandboxed `read_file` / `write_file` / `run_command` tools, then captures the resulting diffs with git.                              | Yes   |
| `direct`           | `DirectLLMAgentService` | A plain OpenAI-compatible chat-completions call with its own SSE parsing and JSON extraction. **Applies real edits** by asking the model for full file contents as JSON, validating it against a strict schema, and writing the files itself. | Yes   |

Wiring up the real Cline SDK:

```ini
AGENT_PROVIDER=cline
CLINE_PROVIDER_ID=anthropic
CLINE_MODEL_ID=claude-sonnet-4-6
LLM_API_KEY=sk-ant-...
```

The SDK path is imported lazily, so choosing `mock` never loads it.

`direct` applies edits **without** needing tool-calling support: it sends the model the full
contents of the files the plan wants to touch and asks for a JSON payload of complete file
contents, which the API then validates and writes. That means any plain chat model works —
including OpenAI-compatible endpoints such as NVIDIA, and reasoning models that never emit tool
calls. Writes are guarded: paths must stay inside the repository, existing files are never blanked,
no-op writes are skipped, and both the file count and total size are capped.

---

## How it works internally

```
 ┌──────────────┐   POST /api/repos        ┌───────────────────────────────────────────┐
 │   Next.js    │ ───────────────────────▶ │  Express API                              │
 │  (App Router)│                          │                                           │
 │              │ ◀── SSE /api/repos/:id/status ──  clone → scan → parse → graph ─────┐ │
 │  React Flow  │                          │            → summarise                 │ │
 │  chat, diffs │ ◀── SSE /api/repos/:id/chat ─────  streamed answer + source chips │ │
 │              │                          │                                        │ │
 │              │ ◀── SSE /api/fix/:id/stream ─────  plan + edit activity           │ │
 └──────────────┘                          │                                           │
                                           │  ┌─────────────┐   ┌───────────────────┐  │
                                           │  │  SQLite     │   │  WORKSPACE_DIR    │  │
                                           │  │ repos/files │   │  repos/<id>       │  │
                                           │  │ graph/chat  │   │  fixes/<sessionId>│  │
                                           │  │ issues/fix  │   │  (throwaway copy) │  │
                                           │  └─────────────┘   └───────────────────┘  │
                                           └───────────────────────────────────────────┘
                                                        ▲
                                                        │  AgentService (mock | cline | direct)
```

- **Streaming** uses Server-Sent Events. The API keeps a small in-memory history per channel, so a
  client that reconnects mid-analysis or mid-fix catches up automatically. Keep-alive pings stop
  proxies from closing idle streams.
- **Everything is validated with Zod** and the schemas live in `packages/shared`, so the web app and
  the API cannot drift. The same package infers the TypeScript types used on both sides.
- **All analysis output is cached in SQLite**, so the dashboard, map, issues and chat history load
  without touching the network again.
- **SQLite** uses `better-sqlite3` when it is available and transparently falls back to Node's
  built-in `node:sqlite`, behind one tiny adapter.
- **The map is aggregated client-side**, so changing depth is instant and needs no re-analysis.
- **Parsing is intentionally dependency-free** (language-aware patterns rather than a native
  tree-sitter build), which keeps installs fast and portable.

### Graceful degradation

The agent is treated as an **optional** dependency, because everything expensive (clone, scan,
parse, graph, diffs, tests) is local:

- If **summarising** fails or times out, the repository still becomes `ready` and a deterministic
  summary is generated locally from the real file list — so the map, chat, issues and the guided fix
  all stay usable instead of the whole repo being marked failed.
- If **issue scoring** fails once, the agent is dropped for the rest of that batch and the heuristic
  score is used, rather than paying one timeout per issue.
- The **dashboard renders as soon as the repo is ready**; the graph and the issue list fill in
  afterwards instead of blocking the first paint.
- Every provider call carries a timeout (`LLM_TIMEOUT_MS`), and failures are reported with their
  underlying cause — `LLM request failed: fetch failed (cause: ENOTFOUND)` rather than a bare
  `fetch failed`.

### Data model

| Table                         | Holds                                                                      |
| ----------------------------- | -------------------------------------------------------------------------- |
| `repos`                       | URL, owner/name, default branch, status, summary JSON, stats JSON          |
| `files`                       | Every scanned file with language and size                                  |
| `graph_nodes` / `graph_edges` | The module graph (edges are weighted by import count)                      |
| `chat_messages`               | Per-repo chat history with source references                               |
| `issues`                      | Open issues with difficulty, estimated minutes, likely files and reasoning |
| `fix_sessions`                | One guided fix (status, plan, patch, test output, PR draft)                |
| `file_changes`                | Per-file diffs and the accept/reject decision                              |

---

## Project structure

```
codecompass/
├── apps/
│   ├── web/                        # Next.js 14 (App Router)
│   │   ├── app/
│   │   │   ├── page.tsx                     # landing
│   │   │   ├── repo/[id]/loading/page.tsx   # SSE analysis stepper
│   │   │   ├── repo/[id]/page.tsx           # dashboard (4 tabs)
│   │   │   └── repo/[id]/fix/[sessionId]/   # guided fix wizard
│   │   ├── components/
│   │   │   ├── ui/                          # Button, Card, Badge, Tabs, Sheet, Stepper,
│   │   │   │                                # CodeBlock, DiffViewer, Skeleton, …
│   │   │   ├── landing/                     # hero, URL form, how-it-works, preview
│   │   │   ├── repo/                        # overview, map (+model/layout/toolbar/legend/drawer),
│   │   │   │                                # ask (chat), issues, code viewer, sidebar
│   │   │   └── fix/                         # wizard, plan editor, activity log, diffs, verify
│   │   ├── lib/                             # api client, graph model, layout, utils
│   │   ├── e2e/                             # Playwright smoke + large-map tests
│   │   └── styles/globals.css               # design tokens (dark + light)
│   └── api/                        # Express + TypeScript (ESM, tsx)
│       ├── src/
│       │   ├── routes/                      # repos, chat, fix (REST + SSE)
│       │   ├── services/                    # analysis, issues, fix, test runner, event bus, difficulty
│       │   ├── agent/                       # AgentService + mock/cline/direct + tools + prompts
│       │   ├── analysis/                    # clone, scan, parse, graph
│       │   ├── db/                          # schema, adapter, stores, mappers
│       │   └── utils/                       # env, paths, logger, sse, url, file matching
│       └── fixtures/demo-repo/              # bundled offline demo project (has its own tests)
├── packages/shared/                # Zod schemas + shared types
├── docs/DEMO.md                    # 3-minute demo script
└── .env.example
```

---

## Scripts

| Command             | What it does                                                              |
| ------------------- | ------------------------------------------------------------------------- |
| `npm run dev`       | Run the API and the web app together (recommended)                        |
| `npm run dev:api`   | API only, on `:4000`                                                      |
| `npm run dev:web`   | Web only, on `:3000`                                                      |
| `npm run typecheck` | TypeScript over both apps                                                 |
| `npm test`          | Vitest unit tests (parsing, graph, scoring, agent, command safety, diffs) |
| `npm run test:e2e`  | Playwright smoke test + large-map test                                    |
| `npm run lint`      | ESLint (flat config)                                                      |
| `npm run format`    | Prettier                                                                  |
| `npm run build`     | Bundle the API with esbuild, build the web app                            |

---

## API reference

All routes are mounted under `/api`. Every response body that has a schema is defined in
`packages/shared`.

### Repositories

| Method   | Route                                  | Description                                                                                       |
| -------- | -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `POST`   | `/api/repos`                           | Body `{ url }` → `{ id }`. Validates the URL and starts analysis in the background.               |
| `GET`    | `/api/repos/:id`                       | `{ repo }` — summary, stats, language breakdown, status.                                          |
| `GET`    | `/api/repos/:id/status`                | **SSE** — analysis progress: `step`, `log`, `error`, `done`.                                      |
| `GET`    | `/api/repos/:id/graph`                 | `{ graph: { nodes, edges } }` — the module graph (raw, folder-level).                             |
| `GET`    | `/api/repos/:id/files`                 | `{ tree }`, or with `?path=src/index.js` → `{ file, content, truncated, language }` (200 KB cap). |
| `GET`    | `/api/repos/:id/issues?skill=beginner` | `{ issues, source }` — issues ranked for the skill level.                                         |
| `POST`   | `/api/repos/:id/issues/refresh`        | Force a re-fetch and re-score from GitHub.                                                        |
| `GET`    | `/api/repos/:id/chat`                  | `{ messages }` — persisted chat history.                                                          |
| `DELETE` | `/api/repos/:id/chat`                  | Clear chat history (`204`).                                                                       |
| `POST`   | `/api/repos/:id/chat`                  | **SSE** — body `{ question, history }`; streams `start`, `token`, `sources`, `end`.               |
| `POST`   | `/api/repos/:id/fix`                   | Body `{ issue }` → `{ session }`. Creates the sandbox and starts planning.                        |

### Guided fix

| Method | Route                                        | Description                                                                                          |
| ------ | -------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `GET`  | `/api/fix/:sessionId`                        | `{ session }` — status, plan, file changes, test output, patch, PR draft.                            |
| `GET`  | `/api/fix/:sessionId/stream`                 | **SSE** — `status`, `understand`, `plan`, `activity`, `file_change`, `test_result`, `error`, `done`. |
| `POST` | `/api/fix/:sessionId/plan`                   | Re-run planning (`202`).                                                                             |
| `POST` | `/api/fix/:sessionId/approve`                | Body `{ plan? }` — apply the (edited) plan.                                                          |
| `POST` | `/api/fix/:sessionId/files/:fileId/decision` | Body `{ decision: "accepted" \| "rejected" }`. Rejecting reverts the file.                           |
| `POST` | `/api/fix/:sessionId/test`                   | Run the repo's tests in the sandbox → `{ session, result }`.                                         |
| `GET`  | `/api/fix/:sessionId/patch`                  | `{ patch, pr }` — the unified diff plus the draft PR.                                                |
| `GET`  | `/api/health`                                | `{ ok, provider }`.                                                                                  |

Example:

```bash
# 1. start an analysis (the bundled demo repo needs no network)
REPO=$(curl -s -X POST localhost:4000/api/repos \
  -H 'Content-Type: application/json' \
  -d '{"url":"codecompass/demo-repo"}' | jq -r .id)

# 2. watch it finish
curl -sN localhost:4000/api/repos/$REPO/status

# 3. read the results
curl -s localhost:4000/api/repos/$REPO | jq .repo.summary
curl -s "localhost:4000/api/repos/$REPO/issues?skill=beginner" | jq '.issues[] | {number,title,difficulty}'
```

---

## Testing

```bash
npm test            # 18 Vitest unit tests
npm run test:e2e    # 2 Playwright tests (starts the dev servers if needed)
```

**Unit tests** (`apps/api/src/**/*.test.ts`) cover the parts where correctness matters and bugs are
hard to spot by eye:

- `analysis.test.ts` — language detection, import/symbol/export extraction for TS and Python, scan
  ignore rules (`node_modules`, binaries, lockfiles), and graph construction with weighted edges.
- `difficulty.test.ts` — the issue-scoring heuristic: label effects, boundedness, and that naming
  specific files lowers the score.
- `agent.test.ts` — mock summarisation and planning, issue scoring shape, the **shell allow-list**
  (`npm test` allowed; `rm -rf /`, `git push`, `npm test && rm -rf /`, pipes and redirects blocked),
  unified-diff splitting, and tolerant JSON extraction from model output.

**E2E tests** (`apps/web/e2e/`):

- `smoke.spec.ts` — landing page → the offline demo repo → analysis → dashboard → Overview → Map →
  click a module → drawer opens and closes, asserting no uncaught page errors.
- `map-large.spec.ts` — serves a synthetic **373-folder** repository and asserts the map aggregates it
  below 120 nodes, that **every node has a unique position** (no stacking), and that the layout spans
  multiple columns _and_ rows.

---

## Troubleshooting

| Symptom                                        | Cause / fix                                                                                                                                                                                                |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stuck on "Cloning"                             | Large repo on a slow connection. Use the offline demo chip, or a small repo (`sindresorhus/slugify`).                                                                                                      |
| `Repository is NMB which exceeds the limit`    | Raise `MAX_REPO_MB` in `.env`.                                                                                                                                                                             |
| Issues tab is empty                            | No usable open issues, or GitHub rate-limited. Add `GITHUB_TOKEN`, or use the manual input box.                                                                                                            |
| Verify step fails                              | The repo's own tests failed (often because dependencies are missing). The real output is still shown; the patch and draft PR are still generated.                                                          |
| `AGENT_PROVIDER=cline requires LLM_API_KEY`    | Set `LLM_API_KEY` (and usually `CLINE_PROVIDER_ID` / `CLINE_MODEL_ID`) in `.env`.                                                                                                                          |
| Analysis ends with `fetch failed`              | The agent's HTTP call never completed. The real reason (e.g. `ENOTFOUND`, `HeadersTimeoutError`) is now appended to the message — usually the model id is wrong, not serving, or not enabled for your key. |
| Provider returns `404 … Not found for account` | `/v1/models` is a **global catalogue**; your account must have the model provisioned. Pick a model your key actually serves.                                                                               |
| A provider request hangs with zero bytes       | That model isn't answering on the provider's side — switch model id.                                                                                                                                       |
| Model returns empty text                       | Reasoning models sometimes leave `message.content` empty; the client falls back to `reasoning_content`. If still empty, raise the token budget or pick a non-reasoning model.                              |
| Port already in use                            | `PORT=4001` and `NEXT_PUBLIC_API_URL=http://localhost:4001`.                                                                                                                                               |
| Map looks dense                                | Lower the depth (`Top level`), enable **Strong links only**, or use search / click a module to isolate its neighbourhood.                                                                                  |
| Want a clean slate                             | `rm -rf apps/api/data apps/api/workspace` and restart.                                                                                                                                                     |

---

## What's real vs. mocked

**Real:** URL validation, shallow cloning with size/count limits, file scanning and language
detection, static analysis, module-graph construction, SQLite persistence for everything, GitHub
issue fetching, difficulty scoring, SSE streaming for analysis/chat/fix, unified diffs, per-file
accept/reject with revert, sandboxed test execution, patch and draft-PR generation, chat history.

**Mocked by default:** the agent's _reasoning_ (`AGENT_PROVIDER=mock`) so the demo needs no keys. The
`cline` and `direct` providers are implemented against the real APIs but need a key to run.

**Known limitations**

- The mock provider's edit is an **intentionally inert comment** — a real change needs `cline` or `direct`.
- `direct` rewrites whole files from a JSON payload, so it is bounded by the file-size and file-count caps (5 files, 8 KB each); larger files are skipped with a note rather than risked.
- Parsing is pattern-based, not a full AST, so exotic import syntax can be missed.
- `reject all files` still produces a patch from the remaining change set rather than an empty diff.
- Only `github.com` URLs are accepted.
- Analysis runs in-process (no job queue), so one API instance handles one big clone at a time.

**Roadmap:** wildcard/alias-aware import resolution, tree-sitter parsing behind a flag, multi-repo
workspaces, and an optional _"open the PR for me"_ action that stays behind an explicit toggle.

---

## License

Built as a hackathon project. Add your own license before distributing.
