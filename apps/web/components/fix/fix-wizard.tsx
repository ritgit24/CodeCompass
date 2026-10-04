"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SkeletonCard } from "@/components/ui/skeleton";
import { Stepper, type Step, type StepState } from "@/components/ui/stepper";
import { UnderstandStep } from "./understand-step";
import { PlanEditor } from "./plan-editor";
import { ActivityLog } from "./activity-log";
import { FileChangeList } from "./file-change-list";
import { VerifyPanel } from "./verify-panel";
import { filesTouched, useFixSession } from "./use-fix-session";

const STEP_IDS = ["understand", "plan", "changes", "verify"] as const;
const STEP_LABELS = ["Understand", "Plan", "Changes", "Verify"];

export function FixWizard({ repoId, sessionId }: { repoId: string; sessionId: string }) {
  const fix = useFixSession(repoId, sessionId);

  if (!fix.session) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <SkeletonCard lines={3} />
        <SkeletonCard lines={4} />
      </div>
    );
  }

  const steps: Step[] = STEP_IDS.map((id, i) => ({
    id,
    label: STEP_LABELS[i],
    state: (i < fix.step ? "done" : i === fix.step ? "active" : "pending") as StepState,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link
          href={`/repo/${repoId}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to repo
        </Link>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
          <ShieldCheck className="h-3.5 w-3.5 text-[var(--success)]" /> Sandboxed · never pushed
        </span>
      </div>

      <Card className="mb-5 p-5">
        <Stepper steps={steps} orientation="horizontal" />
      </Card>

      {fix.step === 0 && (
        <UnderstandStep
          session={fix.session}
          understanding={fix.understanding}
          filesRead={filesTouched(fix.events)}
        />
      )}

      {fix.step === 1 && (
        <div className="space-y-4">
          {!fix.plan ? (
            <Card className="flex items-center gap-3 p-6 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--primary-2)]" /> The agent is
              drafting a plan…
            </Card>
          ) : (
            <PlanEditor plan={fix.plan} onChange={fix.setPlan} />
          )}
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => fix.setStep(0)}>
              Back
            </Button>
            <Button onClick={fix.approve} loading={fix.approving} disabled={!fix.plan}>
              {!fix.approving && <Check className="h-4 w-4" />} Approve plan &amp; apply
            </Button>
          </div>
        </div>
      )}

      {fix.step === 2 && (
        <div className="space-y-4">
          <ActivityLog events={fix.events} />
          <FileChangeList changes={fix.session.fileChanges} onDecide={fix.decide} busy={fix.busy} />
          <div className="flex items-center justify-end">
            <Button
              onClick={() => fix.setStep(3)}
              disabled={fix.session.fileChanges.length === 0 || fix.session.status === "applying"}
            >
              Continue to Verify <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {fix.step === 3 && (
        <VerifyPanel
          session={fix.session}
          onRunTests={fix.runTests}
          running={fix.running}
          patch={fix.patch}
          pr={fix.pr}
          onBuildPatch={fix.buildPatch}
          building={fix.building}
        />
      )}
    </div>
  );
}
