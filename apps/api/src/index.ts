import express from "express";
import type { NextFunction, Request, Response } from "express";
import cors from "cors";
import { ZodError } from "zod";
import { env } from "./utils/env";
import { ensureDirs } from "./utils/paths";
import { getDb } from "./db";
import { createRouter } from "./routes";
import { logger } from "./utils/logger";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "4mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, provider: env.agentProvider });
  });

  app.use("/api", createRouter());

  app.use((_req, res) => res.status(404).json({ error: "Not found" }));

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: "Validation failed", issues: err.issues });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    logger.error("request failed", err);
    return res.status(500).json({ error: message });
  });

  return app;
}

async function main() {
  ensureDirs();
  getDb();
  const app = createApp();
  app.listen(env.port, () => {
    logger.info(`API listening on http://localhost:${env.port} (provider=${env.agentProvider})`);
  });
}

main().catch((err) => {
  logger.error("fatal startup error", err);
  process.exit(1);
});
