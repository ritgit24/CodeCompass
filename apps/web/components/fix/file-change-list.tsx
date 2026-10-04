"use client";

import * as React from "react";
import { Check, FileDiff, Loader2, X } from "lucide-react";
import type { FileChange } from "@codecompass/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DiffViewer } from "@/components/ui/diff-viewer";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export function FileChangeList({
  changes,
  onDecide,
  busy,
}: {
  changes: FileChange[];
  onDecide: (changeId: string, decision: "accepted" | "rejected") => void;
  busy: string | null;
}) {
  const [split, setSplit] = React.useState(true);

  if (changes.length === 0) {
    return (
      <EmptyState
        icon={FileDiff}
        title="No file changes yet"
        description="Once you approve the plan, the agent's edits will appear here as reviewable diffs."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {changes.length} file{changes.length === 1 ? "" : "s"} changed · review each one
        </p>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface/60 p-0.5">
          <button
            onClick={() => setSplit(true)}
            className={cn(
              "rounded-md px-2 py-1 text-xs",
              split ? "bg-elevated text-foreground" : "text-muted",
            )}
          >
            Split
          </button>
          <button
            onClick={() => setSplit(false)}
            className={cn(
              "rounded-md px-2 py-1 text-xs",
              !split ? "bg-elevated text-foreground" : "text-muted",
            )}
          >
            Unified
          </button>
        </div>
      </div>

      {changes.map((change) => (
        <Card key={change.id} className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate font-mono text-sm">{change.path}</span>
              <Badge variant="success">+{change.additions}</Badge>
              <Badge variant="danger">-{change.deletions}</Badge>
              {change.decision !== "pending" && (
                <Badge variant={change.decision === "accepted" ? "success" : "muted"}>
                  {change.decision}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={change.decision === "accepted" ? "success" : "secondary"}
                onClick={() => onDecide(change.id, "accepted")}
                loading={busy === `${change.id}:accepted`}
              >
                {busy !== `${change.id}:accepted` && <Check className="h-3.5 w-3.5" />} Accept
              </Button>
              <Button
                size="sm"
                variant={change.decision === "rejected" ? "danger" : "ghost"}
                onClick={() => onDecide(change.id, "rejected")}
                loading={busy === `${change.id}:rejected`}
              >
                {busy !== `${change.id}:rejected` && <X className="h-3.5 w-3.5" />} Reject
              </Button>
            </div>
          </div>
          <DiffViewer diff={change.diff} splitView={split} />
        </Card>
      ))}

      {busy && (
        <p className="flex items-center gap-2 text-xs text-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Applying decision…
        </p>
      )}
    </div>
  );
}
