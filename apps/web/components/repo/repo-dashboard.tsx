"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileCode2 } from "lucide-react";
import type { Repo, Graph, IssueInfo, SkillLevel } from "@codecompass/shared";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { RepoSidebar } from "./repo-sidebar";
import { OverviewTab } from "./overview-tab";
import { MapTab } from "./map-tab";
import { AskTab } from "./ask-tab";
import { IssuesTab } from "./issues-tab";
import { CodeViewer } from "./code-viewer";
import { api } from "@/lib/api";

export function RepoDashboard({ repoId }: { repoId: string }) {
  const router = useRouter();
  const [repo, setRepo] = React.useState<Repo | null>(null);
  const [graph, setGraph] = React.useState<Graph | null>(null);
  const [issues, setIssues] = React.useState<IssueInfo[] | null>(null);
  const [issuesSource, setIssuesSource] = React.useState<"github" | "none">("github");
  const [skill, setSkill] = React.useState<SkillLevel>("beginner");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [openFile, setOpenFile] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState("overview");
  const [pendingQuestion, setPendingQuestion] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { repo } = await api.getRepo(repoId);
        if (cancelled) return;
        if (repo.status === "error") {
          setError(repo.error ?? "Analysis failed");
          setLoading(false);
          return;
        }
        if (repo.status !== "ready") {
          router.replace(`/repo/${repoId}/loading`);
          return;
        }
        // Render the dashboard as soon as we know the repo is ready; the graph and
        // the (potentially slow) issue scoring fill in as they arrive.
        setRepo(repo);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load repo");
          setLoading(false);
        }
        return;
      }

      api
        .getGraph(repoId)
        .then((res) => !cancelled && setGraph(res.graph))
        .catch(() => undefined);

      api
        .getIssues(repoId, "beginner")
        .then((res) => {
          if (cancelled) return;
          setIssues(res.issues);
          setIssuesSource(res.source);
        })
        .catch(() => !cancelled && setIssues([]));
    })();

    return () => {
      cancelled = true;
    };
  }, [repoId, router]);

  const changeSkill = async (next: SkillLevel) => {
    setSkill(next);
    try {
      const res = await api.getIssues(repoId, next);
      setIssues(res.issues);
      setIssuesSource(res.source);
    } catch {
      /* keep the previous list on failure */
    }
  };

  if (loading) {
    return (
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 md:grid-cols-[240px_1fr]">
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <div className="space-y-4">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={3} />
        </div>
      </div>
    );
  }

  if (error || !repo) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          icon={FileCode2}
          title="Could not load this repository"
          description={error ?? "Unknown error"}
          action={
            <Button variant="secondary" asChild>
              <Link href="/">Back to home</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row">
      <RepoSidebar repo={repo} graph={graph} />

      <div className="min-w-0 flex-1">
        <Tabs value={tab} onValueChange={setTab}>
          <div className="mb-4 flex items-center justify-between gap-2">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="map">Map</TabsTrigger>
              <TabsTrigger value="ask">Ask the Repo</TabsTrigger>
              <TabsTrigger value="issues">
                Issues
                {issues && issues.length > 0 && (
                  <span className="rounded-full bg-[var(--primary)]/20 px-1.5 text-[10px] text-[var(--primary-2)]">
                    {issues.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
          </div>

          <TabsContent value="overview">
            <OverviewTab repo={repo} onOpenFile={setOpenFile} />
          </TabsContent>
          <TabsContent value="map">
            <MapTab
              graph={graph}
              onOpenFile={setOpenFile}
              onAsk={(question) => {
                setPendingQuestion(question);
                setTab("ask");
              }}
            />
          </TabsContent>
          <TabsContent value="ask">
            <AskTab
              key={pendingQuestion ?? "ask"}
              repoId={repoId}
              onOpenFile={setOpenFile}
              initialQuestion={pendingQuestion}
            />
          </TabsContent>
          <TabsContent value="issues">
            <IssuesTab
              repoId={repoId}
              repo={repo}
              issues={issues}
              source={issuesSource}
              skill={skill}
              onSkillChange={changeSkill}
              onIssuesLoaded={(list, src) => {
                setIssues(list);
                setIssuesSource(src);
              }}
            />
          </TabsContent>
        </Tabs>
      </div>

      <CodeViewer repoId={repoId} path={openFile} onClose={() => setOpenFile(null)} />
    </div>
  );
}
