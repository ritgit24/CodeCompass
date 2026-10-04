import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";
import { z } from "zod";

// Load `.env` from the workspace package dir and the repo root (root wins).
for (const candidate of [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../../.env"),
]) {
  if (fs.existsSync(candidate)) dotenv.config({ path: candidate });
}

const EnvSchema = z.object({
  GITHUB_TOKEN: z.string().optional(),
  AGENT_PROVIDER: z.enum(["mock", "cline", "direct"]).default("mock"),
  CLINE_PROVIDER_ID: z.string().default("anthropic"),
  CLINE_MODEL_ID: z.string().default("claude-sonnet-4-6"),
  LLM_API_KEY: z.string().optional(),
  LLM_BASE_URL: z.string().default("https://api.openai.com/v1"),
  LLM_MODEL: z.string().default("gpt-4o-mini"),
  LLM_TIMEOUT_MS: z.coerce.number().default(60_000),
  PORT: z.coerce.number().default(4000),
  WORKSPACE_DIR: z.string().default("./workspace"),
  DATA_DIR: z.string().default("./data"),
  MAX_REPO_MB: z.coerce.number().default(100),
  MAX_FILES: z.coerce.number().default(4000),
  TEST_TIMEOUT_MS: z.coerce.number().default(120_000),
  MOCK_SEED: z.string().default("codecompass"),
});

const parsed = EnvSchema.parse(process.env);
const emptyToUndefined = (v?: string) => (v && v.trim() ? v : undefined);

export const env = {
  githubToken: emptyToUndefined(parsed.GITHUB_TOKEN),
  agentProvider: parsed.AGENT_PROVIDER,
  clineProviderId: parsed.CLINE_PROVIDER_ID,
  clineModelId: parsed.CLINE_MODEL_ID,
  llmApiKey: emptyToUndefined(parsed.LLM_API_KEY),
  llmBaseUrl: parsed.LLM_BASE_URL,
  llmModel: parsed.LLM_MODEL,
  llmTimeoutMs: parsed.LLM_TIMEOUT_MS,
  port: parsed.PORT,
  workspaceDir: path.resolve(process.cwd(), parsed.WORKSPACE_DIR),
  dataDir: path.resolve(process.cwd(), parsed.DATA_DIR),
  maxRepoMb: parsed.MAX_REPO_MB,
  maxFiles: parsed.MAX_FILES,
  testTimeoutMs: parsed.TEST_TIMEOUT_MS,
  mockSeed: parsed.MOCK_SEED,
};

export type Env = typeof env;
