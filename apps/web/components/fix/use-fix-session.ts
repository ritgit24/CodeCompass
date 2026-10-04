"use client";

import * as React from "react";
import { toast } from "sonner";
import type { AgentEvent, FixPlan, FixSession } from "@codecompass/shared";
import { api, apiUrl } from "@/lib/api";

export interface UseFixSession {
  session: FixSession | null;
  step: number;
  setStep: (step: number) => void;
  events: AgentEvent[];
  understanding: string;
  plan: FixPlan | null;
  setPlan: (plan: FixPlan) => void;
  busy: string | null;
  approving: boolean;
  running: boolean;
  building: boolean;
  patch: string | null;
  pr: { title: string; body: string } | null;
  approve: () => Promise<void>;
  decide: (changeId: string, decision: "accepted" | "rejected") => Promise<void>;
  runTests: () => Promise<void>;
  buildPatch: () => Promise<void>;
}

/** Owns the guided-fix state machine and the SSE subscription. */
export function useFixSession(repoId: string, sessionId: string): UseFixSession {
  const [session, setSession] = React.useState<FixSession | null>(null);
  const [step, setStep] = React.useState(0);
  const [events, setEvents] = React.useState<AgentEvent[]>([]);
  const [understanding, setUnderstanding] = React.useState("");
  const [plan, setPlanState] = React.useState<FixPlan | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [approving, setApproving] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [building, setBuilding] = React.useState(false);
  const [patch, setPatch] = React.useState<string | null>(null);
  const [pr, setPr] = React.useState<{ title: string; body: string } | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      const res = await api.getFix(sessionId);
      setSession(res.session);
      if (res.session.plan) setPlanState((prev) => prev ?? res.session.plan ?? null);
      return res.session;
    } catch {
      return null;
    }
  }, [sessionId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    const es = new EventSource(apiUrl(`/api/fix/${sessionId}/stream`));
    es.onmessage = (message) => {
      if (!message.data || message.data === "[DONE]") return;
      let event: any;
      try {
        event = JSON.parse(message.data);
      } catch {
        return;
      }
      if (event.type === "status" && event.status === "applying") setStep(2);
      else if (event.type === "understand") setUnderstanding(event.text);
      else if (event.type === "plan") {
        setPlanState(event.plan);
        setStep(1);
      } else if (event.type === "activity") setEvents((prev) => [...prev, event.event]);
      else if (event.type === "file_change" || event.type === "test_result") void refresh();
      else if (event.type === "error") toast.error(event.message);
    };
    return () => es.close();
  }, [sessionId, refresh]);

  React.useEffect(() => {
    if (session?.status === "reviewing" || session?.status === "applying") {
      setStep((prev) => (prev < 2 ? 2 : prev));
    }
  }, [session?.status]);

  const approve = React.useCallback(async () => {
    setApproving(true);
    try {
      const res = await api.approvePlan(sessionId, plan ?? undefined);
      setSession(res.session);
      setStep(2);
      toast.success("Applying the plan…");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not apply the plan");
    } finally {
      setApproving(false);
    }
  }, [sessionId, plan]);

  const decide = React.useCallback(
    async (changeId: string, decision: "accepted" | "rejected") => {
      setBusy(`${changeId}:${decision}`);
      try {
        const res = await api.decideFile(sessionId, changeId, decision);
        setSession(res.session);
        toast.success(decision === "accepted" ? "Change accepted" : "Change reverted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not update the change");
      } finally {
        setBusy(null);
      }
    },
    [sessionId],
  );

  const runTests = React.useCallback(async () => {
    setRunning(true);
    try {
      const res = await api.runTests(sessionId);
      setSession(res.session);
      const built = await api.getPatch(sessionId);
      setPatch(built.patch);
      setPr(built.pr);
      toast[res.session.testPassed ? "success" : "error"](
        res.session.testPassed ? "Tests passed" : "Tests failed — see the output",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not run tests");
    } finally {
      setRunning(false);
    }
  }, [sessionId]);

  const buildPatch = React.useCallback(async () => {
    setBuilding(true);
    try {
      const res = await api.getPatch(sessionId);
      setPatch(res.patch);
      setPr(res.pr);
    } catch {
      toast.error("Could not build the patch");
    } finally {
      setBuilding(false);
    }
  }, [sessionId]);

  return {
    session,
    step,
    setStep,
    events,
    understanding,
    plan,
    setPlan: setPlanState,
    busy,
    approving,
    running,
    building,
    patch,
    pr,
    approve,
    decide,
    runTests,
    buildPatch,
  };
}

export function filesTouched(events: AgentEvent[]): string[] {
  const seen = new Set<string>();
  for (const event of events) {
    if (event.type === "file_read" || event.type === "file_edit") seen.add(event.path);
  }
  return [...seen];
}
