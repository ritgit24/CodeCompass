"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { IssueInfo, Repo, SkillLevel } from "@codecompass/shared";
import { Button } from "@/components/ui/button";
import { SkeletonCard } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { IssueCard, ManualIssue, ManualIssueInline, SKILLS, type FixRequest } from "./issue-card";

export function IssuesTab({
  repoId,
  issues,
  source,
  skill,
  onSkillChange,
  onIssuesLoaded,
}: {
  repoId: string;
  repo: Repo;
  issues: IssueInfo[] | null;
  source: "github" | "none";
  skill: SkillLevel;
  onSkillChange: (skill: SkillLevel) => void;
  onIssuesLoaded: (issues: IssueInfo[], source: "github" | "none") => void;
}) {
  const router = useRouter();
  const [starting, setStarting] = React.useState<number | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  const startFix = async (issue: FixRequest) => {
    setStarting(issue.number ?? -1);
    try {
      const { session } = await api.createFix(repoId, {
        number: issue.number ?? null,
        title: issue.title,
        body: issue.body ?? "",
      });
      toast.success("Planning your fix…");
      router.push(`/repo/${repoId}/fix/${session.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start the fix");
      setStarting(null);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      const res = await api.getIssues(repoId, skill);
      onIssuesLoaded(res.issues, res.source);
      if (!res.issues.length) toast.info("No open issues found for this repository");
    } catch {
      toast.error("Could not refresh issues");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-border bg-surface/60 p-1">
          {SKILLS.map((s) => (
            <button
              key={s.id}
              onClick={() => onSkillChange(s.id)}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                skill === s.id ? "bg-elevated text-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">
            {source === "github" ? "Open issues, ranked for your level" : "No GitHub issues found"}
          </span>
          <Button variant="ghost" size="sm" onClick={refresh} loading={refreshing}>
            {!refreshing && <RefreshCw className="h-3.5 w-3.5" />} Refresh
          </Button>
        </div>
      </div>

      {issues === null && (
        <div className="grid gap-3">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </div>
      )}

      {issues !== null && issues.length === 0 && (
        <ManualIssue
          onSubmit={startFix}
          reason="This repository has no usable open issues, so describe the change yourself."
        />
      )}

      {issues !== null && issues.length > 0 && (
        <>
          <div className="grid gap-3">
            {issues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                onStart={startFix}
                starting={starting === issue.number}
                disabled={starting !== null}
              />
            ))}
          </div>
          <p className="flex flex-wrap items-center justify-center gap-2 text-center text-xs text-muted">
            Want something specific? <ManualIssueInline onSubmit={startFix} />
          </p>
        </>
      )}
    </div>
  );
}
