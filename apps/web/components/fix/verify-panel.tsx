"use client";

import * as React from "react";
import { Check, Copy, Download, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import type { FixSession } from "@codecompass/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function VerifyPanel({
  session,
  onRunTests,
  running,
  patch,
  pr,
  onBuildPatch,
  building,
}: {
  session: FixSession;
  onRunTests: () => void;
  running: boolean;
  patch: string | null;
  pr: { title: string; body: string } | null;
  onBuildPatch: () => void;
  building: boolean;
}) {
  const accepted = session.fileChanges.filter((c) => c.decision !== "rejected");
  const rejected = session.fileChanges.filter((c) => c.decision === "rejected");

  const downloadPatch = () => {
    if (!patch) {
      toast.error("No patch yet — build it first");
      return;
    }
    const blob = new Blob([patch], { type: "text/x-patch" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `codecompass-${session.id}.patch`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Patch downloaded");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FlaskConical className="h-4 w-4 text-[var(--primary-2)]" /> Verify in the sandbox
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">{accepted.length} accepted</Badge>
            {rejected.length > 0 && <Badge variant="muted">{rejected.length} rejected</Badge>}
            {session.testPassed != null && (
              <Badge variant={session.testPassed ? "success" : "danger"}>
                {session.testPassed ? "tests passed" : "tests failed"}
              </Badge>
            )}
          </div>

          <Button onClick={onRunTests} loading={running} disabled={accepted.length === 0}>
            {!running && <FlaskConical className="h-4 w-4" />} Run tests
          </Button>

          <p className="text-xs text-muted">
            Tests run in a throwaway copy on branch{" "}
            <span className="font-mono text-foreground">{session.branch}</span>. Nothing is ever
            pushed to GitHub.
          </p>

          {session.testOutput && (
            <pre className="max-h-72 overflow-auto rounded-xl border border-border bg-elevated p-3 font-mono text-xs text-muted">
              {session.testOutput}
            </pre>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Draft pull request</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pr ? (
            <DraftPR
              pr={pr}
              hasPatch={Boolean(patch)}
              onDownload={downloadPatch}
              onBuildPatch={onBuildPatch}
              building={building}
            />
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                Generate a draft PR title, description and downloadable patch from your accepted
                changes.
              </p>
              <Button variant="secondary" onClick={onBuildPatch} loading={building}>
                {!building && <Download className="h-4 w-4" />} Build patch &amp; PR
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DraftPR({
  pr,
  hasPatch,
  onDownload,
  onBuildPatch,
  building,
}: {
  pr: { title: string; body: string };
  hasPatch: boolean;
  onDownload: () => void;
  onBuildPatch: () => void;
  building: boolean;
}) {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(`${pr.title}\n\n${pr.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("PR description copied");
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-elevated/50 p-3">
        <p className="text-sm font-semibold">{pr.title || "Untitled pull request"}</p>
        <pre className="mt-2 whitespace-pre-wrap font-sans text-xs text-muted">{pr.body}</pre>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={copy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copy
          description
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={hasPatch ? onDownload : onBuildPatch}
          loading={building}
        >
          {!building && <Download className="h-3.5 w-3.5" />} Download patch
        </Button>
      </div>
    </div>
  );
}
