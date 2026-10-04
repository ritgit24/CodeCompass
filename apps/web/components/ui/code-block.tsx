"use client";

import * as React from "react";
import hljs from "highlight.js/lib/common";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

const EXT_TO_LANG: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  py: "python",
  json: "json",
  css: "css",
  html: "xml",
  md: "markdown",
  yml: "yaml",
  yaml: "yaml",
  sh: "bash",
  go: "go",
  rs: "rust",
  java: "java",
  rb: "ruby",
};

export function languageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_LANG[ext] ?? "plaintext";
}

export function CodeBlock({
  code,
  language,
  filename,
  showCopy = true,
  maxHeight,
  className,
}: {
  code: string;
  language?: string;
  filename?: string;
  showCopy?: boolean;
  maxHeight?: number;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  const html = React.useMemo(() => {
    const lang = language && hljs.getLanguage(language) ? language : undefined;
    try {
      return lang ? hljs.highlight(code, { language: lang }).value : hljs.highlightAuto(code).value;
    } catch {
      return code.replace(/</g, "&lt;");
    }
  }, [code, language]);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-elevated", className)}>
      {(filename || showCopy) && (
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="truncate font-mono text-xs text-muted">{filename ?? language}</span>
          {showCopy && (
            <button
              onClick={copy}
              aria-label="Copy code"
              className="rounded-md p-1 text-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      )}
      <pre
        className="overflow-auto p-4 text-[13px] leading-relaxed"
        style={maxHeight ? { maxHeight } : undefined}
      >
        <code className="hljs font-mono" dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
}
