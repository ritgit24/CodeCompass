import { env } from "../utils/env";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
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

  /** Stream plain text deltas from a chat completion. */
  async *stream(messages: ChatMessage[], signal?: AbortSignal): AsyncGenerator<string> {
    const res = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ model: this.model, messages, stream: true }),
      signal,
    });
    if (!res.ok || !res.body) {
      throw new Error(`LLM request failed (${res.status})`);
    }
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

  async complete(messages: ChatMessage[], signal?: AbortSignal): Promise<string> {
    const res = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ model: this.model, messages, stream: false }),
      signal,
    });
    if (!res.ok) throw new Error(`LLM request failed (${res.status})`);
    const json: any = await res.json();
    return json.choices?.[0]?.message?.content ?? "";
  }
}
