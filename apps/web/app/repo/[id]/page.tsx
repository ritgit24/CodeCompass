"use client";

import { useParams } from "next/navigation";
import { SiteNav } from "@/components/site-nav";
import { RepoDashboard } from "@/components/repo/repo-dashboard";

export default function RepoPage() {
  const params = useParams<{ id: string }>();
  return (
    <div className="min-h-screen">
      <SiteNav />
      <RepoDashboard repoId={params.id} />
    </div>
  );
}
