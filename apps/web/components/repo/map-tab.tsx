"use client";

import * as React from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Files, MessageSquareCode, Search } from "lucide-react";
import type { Graph } from "@codecompass/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { layoutGraph } from "@/lib/graph-layout";
import { ModuleNode, nodeTypes, type ModuleNodeData } from "./map-node";

export function MapTab({
  graph,
  onOpenFile,
  onAsk,
}: {
  graph: Graph | null;
  onOpenFile: (path: string) => void;
  onAsk: (question: string) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<string | null>(null);

  const { nodes, edges } = React.useMemo(() => {
    if (!graph) return { nodes: [] as Node<ModuleNodeData>[], edges: [] as Edge[] };
    const positions = layoutGraph(graph);
    const q = query.trim().toLowerCase();
    const rfNodes: Node<ModuleNodeData>[] = graph.nodes.map((n) => ({
      id: n.id,
      type: "module",
      position: positions.get(n.id) ?? { x: 0, y: 0 },
      data: {
        label: n.label,
        fileCount: n.files.length,
        language: n.language ?? "Other",
        highlighted:
          Boolean(q) && (n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q)),
      },
    }));
    const rfEdges: Edge[] = graph.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: e.weight > 2,
      style: { stroke: "#8A93A6", strokeWidth: Math.min(1 + e.weight * 0.5, 4), opacity: 0.6 },
    }));
    return { nodes: rfNodes, edges: rfEdges };
  }, [graph, query]);

  const selectedNode = graph?.nodes.find((n) => n.id === selected) ?? null;

  if (!graph || graph.nodes.length === 0) {
    return (
      <EmptyState
        icon={Files}
        title="No modules to display"
        description="The architecture graph is empty for this repository."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search modules…"
            aria-label="Search modules"
            className="pl-9"
          />
        </div>
        <span className="text-xs text-muted">
          {graph.nodes.length} modules · {graph.edges.length} edges
        </span>
      </div>

      <div className="h-[560px] overflow-hidden rounded-xl border border-border bg-surface/60 bg-grid">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => setSelected(node.id)}
          fitView
          minZoom={0.2}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={22}
            size={1}
            color="rgba(138,147,166,0.25)"
          />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable nodeColor={() => "#14B8A6"} maskColor="rgba(11,16,32,0.6)" />
        </ReactFlow>
      </div>

      <Sheet open={Boolean(selectedNode)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent title={selectedNode?.label ?? "Module"}>
          {selectedNode && (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="primary">{selectedNode.language ?? "Other"}</Badge>
                <Badge variant="muted">{selectedNode.files.length} files</Badge>
                <Badge variant="muted">
                  {selectedNode.id === "." ? "(root)" : selectedNode.id}
                </Badge>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                  Summary
                </p>
                <p className="text-sm text-muted">
                  This module contains {selectedNode.files.length} file(s) and belongs to the{" "}
                  {selectedNode.language ?? "project"} layer. Follow the edges to see what it
                  depends on.
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                  Files inside
                </p>
                <ul className="space-y-1">
                  {selectedNode.files.slice(0, 40).map((file) => (
                    <li key={file}>
                      <button
                        onClick={() => onOpenFile(file)}
                        className="w-full truncate rounded-lg px-2 py-1.5 text-left font-mono text-xs text-muted transition-colors hover:bg-elevated hover:text-foreground"
                      >
                        {file}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                className="w-full"
                onClick={() => {
                  onAsk(
                    `Explain the "${selectedNode.label}" module and how it fits into the project.`,
                  );
                  setSelected(null);
                }}
              >
                <MessageSquareCode className="h-4 w-4" /> Ask about this
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export { ModuleNode };
