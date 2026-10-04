"use client";

import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import type { Graph, Repo } from "@codecompass/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/utils";

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178C6",
  JavaScript: "#F7DF1E",
  Python: "#3776AB",
  Markdown: "#64748B",
  JSON: "#F59E0B",
  HTML: "#E34F26",
  CSS: "#264DE4",
  Ruby: "#CC342D",
  Go: "#00ADD8",
  Rust: "#DEA584",
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface/80 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wider text-muted">{label}</p>
      <p className="font-mono text-sm">{value}</p>
    </div>
  );
}

function LanguageBar({ languages }: { languages: { language: string; files: number }[] }) {
  const total = languages.reduce((sum, l) => sum + l.files, 0) || 1;
  if (!languages.length) return <div className="h-2 rounded-full bg-elevated" />;
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-elevated">
      {languages.slice(0, 8).map((l) => (
        <span
          key={l.language}
          title={`${l.language} (${l.files})`}
          style={{
            width: `${(l.files / total) * 100}%`,
            background: LANG_COLORS[l.language] ?? "var(--muted)",
          }}
        />
      ))}
    </div>
  );
}

export function RepoSidebar({ repo, graph }: { repo: Repo; graph: Graph | null }) {
  const languages = repo.stats?.languages ?? [];
  return (
    <aside className="w-full shrink-0 lg:w-64">
      <div className="sticky top-20 space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> New repo
        </Link>

        <div className="rounded-xl border border-border bg-surface/80 p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-[var(--primary-foreground)]">
              <Compass className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{repo.name}</p>
              <p className="truncate text-xs text-muted">{repo.owner}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge variant="success">ready</Badge>
            <Badge variant="muted">{repo.defaultBranch}</Badge>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface/80 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Languages
          </p>
          <LanguageBar languages={languages} />
          <div className="mt-3 space-y-1.5">
            {languages.slice(0, 5).map((l) => (
              <div key={l.language} className="flex items-center justify-between text-xs">
                <span className="truncate text-muted">{l.language}</span>
                <span className="font-mono text-muted">{l.files}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Stat label="Files" value={String(repo.stats?.files ?? 0)} />
          <Stat label="Size" value={formatBytes(repo.stats?.bytes ?? 0)} />
          <Stat label="Modules" value={String(graph?.nodes.length ?? 0)} />
          <Stat label="Edges" value={String(graph?.edges.length ?? 0)} />
        </div>

        <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
          <a href={repo.url} target="_blank" rel="noreferrer">
            View on GitHub ↗
          </a>
        </Button>
      </div>
    </aside>
  );
}
