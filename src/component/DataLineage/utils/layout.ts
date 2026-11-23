/**
 * @file layout.ts
 * @description Dagre left-to-right layout for the Data Lineage graph.
 * A fresh dagre graph is created per call so no state leaks between layouts.
 */
import dagre from '@dagrejs/dagre';
import type { FlowEdgeSpec, FlowNodeSpec } from './graphBuilder';

export const ASSET_NODE_WIDTH = 280;
export const ASSET_NODE_BASE_HEIGHT = 72;
export const COLUMN_ROW_HEIGHT = 26;
export const MAX_VISIBLE_COLUMNS = 8;
export const PROCESS_NODE_SIZE = 44;

export const nodeSize = (node: FlowNodeSpec, columnMode: boolean): { width: number; height: number } => {
  if (node.type === 'dlProcess') return { width: PROCESS_NODE_SIZE, height: PROCESS_NODE_SIZE };
  const cols = columnMode ? Math.min(node.asset?.columns.length || 0, MAX_VISIBLE_COLUMNS) : 0;
  const extra = cols ? cols * COLUMN_ROW_HEIGHT + 12 : 0;
  return { width: ASSET_NODE_WIDTH, height: ASSET_NODE_BASE_HEIGHT + extra };
};

export const layoutGraph = (
  nodes: FlowNodeSpec[],
  edges: FlowEdgeSpec[],
  columnMode: boolean,
): Record<string, { x: number; y: number }> => {
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', nodesep: 30, ranksep: columnMode ? 140 : 70, marginx: 20, marginy: 20 });
  nodes.forEach((n) => g.setNode(n.id, nodeSize(n, columnMode)));
  edges.forEach((e) => {
    if (g.hasNode(e.source) && g.hasNode(e.target)) g.setEdge(e.source, e.target);
  });
  dagre.layout(g);
  const positions: Record<string, { x: number; y: number }> = {};
  nodes.forEach((n) => {
    const p = g.node(n.id);
    const { width, height } = nodeSize(n, columnMode);
    positions[n.id] = { x: (p?.x ?? 0) - width / 2, y: (p?.y ?? 0) - height / 2 };
  });
  return positions;
};
