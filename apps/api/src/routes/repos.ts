import { Router } from "express";
import { CreateRepoSchema, CreateFixSchema } from "@codecompass/shared";
import { z } from "zod";
import {
  buildTree,
  createRepoFromUrl,
  getRepoDetail,
  readFileContent,
} from "../services/repoService";
import { bus, repoChannel } from "../services/eventBus";
import { getStoredIssues, loadIssues, rankForSkill } from "../services/issueService";
import { createSession, startPlan } from "../services/fixService";
import { getGraph } from "../db/repoStore";
import { listChat } from "../db/chatIssueStore";
import { closeSse, openSse, sendSse } from "../utils/sse";
import { logger } from "../utils/logger";

export function reposRouter(): Router {
  const router = Router();

  // Create + start analysis
  router.post("/repos", (req, res) => {
    const { url } = CreateRepoSchema.parse(req.body);
    const repo = createRepoFromUrl(url);
    res.status(201).json({ id: repo.id });
  });

  // Repo detail
  router.get("/repos/:id", (req, res) => {
    const repo = getRepoDetail(req.params.id);
    if (!repo) return res.status(404).json({ error: "Repo not found" });
    res.json({ repo });
  });

  // Analysis progress (SSE)
  router.get("/repos/:id/status", (req, res) => {
    const repo = getRepoDetail(req.params.id);
    if (!repo) return res.status(404).json({ error: "Repo not found" });
    openSse(res);

    for (const event of bus.history(repoChannel(repo.id))) sendSse(res, event);
    if (repo.status === "ready") {
      sendSse(res, { type: "done", repoId: repo.id });
      return closeSse(res);
    }
    if (repo.status === "error") {
      sendSse(res, { type: "error", message: repo.error ?? "Analysis failed" });
      return closeSse(res);
    }

    const unsubscribe = bus.subscribe(repoChannel(repo.id), (event) => {
      sendSse(res, event);
      if (
        (event as { type?: string }).type === "done" ||
        (event as { type?: string }).type === "error"
      ) {
        unsubscribe();
        closeSse(res);
      }
    });

    const keepAlive = setInterval(() => res.write(": ping\n\n"), 15_000);
    req.on("close", () => {
      clearInterval(keepAlive);
      unsubscribe();
    });
  });

  // Architecture graph
  router.get("/repos/:id/graph", (req, res) => {
    res.json({ graph: getGraph(req.params.id) });
  });

  // File tree or file content
  router.get("/repos/:id/files", (req, res) => {
    const relPath = typeof req.query.path === "string" ? req.query.path : undefined;
    if (!relPath) return res.json({ tree: buildTree(req.params.id) });
    try {
      const { file, content, truncated, language } = readFileContent(req.params.id, relPath);
      res.json({ tree: [], file, content, truncated, language });
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  // Chat history
  router.get("/repos/:id/chat", (req, res) => {
    res.json({ messages: listChat(req.params.id) });
  });

  // Issues ranked by difficulty for a skill level
  router.get("/repos/:id/issues", async (req, res, next) => {
    try {
      const skill = z
        .enum(["beginner", "intermediate", "advanced"])
        .default("beginner")
        .parse(req.query.skill);
      const repo = getRepoDetail(req.params.id);
      if (!repo) return res.status(404).json({ error: "Repo not found" });

      let issues = getStoredIssues(repo.id);
      let source: "github" | "none" = issues.length ? "github" : "none";
      if (!issues.length) {
        issues = await loadIssues(repo);
        source = issues.length ? "github" : "none";
      }
      res.json({ issues: rankForSkill(issues, skill), source });
    } catch (err) {
      next(err);
    }
  });

  // Force refresh of issues from GitHub
  router.post("/repos/:id/issues/refresh", async (req, res, next) => {
    try {
      const repo = getRepoDetail(req.params.id);
      if (!repo) return res.status(404).json({ error: "Repo not found" });
      const issues = await loadIssues(repo);
      res.json({ issues, source: issues.length ? "github" : "none" });
    } catch (err) {
      next(err);
    }
  });

  // Start a guided fix session
  router.post("/repos/:id/fix", async (req, res, next) => {
    try {
      const repo = getRepoDetail(req.params.id);
      if (!repo) return res.status(404).json({ error: "Repo not found" });
      const { issue } = CreateFixSchema.parse(req.body);
      const session = await createSession(repo.id, {
        number: issue.number ?? null,
        title: issue.title,
        body: issue.body,
      });
      void startPlan(session.id).catch((err) =>
        logger.error("fix planning crashed", (err as Error).message),
      );
      res.status(201).json({ session });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
