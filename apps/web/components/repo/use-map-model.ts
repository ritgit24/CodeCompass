"use client";

import * as React from "react";
import {
  MarkerType,
  useEdgesState,
  useNodesState,
  type Edge,
  type ReactFlowInstance,
} from "@xyflow/react";
import type { Graph } from "@codecompass/shared";
import { aggregateGraph, suggestDepth, type ModelNode } from "@/lib/graph-model";
import { layoutGraph } from "@/lib/graph-layout";
import { NODE_HEIGHT, NODE_WIDTH } from "./map-node";
import { applyEdgeHighlight, applyNodeHighlight } from "./map-highlight";
import { ALL_DEPTH, DEPTH_OPTIONS, toRefs, type FlowNode } from "./map-utils";

/** All state, layout and highlighting logic for the architecture map. */
export function useMapModel(graph: Graph | null) {
  const [depth, setDepth] = React.useState(2);
  const [direction, setDirection] = React.useState<"LR" | "TB">("LR");
  const [strongOnly, setStrongOnly] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<string | null>(null);
  const [hoverGroup, setHoverGroup] = React.useState<string | null>(null);

  const rfRef = React.useRef<ReactFlowInstance<FlowNode, Edge> | null>(null);
  const strongTouched = React.useRef(false);
  const depthInitialised = React.useRef(false);

  // Open large repositories at a depth that stays readable.
  React.useEffect(() => {
    if (depthInitialised.current || !graph) return;
    depthInitialised.current = true;
    const suggested = suggestDepth(graph);
    if (suggested !== 2) setDepth(suggested);
  }, [graph]);

  const model = React.useMemo(
    () => (graph ? aggregateGraph(graph, { maxDepth: depth }) : null),
    [graph, depth],
  );

  const strongAvailable = Boolean(
    model && model.edges.length >= 20 && model.edges.some((edge) => edge.weight >= 2),
  );

  // Dense graphs default to strong links only (until the user chooses).
  React.useEffect(() => {
    if (strongTouched.current || !model) return;
    setStrongOnly(model.edges.length > 140);
  }, [model]);

  const visibleEdges = React.useMemo(() => {
    if (!model) return [];
    if (!strongOnly) return model.edges;
    const strong = model.edges.filter((edge) => edge.weight >= 2);
    return strong.length >= 2 ? strong : model.edges;
  }, [model, strongOnly]);

  const layout = React.useMemo(() => {
    if (!model) return null;
    return layoutGraph(
      { nodes: model.nodes, edges: visibleEdges },
      { direction, nodeWidth: NODE_WIDTH, nodeHeight: NODE_HEIGHT },
    );
  }, [model, visibleEdges, direction]);

  const colorById = React.useMemo(
    () => new Map((model?.nodes ?? []).map((node) => [node.id, node.color])),
    [model],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const layoutKey = `${model?.nodes.length ?? 0}:${visibleEdges.length}:${direction}:${depth}:${strongOnly}`;

  // Rebuild geometry only when layout inputs change (positions reset here).
  React.useEffect(() => {
    if (!model || !layout) return;
    setNodes(
      model.nodes.map<FlowNode>((node) => ({
        id: node.id,
        type: "module",
        position: layout.positions.get(node.id) ?? { x: 0, y: 0 },
        data: {
          label: node.label,
          fullPath: node.id,
          fileCount: node.fileCount,
          language: node.language ?? "Other",
          color: node.color,
          direction,
          inDegree: node.inDegree,
          outDegree: node.outDegree,
          state: "normal",
        },
      })),
    );
    setEdges(
      visibleEdges.map<Edge>((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: "#8A93A6" },
        data: { weight: edge.weight },
        style: {
          stroke: "#8A93A6",
          strokeWidth: 1 + Math.min(edge.weight, 4) * 0.35,
          opacity: 0.32,
        },
      })),
    );
    const timer = window.setTimeout(
      () => rfRef.current?.fitView({ padding: 0.2, duration: 400, maxZoom: 1.1 }),
      60,
    );
    return () => window.clearTimeout(timer);
    // layoutKey encodes every input this effect reads, so it is the sole dep.
  }, [layoutKey]);

  const neighbours = React.useMemo(() => {
    if (!selected || !model) return null;
    const set = new Set<string>([selected]);
    for (const edge of visibleEdges) {
      if (edge.source === selected) set.add(edge.target);
      if (edge.target === selected) set.add(edge.source);
    }
    return set;
  }, [selected, visibleEdges, model]);

  const matches = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !model) return null;
    return new Set(
      model.nodes
        .filter(
          (node) =>
            node.id.toLowerCase().includes(q) ||
            node.label.toLowerCase().includes(q) ||
            (node.language ?? "").toLowerCase().includes(q),
        )
        .map((node) => node.id),
    );
  }, [query, model]);

  const ctx = React.useMemo(
    () => ({ selected, neighbours, matches, hoverGroup }),
    [selected, neighbours, matches, hoverGroup],
  );

  // Highlight / dim without moving nodes (user-dragged positions stay put).
  React.useEffect(() => {
    setNodes((current) => applyNodeHighlight(current, ctx));
  }, [ctx, setNodes]);

  React.useEffect(() => {
    setEdges((current) => applyEdgeHighlight(current, ctx));
  }, [ctx, setEdges]);

  const focusOn = React.useCallback(
    (id: string) => {
      setSelected(id);
      const position = layout?.positions.get(id);
      if (position && rfRef.current) {
        rfRef.current.setCenter(position.x + NODE_WIDTH / 2, position.y + NODE_HEIGHT / 2, {
          zoom: Math.max(0.7, Math.min(1.15, rfRef.current.getZoom())),
          duration: 400,
        });
      }
    },
    [layout],
  );

  const reset = React.useCallback(() => {
    setSelected(null);
    setQuery("");
    setHoverGroup(null);
    rfRef.current?.fitView({ padding: 0.2, duration: 400 });
  }, []);

  const drillDown = React.useCallback((id: string) => {
    const segments = id.split("/").filter(Boolean).length;
    setDepth(Math.min(ALL_DEPTH, segments + 1));
    setSelected(null);
  }, []);

  const selectedNode: ModelNode | null = model?.nodes.find((node) => node.id === selected) ?? null;

  return {
    model,
    visibleEdges,
    layout,
    colorById,
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    rfRef,
    depth,
    setDepth,
    direction,
    setDirection,
    strongOnly,
    setStrongOnly,
    strongAvailable,
    markStrongTouched: () => {
      strongTouched.current = true;
    },
    query,
    setQuery,
    selected,
    setSelected,
    hoverGroup,
    setHoverGroup,
    ctx,
    depthOptions: DEPTH_OPTIONS,
    focusOn,
    reset,
    drillDown,
    selectedNode,
    imports: toRefs(
      model,
      visibleEdges.filter((edge) => edge.source === selected).map((edge) => edge.target),
    ),
    importedBy: toRefs(
      model,
      visibleEdges.filter((edge) => edge.target === selected).map((edge) => edge.source),
    ),
  };
}
