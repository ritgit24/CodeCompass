"use client";

import { useParams } from "next/navigation";
import { SiteNav } from "@/components/site-nav";
import { FixWizard } from "@/components/fix/fix-wizard";

export default function FixPage() {
  const params = useParams<{ id: string; sessionId: string }>();
  return (
    <div className="min-h-screen">
      <SiteNav />
      <FixWizard repoId={params.id} sessionId={params.sessionId} />
    </div>
  );
}
