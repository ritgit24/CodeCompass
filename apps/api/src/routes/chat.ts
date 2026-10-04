import { Router } from "express";
import { nanoid } from "nanoid";
import type { SourceRef } from "@codecompass/shared";
import { ChatRequestSchema } from "@codecompass/shared";
import { getAgentService } from "../agent";
import { addChatMessage, clearChat } from "../db/chatIssueStore";
import { getRepoDetail } from "../services/repoService";
import { getCachedFiles } from "../services/analysisService";
import { matchPaths } from "../utils/fileMatch";
import { paths } from "../utils/paths";
import { closeSse, openSse, sendSse } from "../utils/sse";

export function chatRouter(): Router {
  const router = Router();

  router.delete("/repos/:id/chat", (req, res) => {
    clearChat(req.params.id);
    res.status(204).end();
  });

  // Ask the repo a question (streamed over SSE)
  router.post("/repos/:id/chat", async (req, res) => {
    const repo = getRepoDetail(req.params.id);
    if (!repo) return res.status(404).json({ error: "Repo not found" });
    const body = ChatRequestSchema.parse(req.body);

    openSse(res);
    addChatMessage({ repoId: repo.id, role: "user", content: body.question });
    const messageId = nanoid(12);
    sendSse(res, { type: "start", messageId });

    const files = getCachedFiles(repo.id).map((f) => f.path);
    const context = body.context?.length ? body.context : files;
    let full = "";
    let sources: SourceRef[] = [];

    try {
      const agent = await getAgentService();
      for await (const event of agent.explain({
        repoPath: paths.repoDir(repo.id),
        question: body.question,
        context,
        history: body.history,
      })) {
        if (event.type === "text_delta") {
          full += event.text;
          sendSse(res, { type: "token", text: event.text });
        } else if (event.type === "sources") {
          sources = event.sources;
          sendSse(res, { type: "sources", sources: event.sources });
        } else if (event.type === "error") {
          sendSse(res, { type: "error", message: event.message });
        } else if (event.type === "done" && event.text) {
          full = event.text;
        }
      }
    } catch (err) {
      sendSse(res, { type: "error", message: err instanceof Error ? err.message : String(err) });
    }

    if (!sources.length) {
      sources = matchPaths(body.question, files, 3).map((p) => ({ path: p }));
      if (sources.length) sendSse(res, { type: "sources", sources });
    }

    addChatMessage({ repoId: repo.id, role: "assistant", content: full, sources });
    sendSse(res, { type: "end", messageId, content: full });
    closeSse(res);
  });

  return router;
}
