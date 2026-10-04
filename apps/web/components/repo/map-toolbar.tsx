"use client";

import { Maximize2, RotateCcw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface MapStats {
  shownNodes: number;
  totalNodes: number;
  shownEdges: number;
  totalEdges: number;
  layerCount: number;
}

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex items-center gap-0.5 rounded-lg border border-border bg-surface/60 p-0.5"
    >
      {options.map((option) => (
        <button
          key={String(option.id)}
          onClick={() => onChange(option.id)}
          aria-pressed={value === option.id}
          className={cn(
            "rounded-md px-2 py-1 text-xs transition-colors",
            value === option.id
              ? "bg-elevated text-foreground"
              : "text-muted hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function MapToolbar({
  depth,
  onDepthChange,
  depthOptions,
  direction,
  onDirectionChange,
  strongOnly,
  onStrongOnlyChange,
  strongAvailable,
  query,
  onQueryChange,
  stats,
  onFit,
  onReset,
  showReset,
}: {
  depth: number;
  onDepthChange: (depth: number) => void;
  depthOptions: { id: number; label: string }[];
  direction: "LR" | "TB";
  onDirectionChange: (direction: "LR" | "TB") => void;
  strongOnly: boolean;
  onStrongOnlyChange: (value: boolean) => void;
  strongAvailable: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  stats: MapStats;
  onFit: () => void;
  onReset: () => void;
  showReset: boolean;
}) {
  const aggregated = stats.shownNodes < stats.totalNodes;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          label="Folder depth"
          value={depth}
          options={depthOptions}
          onChange={onDepthChange}
        />

        <Segmented
          label="Layout direction"
          value={direction}
          options={[
            { id: "LR" as const, label: "Left → right" },
            { id: "TB" as const, label: "Top → bottom" },
          ]}
          onChange={onDirectionChange}
        />

        {strongAvailable && (
          <button
            onClick={() => onStrongOnlyChange(!strongOnly)}
            aria-pressed={strongOnly}
            className={cn(
              "rounded-lg border border-border px-2.5 py-1.5 text-xs transition-colors",
              strongOnly
                ? "bg-elevated text-foreground"
                : "bg-surface/60 text-muted hover:text-foreground",
            )}
          >
            Strong links only
          </button>
        )}

        <div className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search modules…"
            aria-label="Search modules"
            className="h-9 pl-9"
          />
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onFit}
            title="Fit the graph to the viewport"
            aria-label="Fit graph to viewport"
            className="rounded-lg border border-border bg-surface/60 p-1.5 text-muted transition-colors hover:text-foreground"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          {showReset && (
            <button
              onClick={onReset}
              title="Clear selection and search"
              aria-label="Reset map view"
              className="rounded-lg border border-border bg-surface/60 p-1.5 text-muted transition-colors hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <Badge variant="muted">
          {stats.shownNodes} module{stats.shownNodes === 1 ? "" : "s"}
        </Badge>
        <Badge variant="muted">{stats.shownEdges} dependency links</Badge>
        <Badge variant="muted">{stats.layerCount} layers</Badge>
        {aggregated && (
          <span className="text-[11px]">
            (rolled up from {stats.totalNodes} folders / {stats.totalEdges} links)
          </span>
        )}
      </div>
    </div>
  );
}
