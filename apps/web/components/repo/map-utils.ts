import type { Node } from "@xyflow/react";
import { ALL_DEPTH, DEPTH_PRESETS, type ModelNode } from "@/lib/graph-model";
import type { ModuleNodeData } from "./map-node";
import type { NeighbourRef } from "./map-drawer";

export type FlowNode = Node<ModuleNodeData, "module">;

export { ALL_DEPTH };

export const DEPTH_OPTIONS = DEPTH_PRESETS.map((preset) => ({
  id: preset.id === Number.POSITIVE_INFINITY ? ALL_DEPTH : (preset.id as number),
  label: preset.label,
}));

/** Does a node id belong to a top-level group (folder)? */
export function belongsTo(id: string, group: string): boolean {
  if (group === "(root)") return id === ".";
  return id === group || id.startsWith(`${group}/`);
}

export function toRefs(model: { nodes: ModelNode[] } | null, ids: string[]): NeighbourRef[] {
  if (!model) return [];
  const byId = new Map(model.nodes.map((node) => [node.id, node]));
  return ids
    .map((id) => byId.get(id))
    .filter((node): node is ModelNode => Boolean(node))
    .map((node) => ({ id: node.id, label: node.label }));
}
