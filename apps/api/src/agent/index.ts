import { env } from "../utils/env";
import type { AgentService } from "./AgentService";
import { MockAgentService } from "./MockAgentService";

let cached: AgentService | null = null;

/**
 * Resolve the configured agent. The Cline SDK / direct providers are imported
 * lazily so the default (mock) path never loads heavy dependencies or needs keys.
 */
export async function getAgentService(): Promise<AgentService> {
  if (cached) return cached;
  cached = await resolveAgent();
  return cached;
}

async function resolveAgent(): Promise<AgentService> {
  switch (env.agentProvider) {
    case "cline": {
      if (!env.llmApiKey) {
        throw new Error("AGENT_PROVIDER=cline requires LLM_API_KEY (see .env.example)");
      }
      const { ClineAgentService } = await import("./ClineAgentService");
      return new ClineAgentService();
    }
    case "direct": {
      if (!env.llmApiKey) {
        throw new Error("AGENT_PROVIDER=direct requires LLM_API_KEY (see .env.example)");
      }
      const { DirectLLMAgentService } = await import("./DirectLLMAgentService");
      return new DirectLLMAgentService();
    }
    default:
      return new MockAgentService();
  }
}

export type { AgentService } from "./AgentService";
