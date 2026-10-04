import { Router } from "express";
import { reposRouter } from "./repos";
import { chatRouter } from "./chat";
import { fixRouter } from "./fix";

/**
 * Mounts every feature router. This is the single place where the API surface
 * is composed.
 */
export function createRouter(): Router {
  const router = Router();

  router.get("/health", (_req, res) => res.json({ ok: true }));

  router.use(reposRouter());
  router.use(chatRouter());
  router.use(fixRouter());

  return router;
}
