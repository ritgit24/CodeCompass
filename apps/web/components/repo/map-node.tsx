"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { ArrowDown, ArrowUp, Files } from "lucide-react";
import { cn } from "@/lib/utils";

export type NodeState = "normal" | "selected" | "neighbour" | "match" | "dim";

export type ModuleNodeData = {
  label: string;
  fullPath: string;
  fileCount: number;
  language: string;
  color: string;
  direction: "LR" | "TB";
  inDegree: number;
  outDegree: number;
  state: NodeState;
};

export const NODE_WIDTH = 208;
export const NODE_HEIGHT = 64;

export function ModuleNode({ data }: NodeProps<Node<ModuleNodeData>>) {
  const horizontal = data.direction === "LR";
  const dimmed = data.state === "dim";
  const isSelected = data.state === "selected";
  const isMatch = data.state === "match";
  const isNeighbour = data.state === "neighbour";

  return (
    <div
      className={cn(
        "relative rounded-xl border bg-surface px-3 py-2.5 shadow-card transition-all duration-200",
        isSelected && "border-transparent ring-2 ring-[var(--primary-2)]",
        isMatch && "border-[var(--primary-2)]/70",
        isNeighbour && "border-[var(--primary)]/60",
        !isSelected && !isMatch && !isNeighbour && "border-border",
        dimmed && "opacity-20 saturate-50",
      )}
      style={{
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        ...(horizontal
          ? { borderLeft: `3px solid ${data.color}` }
          : { borderTop: `3px solid ${data.color}` }),
      }}
      title={data.fullPath}
    >
      <Handle
        type="target"
        position={horizontal ? Position.Left : Position.Top}
        className="!h-1.5 !w-1.5 !border-0 !bg-[var(--muted)]"
      />
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: data.color }} />
        <span className="truncate font-mono text-xs font-semibold">{data.label}</span>
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted">
        <span className="inline-flex items-center gap-1">
          <Files className="h-2.5 w-2.5" /> {data.fileCount}
        </span>
        <span className="truncate">{data.language}</span>
        <span className="ml-auto inline-flex items-center gap-1.5">
          {data.inDegree > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <ArrowDown className="h-2.5 w-2.5" /> {data.inDegree}
            </span>
          )}
          {data.outDegree > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <ArrowUp className="h-2.5 w-2.5" /> {data.outDegree}
            </span>
          )}
          {data.inDegree === 0 && data.outDegree === 0 && (
            <span title="no imports either way">∅</span>
          )}
        </span>
      </div>
      <Handle
        type="source"
        position={horizontal ? Position.Right : Position.Bottom}
        className="!h-1.5 !w-1.5 !border-0 !bg-[var(--muted)]"
      />
    </div>
  );
}

export const nodeTypes = { module: ModuleNode };
