"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Files } from "lucide-react";
import { cn } from "@/lib/utils";

export const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178C6",
  JavaScript: "#F7DF1E",
  Python: "#3776AB",
  Ruby: "#CC342D",
  Go: "#00ADD8",
  Rust: "#DEA584",
  Java: "#B07219",
  Markdown: "#64748B",
  JSON: "#F59E0B",
  Other: "#8A93A6",
};

export type ModuleNodeData = {
  label: string;
  fileCount: number;
  language: string;
  highlighted: boolean;
};

export function ModuleNode({ data }: NodeProps<Node<ModuleNodeData>>) {
  const color = LANG_COLORS[data.language] ?? LANG_COLORS.Other;
  return (
    <div
      className={cn(
        "rounded-xl border bg-surface px-3.5 py-2.5 shadow-card transition-all",
        data.highlighted
          ? "border-[var(--primary-2)] ring-2 ring-[var(--primary-2)]/40"
          : "border-border",
      )}
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <Handle type="target" position={Position.Left} className="!border-0 !bg-[var(--muted)]" />
      <span className="font-mono text-xs font-semibold">{data.label}</span>
      <div className="mt-1 flex items-center gap-1 text-[10px] text-muted">
        <Files className="h-3 w-3" /> {data.fileCount}
        <span className="mx-0.5">·</span>
        {data.language}
      </div>
      <Handle type="source" position={Position.Right} className="!border-0 !bg-[var(--muted)]" />
    </div>
  );
}

export const nodeTypes = { module: ModuleNode };
