import { Router } from "express";
import { FileDecisionSchema } from "@codecompass/shared";
import {
  approveAndApply,
  decideChange,
  finalize,
  runSessionTests,
  startPlan,
} from "../services/fixService";
import { getFixSession } from "../db/fixStore";
import { bus, fixChannel } from "../services/eventBus";
import { openSse, sendSse } from "../utils/sse";

export function fixRouter(): Router {
  const router = Router();

  router.get("/fix/:sessionId", (req, res) => {
    const session = getFixSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json({ session });
  });

  // Live activity stream (planning + edits)
  router.get("/fix/:sessionId/stream", (req, res) => {
    const session = getFixSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });
    openSse(res);

    for (const event of bus.history(fixChannel(session.id))) sendSse(res, event);

    const unsubscribe = bus.subscribe(fixChannel(session.id), (event) => sendSse(res, event));
    const keepAlive = setInterval(() => res.write(": ping\n\n"), 15_000);
    req.on("close", () => {
      clearInterval(keepAlive);
      unsubscribe();
    });
  });

  // Re-plan (used if the user wants to regenerate the plan)
  router.post("/fix/:sessionId/plan", async (req, res, next) => {
    try {
      if (!getFixSession(req.params.sessionId)) {
        return res.status(404).json({ error: "Session not found" });
      }
      void startPlan(req.params.sessionId);
      res.status(202).json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // Approve the (possibly edited) plan and apply the changes
  router.post("/fix/:sessionId/approve", async (req, res, next) => {
    try {
      const plan = req.body?.plan;
      const session = await approveAndApply(req.params.sessionId, plan);
      res.json({ session });
    } catch (err) {
      next(err);
    }
  });

  // Per-file accept / reject
  router.post("/fix/:sessionId/files/:fileId/decision", (req, res, next) => {
    try {
      const { decision } = FileDecisionSchema.parse(req.body);
      const session = decideChange(req.params.sessionId, req.params.fileId, decision);
      res.json({ session });
    } catch (err) {
      next(err);
    }
  });

  // Run the repo's tests in the sandbox
  router.post("/fix/:sessionId/test", async (req, res, next) => {
    try {
      const { session, result } = await runSessionTests(req.params.sessionId);
      res.json({ session, result });
    } catch (err) {
      next(err);
    }
  });

  // Final patch + draft PR
  router.get("/fix/:sessionId/patch", async (req, res, next) => {
    try {
      const { patch, pr } = await finalize(req.params.sessionId);
      res.json({ patch, pr });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
