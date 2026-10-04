import { env } from "../utils/env";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface RequestOptions {
  /** Upper bound on generated tokens (sent as `max_tokens` when provided). */
  maxTokens?: number;
  /** Abort the request after this many ms. */
  timeoutMs?: number;
  /** Caller-provided abort signal (e.g. client disconnected). */
  signal?: AbortSignal;
}

export const DEFAULT_TIMEOUT_MS = env.llmTimeoutMs;

/**
 * Turn Node's opaque "fetch failed" into something diagnosable by surfacing the
 * underlying `err.cause` (ENOTFOUND, ECONNREFUSED, HeadersTimeoutError, …).
 */
export function describeError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const cause = (err as { cause?: unknown }).cause;
  let causeText = "";
  if (cause) {
    causeText =
      typeof cause === "object"
        ? ((cause as { code?: string }).code ??
          (cause as Error).message ??
          (cause as Error).name ??
          String(cause))
        : String(cause);
  }
  return causeText ? `${err.message} (cause: ${causeText})` : err.message;
}

function withTimeout(timeoutMs: number, external?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  if (!external) return timeout;
  return typeof AbortSignal.any === "function" ? AbortSignal.any([external, timeout]) : timeout;
}

/** Minimal OpenAI-compatible chat client used by the `direct` provider. */
export class LLMClient {
  constructor(
    private readonly baseUrl = env.llmBaseUrl,
    private readonly apiKey = env.llmApiKey ?? "",
    private readonly model = env.llmModel,
  ) {}

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
    };
  }

  private async request(body: unknown, options: RequestOptions = {}): Promise<Response> {
    const url = `${this.baseUrl.replace(/\/$/, "")}/chat/completions`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(body),
        signal: withTimeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, options.signal),
      });
    } catch (err) {
      throw new Error(`LLM request failed: ${describeError(err)}`);
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `LLM request failed (HTTP ${res.status})${detail ? `: ${detail.slice(0, 300)}` : ""}`,
      );
    }
    return res;
  }

  /** Stream plain text deltas from a chat completion. */
  async *stream(messages: ChatMessage[], options: RequestOptions = {}): AsyncGenerator<string> {
    const res = await this.request(
      {
        model: this.model,
        messages,
        stream: true,
        ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
      },
      options,
    );
    if (!res.body) throw new Error("LLM response had no body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta) yield delta;
        } catch {
          /* ignore malformed frame */
        }
      }
    }
  }

  async complete(messages: ChatMessage[], options: RequestOptions = {}): Promise<string> {
    const res = await this.request(
      {
        model: this.model,
        messages,
        stream: false,
        ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
      },
      options,
    );
    const json: any = await res.json();
    const message = json.choices?.[0]?.message ?? {};
    if (typeof message.content === "string" && message.content.trim()) return message.content;
    // Reasoning models sometimes leave `content` empty and put everything in
    // `reasoning_content`; better to return something parseable than nothing.
    if (typeof message.reasoning_content === "string" && message.reasoning_content.trim()) {
      return message.reasoning_content;
    }
    return "";
  }
}
