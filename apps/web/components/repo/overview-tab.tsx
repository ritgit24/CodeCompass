"use client";

import { BookOpen, FileCode2, FolderTree, Rocket, Sparkles } from "lucide-react";
import type { Repo } from "@codecompass/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CodeBlock } from "@/components/ui/code-block";

export function OverviewTab({
  repo,
  onOpenFile,
}: {
  repo: Repo;
  onOpenFile: (path: string) => void;
}) {
  const summary = repo.summary;
  if (!summary) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No summary yet"
        description="The AI summary for this repository hasn't been generated."
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--primary-2)]" /> What this project does
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-muted">{summary.what}</p>
          {summary.techStack.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {summary.techStack.map((tech) => (
                <Badge key={tech} variant="primary">
                  {tech}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-4 w-4 text-[var(--primary-2)]" /> How to run it
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {summary.howToRun.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-muted">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-elevated font-mono text-[11px] text-[var(--primary-2)]">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-4 w-4 text-[var(--primary-2)]" /> Folder structure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.folderStructure.length === 0 ? (
              <p className="text-sm text-muted">No folder breakdown available.</p>
            ) : (
              summary.folderStructure.map((folder) => (
                <div key={folder.path} className="flex items-start gap-2 text-sm">
                  <CodeBlockCode>{folder.path}</CodeBlockCode>
                  <span className="text-muted">{folder.description}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[var(--primary-2)]" /> Key files to read first
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summary.keyFiles.length === 0 ? (
            <p className="text-sm text-muted">No key files identified.</p>
          ) : (
            <ul className="divide-y divide-border">
              {summary.keyFiles.map((file) => (
                <li key={file.path}>
                  <button
                    onClick={() => onOpenFile(file.path)}
                    className="group flex w-full items-center gap-3 py-3 text-left transition-colors hover:text-foreground"
                  >
                    <FileCode2 className="h-4 w-4 shrink-0 text-muted group-hover:text-[var(--primary-2)]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-sm">{file.path}</span>
                      <span className="block text-xs text-muted">{file.reason}</span>
                    </span>
                    <span className="text-xs text-muted opacity-0 transition-opacity group-hover:opacity-100">
                      open →
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CodeBlockCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="shrink-0 rounded-md bg-elevated px-1.5 py-0.5 font-mono text-xs text-[var(--primary-2)]">
      {children}
    </code>
  );
}

// Re-exported for tabs that want an inline code chip.
export { CodeBlockCode, CodeBlock };
