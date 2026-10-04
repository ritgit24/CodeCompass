"use client";

import * as React from "react";
import { ChevronDown, Layers } from "lucide-react";
import type { ModelGroup } from "@/lib/graph-model";
import { cn } from "@/lib/utils";

/**
 * Colour key for the module map. Groups are the top-level folders (plus
 * "(root)"), which is what the node colours encode.
 */
export function MapLegend({
  groups,
  isolatedCount,
  visibleGroup,
  onHoverGroup,
}: {
  groups: ModelGroup[];
  isolatedCount: number;
  visibleGroup: string | null;
  onHoverGroup: (group: string | null) => void;
}) {
  const [open, setOpen] = React.useState(true);
  const shown = groups.slice(0, 8);
  const hidden = groups.length - shown.length;

  return (
    <div className="pointer-events-auto w-56 rounded-xl border border-border bg-surface/90 p-3 text-xs shadow-card backdrop-blur">
      <button
        className="flex w-full items-center justify-between gap-2 font-semibold"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-[var(--primary-2)]" /> Modules
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="mt-2 space-y-1">
          {shown.map((group) => (
            <button
              key={group.name}
              onMouseEnter={() => onHoverGroup(group.name)}
              onMouseLeave={() => onHoverGroup(null)}
              onFocus={() => onHoverGroup(group.name)}
              onBlur={() => onHoverGroup(null)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-elevated",
                visibleGroup === group.name && "bg-elevated",
              )}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ background: group.color }}
              />
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted">
                {group.name}
              </span>
              <span className="font-mono text-[10px] text-muted">{group.count}</span>
            </button>
          ))}
          {hidden > 0 && (
            <p className="px-1.5 pt-1 text-[10px] text-muted">+{hidden} more groups</p>
          )}
          {isolatedCount > 0 && (
            <p className="border-t border-border px-1.5 pt-2 text-[10px] text-muted">
              {isolatedCount} module{isolatedCount === 1 ? "" : "s"} with no imports either way (∅)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
