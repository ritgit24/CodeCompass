import type { Edge } from "@xyflow/react";
import type { NodeState } from "./map-node";
import { belongsTo, type FlowNode } from "./map-utils";

export interface HighlightContext {
  selected: string | null;
  neighbours: Set<string> | null;
  matches: Set<string> | null;
  hoverGroup: string | null;
}

/**
 * Pure: decide each node's visual state. Kept separate from React so the
 * behaviour is easy to reason about (and unit-test) independently.
 */
export function applyNodeHighlight(nodes: FlowNode[], ctx: HighlightContext): FlowNode[] {
  const { selected, neighbours, matches, hoverGroup } = ctx;
  return nodes.map((node) => {
    const isSelected = node.id === selected;
    const isNeighbour = neighbours?.has(node.id) ?? false;
    const isMatch = matches?.has(node.id) ?? false;
    const suppressed =
      (Boolean(neighbours) && !isSelected && !isNeighbour) ||
      (Boolean(matches) && !isMatch && !isSelected) ||
      (hoverGroup ? !belongsTo(node.id, hoverGroup) : false);

    const state: NodeState = suppressed
      ? "dim"
      : isSelected
        ? "selected"
        : isMatch
          ? "match"
          : isNeighbour
            ? "neighbour"
            : "normal";

    return {
      ...node,
      zIndex: isSelected ? 30 : isMatch ? 20 : isNeighbour ? 10 : 0,
      data: { ...node.data, state },
    };
  });
}

/** Pure: emphasise the edges that matter for the current selection/search. */
export function applyEdgeHighlight(edges: Edge[], ctx: HighlightContext): Edge[] {
  const { selected, matches, hoverGroup } = ctx;
  return edges.map((edge) => {
    const weight = Number((edge.data as { weight?: number } | undefined)?.weight ?? 1);
    const touches = selected ? edge.source === selected || edge.target === selected : false;
    const inMatch = matches ? matches.has(edge.source) && matches.has(edge.target) : true;
    const groupRelevant = hoverGroup
      ? belongsTo(edge.source, hoverGroup) || belongsTo(edge.target, hoverGroup)
      : true;
    const suppressed =
      (Boolean(selected) && !touches) || (Boolean(matches) && !inMatch) || !groupRelevant;

    return {
      ...edge,
      animated: touches,
      style: {
        stroke: touches ? "#22D3EE" : "#8A93A6",
        strokeWidth: touches ? 1.8 + Math.min(weight, 4) * 0.4 : 1 + Math.min(weight, 4) * 0.35,
        opacity: suppressed ? 0.05 : touches ? 0.95 : 0.32,
      },
    };
  });
}
