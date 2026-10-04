"use client";

import * as React from "react";
import { FileCode2, Loader2 } from "lucide-react";
import type { FilesResponse } from "@codecompass/shared";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { CodeBlock, languageFromPath } from "@/components/ui/code-block";
import { EmptyState } from "@/components/ui/empty-state";
import { api } from "@/lib/api";

export function CodeViewer({
  repoId,
  path,
  onClose,
}: {
  repoId: string;
  path: string | null;
  onClose: () => void;
}) {
  const [data, setData] = React.useState<FilesResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!path) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getFileContent(repoId, path)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load file");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [repoId, path]);

  return (
    <Sheet open={Boolean(path)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent title={path ?? "File"}>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}
        {error && <EmptyState icon={FileCode2} title="Could not load file" description={error} />}
        {data?.content != null && (
          <>
            {data.truncated && (
              <p className="mb-3 rounded-lg bg-[var(--warning)]/10 px-3 py-2 text-xs text-[var(--warning)]">
                Showing the first 200 KB of this file.
              </p>
            )}
            <CodeBlock
              code={data.content}
              language={languageFromPath(path ?? "")}
              filename={path ?? undefined}
              maxHeight={undefined}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
