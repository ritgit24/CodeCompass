"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Files, Info } from "lucide-react";
import type { Graph } from "@codecompass/shared";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { nodeTypes } from "./map-node";
import { MapToolbar } from "./map-toolbar";
import { MapLegend } from "./map-legend";
import { MapDrawer } from "./map-drawer";
import { useMapModel } from "./use-map-model";
import type { FlowNode } from "./map-utils";

export function MapTab({
  graph,
  onOpenFile,
  onAsk,
}: {
  graph: Graph | null;
  onOpenFile: (path: string) => void;
  onAsk: (question: string) => void;
}) {
  const map = useMapModel(graph);

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
    <Card className="overflow-hidden p-4">
      <MapToolbar
        depth={map.depth}
        onDepthChange={(next) => {
          map.setDepth(next);
          map.setSelected(null);
        }}
        depthOptions={map.depthOptions}
        direction={map.direction}
        onDirectionChange={map.setDirection}
        strongOnly={map.strongOnly}
        onStrongOnlyChange={(value) => {
          map.markStrongTouched();
          map.setStrongOnly(value);
        }}
        strongAvailable={map.strongAvailable}
        query={map.query}
        onQueryChange={map.setQuery}
        stats={{
          shownNodes: map.model?.shownNodes ?? 0,
          totalNodes: map.model?.totalNodes ?? 0,
          shownEdges: map.visibleEdges.length,
          totalEdges: map.model?.totalEdges ?? 0,
          layerCount: map.layout?.layerCount ?? 0,
        }}
        onFit={() => map.rfRef.current?.fitView({ padding: 0.2, duration: 400 })}
        onReset={map.reset}
        showReset={Boolean(map.selected || map.query || map.hoverGroup)}
      />

      <div className="mt-3 h-[600px] overflow-hidden rounded-xl border border-border bg-surface/50 bg-grid">
        <ReactFlow<FlowNode, Edge>
          nodes={map.nodes}
          edges={map.edges}
          nodeTypes={nodeTypes}
          onNodesChange={map.onNodesChange}
          onEdgesChange={map.onEdgesChange}
          onInit={(instance) => {
            map.rfRef.current = instance;
          }}
          onNodeClick={(_, node) =>
            map.setSelected((current) => (current === node.id ? null : node.id))
          }
          onPaneClick={() => map.setSelected(null)}
          fitView
          fitViewOptions={{ padding: 0.2, maxZoom: 1.1 }}
          minZoom={0.05}
          maxZoom={2}
          onlyRenderVisibleElements
          nodesDraggable
          nodeDragThreshold={1}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="rgba(138,147,166,0.22)"
          />
          <Controls showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            nodeStrokeWidth={0}
            nodeColor={(node) => map.colorById.get(node.id) ?? "#14B8A6"}
            maskColor="rgba(11,16,32,0.6)"
          />
          <Panel position="bottom-left" className="!m-3">
            <MapLegend
              groups={map.model?.groups ?? []}
              isolatedCount={map.model?.isolatedCount ?? 0}
              visibleGroup={map.hoverGroup}
              onHoverGroup={map.setHoverGroup}
            />
          </Panel>
          <Panel position="top-left" className="!m-3">
            <div className="pointer-events-none flex items-center gap-2 rounded-lg border border-border bg-surface/80 px-2.5 py-1.5 text-[11px] text-muted backdrop-blur">
              <Info className="h-3 w-3" />
              {map.selected
                ? "Neighbours highlighted · click the background to clear"
                : "Click a module to see what it imports"}
            </div>
          </Panel>
        </ReactFlow>
      </div>

      <MapDrawer
        node={map.selectedNode}
        imports={map.imports}
        importedBy={map.importedBy}
        onOpenFile={onOpenFile}
        onAsk={onAsk}
        onSelect={map.focusOn}
        onDrillDown={map.drillDown}
        onClose={() => map.setSelected(null)}
      />
    </Card>
  );
}
