"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Compass, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

export const EXAMPLE_REPOS = [
  {
    label: "Load demo repo",
    url: "codecompass/demo-repo",
    tag: "offline",
    hint: "Bundled sample project — works with no network and no API keys",
  },
  { label: "sindresorhus/slugify", url: "https://github.com/sindresorhus/slugify", tag: "JS" },
  { label: "pallets/itsdangerous", url: "https://github.com/pallets/itsdangerous", tag: "Py" },
  { label: "chalk/chalk", url: "https://github.com/chalk/chalk", tag: "JS" },
];

export function RepoUrlForm({ autoFocus = false }: { autoFocus?: boolean }) {
  const [url, setUrl] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  async function analyze(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      toast.error("Paste a GitHub repository URL first");
      return;
    }
    setLoading(true);
    try {
      const { id } = await api.createRepo(trimmed);
      router.push(`/repo/${id}/loading`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start analysis");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-2xl">
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          void analyze(url);
        }}
      >
        <div className="relative flex-1">
          <Compass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            autoFocus={autoFocus}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            aria-label="GitHub repository URL"
            className="h-12 pl-9 font-mono text-sm"
            disabled={loading}
          />
        </div>
        <Button type="submit" size="lg" loading={loading} className="h-12">
          {!loading && <Sparkles className="h-4 w-4" />}
          Analyze repo
          {!loading && <ArrowRight className="h-4 w-4" />}
        </Button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">Try:</span>
        {EXAMPLE_REPOS.map((repo) => (
          <button
            key={repo.url}
            type="button"
            disabled={loading}
            onClick={() => {
              setUrl(repo.url);
              void analyze(repo.url);
            }}
            className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted transition-all hover:border-[var(--primary-2)]/50 hover:text-foreground disabled:opacity-50"
          >
            <span className="font-mono">{repo.label}</span>
            <span className="rounded-full bg-elevated px-1.5 text-[10px] text-[var(--primary-2)]">
              {repo.tag}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
