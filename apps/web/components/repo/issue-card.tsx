"use client";

import * as React from "react";
import { Clock, FileCode2, MessageSquare, Play, Target } from "lucide-react";
import type { IssueInfo, SkillLevel } from "@codecompass/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMinutes, formatRelativeTime } from "@/lib/utils";

export const DIFFICULTY_VARIANT = { Easy: "success", Medium: "warning", Hard: "danger" } as const;

export const SKILLS: { id: SkillLevel; label: string }[] = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
];

export type FixRequest = { number?: number | null; title: string; body?: string };

export function IssueCard({
  issue,
  onStart,
  starting,
  disabled,
}: {
  issue: IssueInfo;
  onStart: (issue: FixRequest) => void;
  starting: boolean;
  disabled: boolean;
}) {
  return (
    <Card className="p-4 transition-colors hover:border-[var(--primary-2)]/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted">#{issue.number}</span>
            <Badge variant={DIFFICULTY_VARIANT[issue.difficulty]}>{issue.difficulty}</Badge>
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <Clock className="h-3 w-3" /> {formatMinutes(issue.estMinutes)}
            </span>
          </div>
          <h3 className="mt-2 text-sm font-semibold">{issue.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted">{issue.body || "(no description)"}</p>
        </div>
        <Button size="sm" onClick={() => onStart(issue)} loading={starting} disabled={disabled}>
          {!starting && <Play className="h-3.5 w-3.5" />} Start guided fix
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="h-3 w-3" /> {issue.comments}
        </span>
        <span>{formatRelativeTime(issue.createdAt)}</span>
        {issue.labels.slice(0, 4).map((label) => (
          <Badge key={label} variant="muted">
            {label}
          </Badge>
        ))}
      </div>

      {issue.files.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Target className="h-3 w-3 text-muted" />
          {issue.files.slice(0, 4).map((file) => (
            <span
              key={file}
              className="inline-flex items-center gap-1 rounded-md bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-muted"
            >
              <FileCode2 className="h-2.5 w-2.5" /> {file}
            </span>
          ))}
        </div>
      )}

      {issue.reason && <p className="mt-2 text-xs text-muted">Why: {issue.reason}</p>}
    </Card>
  );
}

export function ManualIssue({
  onSubmit,
  reason,
}: {
  onSubmit: (issue: FixRequest) => void;
  reason: string;
}) {
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  return (
    <Card className="p-5">
      <EmptyState
        icon={Target}
        title="Describe the change you want to make"
        description={reason}
        className="border-none bg-transparent py-4"
      />
      <div className="mt-2 space-y-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Add URL-decoding for route parameters"
          aria-label="Change title"
        />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Describe the problem and which files are involved."
          aria-label="Change description"
        />
        <Button
          onClick={() => title.trim() && onSubmit({ title: title.trim(), body, number: null })}
          disabled={!title.trim()}
        >
          <Play className="h-4 w-4" /> Start guided fix
        </Button>
      </div>
    </Card>
  );
}

export function ManualIssueInline({ onSubmit }: { onSubmit: (issue: FixRequest) => void }) {
  const [title, setTitle] = React.useState("");
  return (
    <span className="inline-flex items-center gap-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Describe a custom change…"
        aria-label="Custom change"
        className="h-8 w-56"
      />
      <Button
        size="sm"
        variant="secondary"
        disabled={!title.trim()}
        onClick={() => onSubmit({ title: title.trim(), body: "", number: null })}
      >
        Go
      </Button>
    </span>
  );
}
