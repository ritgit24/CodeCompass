"use client";

import * as React from "react";
import { FileCode2, Info } from "lucide-react";
import type { FixSession } from "@codecompass/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function UnderstandStep({
  session,
  understanding,
  filesRead,
}: {
  session: FixSession;
  understanding: string;
  filesRead: string[];
}) {
  const files = session.plan?.filesToChange?.length ? session.plan.filesToChange : filesRead;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Info className="h-4 w-4 text-[var(--primary-2)]" /> The issue
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            {session.issueNumber != null && <Badge variant="muted">#{session.issueNumber}</Badge>}
            <Badge variant="primary">guided fix</Badge>
          </div>
          <h3 className="text-sm font-semibold">{session.issueTitle}</h3>
          <p className="whitespace-pre-wrap text-sm text-muted">
            {session.issueBody || "(no description provided)"}
          </p>
          {understanding && (
            <div className="rounded-lg border border-border bg-elevated/50 p-3 text-sm text-muted">
              {understanding}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileCode2 className="h-4 w-4 text-[var(--primary-2)]" /> Files in play
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {files.length === 0 && <p className="text-sm text-muted">Identifying relevant files…</p>}
          {files.map((file) => (
            <div
              key={file}
              className="flex items-center gap-2 rounded-lg border border-border bg-elevated/40 px-3 py-2"
            >
              <FileCode2 className="h-3.5 w-3.5 shrink-0 text-[var(--primary-2)]" />
              <span className="truncate font-mono text-xs">{file}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
