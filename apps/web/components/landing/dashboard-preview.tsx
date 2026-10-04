import { GitBranch } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PREVIEW_NODES, PREVIEW_TABS } from "./content";

/** A stylised static mock of the dashboard (no live data needed). */
export function DashboardPreview() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--danger)]/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--warning)]/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--success)]/70" />
        <span className="ml-3 font-mono text-xs text-muted">codecompass / repo / dashboard</span>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-[200px_1fr] sm:p-6">
        <div className="hidden flex-col gap-3 sm:flex">
          <div className="rounded-lg border border-border bg-elevated/50 p-3">
            <p className="text-xs font-semibold">pallets/itsdangerous</p>
            <p className="mt-0.5 text-[11px] text-muted">Python · 42 files</p>
          </div>
          <div className="space-y-1.5">
            {PREVIEW_TABS.map((t, i) => (
              <div
                key={t}
                className={`rounded-lg px-3 py-1.5 text-xs ${
                  i === 1 ? "bg-elevated text-foreground" : "text-muted"
                }`}
              >
                {t}
              </div>
            ))}
          </div>
        </div>
        <div className="relative min-h-[260px] rounded-xl border border-border bg-elevated/40 bg-grid p-4">
          <div className="flex flex-wrap items-center gap-3">
            {PREVIEW_NODES.map((n, i) => (
              <div
                key={n}
                className="rounded-lg border px-3 py-2 text-xs font-medium shadow-card"
                style={{
                  borderColor: i % 2 ? "var(--violet)" : "var(--primary-2)",
                  background: "var(--surface)",
                }}
              >
                <span className="font-mono">{n}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-2">
            <div className="h-2 w-3/4 rounded-full bg-elevated" />
            <div className="h-2 w-1/2 rounded-full bg-elevated" />
            <div className="h-2 w-2/3 rounded-full bg-elevated" />
          </div>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[11px] text-muted">
            <GitBranch className="h-3 w-3" /> codecompass/fix-1 · 2 files changed
          </div>
        </div>
      </div>
    </Card>
  );
}
