"use client";

import * as React from "react";
import { Eraser, Send } from "lucide-react";
import { toast } from "sonner";
import type { ChatMessage, SourceRef } from "@codecompass/shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api, streamSSE } from "@/lib/api";
import { ChatBubble, ChatEmpty } from "./chat-bubble";

export function AskTab({
  repoId,
  onOpenFile,
  initialQuestion,
}: {
  repoId: string;
  onOpenFile: (path: string) => void;
  initialQuestion?: string | null;
}) {
  const [history, setHistory] = React.useState<ChatMessage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [question, setQuestion] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const [streamText, setStreamText] = React.useState("");
  const [streamSources, setStreamSources] = React.useState<SourceRef[]>([]);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    api
      .getChatHistory(repoId)
      .then((res) => setHistory(res.messages))
      .catch(() => toast.error("Could not load chat history"))
      .finally(() => setLoading(false));
  }, [repoId]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [history, streamText]);

  const ask = React.useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || streaming) return;
      setQuestion("");
      setStreaming(true);
      setStreamText("");
      setStreamSources([]);

      const priorHistory = history.map((m) => ({ role: m.role, content: m.content }));
      const now = new Date().toISOString();
      setHistory((prev) => [
        ...prev,
        {
          id: `local-u-${Date.now()}`,
          repoId,
          role: "user",
          content: q,
          sources: [],
          createdAt: now,
        },
      ]);

      let text2 = "";
      let sources: SourceRef[] = [];
      try {
        await streamSSE(
          `/api/repos/${repoId}/chat`,
          { question: q, history: priorHistory },
          (event) => {
            if (event.type === "token") {
              text2 += event.text;
              setStreamText(text2);
            } else if (event.type === "sources") {
              sources = event.sources;
              setStreamSources(event.sources);
            } else if (event.type === "error") {
              toast.error(event.message);
            }
          },
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "The answer failed to stream");
      } finally {
        setStreaming(false);
        setHistory((prev) => [
          ...prev,
          {
            id: `local-a-${Date.now()}`,
            repoId,
            role: "assistant",
            content: text2,
            sources,
            createdAt: now,
          },
        ]);
        setStreamText("");
        setStreamSources([]);
      }
    },
    [repoId, streaming, history],
  );

  React.useEffect(() => {
    if (initialQuestion) void ask(initialQuestion);
  }, [initialQuestion]);

  const clear = async () => {
    try {
      await api.clearChat(repoId);
      setHistory([]);
      toast.success("Chat cleared");
    } catch {
      toast.error("Could not clear chat");
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-3/4" />
        <Skeleton className="ml-auto h-12 w-1/2" />
        <Skeleton className="h-24 w-4/5" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-14rem)] min-h-[420px] flex-col rounded-xl border border-border bg-surface/50">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <p className="text-sm font-medium">Ask the Repo</p>
        {history.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clear}>
            <Eraser className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 space-y-5 overflow-auto p-4">
        {history.length === 0 && !streaming && <ChatEmpty onPick={ask} />}
        {history.map((message) => (
          <ChatBubble
            key={message.id}
            role={message.role}
            content={message.content}
            sources={message.sources}
            onOpenFile={onOpenFile}
          />
        ))}
        {streaming && (
          <ChatBubble
            role="assistant"
            content={streamText}
            sources={streamSources}
            streaming
            onOpenFile={onOpenFile}
          />
        )}
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask(question);
              }
            }}
            placeholder="Ask about the architecture, a file, or how something works…"
            aria-label="Ask a question"
            className="min-h-[44px] resize-none"
            rows={1}
          />
          <Button
            size="icon"
            onClick={() => ask(question)}
            disabled={streaming || !question.trim()}
            aria-label="Send question"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1.5 text-[11px] text-muted">Enter to send · Shift+Enter for a new line</p>
      </div>
    </div>
  );
}
