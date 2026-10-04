import type {
  Repo,
  Graph,
  FilesResponse,
  IssuesResponse,
  ChatMessage,
  FixSession,
  TestResult,
  SkillLevel,
} from "@codecompass/shared";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  createRepo: (url: string) =>
    request<{ id: string }>("/api/repos", { method: "POST", body: JSON.stringify({ url }) }),

  getRepo: (id: string) => request<{ repo: Repo }>(`/api/repos/${id}`),

  getGraph: (id: string) => request<{ graph: Graph }>(`/api/repos/${id}/graph`),

  getFiles: (id: string, path?: string) =>
    request<FilesResponse>(
      `/api/repos/${id}/files${path ? `?path=${encodeURIComponent(path)}` : ""}`,
    ),

  getFileContent: (id: string, path: string) =>
    request<FilesResponse>(`/api/repos/${id}/files?path=${encodeURIComponent(path)}`),

  getChatHistory: (id: string) => request<{ messages: ChatMessage[] }>(`/api/repos/${id}/chat`),

  clearChat: (id: string) => request<void>(`/api/repos/${id}/chat`, { method: "DELETE" }),

  getIssues: (id: string, skill?: SkillLevel) =>
    request<IssuesResponse>(`/api/repos/${id}/issues${skill ? `?skill=${skill}` : ""}`),

  createFix: (repoId: string, issue: Record<string, unknown>) =>
    request<{ session: FixSession }>(`/api/repos/${repoId}/fix`, {
      method: "POST",
      body: JSON.stringify({ issue }),
    }),

  getFix: (sessionId: string) => request<{ session: FixSession }>(`/api/fix/${sessionId}`),

  approvePlan: (sessionId: string, plan?: unknown) =>
    request<{ session: FixSession }>(`/api/fix/${sessionId}/approve`, {
      method: "POST",
      body: JSON.stringify({ plan }),
    }),

  decideFile: (sessionId: string, fileId: string, decision: "accepted" | "rejected") =>
    request<{ session: FixSession }>(`/api/fix/${sessionId}/files/${fileId}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision }),
    }),

  runTests: (sessionId: string) =>
    request<{ session: FixSession; result: TestResult }>(`/api/fix/${sessionId}/test`, {
      method: "POST",
    }),

  getPatch: (sessionId: string) =>
    request<{ patch: string; pr: { title: string; body: string } }>(`/api/fix/${sessionId}/patch`),
};

/** Thin helper around EventSource-style SSE over fetch (works with POST bodies). */
export async function streamSSE(
  path: string,
  body: unknown,
  onEvent: (event: any) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(`Stream failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      for (const line of chunk.split("\n")) {
        const trimmed = line.trimStart();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          onEvent(JSON.parse(data));
        } catch {
          /* ignore malformed frame */
        }
      }
    }
  }
}

/** Subscribe to a GET SSE endpoint with EventSource. */
export function openEventStream(
  path: string,
  onEvent: (event: any) => void,
  onError?: (err: Event) => void,
): EventSource {
  const es = new EventSource(apiUrl(path));
  es.onmessage = (e) => {
    if (!e.data || e.data === "[DONE]") return;
    try {
      onEvent(JSON.parse(e.data));
    } catch {
      /* ignore */
    }
  };
  if (onError) es.onerror = onError;
  return es;
}
