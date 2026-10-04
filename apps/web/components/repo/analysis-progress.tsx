"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, Loader2 } from "lucide-react";
import type { AnalysisEvent, AnalysisStep } from "@codecompass/shared";
import { Stepper, type Step, type StepState } from "@/components/ui/stepper";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/api";

const ORDER: AnalysisStep[] = ["cloning", "scanning", "parsing", "mapping", "summarising", "ready"];
const LABELS: Record<AnalysisStep, string> = {
  cloning: "Cloning repository",
  scanning: "Scanning files",
  parsing: "Parsing code",
  mapping: "Building architecture map",
  summarising: "Summarising modules",
  ready: "Ready",
};

export function AnalysisProgress({ repoId }: { repoId: string }) {
  const router = useRouter();
  const [states, setStates] = React.useState<Record<string, StepState>>(() =>
    Object.fromEntries(ORDER.map((s) => [s, "pending"])),
  );
  const [detail, setDetail] = React.useState<Record<string, string>>({});
  const [log, setLog] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    const es = new EventSource(apiUrl(`/api/repos/${repoId}/status`));
    es.onmessage = (message) => {
      if (!message.data || message.data === "[DONE]") return;
      let event: AnalysisEvent;
      try {
        event = JSON.parse(message.data);
      } catch {
        return;
      }
      if (event.type === "step") {
        setStates((prev) => {
          const next = { ...prev };
          if (event.status === "started") next[event.step] = "active";
          if (event.status === "done") next[event.step] = "done";
          if (event.status === "error") next[event.step] = "error";
          return next;
        });
        if (event.detail)
          setDetail((prev) => ({ ...prev, [event.step]: summariseDetail(event.detail!) }));
        if (event.message) setLog((prev) => [...prev, event.message!]);
      } else if (event.type === "log") {
        setLog((prev) => [...prev.slice(-40), event.message]);
      } else if (event.type === "error") {
        setError(event.message);
        setDone(true);
        es.close();
      } else if (event.type === "done") {
        setStates((prev) => ({ ...prev, ready: "done" }));
        setDone(true);
        es.close();
        setTimeout(() => router.replace(`/repo/${repoId}`), 650);
      }
    };
    es.onerror = () => {
      // A dropped connection is fine — the server keeps history for reconnects.
    };
    return () => es.close();
  }, [repoId, router]);

  const steps: Step[] = ORDER.map((id) => ({
    id,
    label: LABELS[id],
    description: detail[id],
    state: states[id] as StepState,
  }));

  const activeCount = Object.values(states).filter((s) => s === "done").length;
  const progress = Math.round((activeCount / ORDER.length) * 100);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-xl flex-col justify-center px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-6">
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm text-muted">
              {!done && <Loader2 className="h-4 w-4 animate-spin text-[var(--primary-2)]" />}
              <span>{done ? "Analysis complete" : "Analysing repository"}</span>
              <span className="ml-auto font-mono text-xs">{progress}%</span>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-elevated">
              <motion.div
                className="h-full bg-brand-gradient"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: "easeOut", duration: 0.4 }}
              />
            </div>
          </div>

          {error ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <AlertCircle className="h-8 w-8 text-[var(--danger)]" />
              <div>
                <p className="text-sm font-semibold">Analysis failed</p>
                <p className="mt-1 text-sm text-muted">{error}</p>
              </div>
              <Button variant="secondary" onClick={() => router.push("/")}>
                Back to home
              </Button>
            </div>
          ) : (
            <Stepper steps={steps} />
          )}
        </Card>

        {log.length > 0 && (
          <div className="mt-4 max-h-40 overflow-auto rounded-xl border border-border bg-surface/60 p-3 font-mono text-xs text-muted">
            {log.map((line, i) => (
              <div key={i} className="animate-fade-in truncate">
                {line}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function summariseDetail(detail: Record<string, unknown>): string {
  const parts: string[] = [];
  if (typeof detail.files === "number") parts.push(`${detail.files} files`);
  if (typeof detail.languages === "number") parts.push(`${detail.languages} languages`);
  if (typeof detail.parsed === "number") parts.push(`${detail.parsed} parsed`);
  if (typeof detail.nodes === "number") parts.push(`${detail.nodes} modules`);
  if (typeof detail.edges === "number") parts.push(`${detail.edges} edges`);
  if (typeof detail.branch === "string") parts.push(detail.branch);
  return parts.join(" · ");
}
