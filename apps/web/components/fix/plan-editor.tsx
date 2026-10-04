"use client";

import * as React from "react";
import { BookOpen, ShieldAlert } from "lucide-react";
import type { FixPlan, FixStep } from "@codecompass/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Editable checklist for the agent's plan. */
export function PlanEditor({
  plan,
  onChange,
}: {
  plan: FixPlan;
  onChange: (plan: FixPlan) => void;
}) {
  const toggle = (id: string) =>
    onChange({
      ...plan,
      steps: plan.steps.map((s) => (s.id === id ? { ...s, done: !s.done } : s)),
    });

  const editStep = (id: string, title: string) =>
    onChange({ ...plan, steps: plan.steps.map((s) => (s.id === id ? { ...s, title } : s)) });

  return (
    <div className="space-y-4">
      {plan.summary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Plan summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted">{plan.summary}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BookOpen className="h-4 w-4 text-[var(--primary-2)]" /> Steps (tick off or rename)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {plan.steps.map((step, index) => (
            <StepRow
              key={step.id}
              step={step}
              index={index}
              onToggle={toggle}
              onRename={editStep}
            />
          ))}
          {plan.steps.length === 0 && <p className="text-sm text-muted">No steps were produced.</p>}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Files to change</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {plan.filesToChange.length ? (
              plan.filesToChange.map((f) => (
                <span
                  key={f}
                  className="rounded-md bg-elevated px-2 py-1 font-mono text-xs text-muted"
                >
                  {f}
                </span>
              ))
            ) : (
              <p className="text-sm text-muted">Not specified.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldAlert className="h-4 w-4 text-[var(--warning)]" /> Risks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {plan.risks.length ? (
              plan.risks.map((risk) => (
                <Badge key={risk} variant="warning">
                  {risk}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted">No risks flagged.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StepRow({
  step,
  index,
  onToggle,
  onRename,
}: {
  step: FixStep;
  index: number;
  onToggle: (id: string) => void;
  onRename: (id: string, title: string) => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-elevated/40 p-3">
      <button
        onClick={() => onToggle(step.id)}
        aria-label={step.done ? "Mark step incomplete" : "Mark step complete"}
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
          step.done
            ? "border-transparent bg-brand-gradient text-[var(--primary-foreground)]"
            : "border-border text-transparent hover:border-[var(--primary-2)]",
        )}
      >
        ✓
      </button>
      <div className="min-w-0 flex-1">
        <span className="mr-2 font-mono text-xs text-muted">{index + 1}.</span>
        <input
          value={step.title}
          onChange={(e) => onRename(step.id, e.target.value)}
          className={cn(
            "w-full bg-transparent text-sm outline-none focus:underline",
            step.done && "text-muted line-through",
          )}
          aria-label={`Step ${index + 1}`}
        />
        {step.detail && <p className="mt-0.5 text-xs text-muted">{step.detail}</p>}
      </div>
    </div>
  );
}
