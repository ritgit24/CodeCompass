"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Compass, FileCode2, Sparkles, User } from "lucide-react";
import type { SourceRef } from "@codecompass/shared";
import { cn } from "@/lib/utils";

export function ChatBubble({
  role,
  content,
  sources,
  streaming,
  onOpenFile,
}: {
  role: "user" | "assistant";
  content: string;
  sources?: SourceRef[];
  streaming?: boolean;
  onOpenFile: (path: string) => void;
}) {
  const isUser = role === "user";
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
          isUser ? "bg-elevated text-muted" : "bg-brand-gradient text-[var(--primary-foreground)]",
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Compass className="h-3.5 w-3.5" />}
      </div>

      <div className={cn("min-w-0 max-w-[85%] space-y-2", isUser && "items-end text-right")}>
        <div
          className={cn(
            "rounded-xl border px-4 py-3 text-sm",
            isUser ? "border-border bg-elevated/60" : "border-border bg-surface/70",
          )}
        >
          <div className={cn("prose-compass", streaming && "stream-cursor")}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
              {content || (streaming ? "" : "…")}
            </ReactMarkdown>
          </div>
        </div>

        {sources && sources.length > 0 && (
          <div className={cn("flex flex-wrap gap-1.5", isUser && "justify-end")}>
            {sources.map((source, i) => (
              <button
                key={`${source.path}-${i}`}
                onClick={() => onOpenFile(source.path)}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-elevated px-2.5 py-1 font-mono text-[11px] text-muted transition-colors hover:border-[var(--primary-2)]/50 hover:text-foreground"
                title={source.path}
              >
                <FileCode2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{source.path}</span>
                {source.startLine != null && (
                  <span className="text-[var(--primary-2)]">
                    :{source.startLine}
                    {source.endLine && source.endLine !== source.startLine
                      ? `-${source.endLine}`
                      : ""}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export const SUGGESTIONS = [
  "Where does a request enter the app?",
  "How is auth handled?",
  "What should I read first to get productive?",
  "Where are the tests and what do they cover?",
];

export function ChatEmpty({ onPick }: { onPick: (question: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient text-[var(--primary-foreground)]">
        <Sparkles className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm font-semibold">Ask anything about this codebase</p>
        <p className="mt-1 text-sm text-muted">
          Answers stream in and cite the exact files they used.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="rounded-full border border-border bg-elevated px-3 py-1.5 text-xs text-muted transition-colors hover:border-[var(--primary-2)]/50 hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
