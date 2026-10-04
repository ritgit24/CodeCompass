"use client";

import { Check, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepState = "pending" | "active" | "done" | "error";

export interface Step {
  id: string;
  label: string;
  description?: string;
  state: StepState;
}

export function Stepper({
  steps,
  orientation = "vertical",
  className,
}: {
  steps: Step[];
  orientation?: "vertical" | "horizontal";
  className?: string;
}) {
  if (orientation === "horizontal") {
    return (
      <div className={cn("flex w-full items-center", className)}>
        {steps.map((step, i) => (
          <div key={step.id} className="flex flex-1 items-center last:flex-none">
            <StepDot step={step} index={i + 1} />
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "mx-2 h-[2px] flex-1 rounded-full transition-colors",
                  step.state === "done" ? "bg-[var(--primary)]" : "bg-border",
                )}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <ol className={cn("relative space-y-1", className)}>
      {steps.map((step, i) => (
        <li key={step.id} className="relative flex gap-4 pb-6 last:pb-0">
          {i < steps.length - 1 && (
            <span
              className={cn(
                "absolute left-[15px] top-8 h-[calc(100%-1rem)] w-[2px]",
                step.state === "done" ? "bg-[var(--primary)]" : "bg-border",
              )}
            />
          )}
          <StepDot step={step} index={i + 1} />
          <div className="pt-1.5">
            <p
              className={cn(
                "text-sm font-medium transition-colors",
                step.state === "pending" ? "text-muted" : "text-foreground",
              )}
            >
              {step.label}
            </p>
            {step.description && <p className="mt-0.5 text-xs text-muted">{step.description}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function StepDot({ step, index }: { step: Step; index: number }) {
  return (
    <span
      className={cn(
        "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-all",
        step.state === "done" &&
          "border-transparent bg-brand-gradient text-[var(--primary-foreground)]",
        step.state === "active" && "border-[var(--primary-2)] bg-elevated text-[var(--primary-2)]",
        step.state === "pending" && "border-border bg-surface text-muted",
        step.state === "error" && "border-transparent bg-[var(--danger)] text-white",
      )}
      aria-label={`${step.label}: ${step.state}`}
    >
      {step.state === "done" ? (
        <Check className="h-4 w-4" />
      ) : step.state === "active" ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="absolute inset-0 rounded-full border border-[var(--primary-2)] animate-pulse-ring" />
        </>
      ) : step.state === "error" ? (
        <AlertCircle className="h-4 w-4" />
      ) : (
        index
      )}
    </span>
  );
}
