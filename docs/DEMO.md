# CodeCompass — 3-minute demo script

**Goal:** show URL → map → question → issue → plan → diff → tests → patch, keyless, offline.

## Before you start

```bash
npm install
npm run dev          # API on :4000, web on :3000
```

Keep `AGENT_PROVIDER=mock` (the default). No `.env` is required. Everything below works offline.

---

## The script

**0:00 — Landing (~20s)**
Open http://localhost:3000.

> "Paste a GitHub URL and you get an onboarding guide plus your first PR."

Point at the hero, the four-step strip, then click the **`offline` demo repo** chip
(`codecompass/demo-repo`).

**0:20 — Analysis (~20s)**
The SSE stepper ticks through Cloning → Scanning → Parsing → Building map → Summarising, with a
live log and a progress bar. It auto-advances to the dashboard.

> "Real pipeline: shallow clone, language detection, static analysis, module graph, summary."

**0:40 — Overview (~20s)**
Read the AI summary, point at the **language bar** and the stats (files / size / modules / edges),
then click a **Key file** to open the code viewer.

> "The first thing a newcomer needs: what this is, how to run it, and what to read first."

**1:00 — Map (~25s)**
Switch to the **Map** tab. Point out that it opens at an automatically chosen depth (a big repo gets
rolled up so it stays readable): **Top level / 2 levels / 3 levels / Everything**.
Pan/zoom, use the minimap, toggle **Top → bottom**, and type in **Search** to isolate a module.
**Click a node** — its neighbours stay bright and everything else fades, so the local structure pops.
Open the drawer → dependency lists + **Files inside** → **Break this module down** to drill deeper →
**Ask about this**.

> "Modules sit in dependency layers — entry points left, leaves right — with arrows for import
> direction, thickness for import count, and colours per top-level group."

**1:25 — Ask the Repo (~25s)**
The question lands in the chat and the answer **streams in**, followed by **source chips**.
Click a chip to open the file.

> "Every answer cites the exact files it used — no hallucinated paths."

**1:50 — Issues (~20s)**
Switch to **Issues**. Toggle **Beginner → Advanced** and watch the list re-rank.
Point at the difficulty badge, the time estimate, and _why_ it was scored that way.

> "Heuristic signals plus an LLM pass, so beginners start where they'll succeed."

**2:10 — Guided fix (~40s)**
Click **Start guided fix** on the easy URL-decoding issue.

- **Understand:** the issue beside the files in play.
- **Plan:** the agent's steps. Tick one off, rename another — _you_ own the plan. **Approve & apply.**
- **Changes:** the activity log (files read, edited, commands) then **side-by-side diffs** with
  **Accept / Reject** per file. Reject one to show it reverts.
- **Verify:** **Run tests** → real output (`node:test`, 8 passing). Show the **draft PR** and hit
  **Download patch**.

> "Plan first, diff second, apply last. Nothing is pushed to GitHub."

**2:50 — Close (~10s)**

> "Swap `AGENT_PROVIDER` to `cline` and the same flow runs on the real Cline SDK with a key. The
> mock just makes the demo deterministic and offline."

---

## If something goes wrong

| Symptom                                     | Fix                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| Stuck on "Cloning" for a big repo           | Use the offline demo chip, or a small repo (`sindresorhus/slugify`).      |
| "Repository is NMB which exceeds the limit" | Raise `MAX_REPO_MB` in `.env`.                                            |
| Issues tab is empty                         | No usable open issues / GitHub rate limit — use the **manual paste** box. |
| Tests fail on Verify                        | Expected for repos needing dependencies; the real output is still shown.  |
| Port already in use                         | `PORT=4001` for the API and set `NEXT_PUBLIC_API_URL` accordingly.        |
