"use client";

import { useParams } from "next/navigation";
import { SiteNav } from "@/components/site-nav";
import { AnalysisProgress } from "@/components/repo/analysis-progress";

export default function RepoLoadingPage() {
  const params = useParams<{ id: string }>();
  return (
    <div className="min-h-screen">
      <SiteNav />
      <AnalysisProgress repoId={params.id} />
    </div>
  );
}
